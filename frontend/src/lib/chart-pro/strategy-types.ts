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
  /** Which pivot is most recent - determines actual B vs C relationship */
  swingEndpoint?: "high" | "low";
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
 * Toggle visibility for a specific ratio in the visibility config
 * Returns a new VisibilityConfig with the toggled ratio
 */
export function toggleRatioVisibility(
  config: VisibilityConfig,
  timeframe: Timeframe,
  strategy: StrategySource,
  direction: "long" | "short",
  ratio: number
): VisibilityConfig {
  const EPSILON = 0.0001;

  return {
    timeframes: config.timeframes.map((tfConfig) => {
      if (tfConfig.timeframe !== timeframe) return tfConfig;

      return {
        ...tfConfig,
        strategies: tfConfig.strategies.map((stratConfig) => {
          if (stratConfig.strategy !== strategy) return stratConfig;

          return {
            ...stratConfig,
            [direction]: {
              ...stratConfig[direction],
              ratios: stratConfig[direction].ratios.map((r) => {
                if (Math.abs(r.ratio - ratio) < EPSILON) {
                  return { ...r, visible: !r.visible };
                }
                return r;
              }),
            },
          };
        }),
      };
    }),
  };
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
export const ALL_TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "5m", "3m", "1m"];

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
  "5m": "#06b6d4", // cyan
  "3m": "#14b8a6", // teal
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

/**
 * Trend direction type (matches use-trend-alignment.ts)
 */
export type TrendDirection = "bullish" | "bearish" | "ranging";

/**
 * Trend data per timeframe for syncing visibility
 */
export type TimeframeTrendData = {
  timeframe: Timeframe;
  trend: TrendDirection;
  confidence: number;
};

/**
 * Options for syncing visibility with trend
 */
export type SyncVisibilityOptions = {
  /** Include ranging timeframes (default: false - hides them) */
  includeRanging?: boolean;
  /** Minimum confidence threshold to include (default: 0) */
  minConfidence?: number;
  /** Strategies to enable (default: RETRACEMENT, EXTENSION) */
  strategies?: StrategySource[];
  /** Only allow these specific timeframes (default: all) */
  allowedTimeframes?: Timeframe[];
  /** Strategy assignment per timeframe for more granular control */
  timeframeStrategies?: Record<Timeframe, {
    strategies: StrategySource[];
    direction?: "long" | "short" | "both";
  }>;
};

/**
 * Sync visibility config with trend data.
 *
 * For each timeframe:
 * - Bullish trend → enable timeframe, show only LONG levels
 * - Bearish trend → enable timeframe, show only SHORT levels
 * - Ranging trend → disable timeframe (reduces noise)
 *
 * This filters Fibonacci levels to align with the detected trend,
 * showing only levels that make sense for the current market direction.
 *
 * Options:
 * - allowedTimeframes: Only enable these specific timeframes (for signal-based filtering)
 * - timeframeStrategies: Override strategies per timeframe (e.g., retracements for entry TF, extensions for target TF)
 */
export function syncVisibilityWithTrend(
  config: VisibilityConfig,
  trendData: TimeframeTrendData[],
  options: SyncVisibilityOptions = {}
): VisibilityConfig {
  const {
    includeRanging = false,
    minConfidence = 0,
    strategies = ["RETRACEMENT", "EXTENSION"],
    allowedTimeframes,
    timeframeStrategies,
  } = options;

  return {
    timeframes: config.timeframes.map((tfConfig) => {
      const tf = tfConfig.timeframe;

      // Check if timeframe is in allowed list (if specified)
      if (allowedTimeframes && !allowedTimeframes.includes(tf)) {
        return {
          ...tfConfig,
          enabled: false,
        };
      }

      // Find trend data for this timeframe
      const trend = trendData.find((t) => t.timeframe === tf);

      // No trend data - keep disabled
      if (!trend) {
        return {
          ...tfConfig,
          enabled: false,
        };
      }

      // Below confidence threshold - keep disabled
      if (trend.confidence < minConfidence) {
        return {
          ...tfConfig,
          enabled: false,
        };
      }

      // Ranging trend - disable unless includeRanging is true
      if (trend.trend === "ranging" && !includeRanging) {
        return {
          ...tfConfig,
          enabled: false,
        };
      }

      // Get per-timeframe strategy override if available
      const tfOverride = timeframeStrategies?.[tf];
      const tfStrategies = tfOverride?.strategies ?? strategies;

      // Determine direction based on trend or override
      let enableLong: boolean;
      let enableShort: boolean;

      if (tfOverride?.direction) {
        // Use override direction
        enableLong = tfOverride.direction === "long" || tfOverride.direction === "both";
        enableShort = tfOverride.direction === "short" || tfOverride.direction === "both";
      } else {
        // Use trend direction
        enableLong = trend.trend === "bullish" || (trend.trend === "ranging" && includeRanging);
        enableShort = trend.trend === "bearish" || (trend.trend === "ranging" && includeRanging);
      }

      return {
        ...tfConfig,
        enabled: true,
        strategies: tfConfig.strategies.map((stratConfig) => {
          // Only enable strategies in the list for this timeframe
          const isEnabledStrategy = tfStrategies.includes(stratConfig.strategy);

          return {
            ...stratConfig,
            long: {
              ...stratConfig.long,
              enabled: isEnabledStrategy && enableLong,
            },
            short: {
              ...stratConfig.short,
              enabled: isEnabledStrategy && enableShort,
            },
          };
        }),
      };
    }),
  };
}

/**
 * Get a summary of what the sync will do
 */
export function getSyncSummary(
  trendData: TimeframeTrendData[],
  options: SyncVisibilityOptions = {}
): {
  bullishTimeframes: Timeframe[];
  bearishTimeframes: Timeframe[];
  rangingTimeframes: Timeframe[];
  skippedTimeframes: Timeframe[];
  totalLevelsDirection: "long" | "short" | "mixed" | "none";
} {
  const { includeRanging = false, minConfidence = 0 } = options;

  const bullishTimeframes: Timeframe[] = [];
  const bearishTimeframes: Timeframe[] = [];
  const rangingTimeframes: Timeframe[] = [];
  const skippedTimeframes: Timeframe[] = [];

  for (const trend of trendData) {
    if (trend.confidence < minConfidence) {
      skippedTimeframes.push(trend.timeframe);
      continue;
    }

    switch (trend.trend) {
      case "bullish":
        bullishTimeframes.push(trend.timeframe);
        break;
      case "bearish":
        bearishTimeframes.push(trend.timeframe);
        break;
      case "ranging":
        if (includeRanging) {
          rangingTimeframes.push(trend.timeframe);
        } else {
          skippedTimeframes.push(trend.timeframe);
        }
        break;
    }
  }

  // Determine overall direction
  let totalLevelsDirection: "long" | "short" | "mixed" | "none";
  if (bullishTimeframes.length > 0 && bearishTimeframes.length > 0) {
    totalLevelsDirection = "mixed";
  } else if (bullishTimeframes.length > 0) {
    totalLevelsDirection = "long";
  } else if (bearishTimeframes.length > 0) {
    totalLevelsDirection = "short";
  } else {
    totalLevelsDirection = "none";
  }

  return {
    bullishTimeframes,
    bearishTimeframes,
    rangingTimeframes,
    skippedTimeframes,
    totalLevelsDirection,
  };
}

// ============================================================================
// PIVOT-BASED SYNC - Intelligent strategy selection based on swing structure
// ============================================================================

/**
 * Swing type for pivot analysis (matches use-swing-markers.ts)
 */
export type SwingType = "HH" | "HL" | "LH" | "LL";

/**
 * Pivot point from swing detection
 */
export type PivotPointData = {
  index: number;
  price: number;
  type: "high" | "low";
  time: string | number;
};

/**
 * Swing marker from detection
 */
export type SwingMarkerData = {
  index: number;
  price: number;
  time: string | number;
  swingType: SwingType;
};

/**
 * Per-strategy direction based on swing shape
 * See docs/references/fibonacci_conditions.md for full explanation
 */
export type StrategyDirections = {
  /** Retracement direction: based on where swing ENDED
   * - Ended LOW (HL/LL) → LONG (buy the pullback up)
   * - Ended HIGH (HH/LH) → SHORT (sell the pullback down)
   */
  retracement: "long" | "short" | "neutral";
  /** Extension direction: follows the swing direction
   * - Swing DOWN (ended low) → LONG (targets below)
   * - Swing UP (ended high) → SHORT (targets above)
   */
  extension: "long" | "short" | "neutral";
  /** Projection direction: based on ABC pattern
   * - Bullish ABC (A=Low, B=High, C=HL) → LONG
   * - Bearish ABC (A=High, B=Low, C=LH) → SHORT
   */
  projection: "long" | "short" | "neutral";
  /** Expansion direction: based on A-B relationship
   * - A > B (high to low) → LONG (targets below B)
   * - A < B (low to high) → SHORT (targets above B)
   */
  expansion: "long" | "short" | "neutral";
};

/**
 * Pivot analysis for a single timeframe
 * Calculated from swing detection results
 */
export type TimeframePivotAnalysis = {
  timeframe: Timeframe;
  /** Overall direction based on swing structure (for backward compat) */
  direction: "long" | "short" | "neutral";
  /** Per-strategy directions based on swing shape conditions */
  strategyDirections: StrategyDirections;
  /** Whether the swing ended at a HIGH or LOW */
  swingEndpoint: "high" | "low" | "unknown";
  /** Whether price has moved past 100% of the swing (beyond retracement zone) */
  isPast100: boolean;
  /** Recommended strategy based on price position */
  recommendedStrategy: "RETRACEMENT" | "EXTENSION" | "BOTH";
  /** Current price position as percentage of swing (0-100 = retracement zone, >100 = extension zone) */
  pricePosition: number;
  /** Latest swing type that determined direction */
  latestSwing: SwingType | null;
  /** Confidence in the analysis (0-100) */
  confidence: number;
  /** The pivot high used in analysis */
  pivotHigh: number | null;
  /** The pivot low used in analysis */
  pivotLow: number | null;
};

/**
 * Determine if the swing endpoint is a high or low
 */
function getSwingEndpoint(swingType: SwingType): "high" | "low" {
  // HH and LH are highs (the swing ended at a high point)
  if (swingType === "HH" || swingType === "LH") {
    return "high";
  }
  // HL and LL are lows (the swing ended at a low point)
  return "low";
}

/**
 * Calculate per-strategy directions based on swing shape.
 *
 * Per docs/references/fibonacci_conditions.md:
 *
 * RETRACEMENT & EXTENSION (use B vs C relationship):
 * - Swing ended HIGH (C is high) → B < C → BUY/LONG (buy pullback in uptrend)
 * - Swing ended LOW (C is low) → B > C → SELL/SHORT (sell pullback in downtrend)
 *
 * EXPANSION (opposite of retracement/extension):
 * - Swing ended HIGH (C is high) → B < C → SELL/SHORT (targets above C)
 * - Swing ended LOW (C is low) → B > C → BUY/LONG (targets below C)
 *
 * PROJECTION (uses A vs B relationship):
 * - A > B (bearish ABC) → BUY/LONG (targets below C)
 * - A < B (bullish ABC) → SELL/SHORT (targets above C)
 * Note: For simplicity, projection follows the overall trend structure.
 */
function calculateStrategyDirections(swingType: SwingType): StrategyDirections {
  const endpoint = getSwingEndpoint(swingType);

  // Retracement & Extension: based on B vs C relationship
  // Swing ended HIGH (C is high) → B < C → BUY/LONG
  // Swing ended LOW (C is low) → B > C → SELL/SHORT
  const retracementDir = endpoint === "high" ? "long" : "short";
  const extensionDir = endpoint === "high" ? "long" : "short";

  // Expansion: OPPOSITE of retracement/extension
  // Swing ended HIGH (C is high) → B < C → SELL/SHORT (targets above C)
  // Swing ended LOW (C is low) → B > C → BUY/LONG (targets below C)
  const expansionDir = endpoint === "high" ? "short" : "long";

  // Projection: follows overall trend structure (HH/HL = bullish, LH/LL = bearish)
  // Bullish structure (A < B) → SELL/SHORT (targets above)
  // Bearish structure (A > B) → BUY/LONG (targets below)
  // Using swing type: HH/LH ended at high = uptrend structure
  const projectionDir = swingType === "HH" || swingType === "HL" ? "short" : "long";

  return {
    retracement: retracementDir,
    extension: extensionDir,
    projection: projectionDir,
    expansion: expansionDir,
  };
}

/**
 * Analyze swing markers to determine direction and strategy for a timeframe
 *
 * Logic for per-strategy directions (see docs/references/fibonacci_conditions.md):
 * - RETRACEMENT/EXTENSION: B < C (swing UP) → LONG, B > C (swing DOWN) → SHORT
 * - EXPANSION: B < C → SHORT (opposite of above), B > C → LONG
 * - PROJECTION: A > B (bearish ABC) → LONG, A < B (bullish ABC) → SHORT
 *
 * Additional filters:
 * - If current price > 100% of swing range → show extensions only
 * - If current price < 100% of swing range → show retracements
 */
export function analyzePivotsForSync(
  pivots: PivotPointData[],
  markers: SwingMarkerData[],
  currentPrice: number,
  timeframe: Timeframe
): TimeframePivotAnalysis {
  // Default neutral result
  const neutralDirections: StrategyDirections = {
    retracement: "neutral",
    extension: "neutral",
    projection: "neutral",
    expansion: "neutral",
  };

  const neutralResult: TimeframePivotAnalysis = {
    timeframe,
    direction: "neutral",
    strategyDirections: neutralDirections,
    swingEndpoint: "unknown",
    isPast100: false,
    recommendedStrategy: "BOTH",
    pricePosition: 50,
    latestSwing: null,
    confidence: 0,
    pivotHigh: null,
    pivotLow: null,
  };

  if (markers.length === 0 || pivots.length < 2) {
    return neutralResult;
  }

  // Get the latest swing marker to determine direction
  const latestMarker = markers[markers.length - 1];
  const swingEndpoint = getSwingEndpoint(latestMarker.swingType);

  // Calculate per-strategy directions based on swing shape
  const strategyDirections = calculateStrategyDirections(latestMarker.swingType);

  // Overall direction from swing structure (for backward compatibility)
  // HH/HL = bullish structure, LH/LL = bearish structure
  let direction: "long" | "short" | "neutral";
  if (latestMarker.swingType === "HH" || latestMarker.swingType === "HL") {
    direction = "long"; // Bullish structure
  } else if (latestMarker.swingType === "LH" || latestMarker.swingType === "LL") {
    direction = "short"; // Bearish structure
  } else {
    direction = "neutral";
  }

  // Find the most recent significant high and low
  const highs = pivots.filter((p) => p.type === "high").sort((a, b) => b.index - a.index);
  const lows = pivots.filter((p) => p.type === "low").sort((a, b) => b.index - a.index);

  if (highs.length === 0 || lows.length === 0) {
    return {
      ...neutralResult,
      direction,
      strategyDirections,
      swingEndpoint,
      latestSwing: latestMarker.swingType,
    };
  }

  const pivotHigh = highs[0].price;
  const pivotLow = lows[0].price;
  const swingRange = pivotHigh - pivotLow;

  if (swingRange <= 0) {
    return {
      ...neutralResult,
      direction,
      strategyDirections,
      swingEndpoint,
      latestSwing: latestMarker.swingType,
      pivotHigh,
      pivotLow,
    };
  }

  // Calculate price position as percentage of the swing
  // For longs (swing ended low): 0% = at low, 100% = at high, >100% = below low
  // For shorts (swing ended high): 0% = at high, 100% = at low, >100% = above high
  let pricePosition: number;
  if (swingEndpoint === "low") {
    // Swing ended at low, measure from low upward
    pricePosition = ((currentPrice - pivotLow) / swingRange) * 100;
  } else {
    // Swing ended at high, measure from high downward
    pricePosition = ((pivotHigh - currentPrice) / swingRange) * 100;
  }

  // Determine if we're past 100% (in extension territory)
  const isPast100 = pricePosition > 100;

  // Recommend strategy based on position
  let recommendedStrategy: "RETRACEMENT" | "EXTENSION" | "BOTH";
  if (isPast100) {
    recommendedStrategy = "EXTENSION"; // Price beyond 100%, only extensions make sense
  } else if (pricePosition > 80) {
    recommendedStrategy = "BOTH"; // Near the edge, both could be relevant
  } else {
    recommendedStrategy = "RETRACEMENT"; // In retracement zone
  }

  // Calculate confidence based on:
  // - How many swing markers we have (more = higher confidence)
  // - Consistency of direction (all same direction = higher)
  const recentMarkers = markers.slice(-4);
  const bullishCount = recentMarkers.filter((m) => m.swingType === "HH" || m.swingType === "HL").length;
  const bearishCount = recentMarkers.filter((m) => m.swingType === "LH" || m.swingType === "LL").length;
  const majorityCount = Math.max(bullishCount, bearishCount);
  const consistency = majorityCount / recentMarkers.length;
  const confidence = Math.round(consistency * 100);

  return {
    timeframe,
    direction,
    strategyDirections,
    swingEndpoint,
    isPast100,
    recommendedStrategy,
    pricePosition: Math.round(pricePosition * 10) / 10,
    latestSwing: latestMarker.swingType,
    confidence,
    pivotHigh,
    pivotLow,
  };
}

/**
 * Override for a single timeframe
 */
export type PivotSyncOverride = {
  direction?: "long" | "short";
  strategy?: "RETRACEMENT" | "EXTENSION" | "BOTH";
};

/**
 * Options for pivot-based sync
 */
export type PivotSyncOptions = {
  /** Minimum confidence to include timeframe (default: 50) */
  minConfidence?: number;
  /** Override strategies per timeframe */
  overrides?: Partial<Record<Timeframe, PivotSyncOverride>>;
};

/**
 * Get the direction for a specific strategy from the analysis
 */
function getStrategyDirection(
  strategy: StrategySource,
  strategyDirections: StrategyDirections
): "long" | "short" | "neutral" {
  switch (strategy) {
    case "RETRACEMENT":
      return strategyDirections.retracement;
    case "EXTENSION":
      return strategyDirections.extension;
    case "PROJECTION":
      return strategyDirections.projection;
    case "EXPANSION":
      return strategyDirections.expansion;
    default:
      return "neutral";
  }
}

/**
 * Sync visibility config with pivot analysis.
 *
 * For each timeframe, applies per-strategy direction based on swing shape:
 * - RETRACEMENT: based on where swing ENDED (low = long, high = short)
 * - EXTENSION: based on swing DIRECTION (down = long, up = short)
 * - PROJECTION/EXPANSION: follows extension logic
 *
 * Price position filtering:
 * - If price < 100% of swing → show retracements (in pullback zone)
 * - If price > 100% of swing → show extensions (beyond origin)
 *
 * See docs/references/fibonacci_conditions.md for detailed conditions.
 */
export function syncVisibilityWithPivots(
  config: VisibilityConfig,
  pivotAnalysis: TimeframePivotAnalysis[],
  options: PivotSyncOptions = {}
): VisibilityConfig {
  const { minConfidence = 50, overrides } = options;

  return {
    timeframes: config.timeframes.map((tfConfig) => {
      const tf = tfConfig.timeframe;
      const analysis = pivotAnalysis.find((a) => a.timeframe === tf);
      const override = overrides?.[tf];

      // No analysis data - disable timeframe
      if (!analysis) {
        return { ...tfConfig, enabled: false };
      }

      // Below confidence threshold - disable
      if (analysis.confidence < minConfidence) {
        return { ...tfConfig, enabled: false };
      }

      // Check if all strategies are neutral (no clear swing shape)
      const allNeutral =
        analysis.strategyDirections.retracement === "neutral" &&
        analysis.strategyDirections.extension === "neutral";

      if (allNeutral && !override?.direction) {
        return { ...tfConfig, enabled: false };
      }

      // Get recommended strategy (override or from analysis)
      const strategy = override?.strategy ?? analysis.recommendedStrategy;

      // Determine which strategy types to enable based on price position
      const enableRetracement = strategy === "RETRACEMENT" || strategy === "BOTH";
      const enableExtension = strategy === "EXTENSION" || strategy === "BOTH";

      return {
        ...tfConfig,
        enabled: true,
        strategies: tfConfig.strategies.map((stratConfig) => {
          const isRetracement = stratConfig.strategy === "RETRACEMENT";
          const isExtension = stratConfig.strategy === "EXTENSION";
          const isProjection = stratConfig.strategy === "PROJECTION";
          const isExpansion = stratConfig.strategy === "EXPANSION";

          // Check if this strategy type should be enabled based on price position
          const strategyTypeEnabled =
            (isRetracement && enableRetracement) ||
            (isExtension && enableExtension) ||
            (isProjection && enableExtension) || // Projection follows extension
            (isExpansion && enableExtension); // Expansion follows extension

          if (!strategyTypeEnabled) {
            return {
              ...stratConfig,
              long: { ...stratConfig.long, enabled: false },
              short: { ...stratConfig.short, enabled: false },
            };
          }

          // Get the direction for THIS specific strategy
          // (may be overridden for all strategies, or use per-strategy directions)
          let stratDirection: "long" | "short" | "neutral";
          if (override?.direction) {
            // Override applies to all strategies
            stratDirection = override.direction;
          } else {
            // Use per-strategy direction from swing shape analysis
            stratDirection = getStrategyDirection(
              stratConfig.strategy,
              analysis.strategyDirections
            );
          }

          // Enable the appropriate direction for this strategy
          const enableLong = stratDirection === "long";
          const enableShort = stratDirection === "short";

          return {
            ...stratConfig,
            long: {
              ...stratConfig.long,
              enabled: enableLong,
            },
            short: {
              ...stratConfig.short,
              enabled: enableShort,
            },
          };
        }),
      };
    }),
  };
}

/**
 * Per-timeframe sync summary with strategy-specific directions
 */
export type TimeframeSyncDetail = {
  timeframe: Timeframe;
  recommendedStrategy: "RETRACEMENT" | "EXTENSION" | "BOTH";
  swingEndpoint: "high" | "low" | "unknown";
  retracementDir: "long" | "short" | "neutral";
  extensionDir: "long" | "short" | "neutral";
  pricePosition: number;
  confidence: number;
};

/**
 * Get summary of pivot-based sync
 */
export function getPivotSyncSummary(
  pivotAnalysis: TimeframePivotAnalysis[],
  options: PivotSyncOptions = {}
): {
  longTimeframes: Array<{ timeframe: Timeframe; strategy: string }>;
  shortTimeframes: Array<{ timeframe: Timeframe; strategy: string }>;
  neutralTimeframes: Timeframe[];
  overallDirection: "long" | "short" | "mixed" | "none";
  /** Detailed per-timeframe breakdown */
  details: TimeframeSyncDetail[];
} {
  const { minConfidence = 50 } = options;

  const longTimeframes: Array<{ timeframe: Timeframe; strategy: string }> = [];
  const shortTimeframes: Array<{ timeframe: Timeframe; strategy: string }> = [];
  const neutralTimeframes: Timeframe[] = [];
  const details: TimeframeSyncDetail[] = [];

  for (const analysis of pivotAnalysis) {
    // Add detail for this timeframe
    details.push({
      timeframe: analysis.timeframe,
      recommendedStrategy: analysis.recommendedStrategy,
      swingEndpoint: analysis.swingEndpoint,
      retracementDir: analysis.strategyDirections.retracement,
      extensionDir: analysis.strategyDirections.extension,
      pricePosition: analysis.pricePosition,
      confidence: analysis.confidence,
    });

    if (analysis.confidence < minConfidence) {
      neutralTimeframes.push(analysis.timeframe);
      continue;
    }

    // Use the overall direction for backward compat summary
    if (analysis.direction === "long") {
      longTimeframes.push({
        timeframe: analysis.timeframe,
        strategy: analysis.recommendedStrategy,
      });
    } else if (analysis.direction === "short") {
      shortTimeframes.push({
        timeframe: analysis.timeframe,
        strategy: analysis.recommendedStrategy,
      });
    } else {
      neutralTimeframes.push(analysis.timeframe);
    }
  }

  let overallDirection: "long" | "short" | "mixed" | "none";
  if (longTimeframes.length > 0 && shortTimeframes.length > 0) {
    overallDirection = "mixed";
  } else if (longTimeframes.length > 0) {
    overallDirection = "long";
  } else if (shortTimeframes.length > 0) {
    overallDirection = "short";
  } else {
    overallDirection = "none";
  }

  return { longTimeframes, shortTimeframes, neutralTimeframes, overallDirection, details };
}
