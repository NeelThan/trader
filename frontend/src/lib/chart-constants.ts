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

// Fibonacci level ratios
export const RETRACEMENT_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
export const EXTENSION_RATIOS = [1.272, 1.414, 1.618, 2.0, 2.618];
export const EXPANSION_RATIOS = [0.618, 1.0, 1.618, 2.618];
export const PROJECTION_RATIOS = [0.618, 1.0, 1.272, 1.618];

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
