"""Unit tests for backtesting metrics calculator."""

from datetime import datetime

import pytest

from trader.backtesting.metrics import MetricsCalculator
from trader.backtesting.models import (
    EquityCurvePoint,
    ExitReason,
    SimulatedTrade,
    TradeDirection,
    TradeStatus,
)


def create_closed_trade(
    entry_price: float,
    exit_price: float,
    direction: TradeDirection = TradeDirection.LONG,
    position_size: float = 1.0,
    stop_loss: float | None = None,
    category: str = "with_trend",
) -> SimulatedTrade:
    """Helper to create a closed trade for testing."""
    if stop_loss is None:
        stop_loss = entry_price - 5.0 if direction == TradeDirection.LONG else entry_price + 5.0

    trade = SimulatedTrade(
        entry_time=datetime(2023, 1, 1),
        entry_price=entry_price,
        direction=direction,
        position_size=position_size,
        stop_loss=stop_loss,
        targets=[],
        trade_category=category,
        confluence_score=3,
        entry_bar_index=0,
        atr_at_entry=2.0,
    )

    trade.status = TradeStatus.CLOSED
    trade.exit_time = datetime(2023, 1, 2)
    trade.exit_price = exit_price
    trade.exit_reason = ExitReason.TARGET_1 if exit_price > entry_price else ExitReason.STOP_LOSS

    return trade


class TestMetricsCalculator:
    """Tests for MetricsCalculator class."""

    def test_empty_trades(self) -> None:
        """Test calculating metrics with no trades."""
        calc = MetricsCalculator()
        metrics = calc.calculate_metrics([], [], 100000.0)

        assert metrics.total_trades == 0
        assert metrics.win_rate == 0.0
        assert metrics.total_pnl == 0.0

    def test_single_winning_trade(self) -> None:
        """Test metrics with one winning trade."""
        calc = MetricsCalculator()

        trades = [create_closed_trade(100.0, 110.0)]
        equity = [
            EquityCurvePoint(datetime(2023, 1, 1), 0, 100000.0),
            EquityCurvePoint(datetime(2023, 1, 2), 1, 100010.0),
        ]

        metrics = calc.calculate_metrics(trades, equity, 100000.0)

        assert metrics.total_trades == 1
        assert metrics.winning_trades == 1
        assert metrics.losing_trades == 0
        assert metrics.win_rate == 1.0
        assert metrics.total_pnl == 10.0  # (110 - 100) * 1

    def test_single_losing_trade(self) -> None:
        """Test metrics with one losing trade."""
        calc = MetricsCalculator()

        trades = [create_closed_trade(100.0, 90.0)]
        equity = [
            EquityCurvePoint(datetime(2023, 1, 1), 0, 100000.0),
            EquityCurvePoint(datetime(2023, 1, 2), 1, 99990.0),
        ]

        metrics = calc.calculate_metrics(trades, equity, 100000.0)

        assert metrics.total_trades == 1
        assert metrics.winning_trades == 0
        assert metrics.losing_trades == 1
        assert metrics.win_rate == 0.0
        assert metrics.total_pnl == -10.0

    def test_mixed_trades(self) -> None:
        """Test metrics with winning and losing trades."""
        calc = MetricsCalculator()

        trades = [
            create_closed_trade(100.0, 120.0),  # +20
            create_closed_trade(100.0, 110.0),  # +10
            create_closed_trade(100.0, 90.0),   # -10
        ]

        equity = [
            EquityCurvePoint(datetime(2023, 1, 1), 0, 100000.0),
            EquityCurvePoint(datetime(2023, 1, 2), 1, 100020.0),
            EquityCurvePoint(datetime(2023, 1, 3), 2, 100030.0),
            EquityCurvePoint(datetime(2023, 1, 4), 3, 100020.0),
        ]

        metrics = calc.calculate_metrics(trades, equity, 100000.0)

        assert metrics.total_trades == 3
        assert metrics.winning_trades == 2
        assert metrics.losing_trades == 1
        assert metrics.win_rate == pytest.approx(0.6667, rel=0.01)
        assert metrics.total_pnl == 20.0
        assert metrics.largest_winner == 20.0
        assert metrics.largest_loser == -10.0

    def test_profit_factor(self) -> None:
        """Test profit factor calculation."""
        calc = MetricsCalculator()

        trades = [
            create_closed_trade(100.0, 130.0),  # +30
            create_closed_trade(100.0, 90.0),   # -10
            create_closed_trade(100.0, 85.0),   # -15
        ]

        equity = [
            EquityCurvePoint(datetime(2023, 1, i + 1), i, 100000.0 + i * 5)
            for i in range(4)
        ]

        metrics = calc.calculate_metrics(trades, equity, 100000.0)

        # Profit factor = gross profit / gross loss = 30 / 25 = 1.2
        assert metrics.profit_factor == pytest.approx(1.2, rel=0.01)

    def test_average_r_multiple(self) -> None:
        """Test average R-multiple calculation."""
        calc = MetricsCalculator()

        # Create trades with known R-multiples
        # Trade 1: Entry 100, exit 110, stop 95 -> R = 10/5 = 2
        # Trade 2: Entry 100, exit 95, stop 95 -> R = -5/5 = -1

        trades = [
            create_closed_trade(100.0, 110.0, stop_loss=95.0),
            create_closed_trade(100.0, 95.0, stop_loss=95.0),
        ]

        equity = [
            EquityCurvePoint(datetime(2023, 1, i + 1), i, 100000.0)
            for i in range(3)
        ]

        metrics = calc.calculate_metrics(trades, equity, 100000.0)

        # Average R = (2 + (-1)) / 2 = 0.5
        assert metrics.average_r == pytest.approx(0.5, rel=0.01)

    def test_category_breakdown(self) -> None:
        """Test metrics breakdown by trade category."""
        calc = MetricsCalculator()

        trades = [
            create_closed_trade(100.0, 110.0, category="with_trend"),
            create_closed_trade(100.0, 105.0, category="with_trend"),
            create_closed_trade(100.0, 95.0, category="counter_trend"),
        ]

        equity = [
            EquityCurvePoint(datetime(2023, 1, i + 1), i, 100000.0)
            for i in range(4)
        ]

        metrics = calc.calculate_metrics(trades, equity, 100000.0)

        assert "with_trend" in metrics.by_category
        assert "counter_trend" in metrics.by_category

        assert metrics.by_category["with_trend"]["total_trades"] == 2
        assert metrics.by_category["with_trend"]["winning_trades"] == 2

        assert metrics.by_category["counter_trend"]["total_trades"] == 1
        assert metrics.by_category["counter_trend"]["losing_trades"] == 1


class TestDrawdownCalculation:
    """Tests for drawdown calculation."""

    def test_no_drawdown(self) -> None:
        """Test when equity only goes up."""
        calc = MetricsCalculator()

        # Need at least one trade for metrics to be calculated
        trades = [create_closed_trade(100.0, 110.0)]  # One winning trade

        equity = [
            EquityCurvePoint(datetime(2023, 1, 1), 0, 100000.0),
            EquityCurvePoint(datetime(2023, 1, 2), 1, 101000.0),
            EquityCurvePoint(datetime(2023, 1, 3), 2, 102000.0),
        ]

        metrics = calc.calculate_metrics(trades, equity, 100000.0)

        assert metrics.max_drawdown == 0.0
        assert metrics.max_drawdown_duration == 0

    def test_simple_drawdown(self) -> None:
        """Test a simple drawdown calculation."""
        calc = MetricsCalculator()

        # Need at least one trade for metrics to be calculated
        trades = [create_closed_trade(100.0, 110.0)]  # One winning trade

        equity = [
            EquityCurvePoint(datetime(2023, 1, 1), 0, 100000.0),
            EquityCurvePoint(datetime(2023, 1, 2), 1, 110000.0),  # Peak
            EquityCurvePoint(datetime(2023, 1, 3), 2, 99000.0),   # 10% DD
            EquityCurvePoint(datetime(2023, 1, 4), 3, 105000.0),
        ]

        metrics = calc.calculate_metrics(trades, equity, 100000.0)

        # Max drawdown = (110000 - 99000) / 110000 = 0.10
        assert metrics.max_drawdown == pytest.approx(0.10, rel=0.01)
        assert metrics.max_drawdown_duration >= 1

    def test_recovery_and_new_peak(self) -> None:
        """Test drawdown recovery and new peak."""
        calc = MetricsCalculator()

        # Need at least one trade for metrics to be calculated
        trades = [create_closed_trade(100.0, 110.0)]  # One winning trade

        equity = [
            EquityCurvePoint(datetime(2023, 1, 1), 0, 100000.0),
            EquityCurvePoint(datetime(2023, 1, 2), 1, 105000.0),
            EquityCurvePoint(datetime(2023, 1, 3), 2, 95000.0),   # 9.5% DD
            EquityCurvePoint(datetime(2023, 1, 4), 3, 100000.0),
            EquityCurvePoint(datetime(2023, 1, 5), 4, 110000.0),  # New peak
        ]

        metrics = calc.calculate_metrics(trades, equity, 100000.0)

        # Max drawdown should be from 105000 to 95000
        expected_dd = (105000 - 95000) / 105000
        assert metrics.max_drawdown == pytest.approx(expected_dd, rel=0.01)
