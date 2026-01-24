"""Trade simulator for backtesting.

This module handles trade execution simulation including
stop loss, take profit, trailing stops, and breakeven management.
"""

from datetime import datetime
from typing import Literal

from trader.backtesting.models import (
    ExitReason,
    SimulatedTrade,
    TradeDirection,
    TradeStatus,
)
from trader.market_data.models import OHLCBar


class TradeSimulator:
    """Simulates trade execution for backtesting.

    Manages open trades, checking for stop loss, target hits,
    and updating trailing stops on each bar.
    """

    def __init__(
        self,
        breakeven_at_r: float = 1.0,
        trailing_stop_at_r: float = 2.0,
        trailing_stop_atr: float = 1.0,
    ) -> None:
        """Initialize the trade simulator.

        Args:
            breakeven_at_r: R-multiple at which to move stop to breakeven.
            trailing_stop_at_r: R-multiple at which to start trailing.
            trailing_stop_atr: ATR multiplier for trailing stop distance.
        """
        self.breakeven_at_r = breakeven_at_r
        self.trailing_stop_at_r = trailing_stop_at_r
        self.trailing_stop_atr = trailing_stop_atr

    def open_trade(
        self,
        bar: OHLCBar,
        bar_index: int,
        direction: Literal["long", "short"],
        position_size: float,
        stop_loss: float,
        targets: list[float],
        trade_category: str,
        confluence_score: int,
        atr: float,
    ) -> SimulatedTrade:
        """Open a new simulated trade.

        Args:
            bar: Entry bar.
            bar_index: Index of entry bar.
            direction: Trade direction.
            position_size: Number of units/shares.
            stop_loss: Initial stop loss price.
            targets: Target price levels.
            trade_category: Category of trade.
            confluence_score: Confluence score at entry.
            atr: ATR at entry.

        Returns:
            New SimulatedTrade instance.
        """
        entry_time = self._bar_to_datetime(bar)
        trade_dir = TradeDirection.LONG if direction == "long" else TradeDirection.SHORT

        trade = SimulatedTrade(
            entry_time=entry_time,
            entry_price=bar.close,
            direction=trade_dir,
            position_size=position_size,
            stop_loss=stop_loss,
            targets=targets,
            trade_category=trade_category,
            confluence_score=confluence_score,
            entry_bar_index=bar_index,
            atr_at_entry=atr,
            current_stop=stop_loss,
            highest_price=bar.high if trade_dir == TradeDirection.LONG else None,
            lowest_price=bar.low if trade_dir == TradeDirection.SHORT else None,
        )

        return trade

    def update_trade(
        self,
        trade: SimulatedTrade,
        bar: OHLCBar,
        bar_index: int,
    ) -> SimulatedTrade:
        """Update trade state for the current bar.

        Checks for stop loss, target hits, and updates trailing stop.

        Args:
            trade: Trade to update.
            bar: Current bar.
            bar_index: Index of current bar.

        Returns:
            Updated trade (may be closed).
        """
        if not trade.is_open:
            return trade

        # Check stop loss first (worst case)
        if self._check_stop_hit(trade, bar):
            return self._close_trade(
                trade, bar, bar_index, trade.current_stop or trade.stop_loss,
                ExitReason.TRAILING_STOP if trade.at_breakeven else ExitReason.STOP_LOSS
            )

        # Check target hits (best case)
        target_hit, target_price, target_reason = self._check_target_hit(trade, bar)
        if target_hit:
            return self._close_trade(trade, bar, bar_index, target_price, target_reason)

        # Update tracking prices and trailing stop
        self._update_tracking(trade, bar)

        return trade

    def close_all_trades(
        self,
        trades: list[SimulatedTrade],
        bar: OHLCBar,
        bar_index: int,
    ) -> list[SimulatedTrade]:
        """Close all open trades at end of backtest.

        Args:
            trades: List of trades to close.
            bar: Final bar.
            bar_index: Index of final bar.

        Returns:
            List of trades with open ones closed.
        """
        result = []

        for trade in trades:
            if trade.is_open:
                closed = self._close_trade(
                    trade, bar, bar_index, bar.close, ExitReason.END_OF_DATA
                )
                result.append(closed)
            else:
                result.append(trade)

        return result

    def _check_stop_hit(self, trade: SimulatedTrade, bar: OHLCBar) -> bool:
        """Check if stop loss was hit on this bar.

        Args:
            trade: Trade to check.
            bar: Current bar.

        Returns:
            True if stop was hit.
        """
        stop = trade.current_stop or trade.stop_loss

        if trade.direction == TradeDirection.LONG:
            return bar.low <= stop
        else:
            return bar.high >= stop

    def _check_target_hit(
        self,
        trade: SimulatedTrade,
        bar: OHLCBar,
    ) -> tuple[bool, float, ExitReason]:
        """Check if any target was hit on this bar.

        Args:
            trade: Trade to check.
            bar: Current bar.

        Returns:
            Tuple of (hit, price, reason).
        """
        targets = trade.targets
        if not targets:
            return False, 0.0, ExitReason.MANUAL

        target_reasons = [
            ExitReason.TARGET_1,
            ExitReason.TARGET_2,
            ExitReason.TARGET_3,
        ]

        for i, target in enumerate(targets):
            if trade.direction == TradeDirection.LONG:
                if bar.high >= target:
                    reason = target_reasons[min(i, 2)]
                    return True, target, reason
            else:
                if bar.low <= target:
                    reason = target_reasons[min(i, 2)]
                    return True, target, reason

        return False, 0.0, ExitReason.MANUAL

    def _update_tracking(self, trade: SimulatedTrade, bar: OHLCBar) -> None:
        """Update tracking prices and trailing stop.

        Args:
            trade: Trade to update.
            bar: Current bar.
        """
        risk = abs(trade.entry_price - trade.stop_loss)
        if risk == 0:
            return

        if trade.direction == TradeDirection.LONG:
            self._update_long_tracking(trade, bar, risk)
        else:
            self._update_short_tracking(trade, bar, risk)

    def _update_long_tracking(
        self, trade: SimulatedTrade, bar: OHLCBar, risk: float
    ) -> None:
        """Update tracking for long trades."""
        if trade.highest_price is None or bar.high > trade.highest_price:
            trade.highest_price = bar.high

        current_r = (trade.highest_price - trade.entry_price) / risk

        if not trade.at_breakeven and current_r >= self.breakeven_at_r:
            trade.current_stop = trade.entry_price
            trade.at_breakeven = True

        if current_r >= self.trailing_stop_at_r:
            trail_distance = trade.atr_at_entry * self.trailing_stop_atr
            new_stop = trade.highest_price - trail_distance
            if trade.current_stop is None or new_stop > trade.current_stop:
                trade.current_stop = new_stop

    def _update_short_tracking(
        self, trade: SimulatedTrade, bar: OHLCBar, risk: float
    ) -> None:
        """Update tracking for short trades."""
        if trade.lowest_price is None or bar.low < trade.lowest_price:
            trade.lowest_price = bar.low

        current_r = (trade.entry_price - trade.lowest_price) / risk

        if not trade.at_breakeven and current_r >= self.breakeven_at_r:
            trade.current_stop = trade.entry_price
            trade.at_breakeven = True

        if current_r >= self.trailing_stop_at_r:
            trail_distance = trade.atr_at_entry * self.trailing_stop_atr
            new_stop = trade.lowest_price + trail_distance
            if trade.current_stop is None or new_stop < trade.current_stop:
                trade.current_stop = new_stop

    def _close_trade(
        self,
        trade: SimulatedTrade,
        bar: OHLCBar,
        bar_index: int,
        exit_price: float,
        reason: ExitReason,
    ) -> SimulatedTrade:
        """Close a trade.

        Args:
            trade: Trade to close.
            bar: Exit bar.
            bar_index: Index of exit bar.
            exit_price: Price at exit.
            reason: Reason for exit.

        Returns:
            Closed trade.
        """
        trade.status = self._reason_to_status(reason)
        trade.exit_time = self._bar_to_datetime(bar)
        trade.exit_price = exit_price
        trade.exit_reason = reason
        trade.exit_bar_index = bar_index

        return trade

    def _reason_to_status(self, reason: ExitReason) -> TradeStatus:
        """Convert exit reason to trade status."""
        if reason == ExitReason.STOP_LOSS:
            return TradeStatus.STOPPED_OUT
        elif reason in (ExitReason.TARGET_1, ExitReason.TARGET_2, ExitReason.TARGET_3):
            return TradeStatus.TARGET_HIT
        elif reason == ExitReason.TRAILING_STOP:
            return TradeStatus.CLOSED
        else:
            return TradeStatus.CLOSED

    def _bar_to_datetime(self, bar: OHLCBar) -> datetime:
        """Convert bar time to datetime."""
        if isinstance(bar.time, int):
            return datetime.fromtimestamp(bar.time)
        else:
            if "T" in bar.time:
                return datetime.fromisoformat(bar.time.replace("Z", "+00:00"))
            else:
                return datetime.fromisoformat(bar.time)
