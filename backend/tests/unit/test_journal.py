"""Tests for trade journal module.

TDD approach: Tests written first to define expected behavior.
"""


import pytest

from trader.journal import (
    JournalEntry,
    TradeOutcome,
    calculate_analytics,
    create_journal_entry,
)


class TestJournalEntry:
    """Tests for JournalEntry data model."""

    def test_creates_entry_with_required_fields(self) -> None:
        """Journal entry captures essential trade data."""
        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=48500.0,
            stop_loss=47500.0,
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        assert entry.symbol == "DJI"
        assert entry.direction == "long"
        assert entry.entry_price == 48000.0
        assert entry.exit_price == 48500.0
        assert entry.stop_loss == 47500.0
        assert entry.position_size == 10

    def test_calculates_pnl_for_long_trade(self) -> None:
        """P&L calculated correctly for winning long trade."""
        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=48500.0,
            stop_loss=47500.0,
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        # P&L = (exit - entry) * position_size = 500 * 10 = 5000
        assert entry.pnl == 5000.0

    def test_calculates_pnl_for_short_trade(self) -> None:
        """P&L calculated correctly for winning short trade."""
        entry = create_journal_entry(
            symbol="SPX",
            direction="short",
            entry_price=6000.0,
            exit_price=5900.0,
            stop_loss=6100.0,
            position_size=5,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        # P&L = (entry - exit) * position_size = 100 * 5 = 500
        assert entry.pnl == 500.0

    def test_calculates_pnl_for_losing_long_trade(self) -> None:
        """P&L is negative for losing long trade."""
        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=47500.0,  # Stopped out
            stop_loss=47500.0,
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        # P&L = (exit - entry) * position_size = -500 * 10 = -5000
        assert entry.pnl == -5000.0

    def test_calculates_r_multiple_for_winner(self) -> None:
        """R-multiple shows profit relative to risk."""
        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=49000.0,  # +1000 profit
            stop_loss=47500.0,   # 500 risk
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        # R = profit / risk = 1000 / 500 = 2.0R
        assert entry.r_multiple == 2.0

    def test_calculates_r_multiple_for_loser(self) -> None:
        """R-multiple is -1 for full stop loss."""
        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=47500.0,  # Stopped out at stop loss
            stop_loss=47500.0,   # 500 risk
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        # R = profit / risk = -500 / 500 = -1.0R
        assert entry.r_multiple == -1.0

    def test_determines_win_outcome(self) -> None:
        """Positive P&L is a win."""
        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=48500.0,
            stop_loss=47500.0,
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        assert entry.outcome == TradeOutcome.WIN

    def test_determines_loss_outcome(self) -> None:
        """Negative P&L is a loss."""
        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=47500.0,
            stop_loss=47500.0,
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        assert entry.outcome == TradeOutcome.LOSS

    def test_determines_breakeven_outcome(self) -> None:
        """Zero P&L is breakeven."""
        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=48000.0,  # Closed at entry
            stop_loss=47500.0,
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        assert entry.outcome == TradeOutcome.BREAKEVEN

    def test_includes_optional_fields(self) -> None:
        """Entry can include optional metadata."""
        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=48500.0,
            stop_loss=47500.0,
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
            timeframe="1D",
            targets=[48500.0, 49000.0],
            exit_reason="target_hit",
            notes="Clean signal bar entry",
            workflow_id="wf_123",
        )

        assert entry.timeframe == "1D"
        assert entry.targets == [48500.0, 49000.0]
        assert entry.exit_reason == "target_hit"
        assert entry.notes == "Clean signal bar entry"
        assert entry.workflow_id == "wf_123"

    def test_generates_unique_id(self) -> None:
        """Each entry gets a unique ID."""
        entry1 = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=48500.0,
            stop_loss=47500.0,
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )
        entry2 = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=48500.0,
            stop_loss=47500.0,
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        assert entry1.id != entry2.id
        assert entry1.id.startswith("trade_")


class TestJournalAnalytics:
    """Tests for analytics calculations from journal entries."""

    @pytest.fixture
    def sample_entries(self) -> list[JournalEntry]:
        """Create sample journal entries for testing."""
        return [
            # Win: +2R
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=48000.0,
                exit_price=49000.0,
                stop_loss=47500.0,
                position_size=10,
                entry_time="2024-12-01T10:00:00Z",
                exit_time="2024-12-01T14:00:00Z",
            ),
            # Win: +1R
            create_journal_entry(
                symbol="SPX",
                direction="short",
                entry_price=6000.0,
                exit_price=5900.0,
                stop_loss=6100.0,
                position_size=5,
                entry_time="2024-12-02T10:00:00Z",
                exit_time="2024-12-02T14:00:00Z",
            ),
            # Loss: -1R
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=48000.0,
                exit_price=47500.0,
                stop_loss=47500.0,
                position_size=10,
                entry_time="2024-12-03T10:00:00Z",
                exit_time="2024-12-03T14:00:00Z",
            ),
            # Win: +3R
            create_journal_entry(
                symbol="BTCUSD",
                direction="long",
                entry_price=40000.0,
                exit_price=43000.0,
                stop_loss=39000.0,
                position_size=1,
                entry_time="2024-12-04T10:00:00Z",
                exit_time="2024-12-04T14:00:00Z",
            ),
        ]

    def test_calculates_total_trades(self, sample_entries: list[JournalEntry]) -> None:
        """Analytics shows total number of trades."""
        analytics = calculate_analytics(sample_entries)
        assert analytics.total_trades == 4

    def test_calculates_win_loss_count(
        self, sample_entries: list[JournalEntry]
    ) -> None:
        """Analytics tracks wins and losses separately."""
        analytics = calculate_analytics(sample_entries)
        assert analytics.wins == 3
        assert analytics.losses == 1
        assert analytics.breakevens == 0

    def test_calculates_win_rate(self, sample_entries: list[JournalEntry]) -> None:
        """Win rate is percentage of winning trades."""
        analytics = calculate_analytics(sample_entries)
        # 3 wins / 4 trades = 75%
        assert analytics.win_rate == 75.0

    def test_calculates_total_pnl(self, sample_entries: list[JournalEntry]) -> None:
        """Total P&L sums all trades."""
        analytics = calculate_analytics(sample_entries)
        # +10000 + 500 - 5000 + 3000 = 8500
        assert analytics.total_pnl == 8500.0

    def test_calculates_average_r_multiple(
        self, sample_entries: list[JournalEntry]
    ) -> None:
        """Average R shows expected R per trade."""
        analytics = calculate_analytics(sample_entries)
        # (2 + 1 - 1 + 3) / 4 = 1.25R
        assert analytics.average_r == 1.25

    def test_finds_largest_winner(self, sample_entries: list[JournalEntry]) -> None:
        """Identifies the best trade."""
        analytics = calculate_analytics(sample_entries)
        # DJI first trade: (49000-48000) * 10 = +10000
        assert analytics.largest_win == 10000.0

    def test_finds_largest_loser(self, sample_entries: list[JournalEntry]) -> None:
        """Identifies the worst trade."""
        analytics = calculate_analytics(sample_entries)
        # DJI stopped out: -5000
        assert analytics.largest_loss == -5000.0

    def test_calculates_profit_factor(self, sample_entries: list[JournalEntry]) -> None:
        """Profit factor = gross wins / gross losses."""
        analytics = calculate_analytics(sample_entries)
        # Gross wins: 10000 + 500 + 3000 = 13500
        # Gross losses: 5000
        # Profit factor: 13500 / 5000 = 2.7
        assert analytics.profit_factor == 2.7

    def test_handles_empty_entries(self) -> None:
        """Analytics handles empty list gracefully."""
        analytics = calculate_analytics([])
        assert analytics.total_trades == 0
        assert analytics.wins == 0
        assert analytics.losses == 0
        assert analytics.win_rate == 0.0
        assert analytics.total_pnl == 0.0
        assert analytics.average_r == 0.0
        assert analytics.profit_factor == 0.0

    def test_handles_all_winners(self) -> None:
        """Analytics handles 100% win rate."""
        entries = [
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=48000.0,
                exit_price=48500.0,
                stop_loss=47500.0,
                position_size=10,
                entry_time="2024-12-01T10:00:00Z",
                exit_time="2024-12-01T14:00:00Z",
            ),
        ]
        analytics = calculate_analytics(entries)
        assert analytics.win_rate == 100.0
        assert analytics.profit_factor == float("inf") or analytics.profit_factor > 1000

    def test_handles_all_losers(self) -> None:
        """Analytics handles 0% win rate."""
        entries = [
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=48000.0,
                exit_price=47500.0,
                stop_loss=47500.0,
                position_size=10,
                entry_time="2024-12-01T10:00:00Z",
                exit_time="2024-12-01T14:00:00Z",
            ),
        ]
        analytics = calculate_analytics(entries)
        assert analytics.win_rate == 0.0
        assert analytics.profit_factor == 0.0


class TestEdgeCases:
    """Tests for edge cases and validation."""

    def test_handles_zero_risk_gracefully(self) -> None:
        """R-multiple handles zero risk (stop = entry)."""
        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=48500.0,
            stop_loss=48000.0,  # Stop at entry = 0 risk
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        # Should return inf or a very large number, not crash
        assert entry.r_multiple == float("inf") or entry.r_multiple > 1000

    def test_handles_zero_position_size(self) -> None:
        """P&L is zero with zero position size."""
        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=48500.0,
            stop_loss=47500.0,
            position_size=0,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )

        assert entry.pnl == 0.0
