"""Trade journal module for recording and analyzing trades.

This module provides:
- JournalEntry: Data model for completed trades
- JournalAnalytics: Calculated statistics from journal entries
- Functions for creating entries and calculating analytics

The journal captures essential trade data including:
- Entry/exit prices and times
- Position sizing and risk parameters
- P&L and R-multiple calculations
- Trade outcome classification
"""

import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Literal


class TradeOutcome(str, Enum):
    """Classification of trade result."""

    WIN = "win"
    LOSS = "loss"
    BREAKEVEN = "breakeven"


@dataclass
class JournalEntry:
    """A completed trade record.

    Attributes:
        id: Unique identifier for the trade.
        symbol: Market symbol traded (e.g., "DJI", "SPX").
        direction: Trade direction ("long" or "short").
        entry_price: Price at which position was opened.
        exit_price: Price at which position was closed.
        stop_loss: Stop loss price level.
        position_size: Number of units traded.
        entry_time: ISO timestamp of entry.
        exit_time: ISO timestamp of exit.
        pnl: Profit/loss in currency units.
        r_multiple: Profit relative to initial risk (R-multiple).
        outcome: Classification as win/loss/breakeven.
        timeframe: Chart timeframe used (optional).
        targets: Target price levels (optional).
        exit_reason: Why the trade was closed (optional).
        notes: Trader notes (optional).
        workflow_id: Associated workflow ID (optional).
    """

    id: str
    symbol: str
    direction: Literal["long", "short"]
    entry_price: float
    exit_price: float
    stop_loss: float
    position_size: float
    entry_time: str
    exit_time: str
    pnl: float
    r_multiple: float
    outcome: TradeOutcome
    timeframe: str | None = None
    targets: list[float] = field(default_factory=list)
    exit_reason: str | None = None
    notes: str | None = None
    workflow_id: str | None = None


@dataclass
class JournalAnalytics:
    """Aggregated statistics from journal entries.

    Attributes:
        total_trades: Total number of trades.
        wins: Number of winning trades.
        losses: Number of losing trades.
        breakevens: Number of breakeven trades.
        win_rate: Percentage of winning trades (0-100).
        total_pnl: Sum of all P&L.
        average_r: Average R-multiple per trade.
        largest_win: Largest winning P&L.
        largest_loss: Largest losing P&L (negative).
        profit_factor: Gross wins / gross losses.
    """

    total_trades: int
    wins: int
    losses: int
    breakevens: int
    win_rate: float
    total_pnl: float
    average_r: float
    largest_win: float
    largest_loss: float
    profit_factor: float


def _generate_trade_id() -> str:
    """Generate a unique trade ID."""
    return f"trade_{uuid.uuid4().hex[:12]}"


def _calculate_pnl(
    direction: Literal["long", "short"],
    entry_price: float,
    exit_price: float,
    position_size: float,
) -> float:
    """Calculate profit/loss for a trade.

    Args:
        direction: Trade direction.
        entry_price: Entry price.
        exit_price: Exit price.
        position_size: Position size.

    Returns:
        P&L in currency units.
    """
    if direction == "long":
        return (exit_price - entry_price) * position_size
    else:  # short
        return (entry_price - exit_price) * position_size


def _calculate_r_multiple(
    direction: Literal["long", "short"],
    entry_price: float,
    exit_price: float,
    stop_loss: float,
) -> float:
    """Calculate R-multiple (profit relative to risk).

    Args:
        direction: Trade direction.
        entry_price: Entry price.
        exit_price: Exit price.
        stop_loss: Stop loss price.

    Returns:
        R-multiple value.
    """
    # Calculate risk (distance from entry to stop)
    if direction == "long":
        risk = entry_price - stop_loss
        profit = exit_price - entry_price
    else:  # short
        risk = stop_loss - entry_price
        profit = entry_price - exit_price

    # Handle zero risk case
    if risk == 0:
        return float("inf") if profit > 0 else 0.0

    return profit / risk


def _determine_outcome(pnl: float) -> TradeOutcome:
    """Determine trade outcome from P&L.

    Args:
        pnl: Profit/loss value.

    Returns:
        Trade outcome classification.
    """
    if pnl > 0:
        return TradeOutcome.WIN
    elif pnl < 0:
        return TradeOutcome.LOSS
    else:
        return TradeOutcome.BREAKEVEN


def create_journal_entry(
    symbol: str,
    direction: Literal["long", "short"],
    entry_price: float,
    exit_price: float,
    stop_loss: float,
    position_size: float,
    entry_time: str,
    exit_time: str,
    timeframe: str | None = None,
    targets: list[float] | None = None,
    exit_reason: str | None = None,
    notes: str | None = None,
    workflow_id: str | None = None,
) -> JournalEntry:
    """Create a new journal entry with calculated fields.

    Args:
        symbol: Market symbol traded.
        direction: Trade direction.
        entry_price: Entry price.
        exit_price: Exit price.
        stop_loss: Stop loss price.
        position_size: Position size.
        entry_time: Entry timestamp (ISO format).
        exit_time: Exit timestamp (ISO format).
        timeframe: Chart timeframe (optional).
        targets: Target price levels (optional).
        exit_reason: Reason for exit (optional).
        notes: Trader notes (optional).
        workflow_id: Associated workflow ID (optional).

    Returns:
        Complete journal entry with calculated P&L and R-multiple.
    """
    pnl = _calculate_pnl(direction, entry_price, exit_price, position_size)
    r_multiple = _calculate_r_multiple(direction, entry_price, exit_price, stop_loss)
    outcome = _determine_outcome(pnl)

    return JournalEntry(
        id=_generate_trade_id(),
        symbol=symbol,
        direction=direction,
        entry_price=entry_price,
        exit_price=exit_price,
        stop_loss=stop_loss,
        position_size=position_size,
        entry_time=entry_time,
        exit_time=exit_time,
        pnl=pnl,
        r_multiple=r_multiple,
        outcome=outcome,
        timeframe=timeframe,
        targets=targets or [],
        exit_reason=exit_reason,
        notes=notes,
        workflow_id=workflow_id,
    )


def calculate_analytics(entries: list[JournalEntry]) -> JournalAnalytics:
    """Calculate analytics from journal entries.

    Args:
        entries: List of journal entries.

    Returns:
        Aggregated analytics.
    """
    if not entries:
        return JournalAnalytics(
            total_trades=0,
            wins=0,
            losses=0,
            breakevens=0,
            win_rate=0.0,
            total_pnl=0.0,
            average_r=0.0,
            largest_win=0.0,
            largest_loss=0.0,
            profit_factor=0.0,
        )

    # Count outcomes
    wins = sum(1 for e in entries if e.outcome == TradeOutcome.WIN)
    losses = sum(1 for e in entries if e.outcome == TradeOutcome.LOSS)
    breakevens = sum(1 for e in entries if e.outcome == TradeOutcome.BREAKEVEN)
    total = len(entries)

    # Calculate P&L metrics
    total_pnl = sum(e.pnl for e in entries)
    average_r = sum(e.r_multiple for e in entries) / total

    # Find extremes
    pnl_values = [e.pnl for e in entries]
    largest_win = max(pnl_values) if any(p > 0 for p in pnl_values) else 0.0
    largest_loss = min(pnl_values) if any(p < 0 for p in pnl_values) else 0.0

    # Calculate profit factor
    gross_wins = sum(e.pnl for e in entries if e.pnl > 0)
    gross_losses = abs(sum(e.pnl for e in entries if e.pnl < 0))

    if gross_losses == 0:
        profit_factor = float("inf") if gross_wins > 0 else 0.0
    else:
        profit_factor = gross_wins / gross_losses

    return JournalAnalytics(
        total_trades=total,
        wins=wins,
        losses=losses,
        breakevens=breakevens,
        win_rate=(wins / total) * 100,
        total_pnl=total_pnl,
        average_r=average_r,
        largest_win=largest_win,
        largest_loss=largest_loss,
        profit_factor=profit_factor,
    )
