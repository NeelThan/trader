/**
 * Workflow V2 Types
 *
 * Type definitions for the chart-centric trading workflow.
 * Reuses existing types from chart-constants where applicable.
 */

import type { Timeframe, MarketSymbol, PivotPoint, TradingStyle } from "@/lib/chart-constants";

// ============================================================================
// Fibonacci Strategy Types
// ============================================================================

/**
 * Fibonacci strategy types.
 * Each serves a different purpose in the trading workflow.
 */
export type FibStrategy = "retracement" | "extension" | "expansion" | "projection";

/**
 * Trade direction based on trend analysis.
 */
export type TradeDirection = "long" | "short";

// ============================================================================
// Extended Framework Types (from Fibonacci Trading Framework Extended)
// ============================================================================

/**
 * Trend phase identifies where we are in the trend cycle.
 * - impulse: Price moving strongly in trend direction
 * - correction: Price pulling back against trend
 * - continuation: Price resuming trend after correction
 * - exhaustion: Trend losing momentum, potential reversal
 */
export type TrendPhase = "impulse" | "correction" | "continuation" | "exhaustion";

/**
 * Trade category determines position sizing risk.
 * - with_trend: Trading with higher TF trend (1-2% risk)
 * - counter_trend: Against higher TF at major confluence (0.5-1% risk)
 * - reversal_attempt: Speculative against trend (0.25-0.5% risk)
 */
export type TradeCategory = "with_trend" | "counter_trend" | "reversal_attempt";

/**
 * Risk multipliers for each trade category.
 * Applied to base risk percentage.
 */
export const TRADE_CATEGORY_RISK: Record<TradeCategory, number> = {
  with_trend: 1.0, // 100% of base risk
  counter_trend: 0.5, // 50% of base risk
  reversal_attempt: 0.25, // 25% of base risk
};

/**
 * Human-readable explanations for each trade category.
 */
export const TRADE_CATEGORY_EXPLANATIONS: Record<TradeCategory, string> = {
  with_trend: "Trading with the higher timeframe trend - highest probability setup",
  counter_trend: "Trading against higher TF at major confluence - reduced risk recommended",
  reversal_attempt: "Speculative reversal trade - use minimal position size",
};

/**
 * Confluence score interpretation levels.
 */
export type ConfluenceInterpretation = "standard" | "important" | "significant" | "major";

/**
 * Breakdown of confluence score components.
 */
export type ConfluenceBreakdown = {
  /** Base Fib level: always +1 */
  baseFibLevel: number;
  /** Same TF confluence: +1 per level */
  sameTFConfluence: number;
  /** Higher TF confluence: +2 per level */
  higherTFConfluence: number;
  /** Previous pivot nearby: +2 */
  previousPivot: number;
  /** Psychological level (round number): +1 */
  psychologicalLevel: number;
};

/**
 * Complete confluence score with breakdown and interpretation.
 */
export type ConfluenceScore = {
  /** Total confluence score */
  total: number;
  /** Score breakdown by component */
  breakdown: ConfluenceBreakdown;
  /** Interpretation label */
  interpretation: ConfluenceInterpretation;
};

/**
 * Get interpretation label from total confluence score.
 * - 1-2: standard
 * - 3-4: important
 * - 5-6: significant
 * - 7+: major
 */
export function getConfluenceInterpretation(score: number): ConfluenceInterpretation {
  if (score >= 7) return "major";
  if (score >= 5) return "significant";
  if (score >= 3) return "important";
  return "standard";
}

/**
 * Get category-adjusted risk percentage.
 */
export function getCategoryAdjustedRisk(
  baseRiskPercent: number,
  category: TradeCategory
): number {
  return baseRiskPercent * TRADE_CATEGORY_RISK[category];
}

// ============================================================================
// Trade Opportunity Types (for multi-symbol scanning)
// ============================================================================

/**
 * A trade opportunity identified through multi-timeframe analysis.
 * Returned by the /workflow/opportunities endpoint.
 */
export type TradeOpportunity = {
  /** Market symbol (e.g., "DJI", "SPX") */
  symbol: MarketSymbol;
  /** Higher timeframe for trend context */
  higher_timeframe: Timeframe;
  /** Lower timeframe for entry timing */
  lower_timeframe: Timeframe;
  /** Trade direction */
  direction: TradeDirection;
  /** Confidence score 0-100 */
  confidence: number;
  /** Trade category for position sizing */
  category: TradeCategory;
  /** Current trend phase */
  phase: TrendPhase;
  /** Human-readable description */
  description: string;
};

/**
 * Result of scanning multiple symbols for opportunities.
 */
export type OpportunityScanResult = {
  /** List of symbols that were scanned */
  symbols_scanned: string[];
  /** List of identified opportunities */
  opportunities: TradeOpportunity[];
  /** Time taken to scan in milliseconds */
  scan_time_ms: number;
};

/**
 * An individual Fibonacci level with metadata.
 */
export type FibonacciLevel = {
  /** Unique identifier for this level */
  id: string;
  /** The Fib ratio (e.g., 0.618, 1.272) */
  ratio: number;
  /** Calculated price level */
  price: number;
  /** Which strategy calculated this level */
  strategy: FibStrategy;
  /** Which timeframe this level belongs to */
  timeframe: Timeframe;
  /** Direction: blue for long, red for short */
  direction: TradeDirection;
  /** Display label (e.g., "1W R61.8%") */
  label: string;
  /** Is this level currently visible on chart */
  visible: boolean;
};

// ============================================================================
// Pivot Point Storage Types
// ============================================================================

/**
 * Extended pivot point with metadata for storage.
 */
export type StoredPivotPoint = PivotPoint & {
  /** Timestamp when this pivot was detected/set */
  timestamp: string;
  /** Was this manually adjusted by user */
  isManual: boolean;
};

/**
 * Pivot data for a single timeframe.
 */
export type TimeframePivotData = {
  /** The pivot points (A, B, C) for this timeframe */
  points: StoredPivotPoint[];
  /** Prevent auto-refresh from overwriting user adjustments */
  lockedFromRefresh: boolean;
  /** ISO timestamp of last modification */
  lastModified: string;
  /** Detected trend direction for this timeframe */
  trendDirection: TradeDirection | "ranging";
};

/**
 * Pivot storage indexed by symbol, then by timeframe.
 */
export type PivotStorage = {
  [S in MarketSymbol]?: {
    [T in Timeframe]?: TimeframePivotData;
  };
};

// ============================================================================
// Visibility Settings Types
// ============================================================================

/**
 * Which timeframes to show Fib levels for.
 */
export type TimeframeVisibility = {
  [T in Timeframe]: boolean;
};

/**
 * Overall visibility settings.
 */
export type VisibilitySettings = {
  /** Which timeframes to show levels for */
  timeframes: TimeframeVisibility;
  /** Show confluence zones (clustered levels) */
  showConfluence: boolean;
  /** Highlight signal bars on chart */
  showSignalHighlights: boolean;
  /** Show Fib level labels */
  showLabels: boolean;
};

// ============================================================================
// Alert Settings Types
// ============================================================================

/**
 * Alert settings for price level notifications.
 */
export type AlertSettings = {
  /** Master switch for all alerts */
  enabled: boolean;
  /** Play sound when alert triggers */
  soundEnabled: boolean;
  /** Per-level alert toggles (by level id) */
  perLevel: { [levelId: string]: boolean };
};

// ============================================================================
// Validation Settings Types
// ============================================================================

/**
 * How to treat each validation check.
 */
export type ValidationCheckMode = "required" | "warning" | "ignored";

/**
 * Validation check configuration.
 */
export type ValidationSettings = {
  /** Trend alignment between HTF and LTF */
  trendAlignment: ValidationCheckMode;
  /** Entry zone exists (Fib level) */
  entryZone: ValidationCheckMode;
  /** Target zone exists (extension levels) */
  targetZone: ValidationCheckMode;
  /** RSI not overbought/oversold against trade */
  rsiConfirmation: ValidationCheckMode;
  /** MACD momentum matches direction */
  macdConfirmation: ValidationCheckMode;
};

/**
 * Result of a single validation check.
 */
export type ValidationCheckResult = {
  /** Check name */
  name: string;
  /** Did it pass */
  passed: boolean;
  /** Brief explanation */
  explanation: string;
  /** Additional details */
  details?: string;
  /** How this check is configured */
  mode: ValidationCheckMode;
  /** Was this check overridden by user */
  overridden: boolean;
};

// ============================================================================
// Auto-Refresh Settings
// ============================================================================

/**
 * Auto-refresh intervals by timeframe (in seconds).
 * Based on design spec:
 * - 1M, 1W: 4 hours (14400s)
 * - 1D: 5 minutes (300s)
 * - 4H, 1H: 1 minute (60s)
 * - 15m, 5m, 1m: 10 seconds
 */
export const AUTO_REFRESH_INTERVALS: Record<Timeframe, number> = {
  "1M": 14400,
  "1W": 14400,
  "1D": 300,
  "4H": 60,
  "1H": 60,
  "15m": 10,
  "1m": 10,
};

/**
 * Auto-refresh settings.
 */
export type AutoRefreshSettings = {
  /** Master switch for auto-refresh */
  enabled: boolean;
  /** Last refresh timestamp (ISO string) */
  lastRefresh: string | null;
};

// ============================================================================
// Main Storage Type
// ============================================================================

/**
 * Complete Workflow V2 localStorage schema.
 */
export type WorkflowV2Storage = {
  /** Version for migration purposes */
  version: number;

  /** Per-symbol, per-timeframe pivot points */
  pivots: PivotStorage;

  /** Visibility settings */
  visibility: VisibilitySettings;

  /** Alert settings */
  alerts: AlertSettings;

  /** Validation settings */
  validation: ValidationSettings;

  /** Watchlist of symbols to scan */
  watchlist: MarketSymbol[];

  /** Auto-refresh settings */
  autoRefresh: AutoRefreshSettings;

  /** UI theme preference */
  theme: "dark" | "light";
};

// ============================================================================
// Default Values
// ============================================================================

/**
 * Default timeframe visibility - all enabled.
 */
export const DEFAULT_TIMEFRAME_VISIBILITY: TimeframeVisibility = {
  "1M": true,
  "1W": true,
  "1D": true,
  "4H": true,
  "1H": true,
  "15m": true,
  "1m": true,
};

/**
 * Default visibility settings.
 */
export const DEFAULT_VISIBILITY_SETTINGS: VisibilitySettings = {
  timeframes: DEFAULT_TIMEFRAME_VISIBILITY,
  showConfluence: true,
  showSignalHighlights: true,
  showLabels: true,
};

/**
 * Default alert settings.
 */
export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  enabled: true,
  soundEnabled: false,
  perLevel: {},
};

/**
 * Default validation settings.
 */
export const DEFAULT_VALIDATION_SETTINGS: ValidationSettings = {
  trendAlignment: "required",
  entryZone: "required",
  targetZone: "warning",
  rsiConfirmation: "warning",
  macdConfirmation: "warning",
};

/**
 * Default auto-refresh settings.
 */
export const DEFAULT_AUTO_REFRESH_SETTINGS: AutoRefreshSettings = {
  enabled: true,
  lastRefresh: null,
};

/**
 * Default watchlist.
 */
export const DEFAULT_WATCHLIST: MarketSymbol[] = ["DJI"];

/**
 * Complete default storage.
 */
export const DEFAULT_WORKFLOW_V2_STORAGE: WorkflowV2Storage = {
  version: 1,
  pivots: {},
  visibility: DEFAULT_VISIBILITY_SETTINGS,
  alerts: DEFAULT_ALERT_SETTINGS,
  validation: DEFAULT_VALIDATION_SETTINGS,
  watchlist: DEFAULT_WATCHLIST,
  autoRefresh: DEFAULT_AUTO_REFRESH_SETTINGS,
  theme: "dark",
};

// ============================================================================
// Trading Style Configuration
// ============================================================================

/**
 * Timeframe pair for multi-TF analysis.
 */
export type WorkflowTimeframePair = {
  id: string;
  name: string;
  higherTimeframe: Timeframe;
  lowerTimeframe: Timeframe;
  tradingStyle: TradingStyle;
};

/**
 * Standard timeframe pairs for different trading styles.
 */
export const WORKFLOW_TIMEFRAME_PAIRS: WorkflowTimeframePair[] = [
  { id: "1M-1W", name: "Monthly/Weekly", higherTimeframe: "1M", lowerTimeframe: "1W", tradingStyle: "position" },
  { id: "1W-1D", name: "Weekly/Daily", higherTimeframe: "1W", lowerTimeframe: "1D", tradingStyle: "position" },
  { id: "1D-4H", name: "Daily/4-Hour", higherTimeframe: "1D", lowerTimeframe: "4H", tradingStyle: "swing" },
  { id: "4H-1H", name: "4-Hour/1-Hour", higherTimeframe: "4H", lowerTimeframe: "1H", tradingStyle: "day" },
  { id: "1H-15m", name: "1-Hour/15-Min", higherTimeframe: "1H", lowerTimeframe: "15m", tradingStyle: "day" },
  { id: "15m-1m", name: "15-Min/1-Min", higherTimeframe: "15m", lowerTimeframe: "1m", tradingStyle: "scalping" },
];

// ============================================================================
// Storage Key
// ============================================================================

/**
 * localStorage key for Workflow V2 data.
 */
export const WORKFLOW_V2_STORAGE_KEY = "trader-workflow-v2";
