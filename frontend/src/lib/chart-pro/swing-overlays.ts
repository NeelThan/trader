/**
 * Swing Line Overlays
 *
 * Generates line overlays for the CandlestickChart that connect
 * pivot points in chronological sequence to visualize swing structure.
 */

import type { Time } from "lightweight-charts";
import type { LineOverlay } from "@/components/trading";
import type { EditablePivot } from "@/hooks/use-editable-pivots";
import type { SwingSettings } from "@/hooks/use-persisted-swing-settings";

/**
 * Color for the swing line
 */
export const SWING_LINE_COLOR = "#eab308"; // Yellow - for swing structure visibility

/**
 * Get numeric timestamp from pivot time
 */
function getTimestamp(time: string | number): number {
  return typeof time === "string" ? new Date(time).getTime() : time;
}

/**
 * Sort pivots by time and index for line drawing
 * Uses index as secondary sort key to handle same-bar pivots
 */
function sortByTimeAndIndex<T extends { time: string | number; index: number }>(pivots: T[]): T[] {
  return [...pivots].sort((a, b) => {
    const timeA = getTimestamp(a.time);
    const timeB = getTimestamp(b.time);
    if (timeA !== timeB) return timeA - timeB;
    // Secondary sort by index for same timestamp
    return a.index - b.index;
  });
}

/**
 * Deduplicate pivots with same timestamp for lightweight-charts
 * When multiple pivots have the same time, keep only one (the first by index)
 */
function deduplicateByTime<T extends { time: string | number }>(pivots: T[]): T[] {
  const seen = new Set<number>();
  return pivots.filter((p) => {
    const ts = getTimestamp(p.time);
    if (seen.has(ts)) return false;
    seen.add(ts);
    return true;
  });
}

/**
 * Convert pivot time to lightweight-charts Time format
 */
function toChartTime(time: string | number): Time {
  if (typeof time === "number") {
    return time as Time;
  }
  // Convert ISO string to date string (YYYY-MM-DD)
  const date = new Date(time);
  return date.toISOString().split("T")[0] as Time;
}

/**
 * Generate line overlays from editable pivots
 *
 * Creates a single line connecting all pivots in chronological sequence:
 * High1 → Low1 → High2 → Low2 → etc.
 */
export function generateSwingLineOverlays(
  pivots: EditablePivot[],
  settings: SwingSettings
): LineOverlay[] {
  if (!settings.showLines || pivots.length < 2) {
    return [];
  }

  // Sort all pivots by time and index, then deduplicate by timestamp
  // (lightweight-charts requires unique, ascending timestamps)
  const sortedPivots = sortByTimeAndIndex(pivots);
  const uniquePivots = deduplicateByTime(sortedPivots);

  if (uniquePivots.length < 2) {
    return [];
  }

  // Create a single line connecting all pivots in sequence
  return [
    {
      data: uniquePivots.map((p) => ({
        time: toChartTime(p.time),
        value: p.price,
      })),
      color: SWING_LINE_COLOR,
      lineWidth: 1,
    },
  ];
}

/**
 * Generate dashed line overlay showing original positions
 * Shows the original swing structure before modifications as a dashed line
 */
export function generateOriginalPivotOverlay(
  pivots: EditablePivot[]
): LineOverlay[] {
  // Only show if there are modifications
  const hasModifications = pivots.some((p) => p.isModified);
  if (!hasModifications || pivots.length < 2) return [];

  // Sort all pivots by time and index, then deduplicate
  const sortedPivots = sortByTimeAndIndex(pivots);
  const uniquePivots = deduplicateByTime(sortedPivots);

  if (uniquePivots.length < 2) return [];

  return [
    {
      data: uniquePivots.map((p) => ({
        time: toChartTime(p.time),
        value: p.originalPrice,
      })),
      color: "#6b7280", // Gray for original positions
      lineWidth: 1,
      lineStyle: 2, // Dashed
    },
  ];
}

/**
 * Combine all swing overlays
 * Includes both current positions and original positions (dashed) for modified pivots
 */
export function generateAllSwingOverlays(
  pivots: EditablePivot[],
  settings: SwingSettings,
  showOriginalOnModified: boolean = false
): LineOverlay[] {
  const mainOverlays = generateSwingLineOverlays(pivots, settings);

  if (showOriginalOnModified) {
    const originalOverlay = generateOriginalPivotOverlay(pivots);
    return [...mainOverlays, ...originalOverlay];
  }

  return mainOverlays;
}
