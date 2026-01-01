"use client";

/**
 * RSI Pane Component
 *
 * Displays RSI (Relative Strength Index) as a line chart with
 * overbought (70) and oversold (30) reference lines.
 */

import { useMemo } from "react";

type RSIPaneProps = {
  rsiData: { rsi: (number | null)[] } | null;
  barsToShow?: number;
  overbought?: number;
  oversold?: number;
  /** Chart colors from global settings */
  chartColors?: { up: string; down: string };
};

// Chart dimensions - constants
const HEIGHT = 80;
const WIDTH = 100;
const PADDING = { top: 5, bottom: 5 };
const CHART_HEIGHT = HEIGHT - PADDING.top - PADDING.bottom;

// RSI is always 0-100, so this is a pure function
function priceToY(value: number): number {
  return PADDING.top + CHART_HEIGHT - (value / 100) * CHART_HEIGHT;
}

// Helper to convert hex to rgba
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function RSIPane({
  rsiData,
  barsToShow = 50,
  overbought = 70,
  oversold = 30,
  chartColors = { up: "#22c55e", down: "#ef4444" },
}: RSIPaneProps) {
  // Get current RSI value for display
  const currentRSI = useMemo(() => {
    if (!rsiData || rsiData.rsi.length === 0) return null;
    const lastValue = rsiData.rsi.filter((v) => v !== null).slice(-1)[0];
    return lastValue ?? null;
  }, [rsiData]);

  // Get RSI values for chart
  const rsiValues = useMemo(() => {
    if (!rsiData) return [];
    return rsiData.rsi.slice(-barsToShow).map((v) => v ?? null);
  }, [rsiData, barsToShow]);

  // Create line path
  const linePath = useMemo(() => {
    if (rsiValues.length === 0) return "";

    const validPoints = rsiValues
      .map((v, i) => (v !== null ? { x: i, y: v } : null))
      .filter((p): p is { x: number; y: number } => p !== null);

    if (validPoints.length < 2) return "";

    const barWidth = WIDTH / rsiValues.length;

    return validPoints
      .map((point, i) => {
        const x = point.x * barWidth + barWidth / 2;
        const y = priceToY(point.y);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [rsiValues]);

  // Determine RSI condition
  const rsiCondition = useMemo(() => {
    if (currentRSI === null) return null;
    if (currentRSI >= overbought)
      return { label: "Overbought", color: chartColors.down };
    if (currentRSI <= oversold)
      return { label: "Oversold", color: chartColors.up };
    return { label: "Neutral", color: undefined };
  }, [currentRSI, overbought, oversold, chartColors]);

  // Early return after all hooks
  if (!rsiData || rsiValues.length === 0) {
    return (
      <div className="text-muted-foreground text-sm">
        Need at least 15 bars to calculate RSI
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* RSI Value Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">RSI(14)</span>
          {currentRSI !== null && (
            <span
              className="text-lg font-mono font-semibold"
              style={{
                color: currentRSI >= overbought
                  ? chartColors.down
                  : currentRSI <= oversold
                    ? chartColors.up
                    : undefined
              }}
            >
              {currentRSI.toFixed(2)}
            </span>
          )}
          {rsiCondition && (
            <span
              className={`text-xs ${!rsiCondition.color ? "text-gray-400" : ""}`}
              style={{ color: rsiCondition.color }}
            >
              {rsiCondition.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span style={{ color: hexToRgba(chartColors.down, 0.7) }}>OB: {overbought}</span>
          <span style={{ color: hexToRgba(chartColors.up, 0.7) }}>OS: {oversold}</span>
        </div>
      </div>

      {/* RSI Chart */}
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-[80px] border border-border rounded"
        preserveAspectRatio="none"
      >
        {/* Background fill for overbought zone */}
        <rect
          x="0"
          y={priceToY(100)}
          width={WIDTH}
          height={priceToY(overbought) - priceToY(100)}
          fill={hexToRgba(chartColors.down, 0.1)}
        />

        {/* Background fill for oversold zone */}
        <rect
          x="0"
          y={priceToY(oversold)}
          width={WIDTH}
          height={priceToY(0) - priceToY(oversold)}
          fill={hexToRgba(chartColors.up, 0.1)}
        />

        {/* Overbought line (70) */}
        <line
          x1="0"
          y1={priceToY(overbought)}
          x2={WIDTH}
          y2={priceToY(overbought)}
          stroke={hexToRgba(chartColors.down, 0.5)}
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />

        {/* Middle line (50) */}
        <line
          x1="0"
          y1={priceToY(50)}
          x2={WIDTH}
          y2={priceToY(50)}
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="0.5"
        />

        {/* Oversold line (30) */}
        <line
          x1="0"
          y1={priceToY(oversold)}
          x2={WIDTH}
          y2={priceToY(oversold)}
          stroke={hexToRgba(chartColors.up, 0.5)}
          strokeWidth="0.5"
          strokeDasharray="2,2"
        />

        {/* RSI line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </div>
  );
}
