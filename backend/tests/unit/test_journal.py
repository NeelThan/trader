"""Tests for trade journal module.

TDD approach: Tests written first to define expected behavior.
"""


import pytest

from trader.journal import (
    JournalEntry,
    TradeOutcome,
    calculate_analytics,
    calculate_detailed_analytics,
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

    def test_average_r_excludes_infinite_values(self) -> None:
        """Average R-multiple excludes infinite values from zero-risk trades."""
        entries = [
            # Normal trade with 2R
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
            # Zero risk trade (infinite R)
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=48000.0,
                exit_price=48500.0,
                stop_loss=48000.0,  # Stop at entry = infinite R
                position_size=10,
                entry_time="2024-12-02T10:00:00Z",
                exit_time="2024-12-02T14:00:00Z",
            ),
            # Normal trade with 1R
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=48000.0,
                exit_price=48500.0,
                stop_loss=47500.0,
                position_size=10,
                entry_time="2024-12-03T10:00:00Z",
                exit_time="2024-12-03T14:00:00Z",
            ),
        ]
        analytics = calculate_analytics(entries)
        # Should be (2 + 1) / 2 = 1.5, not infinity
        assert analytics.average_r != float("inf")
        assert 1.0 <= analytics.average_r <= 2.0


class TestUpdateJournalEntry:
    """Tests for updating existing journal entries."""

    def test_updates_exit_price(self) -> None:
        """Update exit price recalculates P&L and R-multiple."""
        from trader.journal import update_journal_entry

        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=0.0,  # Not set initially
            stop_loss=47500.0,
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="",
        )

        # Update with exit data
        updated = update_journal_entry(
            entry,
            exit_price=48500.0,
            exit_time="2024-12-31T14:00:00Z",
            exit_reason="target_hit",
        )

        assert updated.exit_price == 48500.0
        assert updated.exit_time == "2024-12-31T14:00:00Z"
        assert updated.exit_reason == "target_hit"
        # P&L recalculated: (48500 - 48000) * 10 = 5000
        assert updated.pnl == 5000.0
        # R-multiple: 500 / 500 = 1.0R
        assert updated.r_multiple == 1.0
        assert updated.outcome == TradeOutcome.WIN

    def test_updates_notes(self) -> None:
        """Update notes without changing other fields."""
        from trader.journal import update_journal_entry

        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=48500.0,
            stop_loss=47500.0,
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
            notes="Initial note",
        )

        updated = update_journal_entry(entry, notes="Updated note")

        assert updated.notes == "Updated note"
        # Other fields unchanged
        assert updated.exit_price == 48500.0
        assert updated.pnl == 5000.0

    def test_preserves_id(self) -> None:
        """Update preserves original entry ID."""
        from trader.journal import update_journal_entry

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
        original_id = entry.id

        updated = update_journal_entry(entry, notes="New note")

        assert updated.id == original_id

    def test_updates_stop_loss_recalculates_r(self) -> None:
        """Updating stop loss recalculates R-multiple."""
        from trader.journal import update_journal_entry

        entry = create_journal_entry(
            symbol="DJI",
            direction="long",
            entry_price=48000.0,
            exit_price=49000.0,  # +1000 profit
            stop_loss=47500.0,   # 500 risk = 2R
            position_size=10,
            entry_time="2024-12-31T10:00:00Z",
            exit_time="2024-12-31T14:00:00Z",
        )
        assert entry.r_multiple == 2.0

        # Change stop to 47000 = 1000 risk
        updated = update_journal_entry(entry, stop_loss=47000.0)

        # Now R = 1000 profit / 1000 risk = 1R
        assert updated.r_multiple == 1.0
        assert updated.stop_loss == 47000.0


class TestDetailedAnalytics:
    """Tests for detailed analytics calculations."""

    @pytest.fixture
    def varied_entries(self) -> list[JournalEntry]:
        """Create varied journal entries for testing detailed analytics."""
        return [
            # DJI Win (December 2024)
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=48000.0,
                exit_price=49000.0,
                stop_loss=47500.0,
                position_size=10,
                entry_time="2024-12-01T10:00:00Z",
                exit_time="2024-12-01T14:00:00Z",
                timeframe="1D",
            ),
            # DJI Loss (December 2024)
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=48000.0,
                exit_price=47500.0,
                stop_loss=47500.0,
                position_size=10,
                entry_time="2024-12-05T10:00:00Z",
                exit_time="2024-12-05T14:00:00Z",
                timeframe="1D",
            ),
            # SPX Win (December 2024)
            create_journal_entry(
                symbol="SPX",
                direction="short",
                entry_price=6000.0,
                exit_price=5900.0,
                stop_loss=6100.0,
                position_size=5,
                entry_time="2024-12-10T10:00:00Z",
                exit_time="2024-12-10T14:00:00Z",
                timeframe="4H",
            ),
            # DJI Win (January 2025)
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=49000.0,
                exit_price=50000.0,
                stop_loss=48500.0,
                position_size=10,
                entry_time="2025-01-02T10:00:00Z",
                exit_time="2025-01-02T14:00:00Z",
                timeframe="1D",
            ),
            # SPX Win (January 2025)
            create_journal_entry(
                symbol="SPX",
                direction="long",
                entry_price=5800.0,
                exit_price=5900.0,
                stop_loss=5700.0,
                position_size=5,
                entry_time="2025-01-05T10:00:00Z",
                exit_time="2025-01-05T14:00:00Z",
                timeframe="1H",
            ),
        ]

    def test_calculates_performance_by_symbol(
        self, varied_entries: list[JournalEntry]
    ) -> None:
        """Performance is broken down by trading symbol."""
        detailed = calculate_detailed_analytics(varied_entries)

        # Should have DJI and SPX
        assert len(detailed.by_symbol) == 2

        # Find DJI performance
        dji_perf = next(s for s in detailed.by_symbol if s.symbol == "DJI")
        assert dji_perf.trades == 3
        assert dji_perf.wins == 2
        assert dji_perf.losses == 1

        # Find SPX performance
        spx_perf = next(s for s in detailed.by_symbol if s.symbol == "SPX")
        assert spx_perf.trades == 2
        assert spx_perf.wins == 2
        assert spx_perf.losses == 0

    def test_calculates_performance_by_timeframe(
        self, varied_entries: list[JournalEntry]
    ) -> None:
        """Performance is broken down by timeframe."""
        detailed = calculate_detailed_analytics(varied_entries)

        # Should have 1D, 4H, 1H
        timeframes = {t.timeframe for t in detailed.by_timeframe}
        assert timeframes == {"1D", "4H", "1H"}

        # Find 1D performance
        daily_perf = next(t for t in detailed.by_timeframe if t.timeframe == "1D")
        assert daily_perf.trades == 3
        assert daily_perf.wins == 2
        assert daily_perf.losses == 1

    def test_calculates_performance_by_month(
        self, varied_entries: list[JournalEntry]
    ) -> None:
        """Performance is broken down by month."""
        detailed = calculate_detailed_analytics(varied_entries)

        # Should have 2024-12 and 2025-01
        months = {m.month for m in detailed.by_month}
        assert months == {"2024-12", "2025-01"}

        # Find December 2024 performance
        dec_perf = next(m for m in detailed.by_month if m.month == "2024-12")
        assert dec_perf.trades == 3
        assert dec_perf.wins == 2
        assert dec_perf.losses == 1

        # Find January 2025 performance
        jan_perf = next(m for m in detailed.by_month if m.month == "2025-01")
        assert jan_perf.trades == 2
        assert jan_perf.wins == 2
        assert jan_perf.losses == 0

    def test_calculates_streaks(self, varied_entries: list[JournalEntry]) -> None:
        """Streak information is calculated correctly."""
        detailed = calculate_detailed_analytics(varied_entries)

        # Sorted by exit_time: Win, Loss, Win, Win, Win
        # Current streak = 3 (last three wins: Dec 10, Jan 2, Jan 5)
        assert detailed.streaks.current == 3
        assert detailed.streaks.best_win_streak == 3  # The last 3 wins
        assert detailed.streaks.worst_loss_streak == 1  # Only 1 loss

    def test_builds_equity_curve(self, varied_entries: list[JournalEntry]) -> None:
        """Equity curve shows cumulative P&L progression."""
        detailed = calculate_detailed_analytics(varied_entries)

        # Should have points for each unique date
        assert len(detailed.equity_curve) == 5

        # First point
        assert detailed.equity_curve[0].date == "2024-12-01"
        assert detailed.equity_curve[0].cumulative_pnl == 10000.0  # First trade
        assert detailed.equity_curve[0].trade_count == 1

        # Last point should have all trades summed
        last_point = detailed.equity_curve[-1]
        assert last_point.trade_count == 5

    def test_returns_recent_trades(self, varied_entries: list[JournalEntry]) -> None:
        """Recent trades are returned in reverse chronological order."""
        detailed = calculate_detailed_analytics(varied_entries, recent_count=3)

        assert len(detailed.recent_trades) == 3

        # Most recent first
        assert detailed.recent_trades[0].exit_time == "2025-01-05T14:00:00Z"
        assert detailed.recent_trades[1].exit_time == "2025-01-02T14:00:00Z"
        assert detailed.recent_trades[2].exit_time == "2024-12-10T14:00:00Z"

    def test_handles_empty_entries(self) -> None:
        """Detailed analytics handles empty list gracefully."""
        detailed = calculate_detailed_analytics([])

        assert detailed.by_symbol == []
        assert detailed.by_timeframe == []
        assert detailed.by_month == []
        assert detailed.streaks.current == 0
        assert detailed.streaks.best_win_streak == 0
        assert detailed.streaks.worst_loss_streak == 0
        assert detailed.equity_curve == []
        assert detailed.recent_trades == []

    def test_handles_missing_timeframe(self) -> None:
        """Entries without timeframe are grouped as 'Unknown'."""
        entries = [
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=48000.0,
                exit_price=49000.0,
                stop_loss=47500.0,
                position_size=10,
                entry_time="2024-12-01T10:00:00Z",
                exit_time="2024-12-01T14:00:00Z",
                timeframe=None,  # No timeframe
            ),
        ]

        detailed = calculate_detailed_analytics(entries)

        assert len(detailed.by_timeframe) == 1
        assert detailed.by_timeframe[0].timeframe == "Unknown"

    def test_calculates_streak_with_all_wins(self) -> None:
        """Streak is positive when all trades are wins."""
        entries = [
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=48000.0,
                exit_price=48500.0,
                stop_loss=47500.0,
                position_size=10,
                entry_time=f"2024-12-{i:02d}T10:00:00Z",
                exit_time=f"2024-12-{i:02d}T14:00:00Z",
            )
            for i in range(1, 6)
        ]

        detailed = calculate_detailed_analytics(entries)

        assert detailed.streaks.current == 5
        assert detailed.streaks.best_win_streak == 5
        assert detailed.streaks.worst_loss_streak == 0

    def test_calculates_streak_with_all_losses(self) -> None:
        """Streak is negative when all trades are losses."""
        entries = [
            create_journal_entry(
                symbol="DJI",
                direction="long",
                entry_price=48000.0,
                exit_price=47500.0,  # Loss
                stop_loss=47500.0,
                position_size=10,
                entry_time=f"2024-12-{i:02d}T10:00:00Z",
                exit_time=f"2024-12-{i:02d}T14:00:00Z",
            )
            for i in range(1, 4)
        ]

        detailed = calculate_detailed_analytics(entries)

        assert detailed.streaks.current == -3
        assert detailed.streaks.best_win_streak == 0
        assert detailed.streaks.worst_loss_streak == 3
