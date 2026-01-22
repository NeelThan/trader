/**
 * Swing Line Overlays
 *
 * Generates line overlays for the CandlestickChart that connect
 * pivot points in chronological sequence to visualize swing structure.
 * Also provides trend line overlays connecting HH/LL points separately.
 */

import type { Time } from "lightweight-charts";
import type { LineOverlay } from "@/components/trading";
import type { EditablePivot } from "@/hooks/use-editable-pivots";
import type { SwingSettings } from "@/hooks/use-persisted-swing-settings";
import { getTimestamp } from "@/lib/format-utils";

/**
 * Color for the swing line
 */
export const SWING_LINE_COLOR = "#eab308"; // Yellow - for swing structure visibility

/**
 * Colors for trend lines
 */
export const TREND_LINE_COLORS = {
  upper: "#22c55e", // Green for HH (resistance trend)
  lower: "#ef4444", // Red for LL (support trend)
  break: "#f59e0b", // Amber for break markers
} as const;

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
function toChartTime(time: string | number | Time): Time {
  if (typeof time === "number") {
    return time as Time;
  }
  if (typeof time === "string") {
    // Convert ISO string to date string (YYYY-MM-DD)
    const date = new Date(time);
    return date.toISOString().split("T")[0] as Time;
  }
  // Already a Time (BusinessDay) - return as-is
  return time;
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

// --- Trend Line Types and Functions ---

/**
 * Point on a trend line
 */
export type TrendLinePoint = {
  index: number;
  price: number;
  time: string | number;
};

/**
 * Trend line data from backend
 */
export type TrendLineData = {
  swing_type: "HH" | "LL";
  points: TrendLinePoint[];
  slope: number;
  intercept: number;
  is_valid: boolean;
};

/**
 * Trend line break data from backend
 */
export type TrendLineBreak = {
  line_type: "HH" | "LL";
  break_index: number;
  break_price: number;
  break_time: string | number | null;
  break_direction: "above" | "below";
};

// --- Pattern Classification Types ---

/**
 * Pattern type classification
 */
export type PatternType =
  | "rising_wedge"
  | "falling_wedge"
  | "expanding"
  | "parallel_channel"
  | "no_pattern";

/**
 * Reversal bias based on pattern
 */
export type ReversalBias = "bullish" | "bearish" | "neutral";

/**
 * Reversal signal type
 */
export type SignalType =
  | "wedge_squeeze"
  | "channel_break"
  | "slope_divergence"
  | "apex_reached"
  | "failed_test";

/**
 * Signal direction
 */
export type SignalDirection = "bullish" | "bearish";

/**
 * Channel pattern classification data
 */
export type ChannelPatternData = {
  pattern_type: PatternType;
  reversal_bias: ReversalBias;
  confidence: number;
  bars_to_apex: number | null;
  channel_width: number;
  width_change_rate: number;
  upper_slope: number | null;
  lower_slope: number | null;
};

/**
 * Reversal signal data
 */
export type ReversalSignalData = {
  signal_type: SignalType;
  direction: SignalDirection;
  strength: number;
  trigger_price: number | null;
  bar_index: number;
  explanation: string;
};

/**
 * Full trend lines result from backend
 */
export type TrendLinesResult = {
  upper_line: TrendLineData | null;
  lower_line: TrendLineData | null;
  breaks: TrendLineBreak[];
  current_position: "above_upper" | "in_channel" | "below_lower" | "no_channel";
  pattern: ChannelPatternData | null;
  signals: ReversalSignalData[];
};

/**
 * Calculate the trend line value at a specific index
 */
function getTrendLineValue(line: TrendLineData, index: number): number {
  return line.intercept + line.slope * index;
}

/**
 * Generate a single trend line overlay
 */
function generateSingleTrendLineOverlay(
  line: TrendLineData,
  color: string
): LineOverlay | null {
  if (!line.is_valid || line.points.length < 2) {
    return null;
  }

  // Create data points for the line
  const dataPoints: Array<{ time: Time; value: number }> = [];

  // Add actual pivot points
  for (const point of line.points) {
    dataPoints.push({
      time: toChartTime(point.time),
      value: point.price,
    });
  }

  // Sort by time to ensure correct order
  dataPoints.sort((a, b) => {
    const getTimeValue = (t: Time): number => {
      if (typeof t === "number") return t;
      if (typeof t === "string") return new Date(t).getTime();
      // BusinessDay object
      return new Date(t.year, t.month - 1, t.day).getTime();
    };
    return getTimeValue(a.time) - getTimeValue(b.time);
  });

  return {
    data: dataPoints,
    color,
    lineWidth: 2,
    lineStyle: 0, // Solid
  };
}

/**
 * Generate projected extension of a trend line (dashed)
 */
function generateTrendLineProjection(
  line: TrendLineData,
  color: string,
  marketData: Array<{ time: Time }>,
  projectBars: number = 20
): LineOverlay | null {
  if (!line.is_valid || line.points.length < 2 || marketData.length === 0) {
    return null;
  }

  // Get the last actual data point index
  const lastDataIndex = marketData.length - 1;

  // Get the last trend line point
  const lastTrendPoint = line.points[line.points.length - 1];

  // If trend line doesn't extend to current data, return null
  if (lastTrendPoint.index > lastDataIndex) {
    return null;
  }

  // Calculate projected points
  // Start from the last trend line point and extend forward
  const startValue = getTrendLineValue(line, lastTrendPoint.index);

  // We need time values - use the last available time and project forward
  const lastTime = marketData[lastDataIndex].time;
  const lastTrendTime = lastTrendPoint.time;

  return {
    data: [
      { time: toChartTime(lastTrendTime), value: startValue },
      // For projection, we'd need future time values
      // For now, just show extension to current bar
      { time: toChartTime(lastTime), value: getTrendLineValue(line, lastDataIndex) },
    ],
    color,
    lineWidth: 1,
    lineStyle: 2, // Dashed
  };
}

/**
 * Generate trend line overlays from trend lines result
 *
 * Creates separate lines for:
 * - Upper (HH) trend line (green, solid)
 * - Lower (LL) trend line (red, solid)
 * - Projections (same colors, dashed)
 */
export function generateTrendLineOverlays(
  trendLines: TrendLinesResult | null,
  marketData: Array<{ time: Time }> = [],
  projectBars: number = 20
): LineOverlay[] {
  if (!trendLines) {
    return [];
  }

  const overlays: LineOverlay[] = [];

  // Generate upper (HH) trend line
  if (trendLines.upper_line) {
    const upperLine = generateSingleTrendLineOverlay(
      trendLines.upper_line,
      TREND_LINE_COLORS.upper
    );
    if (upperLine) {
      overlays.push(upperLine);
    }

    // Add projection
    const upperProjection = generateTrendLineProjection(
      trendLines.upper_line,
      TREND_LINE_COLORS.upper,
      marketData,
      projectBars
    );
    if (upperProjection) {
      overlays.push(upperProjection);
    }
  }

  // Generate lower (LL) trend line
  if (trendLines.lower_line) {
    const lowerLine = generateSingleTrendLineOverlay(
      trendLines.lower_line,
      TREND_LINE_COLORS.lower
    );
    if (lowerLine) {
      overlays.push(lowerLine);
    }

    // Add projection
    const lowerProjection = generateTrendLineProjection(
      trendLines.lower_line,
      TREND_LINE_COLORS.lower,
      marketData,
      projectBars
    );
    if (lowerProjection) {
      overlays.push(lowerProjection);
    }
  }

  return overlays;
}
