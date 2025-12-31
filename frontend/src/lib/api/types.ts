/**
 * TypeScript types for the Trader Backend API.
 * These types match the Pydantic models in the backend.
 */

export type Direction = "buy" | "sell";

// Fibonacci Request/Response Types

export type RetracementRequest = {
  high: number;
  low: number;
  direction: Direction;
};

export type ExtensionRequest = {
  high: number;
  low: number;
  direction: Direction;
};

export type ProjectionRequest = {
  point_a: number;
  point_b: number;
  point_c: number;
  direction: Direction;
};

export type ExpansionRequest = {
  point_a: number;
  point_b: number;
  direction: Direction;
};

export type FibonacciResponse = {
  levels: Record<string, number>;
};

// Signal Request/Response Types

export type SignalRequest = {
  open: number;
  high: number;
  low: number;
  close: number;
  fibonacci_level: number;
};

export type SignalData = {
  direction: string;
  signal_type: string;
  strength: number;
  level: number;
};

export type SignalResponse = {
  signal: SignalData | null;
};

// Harmonic Pattern Request/Response Types

export type HarmonicValidateRequest = {
  x: number;
  a: number;
  b: number;
  c: number;
  d: number;
};

export type HarmonicPatternData = {
  pattern_type: string;
  direction: string;
  x: number;
  a: number;
  b: number;
  c: number;
  d: number;
};

export type HarmonicValidateResponse = {
  pattern: HarmonicPatternData | null;
};

export type PatternType = "gartley" | "butterfly" | "bat" | "crab";

export type ReversalZoneRequest = {
  x: number;
  a: number;
  b: number;
  c: number;
  pattern_type: PatternType;
};

export type ReversalZoneData = {
  d_level: number;
  direction: string;
  pattern_type: string;
};

export type ReversalZoneResponse = {
  reversal_zone: ReversalZoneData | null;
};

// Parsed Fibonacci Levels (with numeric keys converted to ratios)

export type FibonacciLevel = {
  ratio: number;
  price: number;
};

export type ParsedFibonacciLevels = {
  levels: FibonacciLevel[];
};

// Position Sizing Request/Response Types

export type PositionSizeRequest = {
  entry_price: number;
  stop_loss: number;
  risk_capital: number;
  account_balance?: number;
};

export type PositionSizeData = {
  position_size: number;
  distance_to_stop: number;
  risk_amount: number;
  account_risk_percentage: number;
  is_valid: boolean;
};

export type PositionSizeResponse = {
  result: PositionSizeData;
};

export type RiskRewardRequest = {
  entry_price: number;
  stop_loss: number;
  targets: number[];
  position_size?: number;
};

export type TradeRecommendation = "excellent" | "good" | "marginal" | "poor";

export type RiskRewardData = {
  risk_reward_ratio: number;
  target_ratios: number[];
  potential_profit: number;
  potential_loss: number;
  recommendation: TradeRecommendation;
  is_valid: boolean;
};

export type RiskRewardResponse = {
  result: RiskRewardData;
};

// Pivot Detection Request/Response Types

export type OHLCBarRequest = {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type PivotDetectRequest = {
  data: OHLCBarRequest[];
  lookback?: number;
  count?: number;
};

export type PivotPointData = {
  index: number;
  price: number;
  type: "high" | "low";
  time: string | number;
};

export type PivotDetectResponse = {
  pivots: PivotPointData[];
  recent_pivots: PivotPointData[];
  pivot_high: number;
  pivot_low: number;
  swing_high: PivotPointData | null;
  swing_low: PivotPointData | null;
};

// Journal Request/Response Types

export type TradeDirection = "long" | "short";

export type TradeOutcome = "win" | "loss" | "breakeven";

export type JournalEntryRequest = {
  symbol: string;
  direction: TradeDirection;
  entry_price: number;
  exit_price: number;
  stop_loss: number;
  position_size: number;
  entry_time: string;
  exit_time: string;
  timeframe?: string;
  targets?: number[];
  exit_reason?: string;
  notes?: string;
  workflow_id?: string;
};

export type JournalEntryData = {
  id: string;
  symbol: string;
  direction: TradeDirection;
  entry_price: number;
  exit_price: number;
  stop_loss: number;
  position_size: number;
  entry_time: string;
  exit_time: string;
  pnl: number;
  r_multiple: number;
  outcome: TradeOutcome;
  timeframe?: string;
  targets: number[];
  exit_reason?: string;
  notes?: string;
  workflow_id?: string;
};

export type JournalEntryResponse = {
  entry: JournalEntryData;
};

export type JournalEntriesResponse = {
  entries: JournalEntryData[];
};

export type JournalAnalyticsData = {
  total_trades: number;
  wins: number;
  losses: number;
  breakevens: number;
  win_rate: number;
  total_pnl: number;
  average_r: number;
  largest_win: number;
  largest_loss: number;
  profit_factor: number;
};

export type JournalAnalyticsResponse = {
  analytics: JournalAnalyticsData;
};
