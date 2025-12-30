"""Signal bar detection for trade entry confirmation."""

from dataclasses import dataclass
from enum import Enum
from typing import Literal


class SignalType(Enum):
    """Signal type classification."""

    TYPE_1 = "type_1"  # Level tested and rejected (stronger)
    TYPE_2 = "type_2"  # Close beyond level without deep test


@dataclass(frozen=True)
class Bar:
    """OHLC price bar."""

    open: float
    high: float
    low: float
    close: float

    @property
    def is_bullish(self) -> bool:
        """Bar closes above open."""
        return self.close > self.open

    @property
    def is_bearish(self) -> bool:
        """Bar closes below open."""
        return self.close < self.open


@dataclass(frozen=True)
class Signal:
    """Detected trading signal."""

    direction: Literal["buy", "sell"]
    bar: Bar
    level: float
    signal_type: SignalType
    strength: float


def detect_signal(bar: Bar, fibonacci_level: float) -> Signal | None:
    """
    Detect trading signal at a Fibonacci level.

    BUY Signal Requirements:
        - Close > Open (bullish bar)
        - Close > Fibonacci level

    SELL Signal Requirements:
        - Close < Open (bearish bar)
        - Close < Fibonacci level

    Signal Types:
        - Type 1 (stronger): Level was tested and rejected
        - Type 2: Close beyond level without deep test

    Args:
        bar: OHLC price bar
        fibonacci_level: Fibonacci level to check against

    Returns:
        Signal if valid signal detected, None otherwise
    """
    # Check for BUY signal
    if bar.is_bullish and bar.close > fibonacci_level:
        signal_type = _classify_buy_signal(bar, fibonacci_level)
        strength = _calculate_strength(signal_type, bar, fibonacci_level, "buy")
        return Signal(
            direction="buy",
            bar=bar,
            level=fibonacci_level,
            signal_type=signal_type,
            strength=strength,
        )

    # Check for SELL signal
    if bar.is_bearish and bar.close < fibonacci_level:
        signal_type = _classify_sell_signal(bar, fibonacci_level)
        strength = _calculate_strength(signal_type, bar, fibonacci_level, "sell")
        return Signal(
            direction="sell",
            bar=bar,
            level=fibonacci_level,
            signal_type=signal_type,
            strength=strength,
        )

    return None


def _classify_buy_signal(bar: Bar, fibonacci_level: float) -> SignalType:
    """
    Classify BUY signal as Type 1 or Type 2.

    Type 1: Low penetrated the level (tested and rejected)
    Type 2: Low stayed above the level (no deep test)
    """
    if bar.low < fibonacci_level:
        return SignalType.TYPE_1
    return SignalType.TYPE_2


def _classify_sell_signal(bar: Bar, fibonacci_level: float) -> SignalType:
    """
    Classify SELL signal as Type 1 or Type 2.

    Type 1: High penetrated the level (tested and rejected)
    Type 2: High stayed below the level (no deep test)
    """
    if bar.high > fibonacci_level:
        return SignalType.TYPE_1
    return SignalType.TYPE_2


def _calculate_strength(
    signal_type: SignalType,
    bar: Bar,
    fibonacci_level: float,
    direction: Literal["buy", "sell"],
) -> float:
    """
    Calculate signal strength score (0.0 to 1.0).

    Factors:
        - Signal type (Type 1 = 0.7 base, Type 2 = 0.5 base)
        - Close distance from level (further = stronger)
    """
    # Base score from signal type
    base_score = 0.7 if signal_type == SignalType.TYPE_1 else 0.5

    # Bonus for close distance from level (max 0.3)
    bar_range = bar.high - bar.low
    if bar_range > 0:
        if direction == "buy":
            close_distance = bar.close - fibonacci_level
        else:
            close_distance = fibonacci_level - bar.close

        distance_ratio = min(close_distance / bar_range, 1.0)
        distance_bonus = distance_ratio * 0.3
    else:
        distance_bonus = 0.0

    return min(base_score + distance_bonus, 1.0)
