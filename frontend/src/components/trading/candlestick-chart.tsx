"use client";

import * as React from "react";
import { useRef, useEffect, useCallback, useLayoutEffect, useImperativeHandle, forwardRef, useState, useMemo } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  HistogramSeries,
  CandlestickData,
  BarData,
  LineData,
  HistogramData,
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
  volume?: number;
};

export type PriceLine = {
  price: number;
  color?: string;
  lineWidth?: LineWidth;
  lineStyle?: LineStyle;
  axisLabelVisible?: boolean;
  title?: string;
  /** Timeframe this level belongs to (for left-side label positioning) */
  timeframe?: string;
  /** Strategy type (e.g., "RETRACEMENT", "EXTENSION") for tooltip */
  strategy?: string;
  /** Direction bias ("long" or "short") for marker color */
  direction?: "long" | "short";
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

/** Timeframe order for label positioning (higher TF = more left) */
const TIMEFRAME_ORDER: string[] = ["1M", "1W", "1D", "4H", "1H", "15m", "5m", "3m", "1m"];

/** Get x-position percentage based on timeframe (higher TF = more left) */
function getTimeframeXPosition(timeframe: string): number {
  const index = TIMEFRAME_ORDER.indexOf(timeframe);
  if (index === -1) return 50; // Default to middle if unknown
  // Position from 2% (1M) to 26% (1m) - compact spacing for dot markers
  return 2 + index * 3;
}

export type CandlestickChartProps = {
  data: OHLCData[];
  priceLines?: PriceLine[];
  lineOverlays?: LineOverlay[];
  markers?: ChartMarker[];
  chartType?: ChartType;
  width?: number;
  height?: number;
  autoSize?: boolean;
  /** Fill container height (use 100% height instead of fixed) */
  fillContainer?: boolean;
  theme?: "light" | "dark";
  upColor?: string;
  downColor?: string;
  className?: string;
  onCrosshairMove?: (price: number | null, time: Time | null) => void;
  onLoadMore?: (oldestTime: Time) => void; // Called when user scrolls to start of data
  /** Show Fib labels on left side of chart instead of price axis */
  showLeftSideLabels?: boolean;
  /** Show volume bars below the price chart */
  showVolume?: boolean;
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
      fillContainer = false,
      theme = "dark",
      upColor = "#22c55e",
      downColor = "#ef4444",
      className,
      onCrosshairMove,
      onLoadMore,
      showLeftSideLabels = false,
      showVolume = false,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Bar"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const lineSeriesRef = useRef<ISeriesApi<"Line">[]>([]);
    const priceLinesRef = useRef<IPriceLine[]>([]);
    const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
    const hasInitializedRef = useRef(false);

    // State for left-side label positions (y-coordinates)
    const [labelPositions, setLabelPositions] = useState<Map<number, number>>(new Map());

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
  const showVolumeRef = useRef(showVolume);

  // Update refs in layout effect (runs synchronously before paint)
  useIsomorphicLayoutEffect(() => {
    dataRef.current = data;
    priceLinesPropsRef.current = priceLines;
    lineOverlaysRef.current = lineOverlays;
    markersPropsRef.current = markers;
    onCrosshairMoveRef.current = onCrosshairMove;
    onLoadMoreRef.current = onLoadMore;
    showVolumeRef.current = showVolume;
  });

  // Create chart on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const themeOptions = theme === "dark" ? DARK_THEME : LIGHT_THEME;

    const effectiveHeight = fillContainer
      ? containerRef.current.clientHeight || height
      : height;

    const chart = createChart(containerRef.current, {
      width: width ?? containerRef.current.clientWidth,
      height: effectiveHeight,
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

    // Add volume series if enabled and data has volume
    if (showVolumeRef.current && dataRef.current.some(d => d.volume !== undefined && d.volume !== null)) {
      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'volume',
        priceLineVisible: false,
        lastValueVisible: false,
      });

      // Configure volume price scale (separate from main price)
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.85, // Volume in bottom 15% of chart
          bottom: 0,
        },
        borderVisible: false,
      });

      // Set volume data with colors based on price direction
      const cleanedData = deduplicateAndSort(dataRef.current);
      const volumeData: HistogramData[] = cleanedData
        .filter(d => d.volume !== undefined && d.volume !== null)
        .map(d => ({
          time: d.time,
          value: d.volume as number,
          color: d.close >= d.open ? upColor + '80' : downColor + '80', // 50% opacity
        }));

      if (volumeData.length > 0) {
        volumeSeries.setData(volumeData);
      }

      volumeSeriesRef.current = volumeSeries;
    }

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
      volumeSeriesRef.current = null;
      priceLinesRef.current = [];
      lineSeriesRef.current = [];
      markersPluginRef.current = null;
      hasInitializedRef.current = false; // Reset so new chart fits content
    };
  }, [theme, height, width, upColor, downColor, chartType, showVolume]);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;
    const cleanedData = deduplicateAndSort(data);
    const chartData =
      chartType === "heikin-ashi" ? calculateHeikinAshi(cleanedData) : cleanedData;
    seriesRef.current.setData(chartData as (CandlestickData | BarData)[]);

    // Update volume data if volume series exists
    if (volumeSeriesRef.current) {
      const volumeData: HistogramData[] = cleanedData
        .filter(d => d.volume !== undefined && d.volume !== null)
        .map(d => ({
          time: d.time,
          value: d.volume as number,
          color: d.close >= d.open ? upColor + '80' : downColor + '80', // 50% opacity
        }));

      if (volumeData.length > 0) {
        volumeSeriesRef.current.setData(volumeData);
      }
    }

    // Reset loading flag so we can load more again
    isLoadingMoreRef.current = false;

    // Only fit content on first data load, preserve user's zoom/pan on refreshes
    if (!hasInitializedRef.current) {
      chartRef.current?.timeScale().fitContent();
      hasInitializedRef.current = true;
    }
  }, [data, chartType, upColor, downColor]);

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
    const effectiveHeight = fillContainer
      ? containerRef.current.clientHeight || height
      : height;
    chartRef.current.resize(containerRef.current.clientWidth, effectiveHeight);
  }, [autoSize, fillContainer, height]);

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

  // Update label positions for left-side rendering
  useEffect(() => {
    if (!showLeftSideLabels || !seriesRef.current || priceLines.length === 0) {
      setLabelPositions(new Map());
      return;
    }

    const updatePositions = () => {
      const series = seriesRef.current;
      if (!series) return;

      const newPositions = new Map<number, number>();
      priceLines.forEach((line, index) => {
        // Use priceToCoordinate to get Y pixel position
        const y = series.priceToCoordinate(line.price);
        if (y !== null) {
          newPositions.set(index, y);
        }
      });
      setLabelPositions(newPositions);
    };

    // Update immediately
    updatePositions();

    // Subscribe to visible range changes to update positions on pan/zoom
    const chart = chartRef.current;
    if (chart) {
      const timeScale = chart.timeScale();
      timeScale.subscribeVisibleLogicalRangeChange(updatePositions);
      return () => {
        timeScale.unsubscribeVisibleLogicalRangeChange(updatePositions);
      };
    }
  }, [showLeftSideLabels, priceLines]);

  // Flatten all labels with positions for rendering
  const allMarkers = useMemo(() => {
    if (!showLeftSideLabels) return [];

    const markers: Array<{ index: number; line: PriceLine; y: number; xPercent: number }> = [];
    priceLines.forEach((line, index) => {
      const y = labelPositions.get(index);
      if (y === undefined || !line.timeframe) return;

      const xPercent = getTimeframeXPosition(line.timeframe);
      markers.push({ index, line, y, xPercent });
    });

    return markers;
  }, [showLeftSideLabels, priceLines, labelPositions]);

  // State for hovered marker tooltip
  const [hoveredMarker, setHoveredMarker] = useState<{ index: number; x: number; y: number } | null>(null);

  // Format price for display
  const formatLevelPrice = useCallback((price: number) => {
    if (price >= 10000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
    if (price >= 100) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(5);
  }, []);

    return (
      <div
        ref={containerRef}
        className={cn("w-full relative", fillContainer && "h-full", className)}
        style={fillContainer ? undefined : { height }}
      >
        {/* Left-side Fib markers overlay - pointer-events-none on container, auto on markers */}
        {showLeftSideLabels && allMarkers.length > 0 && (
          <div className="absolute inset-0 overflow-hidden z-10 pointer-events-none">
            {allMarkers.map(({ index, line, y, xPercent }) => {
              const isLong = line.direction === "long";
              const markerColor = isLong ? "#3b82f6" : "#ef4444"; // blue for support/buy, red for resistance/sell

              return (
                <div
                  key={`marker-${index}`}
                  className="absolute cursor-pointer pointer-events-auto group p-2 -m-2"
                  style={{
                    left: `${xPercent}%`,
                    top: y,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const containerRect = containerRef.current?.getBoundingClientRect();
                    if (containerRect) {
                      setHoveredMarker({
                        index,
                        x: rect.left - containerRect.left + rect.width / 2,
                        y: rect.top - containerRect.top,
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredMarker(null)}
                >
                  {/* Small marker dot with larger hover area */}
                  <div
                    className="w-2 h-2 rounded-full border border-white/50 shadow-sm transition-transform group-hover:scale-150 pointer-events-none"
                    style={{ backgroundColor: markerColor }}
                  />
                </div>
              );
            })}

            {/* Tooltip for hovered marker */}
            {hoveredMarker && (() => {
              const marker = allMarkers.find(m => m.index === hoveredMarker.index);
              if (!marker) return null;
              const { line } = marker;
              const isLong = line.direction === "long";

              // Tooltip positioning with boundary detection
              const TOOLTIP_WIDTH = 200; // Tooltip width (includes padding)
              const TOOLTIP_HEIGHT = 80; // Estimated tooltip height
              const TOOLTIP_PADDING = 8; // Padding from edges

              // Get container dimensions
              const containerWidth = containerRef.current?.clientWidth || 800;
              const containerHeight = containerRef.current?.clientHeight || 600;

              // Horizontal boundary detection - clamp to keep tooltip visible
              const tooltipHalfWidth = TOOLTIP_WIDTH / 2;
              const minLeft = tooltipHalfWidth + TOOLTIP_PADDING;
              const maxLeft = containerWidth - tooltipHalfWidth - TOOLTIP_PADDING;
              const clampedX = Math.max(minLeft, Math.min(maxLeft, hoveredMarker.x));

              // Calculate arrow horizontal offset
              const arrowOffsetX = hoveredMarker.x - clampedX;

              // Vertical boundary detection - show below marker if too close to top
              const showBelow = hoveredMarker.y < TOOLTIP_HEIGHT + TOOLTIP_PADDING;

              return (
                <div
                  className="absolute z-20 pointer-events-none"
                  style={{
                    left: clampedX,
                    top: showBelow ? hoveredMarker.y + 16 : hoveredMarker.y - 8,
                    transform: showBelow ? "translate(-50%, 0)" : "translate(-50%, -100%)",
                  }}
                >
                  {/* Arrow on top when tooltip is below marker */}
                  {showBelow && (
                    <div
                      className="absolute w-0 h-0"
                      style={{
                        top: 0,
                        left: `calc(50% + ${arrowOffsetX}px)`,
                        transform: "translate(-50%, -100%)",
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderBottom: "6px solid hsl(var(--border))",
                      }}
                    />
                  )}
                  <div className="bg-popover border border-border rounded-md shadow-lg px-3 py-2 text-xs whitespace-nowrap">
                    {/* Header with timeframe and direction */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-muted-foreground">{line.timeframe}</span>
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          backgroundColor: isLong ? "rgba(59, 130, 246, 0.2)" : "rgba(239, 68, 68, 0.2)",
                          color: isLong ? "#3b82f6" : "#ef4444",
                        }}
                      >
                        {isLong ? "SUPPORT" : "RESISTANCE"}
                      </span>
                    </div>
                    {/* Strategy and ratio */}
                    <div className="text-foreground font-medium">
                      {line.strategy && <span className="mr-1">{line.strategy}</span>}
                      {line.title}
                    </div>
                    {/* Price - prominent */}
                    <div className="text-sm font-bold mt-1" style={{ color: isLong ? "#3b82f6" : "#ef4444" }}>
                      {formatLevelPrice(line.price)}
                    </div>
                  </div>
                  {/* Arrow on bottom when tooltip is above marker */}
                  {!showBelow && (
                    <div
                      className="absolute w-0 h-0"
                      style={{
                        left: `calc(50% + ${arrowOffsetX}px)`,
                        transform: "translateX(-50%)",
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "6px solid hsl(var(--border))",
                      }}
                    />
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }
);
