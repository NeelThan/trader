/**
 * Chart configuration constants and types.
 * Centralized location for all chart-related configuration.
 */

export type Timeframe = "1m" | "15m" | "1H" | "4H" | "1D" | "1W" | "1M";
export type MarketSymbol = "DJI" | "SPX" | "NDX" | "BTCUSD" | "EURUSD" | "GOLD";
export type DataSource = "simulated" | "yahoo";

export type FibonacciVisibility = {
  retracement: boolean;
  extension: boolean;
  expansion: boolean;
  projection: boolean;
};

export type PivotPoint = {
  index: number;
  price: number;
  type: "high" | "low";
};

export type MarketStatus = {
  state: string;
  stateDisplay: string;
  isOpen: boolean;
  isPreMarket: boolean;
  isAfterHours: boolean;
  isClosed: boolean;
};

export const MARKET_CONFIG: Record<
  MarketSymbol,
  { name: string; basePrice: number; volatilityMultiplier: number }
> = {
  DJI: { name: "Dow Jones Industrial Average", basePrice: 42500, volatilityMultiplier: 1 },
  SPX: { name: "S&P 500", basePrice: 5950, volatilityMultiplier: 0.15 },
  NDX: { name: "Nasdaq 100", basePrice: 21200, volatilityMultiplier: 0.5 },
  BTCUSD: { name: "Bitcoin / USD", basePrice: 95000, volatilityMultiplier: 2.5 },
  EURUSD: { name: "Euro / US Dollar", basePrice: 1.04, volatilityMultiplier: 0.00005 },
  GOLD: { name: "Gold", basePrice: 2620, volatilityMultiplier: 0.08 },
};

export const TIMEFRAME_CONFIG: Record<
  Timeframe,
  { label: string; periods: number; description: string; refreshInterval: number }
> = {
  "1m": { label: "1m", periods: 240, description: "4 hours of 1-minute data", refreshInterval: 60 },
  "15m": {
    label: "15m",
    periods: 192,
    description: "2 days of 15-minute data",
    refreshInterval: 60,
  },
  "1H": { label: "1H", periods: 168, description: "1 week of hourly data", refreshInterval: 300 },
  "4H": { label: "4H", periods: 126, description: "3 weeks of 4-hour data", refreshInterval: 300 },
  "1D": { label: "1D", periods: 90, description: "90 days of daily data", refreshInterval: 900 },
  "1W": { label: "1W", periods: 52, description: "1 year of weekly data", refreshInterval: 3600 },
  "1M": { label: "1M", periods: 60, description: "5 years of monthly data", refreshInterval: 3600 },
};

// Fibonacci level ratios - aligned with backend defaults
// Backend-defined ratios (from backend/src/trader/fibonacci.py)
export const RETRACEMENT_RATIOS_BACKEND = [0.382, 0.5, 0.618, 0.786];
export const EXTENSION_RATIOS_BACKEND = [1.272, 1.618, 2.618];
export const EXPANSION_RATIOS_BACKEND = [0.382, 0.5, 0.618, 1.0, 1.618];
export const PROJECTION_RATIOS_BACKEND = [0.618, 0.786, 1.0, 1.272, 1.618];

// Extended ratios (additional levels that can be enabled in settings)
export const RETRACEMENT_RATIOS_EXTENDED = [0, 0.236, 1.0];
export const EXTENSION_RATIOS_EXTENDED = [1.414, 2.0];
export const EXPANSION_RATIOS_EXTENDED = [2.618];
export const PROJECTION_RATIOS_EXTENDED = [2.0, 2.618];

// Combined ratios for backward compatibility (sorted)
export const RETRACEMENT_RATIOS = [...RETRACEMENT_RATIOS_BACKEND, ...RETRACEMENT_RATIOS_EXTENDED].sort((a, b) => a - b);
export const EXTENSION_RATIOS = [...EXTENSION_RATIOS_BACKEND, ...EXTENSION_RATIOS_EXTENDED].sort((a, b) => a - b);
export const EXPANSION_RATIOS = [...EXPANSION_RATIOS_BACKEND, ...EXPANSION_RATIOS_EXTENDED].sort((a, b) => a - b);
export const PROJECTION_RATIOS = [...PROJECTION_RATIOS_BACKEND, ...PROJECTION_RATIOS_EXTENDED].sort((a, b) => a - b);

// Configuration for which ratios to display by default
export type FibonacciRatioConfig = {
  backend: number[];
  extended: number[];
  useExtended: boolean;
};

export const DEFAULT_RATIO_CONFIG: Record<keyof FibonacciVisibility, FibonacciRatioConfig> = {
  retracement: { backend: RETRACEMENT_RATIOS_BACKEND, extended: RETRACEMENT_RATIOS_EXTENDED, useExtended: false },
  extension: { backend: EXTENSION_RATIOS_BACKEND, extended: EXTENSION_RATIOS_EXTENDED, useExtended: false },
  expansion: { backend: EXPANSION_RATIOS_BACKEND, extended: EXPANSION_RATIOS_EXTENDED, useExtended: false },
  projection: { backend: PROJECTION_RATIOS_BACKEND, extended: PROJECTION_RATIOS_EXTENDED, useExtended: false },
};

// Colors for each Fibonacci type
export const FIB_COLORS = {
  retracement: {
    0: "#6b7280",
    0.236: "#9ca3af",
    0.382: "#f59e0b",
    0.5: "#8b5cf6",
    0.618: "#22c55e",
    0.786: "#ef4444",
    1: "#6b7280",
  } as Record<number, string>,
  extension: "#3b82f6",
  expansion: "#ec4899",
  projection: "#14b8a6",
  pivotLine: "#f59e0b",
};

// Market status display colors
export const MARKET_STATUS_STYLES = {
  open: {
    badge: "bg-green-500/20 text-green-400",
    dot: "bg-green-400 animate-pulse",
  },
  premarket: {
    badge: "bg-amber-500/20 text-amber-400",
    dot: "bg-amber-400",
  },
  closed: {
    badge: "bg-gray-500/20 text-gray-400",
    dot: "bg-gray-400",
  },
};

// ============================================================================
// Multi-Timeframe Trend Analysis
// ============================================================================

/**
 * Trend direction for a single timeframe.
 */
export type TrendDirection = "UP" | "DOWN" | "NEUTRAL";

/**
 * A timeframe pair configuration for trend alignment analysis.
 * The higher timeframe determines the primary trend, while the lower
 * timeframe is used to find entry opportunities.
 */
export type TimeframePair = {
  id: string;
  name: string;
  higherTF: Timeframe;
  lowerTF: Timeframe;
  tradingStyle: TradingStyle;
};

export type TradingStyle = "position" | "swing" | "day" | "scalping";

/**
 * Trade action recommendation based on trend alignment.
 * - GO_LONG: Higher TF up, lower TF down - buy the dip
 * - GO_SHORT: Higher TF down, lower TF up - sell the rally
 * - STAND_ASIDE: Both TFs in same direction - wait for pullback
 */
export type TradeAction = "GO_LONG" | "GO_SHORT" | "STAND_ASIDE";

/**
 * Trend analysis result for a single timeframe.
 */
export type TimeframeTrend = {
  timeframe: Timeframe;
  direction: TrendDirection;
  strength: number; // 0-1, how strong the trend is
  pivotHigh: number | null;
  pivotLow: number | null;
};

/**
 * Complete trend alignment analysis for a timeframe pair.
 */
export type TrendAlignment = {
  pair: TimeframePair;
  higherTrend: TimeframeTrend;
  lowerTrend: TimeframeTrend;
  action: TradeAction;
  confidence: number; // 0-1, how confident is the alignment signal
};

/**
 * Preset timeframe pairs for different trading styles.
 * Based on SignalPro strategy recommendations.
 */
export const TIMEFRAME_PAIR_PRESETS: TimeframePair[] = [
  {
    id: "monthly-weekly",
    name: "Monthly / Weekly",
    higherTF: "1M",
    lowerTF: "1W",
    tradingStyle: "position",
  },
  {
    id: "weekly-daily",
    name: "Weekly / Daily",
    higherTF: "1W",
    lowerTF: "1D",
    tradingStyle: "position",
  },
  {
    id: "daily-4h",
    name: "Daily / 4-Hour",
    higherTF: "1D",
    lowerTF: "4H",
    tradingStyle: "swing",
  },
  {
    id: "4h-1h",
    name: "4-Hour / 1-Hour",
    higherTF: "4H",
    lowerTF: "1H",
    tradingStyle: "day",
  },
  {
    id: "1h-15m",
    name: "1-Hour / 15-Minute",
    higherTF: "1H",
    lowerTF: "15m",
    tradingStyle: "day",
  },
  {
    id: "15m-1m",
    name: "15-Minute / 1-Minute",
    higherTF: "15m",
    lowerTF: "1m",
    tradingStyle: "scalping",
  },
];

/**
 * Trading style display configuration.
 */
export const TRADING_STYLE_CONFIG: Record<TradingStyle, { label: string; description: string; color: string }> = {
  position: {
    label: "Position Trading",
    description: "Hold for weeks/months",
    color: "#3b82f6", // blue
  },
  swing: {
    label: "Swing Trading",
    description: "Hold for days/weeks",
    color: "#22c55e", // green
  },
  day: {
    label: "Day Trading",
    description: "Intraday positions",
    color: "#f59e0b", // amber
  },
  scalping: {
    label: "Scalping",
    description: "Very short-term",
    color: "#ef4444", // red
  },
};

/**
 * Trade action display configuration.
 */
export const TRADE_ACTION_CONFIG: Record<TradeAction, { label: string; description: string; color: string; bgColor: string }> = {
  GO_LONG: {
    label: "GO LONG",
    description: "Buy the dip - Higher TF up, Lower TF down",
    color: "#22c55e",
    bgColor: "bg-green-500/20",
  },
  GO_SHORT: {
    label: "GO SHORT",
    description: "Sell the rally - Higher TF down, Lower TF up",
    color: "#ef4444",
    bgColor: "bg-red-500/20",
  },
  STAND_ASIDE: {
    label: "STAND ASIDE",
    description: "Wait for pullback - Both timeframes aligned",
    color: "#9ca3af",
    bgColor: "bg-gray-500/20",
  },
};

/**
 * Trend direction display configuration.
 */
export const TREND_DIRECTION_CONFIG: Record<TrendDirection, { label: string; icon: string; color: string }> = {
  UP: { label: "Uptrend", icon: "↑", color: "#22c55e" },
  DOWN: { label: "Downtrend", icon: "↓", color: "#ef4444" },
  NEUTRAL: { label: "Neutral", icon: "→", color: "#9ca3af" },
};
