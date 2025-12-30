"use client";

/**
 * Hook for pivot point detection and Fibonacci level calculations.
 */

import { useMemo, useCallback, useState } from "react";
import { OHLCData, PriceLine, LineOverlay } from "@/components/trading";
import { LineStyle } from "lightweight-charts";
import {
  PivotPoint,
  FibonacciVisibility,
  RETRACEMENT_RATIOS,
  EXTENSION_RATIOS,
  EXPANSION_RATIOS,
  PROJECTION_RATIOS,
  FIB_COLORS,
} from "@/lib/chart-constants";
import { detectPivotPoints } from "@/lib/market-utils";

export type UsePivotAnalysisReturn = {
  pivotPoints: PivotPoint[];
  recentPivots: PivotPoint[];
  pivotA: PivotPoint | null;
  pivotB: PivotPoint | null;
  pivotC: PivotPoint | null;
  high: number;
  low: number;
  range: number;
  pivotHigh: PivotPoint | null;
  pivotLow: PivotPoint | null;
  priceLines: PriceLine[];
  lineOverlays: LineOverlay[];
  // Manual pivot controls
  useManualPivots: boolean;
  manualHigh: string;
  manualLow: string;
  setUseManualPivots: (value: boolean) => void;
  setManualHigh: (value: string) => void;
  setManualLow: (value: string) => void;
  applyDetectedPivots: () => void;
};

export function usePivotAnalysis(
  data: OHLCData[],
  fibVisibility: FibonacciVisibility,
  showPivots: boolean,
  showPivotLines: boolean,
  upColor: string,
  downColor: string
): UsePivotAnalysisReturn {
  // Manual pivot state
  const [useManualPivots, setUseManualPivots] = useState(false);
  const [manualHigh, setManualHigh] = useState<string>("");
  const [manualLow, setManualLow] = useState<string>("");

  // Detect pivot points
  const pivotPoints = useMemo(() => detectPivotPoints(data, 5), [data]);

  // Get the recent pivot points (last 5) for Fibonacci calculations
  const recentPivots = useMemo(() => {
    if (pivotPoints.length <= 5) return pivotPoints;
    return pivotPoints.slice(-5);
  }, [pivotPoints]);

  // Get A-B-C pivot points for projection (last 3 alternating pivots)
  const { pivotA, pivotB, pivotC } = useMemo(() => {
    if (recentPivots.length < 3) {
      return { pivotA: null, pivotB: null, pivotC: null };
    }
    const lastThree = recentPivots.slice(-3);
    return {
      pivotA: lastThree[0],
      pivotB: lastThree[1],
      pivotC: lastThree[2],
    };
  }, [recentPivots]);

  // Get the high and low from recent pivots for Fibonacci
  const { high, low, pivotHigh, pivotLow } = useMemo(() => {
    if (useManualPivots) {
      const manualHighVal = parseFloat(manualHigh) || 0;
      const manualLowVal = parseFloat(manualLow) || 0;
      return {
        high: manualHighVal || (data.length > 0 ? Math.max(...data.map((d) => d.high)) : 0),
        low: manualLowVal || (data.length > 0 ? Math.min(...data.map((d) => d.low)) : 0),
        pivotHigh: null as PivotPoint | null,
        pivotLow: null as PivotPoint | null,
      };
    }

    const recentHighs = recentPivots.filter((p) => p.type === "high");
    const recentLows = recentPivots.filter((p) => p.type === "low");

    const pivotHigh =
      recentHighs.length > 0
        ? recentHighs.reduce((max, p) => (p.price > max.price ? p : max))
        : null;
    const pivotLow =
      recentLows.length > 0
        ? recentLows.reduce((min, p) => (p.price < min.price ? p : min))
        : null;

    return {
      high: pivotHigh?.price ?? (data.length > 0 ? Math.max(...data.map((d) => d.high)) : 0),
      low: pivotLow?.price ?? (data.length > 0 ? Math.min(...data.map((d) => d.low)) : 0),
      pivotHigh,
      pivotLow,
    };
  }, [data, recentPivots, useManualPivots, manualHigh, manualLow]);

  const range = high - low;

  // Build price lines based on visibility
  const priceLines: PriceLine[] = useMemo(() => {
    const lines: PriceLine[] = [];

    // Add pivot point lines
    if (showPivots && !useManualPivots) {
      pivotPoints.forEach((pivot) => {
        lines.push({
          price: pivot.price,
          color: pivot.type === "high" ? upColor : downColor,
          title: pivot.type === "high" ? "▼ SH" : "▲ SL",
          lineStyle: LineStyle.Dotted,
        });
      });
    }

    // Retracement levels
    if (fibVisibility.retracement) {
      RETRACEMENT_RATIOS.forEach((ratio) => {
        const price = high - range * ratio;
        lines.push({
          price,
          color: FIB_COLORS.retracement[ratio] ?? "#6b7280",
          title: `R ${(ratio * 100).toFixed(2)}%`,
          lineStyle: ratio === 0 || ratio === 1 ? LineStyle.Dotted : LineStyle.Dashed,
        });
      });
    }

    // Extension levels
    if (fibVisibility.extension) {
      EXTENSION_RATIOS.forEach((ratio) => {
        const price = high - range * ratio;
        lines.push({
          price,
          color: FIB_COLORS.extension,
          title: `Ext ${(ratio * 100).toFixed(2)}%`,
          lineStyle: LineStyle.Dashed,
        });
      });
    }

    // Expansion levels
    if (fibVisibility.expansion) {
      EXPANSION_RATIOS.forEach((ratio) => {
        const price = low + range * ratio;
        lines.push({
          price,
          color: FIB_COLORS.expansion,
          title: `Exp ${(ratio * 100).toFixed(2)}%`,
          lineStyle: LineStyle.Dashed,
        });
      });
    }

    // Projection levels (using A-B-C pattern)
    if (fibVisibility.projection && pivotA && pivotB && pivotC) {
      const abRange = Math.abs(pivotB.price - pivotA.price);
      const direction = pivotC.type === "low" ? 1 : -1;

      PROJECTION_RATIOS.forEach((ratio) => {
        const price = pivotC.price + direction * abRange * ratio;
        lines.push({
          price,
          color: FIB_COLORS.projection,
          title: `Proj ${(ratio * 100).toFixed(2)}%`,
          lineStyle: LineStyle.Dashed,
        });
      });
    }

    return lines;
  }, [
    fibVisibility,
    high,
    low,
    range,
    showPivots,
    pivotPoints,
    useManualPivots,
    pivotA,
    pivotB,
    pivotC,
    upColor,
    downColor,
  ]);

  // Build line overlays to connect recent pivot points
  const lineOverlays: LineOverlay[] = useMemo(() => {
    if (!showPivotLines || useManualPivots || recentPivots.length < 2 || data.length === 0) {
      return [];
    }

    const lineData = recentPivots
      .filter((pivot) => pivot.index < data.length)
      .map((pivot) => ({
        time: data[pivot.index].time,
        value: pivot.price,
      }));

    if (lineData.length < 2) return [];

    return [
      {
        data: lineData,
        color: FIB_COLORS.pivotLine,
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
      },
    ];
  }, [showPivotLines, useManualPivots, recentPivots, data]);

  const applyDetectedPivots = useCallback(() => {
    if (pivotHigh) setManualHigh(pivotHigh.price.toFixed(2));
    if (pivotLow) setManualLow(pivotLow.price.toFixed(2));
    setUseManualPivots(true);
  }, [pivotHigh, pivotLow]);

  return {
    pivotPoints,
    recentPivots,
    pivotA,
    pivotB,
    pivotC,
    high,
    low,
    range,
    pivotHigh,
    pivotLow,
    priceLines,
    lineOverlays,
    useManualPivots,
    manualHigh,
    manualLow,
    setUseManualPivots,
    setManualHigh,
    setManualLow,
    applyDetectedPivots,
  };
}
