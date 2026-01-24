"""Data models for the backtesting system.

This module defines the core data structures used throughout
the backtesting engine, including configuration, trades, and results.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class TradeDirection(Enum):
    """Trade direction enumeration."""

    LONG = "long"
    SHORT = "short"


class TradeStatus(Enum):
    """Trade status enumeration."""

    OPEN = "open"
    CLOSED = "closed"
    STOPPED_OUT = "stopped_out"
    TARGET_HIT = "target_hit"
    BREAKEVEN = "breakeven"


class ExitReason(Enum):
    """Reason for trade exit."""

    STOP_LOSS = "stop_loss"
    TARGET_1 = "target_1"
    TARGET_2 = "target_2"
    TARGET_3 = "target_3"
    TRAILING_STOP = "trailing_stop"
    END_OF_DATA = "end_of_data"
    MANUAL = "manual"


@dataclass(frozen=True)
class BacktestConfig:
    """Configuration for a backtest run.

    Attributes:
        symbol: Market symbol to backtest (e.g., "DJI").
        higher_timeframe: Higher timeframe for trend (e.g., "1D").
        lower_timeframe: Lower timeframe for entry (e.g., "4H").
        start_date: Start date for backtest.
        end_date: End date for backtest.
        initial_capital: Starting capital.
        risk_per_trade: Percentage of capital to risk per trade.
        lookback_periods: Bars for pivot detection.
        confluence_threshold: Minimum confluence score.
        validation_pass_threshold: Minimum pass percentage (0-1).
        atr_stop_multiplier: ATR multiplier for stop loss.
        breakeven_at_r: R-multiple at which to move stop to breakeven.
        trailing_stop_at_r: R-multiple at which to start trailing.
        trailing_stop_atr: ATR multiplier for trailing stop distance.
    """

    symbol: str
    higher_timeframe: str
    lower_timeframe: str
    start_date: datetime
    end_date: datetime
    initial_capital: float = 100000.0
    risk_per_trade: float = 0.01  # 1%
    lookback_periods: int = 50
    confluence_threshold: int = 3
    validation_pass_threshold: float = 0.6  # 60%
    atr_stop_multiplier: float = 1.5
    breakeven_at_r: float = 1.0
    trailing_stop_at_r: float = 2.0
    trailing_stop_atr: float = 1.0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "symbol": self.symbol,
            "higher_timeframe": self.higher_timeframe,
            "lower_timeframe": self.lower_timeframe,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "initial_capital": self.initial_capital,
            "risk_per_trade": self.risk_per_trade,
            "lookback_periods": self.lookback_periods,
            "confluence_threshold": self.confluence_threshold,
            "validation_pass_threshold": self.validation_pass_threshold,
            "atr_stop_multiplier": self.atr_stop_multiplier,
            "breakeven_at_r": self.breakeven_at_r,
            "trailing_stop_at_r": self.trailing_stop_at_r,
            "trailing_stop_atr": self.trailing_stop_atr,
        }


@dataclass
class SimulatedTrade:
    """A simulated trade during backtesting.

    Mutable dataclass to track trade state during simulation.
    """

    entry_time: datetime
    entry_price: float
    direction: TradeDirection
    position_size: float
    stop_loss: float
    targets: list[float]
    trade_category: str  # "with_trend", "counter_trend", "reversal_attempt"
    confluence_score: int
    entry_bar_index: int
    atr_at_entry: float

    # Updated during simulation
    status: TradeStatus = TradeStatus.OPEN
    exit_time: datetime | None = None
    exit_price: float | None = None
    exit_reason: ExitReason | None = None
    exit_bar_index: int | None = None
    current_stop: float | None = None
    highest_price: float | None = None  # For trailing stop (longs)
    lowest_price: float | None = None   # For trailing stop (shorts)
    at_breakeven: bool = False

    @property
    def is_open(self) -> bool:
        """Check if trade is still open."""
        return self.status == TradeStatus.OPEN

    @property
    def pnl(self) -> float:
        """Calculate profit/loss in price units."""
        if self.exit_price is None:
            return 0.0

        if self.direction == TradeDirection.LONG:
            return (self.exit_price - self.entry_price) * self.position_size
        else:
            return (self.entry_price - self.exit_price) * self.position_size

    @property
    def r_multiple(self) -> float:
        """Calculate R-multiple (profit in terms of initial risk)."""
        if self.exit_price is None:
            return 0.0

        risk = abs(self.entry_price - self.stop_loss)
        if risk == 0:
            return 0.0

        if self.direction == TradeDirection.LONG:
            return (self.exit_price - self.entry_price) / risk
        else:
            return (self.entry_price - self.exit_price) / risk

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "entry_time": self.entry_time.isoformat(),
            "entry_price": self.entry_price,
            "direction": self.direction.value,
            "position_size": self.position_size,
            "stop_loss": self.stop_loss,
            "targets": self.targets,
            "trade_category": self.trade_category,
            "confluence_score": self.confluence_score,
            "entry_bar_index": self.entry_bar_index,
            "atr_at_entry": self.atr_at_entry,
            "status": self.status.value,
            "exit_time": self.exit_time.isoformat() if self.exit_time else None,
            "exit_price": self.exit_price,
            "exit_reason": self.exit_reason.value if self.exit_reason else None,
            "exit_bar_index": self.exit_bar_index,
            "pnl": self.pnl,
            "r_multiple": self.r_multiple,
            "at_breakeven": self.at_breakeven,
        }


@dataclass
class EquityCurvePoint:
    """Single point on the equity curve."""

    timestamp: datetime
    bar_index: int
    equity: float
    open_pnl: float = 0.0
    closed_pnl: float = 0.0
    trade_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "bar_index": self.bar_index,
            "equity": self.equity,
            "open_pnl": self.open_pnl,
            "closed_pnl": self.closed_pnl,
            "trade_count": self.trade_count,
        }


@dataclass
class BacktestMetrics:
    """Performance metrics from a backtest run.

    Attributes:
        total_trades: Total number of trades taken.
        winning_trades: Number of profitable trades.
        losing_trades: Number of losing trades.
        breakeven_trades: Number of breakeven trades.
        win_rate: Percentage of winning trades.
        profit_factor: Gross profit / gross loss.
        total_pnl: Total profit/loss.
        average_pnl: Average profit/loss per trade.
        average_winner: Average profit on winning trades.
        average_loser: Average loss on losing trades.
        average_r: Average R-multiple.
        largest_winner: Largest winning trade.
        largest_loser: Largest losing trade.
        max_drawdown: Maximum drawdown percentage.
        max_drawdown_duration: Duration of max drawdown in bars.
        sharpe_ratio: Annualized Sharpe ratio.
        sortino_ratio: Annualized Sortino ratio.
        calmar_ratio: Annualized return / max drawdown.
        by_category: Metrics broken down by trade category.
    """

    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    breakeven_trades: int = 0
    win_rate: float = 0.0
    profit_factor: float = 0.0
    total_pnl: float = 0.0
    average_pnl: float = 0.0
    average_winner: float = 0.0
    average_loser: float = 0.0
    average_r: float = 0.0
    largest_winner: float = 0.0
    largest_loser: float = 0.0
    max_drawdown: float = 0.0
    max_drawdown_duration: int = 0
    sharpe_ratio: float = 0.0
    sortino_ratio: float = 0.0
    calmar_ratio: float = 0.0
    by_category: dict[str, dict[str, Any]] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "total_trades": self.total_trades,
            "winning_trades": self.winning_trades,
            "losing_trades": self.losing_trades,
            "breakeven_trades": self.breakeven_trades,
            "win_rate": self.win_rate,
            "profit_factor": self.profit_factor,
            "total_pnl": self.total_pnl,
            "average_pnl": self.average_pnl,
            "average_winner": self.average_winner,
            "average_loser": self.average_loser,
            "average_r": self.average_r,
            "largest_winner": self.largest_winner,
            "largest_loser": self.largest_loser,
            "max_drawdown": self.max_drawdown,
            "max_drawdown_duration": self.max_drawdown_duration,
            "sharpe_ratio": self.sharpe_ratio,
            "sortino_ratio": self.sortino_ratio,
            "calmar_ratio": self.calmar_ratio,
            "by_category": self.by_category,
        }


@dataclass
class BacktestResult:
    """Complete result from a backtest run.

    Attributes:
        config: Backtest configuration used.
        metrics: Performance metrics.
        trades: List of simulated trades.
        equity_curve: Equity curve data points.
        execution_time_seconds: Time to run the backtest.
    """

    config: BacktestConfig
    metrics: BacktestMetrics
    trades: list[SimulatedTrade]
    equity_curve: list[EquityCurvePoint]
    execution_time_seconds: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for storage."""
        return {
            "config": self.config.to_dict(),
            "metrics": self.metrics.to_dict(),
            "trades": [t.to_dict() for t in self.trades],
            "equity_curve": [e.to_dict() for e in self.equity_curve],
            "execution_time_seconds": self.execution_time_seconds,
        }


@dataclass
class OptimizationParameter:
    """Parameter definition for optimization.

    Attributes:
        name: Parameter name (must match BacktestConfig field).
        min_value: Minimum value to test.
        max_value: Maximum value to test.
        step: Step size for grid search.
    """

    name: str
    min_value: float
    max_value: float
    step: float

    def get_values(self) -> list[float]:
        """Get all values to test in grid search."""
        values = []
        current = self.min_value
        while current <= self.max_value:
            values.append(current)
            current += self.step
        return values


@dataclass
class OptimizationConfig:
    """Configuration for walk-forward optimization.

    Attributes:
        base_config: Base backtest configuration.
        parameters: Parameters to optimize.
        in_sample_months: Number of months for in-sample period.
        out_of_sample_months: Number of months for out-of-sample period.
        optimization_target: Metric to optimize (e.g., "sharpe_ratio").
    """

    base_config: BacktestConfig
    parameters: list[OptimizationParameter]
    in_sample_months: int = 6
    out_of_sample_months: int = 1
    optimization_target: str = "sharpe_ratio"


@dataclass
class OptimizationResult:
    """Result from walk-forward optimization.

    Attributes:
        windows: Results for each walk-forward window.
        best_parameters: Best parameter values found.
        combined_metrics: Metrics from combined out-of-sample results.
        robustness_score: Measure of parameter stability across windows.
    """

    windows: list[dict[str, Any]]
    best_parameters: dict[str, float]
    combined_metrics: BacktestMetrics
    robustness_score: float
