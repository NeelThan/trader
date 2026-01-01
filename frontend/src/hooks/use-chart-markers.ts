"use client";

/**
 * Hook for generating chart markers from swing detection results.
 *
 * Converts swing markers to chart markers, filtering to only include
 * markers with times that exist in the market data. Also incorporates
 * ABC labels from editable pivots when available.
 */

import { useMemo } from "react";
import type { Time } from "lightweight-charts";
import type { ChartMarker } from "@/components/trading";
import type { SwingMarker } from "@/hooks/use-swing-markers";
import type { EditablePivot } from "@/hooks/use-editable-pivots";

export type UseChartMarkersOptions = {
  /** Whether swing detection is enabled */
  swingEnabled: boolean;
  /** Swing detection result markers */
  markers: SwingMarker[] | undefined;
  /** Market data bars (used to filter valid marker times) */
  marketData: Array<{ time: Time }>;
  /** Editable pivots for ABC labels */
  editablePivots: EditablePivot[];
};

/**
 * Determine marker color based on swing type and ABC label
 */
function getMarkerColor(
  swingType: SwingMarker["swingType"],
  hasAbcLabel: boolean
): string {
  if (hasAbcLabel) {
    return "#22c55e"; // Green for ABC
  }
  const isBullish = swingType === "HH" || swingType === "HL";
  return isBullish ? "#3b82f6" : "#ef4444"; // Blue for bullish, Red for bearish
}

/**
 * Hook that generates chart markers from swing detection results
 */
export function useChartMarkers({
  swingEnabled,
  markers,
  marketData,
  editablePivots,
}: UseChartMarkersOptions): ChartMarker[] {
  return useMemo<ChartMarker[]>(() => {
    if (!swingEnabled || !markers || marketData.length === 0) {
      return [];
    }

    // Create a Set of valid times from market data for fast lookup
    const validTimes = new Set(marketData.map((bar) => String(bar.time)));

    // Filter markers to only those with valid times in current market data
    const validMarkers = markers.filter((marker) =>
      validTimes.has(String(marker.time))
    );

    return validMarkers.map((marker) => {
      // Determine position based on swing type
      const isHigh = marker.swingType === "HH" || marker.swingType === "LH";

      // Find matching editable pivot to get ABC label
      const matchingPivot = editablePivots.find(
        (p) => p.index === marker.index
      );
      const abcLabel = matchingPivot?.abcLabel;

      // Build marker text: ABC with swing type, or just swing type
      const text = abcLabel
        ? `${abcLabel} (${marker.swingType})`
        : marker.swingType;

      return {
        time: marker.time,
        position: isHigh ? "aboveBar" : "belowBar",
        color: getMarkerColor(marker.swingType, !!abcLabel),
        shape: isHigh ? "arrowDown" : "arrowUp",
        text,
        size: 1,
      } as ChartMarker;
    });
  }, [swingEnabled, markers, marketData, editablePivots]);
}
