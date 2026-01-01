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

export function RSIPane({
  rsiData,
  barsToShow = 50,
  overbought = 70,
  oversold = 30,
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
      return { label: "Overbought", color: "text-red-400" };
    if (currentRSI <= oversold)
      return { label: "Oversold", color: "text-green-400" };
    return { label: "Neutral", color: "text-gray-400" };
  }, [currentRSI, overbought, oversold]);

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
              className={`text-lg font-mono font-semibold ${
                currentRSI >= overbought
                  ? "text-red-400"
                  : currentRSI <= oversold
                    ? "text-green-400"
                    : "text-foreground"
              }`}
            >
              {currentRSI.toFixed(2)}
            </span>
          )}
          {rsiCondition && (
            <span className={`text-xs ${rsiCondition.color}`}>
              {rsiCondition.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="text-red-400/70">OB: {overbought}</span>
          <span className="text-green-400/70">OS: {oversold}</span>
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
          fill="rgba(239, 68, 68, 0.1)"
        />

        {/* Background fill for oversold zone */}
        <rect
          x="0"
          y={priceToY(oversold)}
          width={WIDTH}
          height={priceToY(0) - priceToY(oversold)}
          fill="rgba(34, 197, 94, 0.1)"
        />

        {/* Overbought line (70) */}
        <line
          x1="0"
          y1={priceToY(overbought)}
          x2={WIDTH}
          y2={priceToY(overbought)}
          stroke="rgba(239, 68, 68, 0.5)"
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
          stroke="rgba(34, 197, 94, 0.5)"
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
