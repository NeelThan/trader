"""Backtesting engine for historical replay.

This module provides the main backtesting engine that replays
historical data bar-by-bar, detecting signals and simulating trades.
"""

import time
from datetime import datetime

from trader.backtesting.data_loader import DataLoader
from trader.backtesting.metrics import MetricsCalculator
from trader.backtesting.models import (
    BacktestConfig,
    BacktestMetrics,
    BacktestResult,
    EquityCurvePoint,
    SimulatedTrade,
)
from trader.backtesting.signals_processor import SignalsProcessor
from trader.backtesting.trade_simulator import TradeSimulator
from trader.market_data.models import OHLCBar
from trader.position_sizing import calculate_position_size


class BacktestEngine:
    """Engine for running historical backtests.

    Replays historical data bar-by-bar, detecting entry signals,
    opening trades, and managing positions through to exit.
    """

    def __init__(
        self,
        data_loader: DataLoader,
    ) -> None:
        """Initialize the backtest engine.

        Args:
            data_loader: Data loader for historical data.
        """
        self.data_loader = data_loader
        self._metrics_calculator = MetricsCalculator()

    async def run(self, config: BacktestConfig) -> BacktestResult:
        """Run a backtest with the given configuration.

        Args:
            config: Backtest configuration.

        Returns:
            BacktestResult with trades, metrics, and equity curve.
        """
        start_time = time.time()

        # Initialize components
        signals_processor = SignalsProcessor(
            lookback_periods=config.lookback_periods,
            confluence_threshold=config.confluence_threshold,
            validation_threshold=config.validation_pass_threshold,
            atr_stop_multiplier=config.atr_stop_multiplier,
        )

        trade_simulator = TradeSimulator(
            breakeven_at_r=config.breakeven_at_r,
            trailing_stop_at_r=config.trailing_stop_at_r,
            trailing_stop_atr=1.0,
        )

        # Load historical data
        higher_tf_bars = await self.data_loader.load_data(
            symbol=config.symbol,
            timeframe=config.higher_timeframe,
            start_date=config.start_date,
            end_date=config.end_date,
        )

        lower_tf_bars = await self.data_loader.load_data(
            symbol=config.symbol,
            timeframe=config.lower_timeframe,
            start_date=config.start_date,
            end_date=config.end_date,
        )

        if not lower_tf_bars:
            return BacktestResult(
                config=config,
                metrics=BacktestMetrics(),
                trades=[],
                equity_curve=[],
                execution_time_seconds=time.time() - start_time,
            )

        # Run bar-by-bar simulation
        trades: list[SimulatedTrade] = []
        equity_curve: list[EquityCurvePoint] = []
        current_capital = config.initial_capital
        closed_pnl = 0.0

        for bar_index, bar in enumerate(lower_tf_bars):
            bar_time = self._bar_to_datetime(bar)

            # Update open trades
            open_trades = [t for t in trades if t.is_open]
            for trade in open_trades:
                trade_simulator.update_trade(trade, bar, bar_index)

                # Accumulate closed PnL
                if not trade.is_open:
                    closed_pnl += trade.pnl

            # Check for new entry signal (only if no open trades)
            if not any(t.is_open for t in trades):
                signal = signals_processor.detect_entry_signal(
                    higher_tf_bars=higher_tf_bars,
                    lower_tf_bars=lower_tf_bars,
                    bar_index=bar_index,
                )

                if signal is not None:
                    # Calculate position size
                    risk_capital = current_capital * config.risk_per_trade
                    position_result = calculate_position_size(
                        entry_price=signal.entry_price,
                        stop_loss=signal.stop_loss,
                        risk_capital=risk_capital,
                        account_balance=current_capital,
                        trade_category=signal.trade_category,  # type: ignore
                    )

                    if position_result.is_valid:
                        trade = trade_simulator.open_trade(
                            bar=bar,
                            bar_index=bar_index,
                            direction=signal.direction,
                            position_size=position_result.position_size,
                            stop_loss=signal.stop_loss,
                            targets=signal.targets,
                            trade_category=signal.trade_category,
                            confluence_score=signal.confluence_score,
                            atr=signal.atr,
                        )
                        trades.append(trade)

            # Calculate open PnL for equity curve
            open_pnl = self._calculate_open_pnl(trades, bar)

            # Record equity point
            equity = config.initial_capital + closed_pnl + open_pnl
            equity_curve.append(
                EquityCurvePoint(
                    timestamp=bar_time,
                    bar_index=bar_index,
                    equity=equity,
                    open_pnl=open_pnl,
                    closed_pnl=closed_pnl,
                    trade_count=len([t for t in trades if not t.is_open]),
                )
            )

            # Update current capital (only with closed PnL)
            current_capital = config.initial_capital + closed_pnl

        # Close any remaining open trades at end of data
        if lower_tf_bars:
            final_bar = lower_tf_bars[-1]
            final_index = len(lower_tf_bars) - 1
            trades = trade_simulator.close_all_trades(trades, final_bar, final_index)

        # Calculate final metrics
        metrics = self._metrics_calculator.calculate_metrics(
            trades=trades,
            equity_curve=equity_curve,
            initial_capital=config.initial_capital,
        )

        execution_time = time.time() - start_time

        return BacktestResult(
            config=config,
            metrics=metrics,
            trades=trades,
            equity_curve=equity_curve,
            execution_time_seconds=execution_time,
        )

    def _calculate_open_pnl(
        self,
        trades: list[SimulatedTrade],
        current_bar: OHLCBar,
    ) -> float:
        """Calculate total open PnL for all open trades.

        Args:
            trades: List of trades.
            current_bar: Current price bar.

        Returns:
            Total open PnL.
        """
        open_pnl = 0.0
        current_price = current_bar.close

        for trade in trades:
            if not trade.is_open:
                continue

            if trade.direction.value == "long":
                pnl = (current_price - trade.entry_price) * trade.position_size
            else:
                pnl = (trade.entry_price - current_price) * trade.position_size

            open_pnl += pnl

        return open_pnl

    def _bar_to_datetime(self, bar: OHLCBar) -> datetime:
        """Convert bar time to datetime."""
        if isinstance(bar.time, int):
            return datetime.fromtimestamp(bar.time)
        else:
            if "T" in bar.time:
                return datetime.fromisoformat(bar.time.replace("Z", "+00:00"))
            else:
                return datetime.fromisoformat(bar.time)
