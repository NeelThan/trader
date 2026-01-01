"use client";

import * as React from "react";
import { useRef, useEffect, useCallback, useLayoutEffect, useImperativeHandle, forwardRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  CandlestickData,
  BarData,
  LineData,
  Time,
  IPriceLine,
  DeepPartial,
  ChartOptions,
  CandlestickStyleOptions,
  BarStyleOptions,
  SeriesOptionsCommon,
  LineWidth,
  LineStyle,
  CrosshairMode,
  SeriesMarker,
  createSeriesMarkers,
  ISeriesMarkersPluginApi,
} from "lightweight-charts";
import { cn } from "@/lib/utils";

export type OHLCData = {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type PriceLine = {
  price: number;
  color?: string;
  lineWidth?: LineWidth;
  lineStyle?: LineStyle;
  axisLabelVisible?: boolean;
  title?: string;
};

export type LineOverlay = {
  data: { time: Time; value: number }[];
  color?: string;
  lineWidth?: number;
  lineStyle?: LineStyle;
};

export type ChartMarker = {
  time: Time;
  position: "aboveBar" | "belowBar" | "inBar";
  color: string;
  shape: "circle" | "square" | "arrowUp" | "arrowDown";
  text?: string;
  size?: number;
};

export type ChartType = "candlestick" | "bar" | "heikin-ashi";

export type CandlestickChartProps = {
  data: OHLCData[];
  priceLines?: PriceLine[];
  lineOverlays?: LineOverlay[];
  markers?: ChartMarker[];
  chartType?: ChartType;
  width?: number;
  height?: number;
  autoSize?: boolean;
  theme?: "light" | "dark";
  upColor?: string;
  downColor?: string;
  className?: string;
  onCrosshairMove?: (price: number | null, time: Time | null) => void;
  onLoadMore?: (oldestTime: Time) => void; // Called when user scrolls to start of data
};

export type CandlestickChartHandle = {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitPriceScale: () => void;
  scrollUp: () => void;
  scrollDown: () => void;
};

const LIGHT_THEME: DeepPartial<ChartOptions> = {
  layout: {
    background: { color: "#ffffff" },
    textColor: "#333333",
  },
  grid: {
    vertLines: { color: "#e1e1e1" },
    horzLines: { color: "#e1e1e1" },
  },
  rightPriceScale: {
    borderColor: "#e1e1e1",
  },
  timeScale: {
    borderColor: "#e1e1e1",
  },
};

const DARK_THEME: DeepPartial<ChartOptions> = {
  layout: {
    background: { color: "#1a1a1a" },
    textColor: "#d1d1d1",
  },
  grid: {
    vertLines: { color: "#2d2d2d" },
    horzLines: { color: "#2d2d2d" },
  },
  rightPriceScale: {
    borderColor: "#2d2d2d",
  },
  timeScale: {
    borderColor: "#2d2d2d",
  },
};

// Use layout effect on client, regular effect during SSR
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Convert time to Unix timestamp (seconds) for consistent comparison
function timeToUnix(time: Time): number {
  if (typeof time === "number") {
    // Already a timestamp - if > 10^10, it's milliseconds, convert to seconds
    return time > 10000000000 ? Math.floor(time / 1000) : time;
  }
  // String date like "2025-12-26" - convert to Unix seconds
  return Math.floor(new Date(time as string).getTime() / 1000);
}

// Deduplicate and sort data by time (ascending) to prevent Lightweight Charts errors
// Also normalizes time to Unix seconds for consistent handling
function deduplicateAndSort(data: OHLCData[]): OHLCData[] {
  if (data.length === 0) return [];

  // Use Map with Unix timestamp as key to deduplicate (keeps last occurrence)
  // Also normalize time to Unix seconds for chart consistency
  const uniqueMap = new Map<number, OHLCData>();
  for (const d of data) {
    const unixTime = timeToUnix(d.time);
    // Store with normalized Unix timestamp
    uniqueMap.set(unixTime, {
      ...d,
      time: unixTime as Time,
    });
  }

  // Sort by time ascending (times are now all Unix seconds)
  const result = Array.from(uniqueMap.values()).sort((a, b) => {
    return (a.time as number) - (b.time as number);
  });

  return result;
}

// Calculate Heikin Ashi values from OHLC data
function calculateHeikinAshi(data: OHLCData[]): OHLCData[] {
  if (data.length === 0) return [];

  const result: OHLCData[] = [];

  for (let i = 0; i < data.length; i++) {
    const current = data[i];

    // HA Close = (Open + High + Low + Close) / 4
    const haClose = (current.open + current.high + current.low + current.close) / 4;

    // HA Open = (Previous HA Open + Previous HA Close) / 2
    // For the first bar, use (Open + Close) / 2
    const haOpen =
      i === 0
        ? (current.open + current.close) / 2
        : (result[i - 1].open + result[i - 1].close) / 2;

    // HA High = Max(High, HA Open, HA Close)
    const haHigh = Math.max(current.high, haOpen, haClose);

    // HA Low = Min(Low, HA Open, HA Close)
    const haLow = Math.min(current.low, haOpen, haClose);

    result.push({
      time: current.time,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
    });
  }

  return result;
}

export const CandlestickChart = forwardRef<CandlestickChartHandle, CandlestickChartProps>(
  function CandlestickChart(
    {
      data,
      priceLines = [],
      lineOverlays = [],
      markers = [],
      chartType = "candlestick",
      width,
      height = 400,
      autoSize = true,
      theme = "dark",
      upColor = "#22c55e",
      downColor = "#ef4444",
      className,
      onCrosshairMove,
      onLoadMore,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Bar"> | null>(null);
    const lineSeriesRef = useRef<ISeriesApi<"Line">[]>([]);
    const priceLinesRef = useRef<IPriceLine[]>([]);
    const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
    const hasInitializedRef = useRef(false);

    // Expose chart control methods via ref
    useImperativeHandle(ref, () => ({
      resetView: () => {
        chartRef.current?.timeScale().fitContent();
        // Reset price scale to auto mode
        chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
      },
      zoomIn: () => {
        const timeScale = chartRef.current?.timeScale();
        if (timeScale) {
          const visibleRange = timeScale.getVisibleLogicalRange();
          if (visibleRange) {
            const rangeSize = visibleRange.to - visibleRange.from;
            const center = (visibleRange.from + visibleRange.to) / 2;
            const newRangeSize = rangeSize * 0.7; // Zoom in by 30%
            timeScale.setVisibleLogicalRange({
              from: center - newRangeSize / 2,
              to: center + newRangeSize / 2,
            });
          }
        }
      },
      zoomOut: () => {
        const timeScale = chartRef.current?.timeScale();
        if (timeScale) {
          const visibleRange = timeScale.getVisibleLogicalRange();
          if (visibleRange) {
            const rangeSize = visibleRange.to - visibleRange.from;
            const center = (visibleRange.from + visibleRange.to) / 2;
            const newRangeSize = rangeSize * 1.4; // Zoom out by 40%
            timeScale.setVisibleLogicalRange({
              from: center - newRangeSize / 2,
              to: center + newRangeSize / 2,
            });
          }
        }
      },
      fitPriceScale: () => {
        // Reset price scale to auto-fit all visible data and price lines
        chartRef.current?.priceScale("right").applyOptions({ autoScale: true });
      },
      scrollUp: () => {
        // Scroll price scale up (show lower prices)
        const priceScale = chartRef.current?.priceScale("right");
        if (priceScale) {
          // Disable auto-scale to allow manual scrolling
          priceScale.applyOptions({ autoScale: false });
        }
      },
      scrollDown: () => {
        // Scroll price scale down (show higher prices)
        const priceScale = chartRef.current?.priceScale("right");
        if (priceScale) {
          // Disable auto-scale to allow manual scrolling
          priceScale.applyOptions({ autoScale: false });
        }
      },
    }));

  // Store latest data/priceLines/lineOverlays/markers/callbacks in refs for access in effects
  const dataRef = useRef(data);
  const priceLinesPropsRef = useRef(priceLines);
  const lineOverlaysRef = useRef(lineOverlays);
  const markersPropsRef = useRef(markers);
  const onCrosshairMoveRef = useRef(onCrosshairMove);
  const onLoadMoreRef = useRef(onLoadMore);
  const isLoadingMoreRef = useRef(false);

  // Update refs in layout effect (runs synchronously before paint)
  useIsomorphicLayoutEffect(() => {
    dataRef.current = data;
    priceLinesPropsRef.current = priceLines;
    lineOverlaysRef.current = lineOverlays;
    markersPropsRef.current = markers;
    onCrosshairMoveRef.current = onCrosshairMove;
    onLoadMoreRef.current = onLoadMore;
  });

  // Create chart on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const themeOptions = theme === "dark" ? DARK_THEME : LIGHT_THEME;

    const chart = createChart(containerRef.current, {
      width: width ?? containerRef.current.clientWidth,
      height,
      ...themeOptions,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        ...themeOptions.rightPriceScale,
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      // Enable kinetic scrolling for smoother panning
      kineticScroll: {
        touch: true,
        mouse: true,
      },
      handleScale: {
        // Enable scaling by dragging on price axis (vertical) and time axis (horizontal)
        axisPressedMouseMove: {
          price: true,
          time: true,
        },
        // Enable mouse wheel zoom
        mouseWheel: true,
        // Enable pinch zoom on touch devices
        pinch: true,
      },
      handleScroll: {
        // Enable horizontal scrolling by mouse drag on chart
        pressedMouseMove: true,
        // Enable touch drag
        horzTouchDrag: true,
        vertTouchDrag: true,
        // Enable mouse wheel scroll
        mouseWheel: true,
      },
      timeScale: {
        ...themeOptions.timeScale,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    let series: ISeriesApi<"Candlestick"> | ISeriesApi<"Bar">;

    if (chartType === "bar") {
      const barOptions: DeepPartial<BarStyleOptions & SeriesOptionsCommon> = {
        upColor,
        downColor,
        openVisible: true,
        thinBars: true,
      };
      series = chart.addSeries(BarSeries, barOptions);
    } else {
      // Candlestick and Heikin Ashi both use CandlestickSeries
      const candlestickOptions: DeepPartial<
        CandlestickStyleOptions & SeriesOptionsCommon
      > = {
        upColor,
        downColor,
        borderVisible: true,
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickUpColor: upColor,
        wickDownColor: downColor,
      };
      series = chart.addSeries(CandlestickSeries, candlestickOptions);
    }

    // Set initial data from ref (apply Heikin Ashi transformation if needed)
    if (dataRef.current.length > 0) {
      const cleanedData = deduplicateAndSort(dataRef.current);
      const chartData =
        chartType === "heikin-ashi"
          ? calculateHeikinAshi(cleanedData)
          : cleanedData;
      series.setData(chartData as (CandlestickData | BarData)[]);
      chart.timeScale().fitContent();
    }

    // Set initial price lines from ref
    priceLinesPropsRef.current.forEach((lineConfig) => {
      const line = series.createPriceLine({
        price: lineConfig.price,
        color: lineConfig.color ?? "#3179F5",
        lineWidth: lineConfig.lineWidth ?? (1 as LineWidth),
        lineStyle: lineConfig.lineStyle ?? LineStyle.Dashed,
        axisLabelVisible: lineConfig.axisLabelVisible ?? true,
        title: lineConfig.title ?? "",
      });
      priceLinesRef.current.push(line);
    });

    // Create line overlays from ref
    lineOverlaysRef.current.forEach((overlay) => {
      const lineSeries = chart.addSeries(LineSeries, {
        color: overlay.color ?? "#f59e0b",
        lineWidth: (overlay.lineWidth ?? 2) as LineWidth,
        lineStyle: overlay.lineStyle ?? LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      if (overlay.data.length > 0) {
        lineSeries.setData(overlay.data as LineData[]);
      }
      lineSeriesRef.current.push(lineSeries);
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Set up initial markers from ref (v5 API)
    if (markersPropsRef.current.length > 0) {
      const seriesMarkers: SeriesMarker<Time>[] = markersPropsRef.current.map((m) => ({
        time: m.time,
        position: m.position,
        color: m.color,
        shape: m.shape,
        text: m.text ?? "",
        size: m.size ?? 1,
      }));
      // Sort markers by time (required by lightweight-charts)
      seriesMarkers.sort((a, b) => {
        const timeA = typeof a.time === "number" ? a.time : new Date(a.time as string).getTime();
        const timeB = typeof b.time === "number" ? b.time : new Date(b.time as string).getTime();
        return timeA - timeB;
      });
      markersPluginRef.current = createSeriesMarkers(series, seriesMarkers);
    }

    // Handle crosshair move (use ref to avoid recreating chart when callback changes)
    chart.subscribeCrosshairMove((param) => {
      if (!onCrosshairMoveRef.current) return;
      if (!param.time || !param.point) {
        onCrosshairMoveRef.current(null, null);
        return;
      }
      const seriesData = param.seriesData.get(series) as
        | CandlestickData
        | undefined;
      onCrosshairMoveRef.current(seriesData?.close ?? null, param.time);
    });

    // Handle visible range change to detect when user scrolls to start of data
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range || !onLoadMoreRef.current || isLoadingMoreRef.current) return;

      // If the visible range starts before or at index 0, we're at the left edge
      // Load more when user is within 10 bars of the start
      if (range.from <= 10 && dataRef.current.length > 0) {
        const oldestData = dataRef.current[0];
        if (oldestData) {
          isLoadingMoreRef.current = true;
          onLoadMoreRef.current(oldestData.time);
        }
      }
    });

    // Mark as initialized since we just fit content
    hasInitializedRef.current = true;

    // Cleanup
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
      lineSeriesRef.current = [];
      markersPluginRef.current = null;
      hasInitializedRef.current = false; // Reset so new chart fits content
    };
  }, [theme, height, width, upColor, downColor, chartType]);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;
    const cleanedData = deduplicateAndSort(data);
    const chartData =
      chartType === "heikin-ashi" ? calculateHeikinAshi(cleanedData) : cleanedData;
    seriesRef.current.setData(chartData as (CandlestickData | BarData)[]);

    // Reset loading flag so we can load more again
    isLoadingMoreRef.current = false;

    // Only fit content on first data load, preserve user's zoom/pan on refreshes
    if (!hasInitializedRef.current) {
      chartRef.current?.timeScale().fitContent();
      hasInitializedRef.current = true;
    }
  }, [data, chartType]);

  // Update price lines when they change
  useEffect(() => {
    if (!seriesRef.current) return;

    // Remove existing price lines
    priceLinesRef.current.forEach((line) => {
      seriesRef.current?.removePriceLine(line);
    });
    priceLinesRef.current = [];

    // Add new price lines
    priceLines.forEach((lineConfig) => {
      const line = seriesRef.current?.createPriceLine({
        price: lineConfig.price,
        color: lineConfig.color ?? "#3179F5",
        lineWidth: lineConfig.lineWidth ?? (1 as LineWidth),
        lineStyle: lineConfig.lineStyle ?? LineStyle.Dashed,
        axisLabelVisible: lineConfig.axisLabelVisible ?? true,
        title: lineConfig.title ?? "",
      });
      if (line) {
        priceLinesRef.current.push(line);
      }
    });
  }, [priceLines]);

  // Update line overlays when they change
  useEffect(() => {
    if (!chartRef.current) return;

    // Remove existing line series
    lineSeriesRef.current.forEach((series) => {
      chartRef.current?.removeSeries(series);
    });
    lineSeriesRef.current = [];

    // Add new line overlays
    lineOverlays.forEach((overlay) => {
      const lineSeries = chartRef.current?.addSeries(LineSeries, {
        color: overlay.color ?? "#f59e0b",
        lineWidth: (overlay.lineWidth ?? 2) as LineWidth,
        lineStyle: overlay.lineStyle ?? LineStyle.Solid,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      if (lineSeries && overlay.data.length > 0) {
        lineSeries.setData(overlay.data as LineData[]);
        lineSeriesRef.current.push(lineSeries);
      }
    });
  }, [lineOverlays]);

  // Update markers when they change
  useEffect(() => {
    if (!seriesRef.current) return;

    // Convert ChartMarker to SeriesMarker format
    const seriesMarkers: SeriesMarker<Time>[] = markers.map((m) => ({
      time: m.time,
      position: m.position,
      color: m.color,
      shape: m.shape,
      text: m.text ?? "",
      size: m.size ?? 1,
    }));

    // Sort markers by time (required by lightweight-charts)
    seriesMarkers.sort((a, b) => {
      const timeA = typeof a.time === "number" ? a.time : new Date(a.time as string).getTime();
      const timeB = typeof b.time === "number" ? b.time : new Date(b.time as string).getTime();
      return timeA - timeB;
    });

    // Use v5 API: createSeriesMarkers
    if (markersPluginRef.current) {
      // Update existing markers
      markersPluginRef.current.setMarkers(seriesMarkers);
    } else if (seriesMarkers.length > 0) {
      // Create markers plugin on first use
      markersPluginRef.current = createSeriesMarkers(seriesRef.current, seriesMarkers);
    }
  }, [markers]);

  // Handle resize with ResizeObserver
  const handleResize = useCallback(() => {
    if (!containerRef.current || !chartRef.current || !autoSize) return;
    chartRef.current.resize(containerRef.current.clientWidth, height);
  }, [autoSize, height]);

  useEffect(() => {
    if (!autoSize || !containerRef.current) return;

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [autoSize, handleResize]);

  // Custom vertical panning: Middle mouse button OR Ctrl+Scroll for vertical zoom
  const isDraggingVerticalRef = useRef(false);
  const lastYRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Middle mouse button (button 1) for vertical panning
      if (e.button === 1) {
        isDraggingVerticalRef.current = true;
        lastYRef.current = e.clientY;
        // Disable auto-scale to allow manual adjustment
        chartRef.current?.priceScale("right").applyOptions({ autoScale: false });
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingVerticalRef.current || !chartRef.current) return;

      const deltaY = e.clientY - lastYRef.current;
      lastYRef.current = e.clientY;

      const priceScale = chartRef.current.priceScale("right");
      const priceRange = priceScale.options();
      const currentMargins = priceRange.scaleMargins ?? { top: 0.1, bottom: 0.1 };

      // Adjust margins to simulate vertical scrolling
      const sensitivity = 0.003;
      const adjustment = deltaY * sensitivity;

      priceScale.applyOptions({
        scaleMargins: {
          top: Math.max(0, Math.min(0.8, (currentMargins.top ?? 0.1) + adjustment)),
          bottom: Math.max(0, Math.min(0.8, (currentMargins.bottom ?? 0.1) - adjustment)),
        },
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        isDraggingVerticalRef.current = false;
      }
    };

    // Ctrl+Scroll for vertical zoom
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey && chartRef.current) {
        e.preventDefault();
        const priceScale = chartRef.current.priceScale("right");

        // Disable auto-scale
        priceScale.applyOptions({ autoScale: false });

        const priceRange = priceScale.options();
        const currentMargins = priceRange.scaleMargins ?? { top: 0.1, bottom: 0.1 };

        // Zoom: scroll up = zoom in (decrease margins), scroll down = zoom out (increase margins)
        const zoomFactor = e.deltaY > 0 ? 0.02 : -0.02;

        priceScale.applyOptions({
          scaleMargins: {
            top: Math.max(0.02, Math.min(0.45, (currentMargins.top ?? 0.1) + zoomFactor)),
            bottom: Math.max(0.02, Math.min(0.45, (currentMargins.bottom ?? 0.1) + zoomFactor)),
          },
        });
      }
    };

    // Prevent context menu on middle click
    const handleContextMenu = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };

    container.addEventListener("mousedown", handleMouseDown);
    container.addEventListener("auxclick", handleContextMenu);
    container.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("auxclick", handleContextMenu);
      container.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

    return (
      <div
        ref={containerRef}
        className={cn("w-full", className)}
        style={{ height }}
      />
    );
  }
);
