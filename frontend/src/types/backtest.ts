/**
 * Types for the backtest replay feature.
 * Mirrors the backend BacktestRunRequest/BacktestResultResponse models.
 */

export type BacktestConfig = {
  symbol: string;
  higher_timeframe: string;
  lower_timeframe: string;
  start_date: string;
  end_date: string;
  initial_capital: number;
  risk_per_trade: number;
  lookback_periods: number;
  confluence_threshold: number;
  validation_pass_threshold: number;
  atr_stop_multiplier: number;
  breakeven_at_r: number;
  trailing_stop_at_r: number;
};

export type BacktestTrade = {
  entry_time: string;
  entry_price: number;
  direction: "long" | "short";
  position_size: number;
  stop_loss: number;
  targets: number[];
  trade_category: string;
  confluence_score: number;
  status: string;
  exit_time: string | null;
  exit_price: number | null;
  exit_reason: string | null;
  pnl: number;
  r_multiple: number;
};

export type BacktestMetrics = {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  breakeven_trades: number;
  win_rate: number;
  profit_factor: number;
  total_pnl: number;
  average_pnl: number;
  average_r: number;
  largest_winner: number;
  largest_loser: number;
  max_drawdown: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  by_category: Record<string, Record<string, number>>;
};

export type BacktestEquityPoint = {
  timestamp: string;
  bar_index: number;
  equity: number;
  trade_count: number;
};

export type BacktestResult = {
  config: Record<string, unknown>;
  metrics: BacktestMetrics;
  trades: BacktestTrade[];
  equity_curve: BacktestEquityPoint[];
  execution_time_seconds: number;
};

export const DEFAULT_BACKTEST_CONFIG: Omit<BacktestConfig, "symbol" | "start_date" | "end_date"> = {
  higher_timeframe: "1D",
  lower_timeframe: "4H",
  initial_capital: 100_000,
  risk_per_trade: 0.01,
  lookback_periods: 50,
  confluence_threshold: 3,
  validation_pass_threshold: 0.6,
  atr_stop_multiplier: 1.5,
  breakeven_at_r: 1.0,
  trailing_stop_at_r: 2.0,
};
