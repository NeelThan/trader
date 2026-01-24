"""Backtesting system for historical strategy validation.

This package provides a comprehensive backtesting framework including:
- Bar-by-bar historical replay
- Signal detection and trade simulation
- Performance metrics calculation
- Walk-forward optimization

Example usage:
    from trader.backtesting import BacktestConfig, BacktestEngine, DataLoader

    config = BacktestConfig(
        symbol="DJI",
        higher_timeframe="1D",
        lower_timeframe="4H",
        start_date=datetime(2021, 1, 1),
        end_date=datetime(2026, 1, 1),
    )

    engine = BacktestEngine(DataLoader())
    result = await engine.run(config)
    print(f"Total PnL: {result.metrics.total_pnl}")
"""

from trader.backtesting.data_loader import DataLoader
from trader.backtesting.engine import BacktestEngine
from trader.backtesting.metrics import MetricsCalculator
from trader.backtesting.models import (
    BacktestConfig,
    BacktestMetrics,
    BacktestResult,
    EquityCurvePoint,
    ExitReason,
    OptimizationConfig,
    OptimizationParameter,
    OptimizationResult,
    SimulatedTrade,
    TradeDirection,
    TradeStatus,
)
from trader.backtesting.optimizer import WalkForwardOptimizer
from trader.backtesting.signals_processor import EntrySignal, SignalsProcessor
from trader.backtesting.trade_simulator import TradeSimulator

__all__ = [
    # Engine
    "BacktestEngine",
    "DataLoader",
    # Models
    "BacktestConfig",
    "BacktestMetrics",
    "BacktestResult",
    "SimulatedTrade",
    "EquityCurvePoint",
    "TradeDirection",
    "TradeStatus",
    "ExitReason",
    # Optimization
    "OptimizationConfig",
    "OptimizationParameter",
    "OptimizationResult",
    "WalkForwardOptimizer",
    # Components
    "SignalsProcessor",
    "EntrySignal",
    "TradeSimulator",
    "MetricsCalculator",
]
