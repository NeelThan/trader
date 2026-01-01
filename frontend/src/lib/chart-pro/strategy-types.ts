/**
 * Strategy Types for Chart Pro
 *
 * Defines types for multi-timeframe, multi-strategy level aggregation
 * with granular visibility controls.
 *
 * Hierarchy: Timeframe → Strategy → Direction → Ratio/Level
 */

import type { Timeframe } from "@/lib/chart-constants";
import type { Time } from "lightweight-charts";

/**
 * Strategy sources for level calculation
 */
export type StrategySource =
  | "RETRACEMENT"
  | "EXTENSION"
  | "PROJECTION"
  | "EXPANSION"
  | "HARMONIC"
  | "SIGNAL";

/**
 * Level type classification
 */
export type LevelType =
  | "retracement"
  | "extension"
  | "projection"
  | "expansion"
  | "support"
  | "resistance"
  | "harmonic_prz"; // Potential Reversal Zone

/**
 * Trade direction
 */
export type LevelDirection = "long" | "short";

/**
 * Standard Fibonacci ratios for each strategy
 * These MUST match the backend enums in fibonacci.py
 */
export const FIBONACCI_RATIOS: Record<StrategySource, number[]> = {
  // Backend: FibonacciLevel enum - 0.382, 0.5, 0.618, 0.786
  RETRACEMENT: [0.382, 0.5, 0.618, 0.786],
  // Backend: ExtensionLevel enum - 1.272, 1.618, 2.618
  EXTENSION: [1.272, 1.618, 2.618],
  // Backend: ProjectionLevel enum - 0.618, 0.786, 1.0, 1.272, 1.618
  PROJECTION: [0.618, 0.786, 1.0, 1.272, 1.618],
  // Backend: ExpansionLevel enum - 0.382, 0.5, 0.618, 1.0, 1.618
  EXPANSION: [0.382, 0.5, 0.618, 1.0, 1.618],
  HARMONIC: [0.786, 0.886], // Common PRZ levels
  SIGNAL: [], // Signal levels don't use ratios
};

/**
 * A single strategy level from any source
 */
export type StrategyLevel = {
  /** Unique identifier for this level */
  id: string;
  /** Price level */
  price: number;
  /** Timeframe this level was calculated from */
  timeframe: Timeframe;
  /** Source strategy that generated this level */
  strategy: StrategySource;
  /** Type of level */
  type: LevelType;
  /** Trade direction bias */
  direction: LevelDirection;
  /** Fibonacci ratio (e.g., 0.618) or pattern ratio if applicable */
  ratio: number;
  /** Label to display (e.g., "R61.8%", "EXT 1.618") */
  label: string;
  /** Whether this level is currently visible on chart */
  visible: boolean;
  /** Heat score 0-100 based on confluence with other levels */
  heat: number;
  /** Time/date when pivot was detected (for display) */
  pivotTime?: Time;
  /** Pivot high price used in calculation */
  pivotHigh?: number;
  /** Pivot low price used in calculation */
  pivotLow?: number;
  /** Point A price (for projection/expansion) */
  pointA?: number;
  /** Point B price (for projection/expansion) */
  pointB?: number;
  /** Point C price (for projection) */
  pointC?: number;
};

/**
 * Visibility settings for a specific strategy+direction+ratio combination
 */
export type RatioVisibility = {
  ratio: number;
  visible: boolean;
};

/**
 * Visibility settings for a strategy under a direction
 */
export type DirectionSettings = {
  enabled: boolean;
  ratios: RatioVisibility[];
};

/**
 * Visibility settings for a strategy under a timeframe
 */
export type StrategySettings = {
  strategy: StrategySource;
  long: DirectionSettings;
  short: DirectionSettings;
};

/**
 * Visibility settings for a timeframe
 */
export type TimeframeSettings = {
  timeframe: Timeframe;
  enabled: boolean;
  strategies: StrategySettings[];
};

/**
 * Complete visibility configuration
 */
export type VisibilityConfig = {
  timeframes: TimeframeSettings[];
};

/**
 * Grouped levels by timeframe
 */
export type TimeframeLevels = {
  timeframe: Timeframe;
  levels: StrategyLevel[];
  pivotHigh: number | null;
  pivotLow: number | null;
};

/**
 * Multi-timeframe level aggregation result
 */
export type MultiTFLevelsResult = {
  /** All levels from all timeframes */
  allLevels: StrategyLevel[];
  /** Levels grouped by timeframe */
  byTimeframe: TimeframeLevels[];
  /** Unique levels after deduplication (within tolerance) */
  uniqueLevels: StrategyLevel[];
  /** Loading state for each timeframe */
  loadingStates: Record<Timeframe, boolean>;
  /** Error state for each timeframe */
  errors: Record<Timeframe, string | null>;
};

/**
 * Generate a unique ID for a strategy level
 */
export function generateLevelId(
  timeframe: Timeframe,
  strategy: StrategySource,
  direction: LevelDirection,
  ratio: number,
  price: number
): string {
  return `${timeframe}-${strategy}-${direction}-${ratio}-${price.toFixed(2)}`;
}

/**
 * Calculate heat score based on how many levels are within tolerance
 */
export function calculateHeat(
  level: StrategyLevel,
  allLevels: StrategyLevel[],
  tolerancePercent: number = 0.5
): number {
  const tolerance = level.price * (tolerancePercent / 100);
  const nearbyLevels = allLevels.filter(
    (other) =>
      other.id !== level.id &&
      Math.abs(other.price - level.price) <= tolerance
  );

  // Base heat from number of nearby levels (max 5 for 100%)
  const baseHeat = Math.min(nearbyLevels.length * 20, 100);

  // Bonus for different timeframes
  const uniqueTimeframes = new Set(nearbyLevels.map((l) => l.timeframe)).size;
  const tfBonus = Math.min(uniqueTimeframes * 10, 30);

  // Bonus for different strategies
  const uniqueStrategies = new Set(nearbyLevels.map((l) => l.strategy)).size;
  const stratBonus = Math.min(uniqueStrategies * 10, 30);

  return Math.min(baseHeat + tfBonus + stratBonus, 100);
}

/**
 * Format a ratio as a display label
 */
export function formatRatioLabel(
  strategy: StrategySource,
  ratio: number
): string {
  const ratioPercent = (ratio * 100).toFixed(1);

  switch (strategy) {
    case "RETRACEMENT":
      return `R${ratioPercent}%`;
    case "EXTENSION":
      return `EXT ${ratio.toFixed(3)}`;
    case "PROJECTION":
      return `PRJ ${ratio.toFixed(3)}`;
    case "EXPANSION":
      return `EXP ${ratio.toFixed(3)}`;
    case "HARMONIC":
      return `PRZ ${ratioPercent}%`;
    case "SIGNAL":
      return `SIG`;
    default:
      return `${ratioPercent}%`;
  }
}

/**
 * Create default visibility config for a set of timeframes
 */
export function createDefaultVisibilityConfig(
  timeframes: Timeframe[],
  strategies: StrategySource[] = ["RETRACEMENT", "EXTENSION"]
): VisibilityConfig {
  return {
    timeframes: timeframes.map((tf) => ({
      timeframe: tf,
      enabled: false, // Start with all disabled
      strategies: strategies.map((strategy) => ({
        strategy,
        long: {
          enabled: false,
          ratios: FIBONACCI_RATIOS[strategy].map((ratio) => ({
            ratio,
            visible: true, // Default all ratios visible when direction is enabled
          })),
        },
        short: {
          enabled: false,
          ratios: FIBONACCI_RATIOS[strategy].map((ratio) => ({
            ratio,
            visible: true,
          })),
        },
      })),
    })),
  };
}

/**
 * Check if a level should be visible based on visibility config
 */
export function isLevelVisible(
  level: StrategyLevel,
  config: VisibilityConfig
): boolean {
  const tfConfig = config.timeframes.find((tf) => tf.timeframe === level.timeframe);
  if (!tfConfig || !tfConfig.enabled) return false;

  const stratConfig = tfConfig.strategies.find((s) => s.strategy === level.strategy);
  if (!stratConfig) return false;

  const dirConfig = level.direction === "long" ? stratConfig.long : stratConfig.short;
  if (!dirConfig.enabled) return false;

  // Use tolerance-based comparison for floating point ratios
  const EPSILON = 0.0001;
  const ratioConfig = dirConfig.ratios.find(
    (r) => Math.abs(r.ratio - level.ratio) < EPSILON
  );
  return ratioConfig?.visible ?? false;
}

/**
 * Count visible levels for a visibility config
 */
export function countVisibleLevels(
  levels: StrategyLevel[],
  config: VisibilityConfig
): number {
  return levels.filter((level) => isLevelVisible(level, config)).length;
}

/**
 * Default enabled strategies
 */
export const DEFAULT_ENABLED_STRATEGIES: StrategySource[] = [
  "RETRACEMENT",
  "EXTENSION",
];

/**
 * All available strategies
 */
export const ALL_STRATEGIES: StrategySource[] = [
  "RETRACEMENT",
  "EXTENSION",
  "PROJECTION",
  "EXPANSION",
];

/**
 * All available timeframes
 */
export const ALL_TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "1m"];

/**
 * Default enabled timeframes for multi-TF analysis
 */
export const DEFAULT_ENABLED_TIMEFRAMES: Timeframe[] = ["1D"];

/**
 * Color palette for different timeframes (used in "distinct" theme)
 */
export const TIMEFRAME_COLORS: Record<Timeframe, string> = {
  "1M": "#f43f5e", // rose
  "1W": "#f97316", // orange
  "1D": "#eab308", // yellow
  "4H": "#22c55e", // green
  "1H": "#3b82f6", // blue
  "15m": "#8b5cf6", // violet
  "1m": "#ec4899", // pink
};

/**
 * Color palette for different strategies
 */
export const STRATEGY_COLORS: Record<StrategySource, string> = {
  RETRACEMENT: "#3b82f6", // blue
  EXTENSION: "#22c55e", // green
  PROJECTION: "#f97316", // orange
  EXPANSION: "#8b5cf6", // violet
  HARMONIC: "#f43f5e", // rose
  SIGNAL: "#eab308", // yellow
};

/**
 * Direction colors
 */
export const DIRECTION_COLORS: Record<LevelDirection, string> = {
  long: "#3b82f6", // blue
  short: "#ef4444", // red
};

/**
 * Strategy display names
 */
export const STRATEGY_DISPLAY_NAMES: Record<StrategySource, string> = {
  RETRACEMENT: "Retracement",
  EXTENSION: "Extension",
  PROJECTION: "Projection",
  EXPANSION: "Expansion",
  HARMONIC: "Harmonic",
  SIGNAL: "Signal",
};
