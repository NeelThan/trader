"""Unit tests for backtesting models."""

from datetime import datetime

import pytest

from trader.backtesting.models import (
    BacktestConfig,
    BacktestMetrics,
    EquityCurvePoint,
    ExitReason,
    OptimizationParameter,
    SimulatedTrade,
    TradeDirection,
    TradeStatus,
)


class TestBacktestConfig:
    """Tests for BacktestConfig dataclass."""

    def test_create_with_defaults(self) -> None:
        """Test creating config with default values."""
        config = BacktestConfig(
            symbol="DJI",
            higher_timeframe="1D",
            lower_timeframe="4H",
            start_date=datetime(2021, 1, 1),
            end_date=datetime(2026, 1, 1),
        )

        assert config.symbol == "DJI"
        assert config.initial_capital == 100000.0
        assert config.risk_per_trade == 0.01
        assert config.lookback_periods == 50
        assert config.confluence_threshold == 3

    def test_to_dict(self) -> None:
        """Test conversion to dictionary."""
        config = BacktestConfig(
            symbol="SPX",
            higher_timeframe="1W",
            lower_timeframe="1D",
            start_date=datetime(2020, 1, 1),
            end_date=datetime(2025, 1, 1),
            initial_capital=50000.0,
        )

        result = config.to_dict()

        assert result["symbol"] == "SPX"
        assert result["higher_timeframe"] == "1W"
        assert result["initial_capital"] == 50000.0
        assert "start_date" in result
        assert "end_date" in result


class TestSimulatedTrade:
    """Tests for SimulatedTrade dataclass."""

    def test_create_trade(self) -> None:
        """Test creating a simulated trade."""
        trade = SimulatedTrade(
            entry_time=datetime(2023, 6, 1, 10, 0),
            entry_price=100.0,
            direction=TradeDirection.LONG,
            position_size=10.0,
            stop_loss=95.0,
            targets=[105.0, 110.0],
            trade_category="with_trend",
            confluence_score=4,
            entry_bar_index=50,
            atr_at_entry=2.5,
        )

        assert trade.is_open is True
        assert trade.pnl == 0.0
        assert trade.r_multiple == 0.0

    def test_closed_trade_pnl_long(self) -> None:
        """Test PnL calculation for closed long trade."""
        trade = SimulatedTrade(
            entry_time=datetime(2023, 6, 1),
            entry_price=100.0,
            direction=TradeDirection.LONG,
            position_size=10.0,
            stop_loss=95.0,
            targets=[105.0],
            trade_category="with_trend",
            confluence_score=3,
            entry_bar_index=50,
            atr_at_entry=2.0,
        )

        # Close at 110 (winning trade)
        trade.status = TradeStatus.TARGET_HIT
        trade.exit_price = 110.0
        trade.exit_time = datetime(2023, 6, 5)

        assert trade.pnl == 100.0  # (110 - 100) * 10
        assert trade.r_multiple == 2.0  # (110 - 100) / (100 - 95) = 10/5 = 2

    def test_closed_trade_pnl_short(self) -> None:
        """Test PnL calculation for closed short trade."""
        trade = SimulatedTrade(
            entry_time=datetime(2023, 6, 1),
            entry_price=100.0,
            direction=TradeDirection.SHORT,
            position_size=10.0,
            stop_loss=105.0,
            targets=[95.0],
            trade_category="counter_trend",
            confluence_score=5,
            entry_bar_index=50,
            atr_at_entry=2.0,
        )

        # Close at 90 (winning trade)
        trade.status = TradeStatus.TARGET_HIT
        trade.exit_price = 90.0
        trade.exit_time = datetime(2023, 6, 5)

        assert trade.pnl == 100.0  # (100 - 90) * 10
        assert trade.r_multiple == 2.0  # (100 - 90) / (105 - 100) = 10/5 = 2

    def test_losing_trade_r_multiple(self) -> None:
        """Test R-multiple for losing trade."""
        trade = SimulatedTrade(
            entry_time=datetime(2023, 6, 1),
            entry_price=100.0,
            direction=TradeDirection.LONG,
            position_size=10.0,
            stop_loss=95.0,
            targets=[110.0],
            trade_category="with_trend",
            confluence_score=3,
            entry_bar_index=50,
            atr_at_entry=2.0,
        )

        # Close at stop loss
        trade.status = TradeStatus.STOPPED_OUT
        trade.exit_price = 95.0
        trade.exit_time = datetime(2023, 6, 2)

        assert trade.pnl == -50.0  # (95 - 100) * 10
        assert trade.r_multiple == -1.0  # (95 - 100) / 5 = -1

    def test_to_dict(self) -> None:
        """Test conversion to dictionary."""
        trade = SimulatedTrade(
            entry_time=datetime(2023, 6, 1),
            entry_price=100.0,
            direction=TradeDirection.LONG,
            position_size=10.0,
            stop_loss=95.0,
            targets=[105.0],
            trade_category="with_trend",
            confluence_score=3,
            entry_bar_index=50,
            atr_at_entry=2.0,
        )

        result = trade.to_dict()

        assert result["entry_price"] == 100.0
        assert result["direction"] == "long"
        assert result["status"] == "open"


class TestEquityCurvePoint:
    """Tests for EquityCurvePoint dataclass."""

    def test_create_point(self) -> None:
        """Test creating equity curve point."""
        point = EquityCurvePoint(
            timestamp=datetime(2023, 6, 1),
            bar_index=100,
            equity=105000.0,
            open_pnl=1000.0,
            closed_pnl=4000.0,
            trade_count=5,
        )

        assert point.equity == 105000.0
        assert point.trade_count == 5

    def test_to_dict(self) -> None:
        """Test conversion to dictionary."""
        point = EquityCurvePoint(
            timestamp=datetime(2023, 6, 1),
            bar_index=100,
            equity=105000.0,
        )

        result = point.to_dict()

        assert "timestamp" in result
        assert result["equity"] == 105000.0


class TestBacktestMetrics:
    """Tests for BacktestMetrics dataclass."""

    def test_default_values(self) -> None:
        """Test default metric values."""
        metrics = BacktestMetrics()

        assert metrics.total_trades == 0
        assert metrics.win_rate == 0.0
        assert metrics.sharpe_ratio == 0.0

    def test_to_dict(self) -> None:
        """Test conversion to dictionary."""
        metrics = BacktestMetrics(
            total_trades=100,
            winning_trades=60,
            losing_trades=35,
            breakeven_trades=5,
            win_rate=0.60,
            profit_factor=2.5,
            total_pnl=25000.0,
        )

        result = metrics.to_dict()

        assert result["total_trades"] == 100
        assert result["win_rate"] == 0.60
        assert result["profit_factor"] == 2.5


class TestOptimizationParameter:
    """Tests for OptimizationParameter dataclass."""

    def test_get_values(self) -> None:
        """Test generating parameter values for grid search."""
        param = OptimizationParameter(
            name="confluence_threshold",
            min_value=2.0,
            max_value=6.0,
            step=1.0,
        )

        values = param.get_values()

        assert values == [2.0, 3.0, 4.0, 5.0, 6.0]

    def test_get_values_fractional(self) -> None:
        """Test generating fractional parameter values."""
        param = OptimizationParameter(
            name="atr_stop_multiplier",
            min_value=1.0,
            max_value=2.0,
            step=0.25,
        )

        values = param.get_values()

        assert len(values) == 5
        assert values[0] == 1.0
        assert values[-1] == 2.0
