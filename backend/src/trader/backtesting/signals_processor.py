"""Signal processing for backtesting.

This module adapts the workflow validation logic for use in backtesting,
detecting entry signals based on trend alignment and Fibonacci levels.
"""

from dataclasses import dataclass
from typing import Literal

from trader.atr_indicators import ATRAnalysis, analyze_atr
from trader.fibonacci import calculate_extension_levels, calculate_retracement_levels
from trader.market_data.models import OHLCBar
from trader.pivots import OHLCBar as PivotOHLCBar
from trader.pivots import classify_swings, detect_pivots
from trader.signals import Bar as SignalBar
from trader.signals import detect_signal


@dataclass
class EntrySignal:
    """Detected entry signal from backtesting analysis.

    Attributes:
        bar_index: Index of the signal bar.
        direction: Trade direction ("long" or "short").
        entry_price: Suggested entry price.
        stop_loss: Suggested stop loss level.
        targets: Target price levels.
        confluence_score: Confluence score at entry.
        trade_category: Category of trade.
        atr: ATR value at signal.
        validation_score: Percentage of checks passed.
    """

    bar_index: int
    direction: Literal["long", "short"]
    entry_price: float
    stop_loss: float
    targets: list[float]
    confluence_score: int
    trade_category: str
    atr: float
    validation_score: float


class SignalsProcessor:
    """Processes price data to detect entry signals.

    Adapts workflow validation logic for bar-by-bar backtesting.
    """

    def __init__(
        self,
        lookback_periods: int = 50,
        confluence_threshold: int = 3,
        validation_threshold: float = 0.6,
        atr_period: int = 14,
        atr_stop_multiplier: float = 1.5,
    ) -> None:
        """Initialize the signals processor.

        Args:
            lookback_periods: Bars for pivot detection.
            confluence_threshold: Minimum confluence score.
            validation_threshold: Minimum validation pass percentage.
            atr_period: Period for ATR calculation.
            atr_stop_multiplier: ATR multiplier for stop loss.
        """
        self.lookback_periods = lookback_periods
        self.confluence_threshold = confluence_threshold
        self.validation_threshold = validation_threshold
        self.atr_period = atr_period
        self.atr_stop_multiplier = atr_stop_multiplier

    def detect_entry_signal(
        self,
        higher_tf_bars: list[OHLCBar],
        lower_tf_bars: list[OHLCBar],
        bar_index: int,
    ) -> EntrySignal | None:
        """Detect entry signal at the current bar.

        Args:
            higher_tf_bars: Higher timeframe bars (for trend).
            lower_tf_bars: Lower timeframe bars (for entry).
            bar_index: Current bar index in lower_tf_bars.

        Returns:
            EntrySignal if valid signal detected, None otherwise.
        """
        if bar_index < self.lookback_periods:
            return None

        if len(lower_tf_bars) <= bar_index:
            return None

        # Get current bar and lookback data
        current_bar = lower_tf_bars[bar_index]
        start_idx = max(0, bar_index - self.lookback_periods)
        lookback_bars = lower_tf_bars[start_idx:bar_index + 1]

        # Assess trends
        higher_trend = self._assess_trend(higher_tf_bars)
        lower_trend = self._assess_trend(lookback_bars)

        if higher_trend == "neutral" or lower_trend == "neutral":
            return None

        # Determine trade direction and category
        direction, category = self._determine_trade_direction(
            higher_trend, lower_trend
        )

        if direction is None:
            return None

        # Calculate Fibonacci levels
        fib_levels = self._calculate_fib_levels(lookback_bars, direction)

        if not fib_levels:
            return None

        # Check signal bar
        signal = self._check_signal_bar(current_bar, fib_levels, direction)

        if signal is None:
            return None

        # Calculate ATR for stop loss
        atr_analysis = self._calculate_atr(lookback_bars)

        if atr_analysis is None:
            return None

        # Calculate confluence score
        confluence = self._calculate_confluence(
            fib_levels, current_bar.close, atr_analysis.atr
        )

        if confluence < self.confluence_threshold:
            return None

        # Calculate validation score
        validation_score = self._calculate_validation_score(
            higher_trend, lower_trend, direction, confluence
        )

        if validation_score < self.validation_threshold:
            return None

        # Calculate stop loss and targets
        stop_loss = self._calculate_stop_loss(
            current_bar.close, direction, atr_analysis.atr
        )
        targets = self._calculate_targets(fib_levels, direction)

        return EntrySignal(
            bar_index=bar_index,
            direction=direction,
            entry_price=current_bar.close,
            stop_loss=stop_loss,
            targets=targets,
            confluence_score=confluence,
            trade_category=category,
            atr=atr_analysis.atr,
            validation_score=validation_score,
        )

    def _assess_trend(
        self, bars: list[OHLCBar]
    ) -> Literal["bullish", "bearish", "neutral"]:
        """Assess trend direction from swing patterns.

        Args:
            bars: OHLC bars to analyze.

        Returns:
            Trend direction.
        """
        if len(bars) < 10:
            return "neutral"

        # Convert to pivot detection format
        pivot_bars = [
            PivotOHLCBar(
                time=bar.time,
                open=bar.open,
                high=bar.high,
                low=bar.low,
                close=bar.close,
            )
            for bar in bars
        ]

        pivot_result = detect_pivots(pivot_bars, lookback=5)
        swing_markers = classify_swings(pivot_result.pivots)

        if len(swing_markers) < 2:
            return "neutral"

        # Count recent swing patterns
        recent = swing_markers[-4:] if len(swing_markers) >= 4 else swing_markers
        hh_count = sum(1 for m in recent if m.swing_type == "HH")
        hl_count = sum(1 for m in recent if m.swing_type == "HL")
        lh_count = sum(1 for m in recent if m.swing_type == "LH")
        ll_count = sum(1 for m in recent if m.swing_type == "LL")

        bullish = hh_count + hl_count
        bearish = lh_count + ll_count

        if bullish > bearish:
            return "bullish"
        elif bearish > bullish:
            return "bearish"
        else:
            return "neutral"

    def _determine_trade_direction(
        self,
        higher_trend: str,
        lower_trend: str,
    ) -> tuple[Literal["long", "short"] | None, str]:
        """Determine trade direction based on trend alignment.

        Returns:
            Tuple of (direction, category) or (None, "") if no trade.
        """
        # Pullback setups (counter-trend on lower TF)
        if higher_trend == "bullish" and lower_trend == "bearish":
            return "long", "with_trend"  # Buy the dip

        if higher_trend == "bearish" and lower_trend == "bullish":
            return "short", "with_trend"  # Sell the rally

        # With-trend setups (same direction, need confirmation)
        if higher_trend == "bullish" and lower_trend == "bullish":
            return "long", "counter_trend"  # Already moving, less ideal

        if higher_trend == "bearish" and lower_trend == "bearish":
            return "short", "counter_trend"  # Already moving, less ideal

        return None, ""

    def _calculate_fib_levels(
        self,
        bars: list[OHLCBar],
        direction: str,
    ) -> dict[str, float]:
        """Calculate Fibonacci retracement and extension levels.

        Args:
            bars: OHLC bars for pivot detection.
            direction: Trade direction.

        Returns:
            Dictionary of level name to price.
        """
        if len(bars) < 10:
            return {}

        # Find swing high and low
        highs = [b.high for b in bars]
        lows = [b.low for b in bars]

        swing_high = max(highs)
        swing_low = min(lows)

        if swing_high == swing_low:
            return {}

        # Calculate levels
        fib_direction: Literal["buy", "sell"] = "buy" if direction == "long" else "sell"

        retracement = calculate_retracement_levels(
            high=swing_high, low=swing_low, direction=fib_direction
        )
        extension = calculate_extension_levels(
            high=swing_high, low=swing_low, direction=fib_direction
        )

        # Combine into flat dict
        levels: dict[str, float] = {}
        for ret_level, price in retracement.items():
            levels[f"ret_{ret_level.value}"] = price
        for ext_level, ext_price in extension.items():
            levels[f"ext_{ext_level.value}"] = ext_price

        return levels

    def _check_signal_bar(
        self,
        bar: OHLCBar,
        fib_levels: dict[str, float],
        direction: str,
    ) -> bool | None:
        """Check if current bar is a valid signal bar at a Fib level.

        Args:
            bar: Current OHLC bar.
            fib_levels: Fibonacci levels.
            direction: Trade direction.

        Returns:
            True if valid signal, None otherwise.
        """
        signal_bar = SignalBar(
            open=bar.open,
            high=bar.high,
            low=bar.low,
            close=bar.close,
        )

        # Check key retracement levels (38.2%, 50%, 61.8%)
        key_levels = [
            fib_levels.get("ret_0.382"),
            fib_levels.get("ret_0.5"),
            fib_levels.get("ret_0.618"),
        ]

        for level in key_levels:
            if level is None:
                continue

            signal = detect_signal(signal_bar, level)
            if signal is not None:
                expected_dir = "buy" if direction == "long" else "sell"
                if signal.direction == expected_dir:
                    return True

        return None

    def _calculate_atr(self, bars: list[OHLCBar]) -> ATRAnalysis | None:
        """Calculate ATR from bars."""
        if len(bars) < self.atr_period:
            return None

        highs = [b.high for b in bars]
        lows = [b.low for b in bars]
        closes = [b.close for b in bars]

        return analyze_atr(highs, lows, closes, self.atr_period)

    def _calculate_confluence(
        self,
        fib_levels: dict[str, float],
        current_price: float,
        atr: float,
    ) -> int:
        """Calculate confluence score.

        Args:
            fib_levels: Fibonacci levels.
            current_price: Current price.
            atr: ATR for tolerance calculation.

        Returns:
            Confluence score.
        """
        tolerance = atr * 0.5
        score = 1  # Base score for any Fib level

        # Count levels within tolerance
        for name, price in fib_levels.items():
            if abs(price - current_price) <= tolerance:
                if "ret_" in name:
                    score += 1
                elif "ext_" in name:
                    score += 1

        # Check psychological level (round number)
        round_level = round(current_price / 100) * 100
        if abs(current_price - round_level) <= tolerance:
            score += 1

        return score

    def _calculate_validation_score(
        self,
        higher_trend: str,
        lower_trend: str,
        direction: str,
        confluence: int,
    ) -> float:
        """Calculate validation pass percentage.

        Args:
            higher_trend: Higher TF trend.
            lower_trend: Lower TF trend.
            direction: Trade direction.
            confluence: Confluence score.

        Returns:
            Validation score as percentage (0-1).
        """
        checks_passed = 0
        total_checks = 5

        # Trend alignment
        if direction == "long" and higher_trend == "bullish":
            checks_passed += 1
        elif direction == "short" and higher_trend == "bearish":
            checks_passed += 1

        # Counter-trend for pullback
        if direction == "long" and lower_trend == "bearish":
            checks_passed += 1
        elif direction == "short" and lower_trend == "bullish":
            checks_passed += 1

        # Confluence check
        if confluence >= self.confluence_threshold:
            checks_passed += 1

        # Minimum confluence
        if confluence >= 2:
            checks_passed += 1

        # Signal bar confirmed
        checks_passed += 1  # Already checked before calling this

        return checks_passed / total_checks

    def _calculate_stop_loss(
        self,
        entry_price: float,
        direction: str,
        atr: float,
    ) -> float:
        """Calculate stop loss level.

        Args:
            entry_price: Entry price.
            direction: Trade direction.
            atr: ATR value.

        Returns:
            Stop loss price.
        """
        stop_distance = atr * self.atr_stop_multiplier

        if direction == "long":
            return entry_price - stop_distance
        else:
            return entry_price + stop_distance

    def _calculate_targets(
        self,
        fib_levels: dict[str, float],
        direction: str,
    ) -> list[float]:
        """Calculate target levels from extensions.

        Args:
            fib_levels: Fibonacci levels.
            direction: Trade direction.

        Returns:
            List of target prices.
        """
        targets = []

        # Extension targets
        ext_levels = [1.0, 1.272, 1.618]

        for ext in ext_levels:
            key = f"ext_{ext}"
            if key in fib_levels:
                targets.append(fib_levels[key])

        # Sort by distance from entry (ascending for long, descending for short)
        if direction == "long":
            targets.sort()
        else:
            targets.sort(reverse=True)

        return targets[:3]  # Limit to 3 targets
