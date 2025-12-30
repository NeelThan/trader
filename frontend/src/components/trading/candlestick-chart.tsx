"use client";

import * as React from "react";
import { useRef, useEffect, useCallback } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickSeries,
  CandlestickData,
  Time,
  IPriceLine,
  DeepPartial,
  ChartOptions,
  CandlestickStyleOptions,
  SeriesOptionsCommon,
  LineWidth,
  LineStyle,
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

export type CandlestickChartProps = {
  data: OHLCData[];
  priceLines?: PriceLine[];
  width?: number;
  height?: number;
  autoSize?: boolean;
  theme?: "light" | "dark";
  upColor?: string;
  downColor?: string;
  className?: string;
  onCrosshairMove?: (price: number | null, time: Time | null) => void;
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

export function CandlestickChart({
  data,
  priceLines = [],
  width,
  height = 400,
  autoSize = true,
  theme = "dark",
  upColor = "#22c55e",
  downColor = "#ef4444",
  className,
  onCrosshairMove,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);

  // Create chart on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const themeOptions = theme === "dark" ? DARK_THEME : LIGHT_THEME;

    const chart = createChart(containerRef.current, {
      width: width ?? containerRef.current.clientWidth,
      height,
      ...themeOptions,
      crosshair: {
        mode: 1, // CrosshairMode.Normal
      },
      timeScale: {
        ...themeOptions.timeScale,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const seriesOptions: DeepPartial<
      CandlestickStyleOptions & SeriesOptionsCommon
    > = {
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
    };

    const series = chart.addSeries(CandlestickSeries, seriesOptions);

    chartRef.current = chart;
    seriesRef.current = series;

    // Handle crosshair move
    if (onCrosshairMove) {
      chart.subscribeCrosshairMove((param) => {
        if (!param.time || !param.point) {
          onCrosshairMove(null, null);
          return;
        }
        const data = param.seriesData.get(series) as CandlestickData | undefined;
        onCrosshairMove(data?.close ?? null, param.time);
      });
    }

    // Cleanup
    return () => {
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, [theme, height, width, upColor, downColor, onCrosshairMove]);

  // Update data when it changes
  useEffect(() => {
    if (!seriesRef.current || data.length === 0) return;
    seriesRef.current.setData(data as CandlestickData[]);
    chartRef.current?.timeScale().fitContent();
  }, [data]);

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

  // Handle resize with ResizeObserver
  const handleResize = useCallback(() => {
    if (!containerRef.current || !chartRef.current || !autoSize) return;
    chartRef.current.resize(
      containerRef.current.clientWidth,
      height
    );
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
