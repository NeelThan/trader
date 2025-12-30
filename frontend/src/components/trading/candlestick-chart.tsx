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

export type ChartType = "candlestick" | "bar" | "heikin-ashi";

export type CandlestickChartProps = {
  data: OHLCData[];
  priceLines?: PriceLine[];
  lineOverlays?: LineOverlay[];
  chartType?: ChartType;
  width?: number;
  height?: number;
  autoSize?: boolean;
  theme?: "light" | "dark";
  upColor?: string;
  downColor?: string;
  className?: string;
  onCrosshairMove?: (price: number | null, time: Time | null) => void;
};

export type CandlestickChartHandle = {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
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
      chartType = "candlestick",
      width,
      height = 400,
      autoSize = true,
      theme = "dark",
      upColor = "#22c55e",
      downColor = "#ef4444",
      className,
      onCrosshairMove,
    },
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | ISeriesApi<"Bar"> | null>(null);
    const lineSeriesRef = useRef<ISeriesApi<"Line">[]>([]);
    const priceLinesRef = useRef<IPriceLine[]>([]);

    // Expose chart control methods via ref
    useImperativeHandle(ref, () => ({
      resetView: () => {
        chartRef.current?.timeScale().fitContent();
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
    }));

  // Store latest data/priceLines/lineOverlays in refs for access in chart creation effect
  const dataRef = useRef(data);
  const priceLinesPropsRef = useRef(priceLines);
  const lineOverlaysRef = useRef(lineOverlays);

  // Update refs in layout effect (runs synchronously before paint)
  useIsomorphicLayoutEffect(() => {
    dataRef.current = data;
    priceLinesPropsRef.current = priceLines;
    lineOverlaysRef.current = lineOverlays;
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
      const chartData =
        chartType === "heikin-ashi"
          ? calculateHeikinAshi(dataRef.current)
          : dataRef.current;
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

    // Handle crosshair move
    if (onCrosshairMove) {
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.point) {
          onCrosshairMove(null, null);
          return;
        }
        const seriesData = param.seriesData.get(series) as
          | CandlestickData
          | undefined;
        onCrosshairMove(seriesData?.close ?? null, param.time);
      });
    }

    // Cleanup
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
      lineSeriesRef.current = [];
    };
  }, [theme, height, width, upColor, downColor, chartType, onCrosshairMove]);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;
    const chartData =
      chartType === "heikin-ashi" ? calculateHeikinAshi(data) : data;
    seriesRef.current.setData(chartData as (CandlestickData | BarData)[]);
    chartRef.current?.timeScale().fitContent();
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

    return (
      <div
        ref={containerRef}
        className={cn("w-full", className)}
        style={{ height }}
      />
    );
  }
);
