"""Pivot point detection for technical analysis.

This module provides functions to identify swing highs and lows in OHLC data:
- Swing highs: local price maxima within a lookback window
- Swing lows: local price minima within a lookback window
- Alternating pattern enforcement: ensures pivots alternate high-low
- Recent pivot extraction for Fibonacci calculations
- Swing classification: HH/HL/LH/LL pattern detection

All pivot detection is performed here to ensure consistency. The frontend
should use these endpoints rather than implementing the detection itself.
"""

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class OHLCBar:
    """Single OHLC price bar.

    Attributes:
        time: ISO date string (YYYY-MM-DD) or Unix timestamp.
        open: Opening price.
        high: Highest price during the period.
        low: Lowest price during the period.
        close: Closing price.
    """

    time: str | int
    open: float
    high: float
    low: float
    close: float


@dataclass(frozen=True)
class PivotPoint:
    """Detected swing high or low.

    Attributes:
        index: Position in the OHLC data array.
        price: The pivot price (high or low value).
        type: Either "high" for swing high or "low" for swing low.
        time: Timestamp from the corresponding OHLC bar.
    """

    index: int
    price: float
    type: Literal["high", "low"]
    time: str | int


@dataclass(frozen=True)
class PivotDetectionResult:
    """Result of pivot detection analysis.

    Attributes:
        pivots: All detected pivots in chronological order.
        recent_pivots: Most recent N pivots (limited by count parameter).
        pivot_high: Highest price among detected high pivots.
        pivot_low: Lowest price among detected low pivots.
        swing_high: Most recently detected swing high (or None).
        swing_low: Most recently detected swing low (or None).
    """

    pivots: list[PivotPoint]
    recent_pivots: list[PivotPoint]
    pivot_high: float
    pivot_low: float
    swing_high: PivotPoint | None
    swing_low: PivotPoint | None


@dataclass(frozen=True)
class SwingMarker:
    """Classified swing point with HH/HL/LH/LL pattern type.

    Attributes:
        index: Position in the OHLC data array.
        price: The pivot price.
        time: Timestamp from the corresponding OHLC bar.
        swing_type: Pattern classification (HH, HL, LH, or LL).
    """

    index: int
    price: float
    time: str | int
    swing_type: Literal["HH", "HL", "LH", "LL"]


def _is_swing_high(data: list[OHLCBar], index: int, lookback: int) -> bool:
    """Check if bar at index is a swing high."""
    current_high = data[index].high
    for j in range(index - lookback, index + lookback + 1):
        if j != index and data[j].high >= current_high:
            return False
    return True


def _is_swing_low(data: list[OHLCBar], index: int, lookback: int) -> bool:
    """Check if bar at index is a swing low."""
    current_low = data[index].low
    for j in range(index - lookback, index + lookback + 1):
        if j != index and data[j].low <= current_low:
            return False
    return True


def _find_raw_pivots(data: list[OHLCBar], lookback: int) -> list[PivotPoint]:
    """Find all potential swing highs and lows."""
    raw_pivots: list[PivotPoint] = []

    for i in range(lookback, len(data) - lookback):
        if _is_swing_high(data, i, lookback):
            raw_pivots.append(
                PivotPoint(index=i, price=data[i].high, type="high", time=data[i].time)
            )
        if _is_swing_low(data, i, lookback):
            raw_pivots.append(
                PivotPoint(index=i, price=data[i].low, type="low", time=data[i].time)
            )

    raw_pivots.sort(key=lambda p: p.index)
    return raw_pivots


def _enforce_alternation(raw_pivots: list[PivotPoint]) -> list[PivotPoint]:
    """Ensure pivots alternate between high and low types."""
    alternating: list[PivotPoint] = []

    for pivot in raw_pivots:
        if not alternating:
            alternating.append(pivot)
            continue

        last = alternating[-1]
        if pivot.type != last.type:
            alternating.append(pivot)
        elif pivot.type == "high" and pivot.price > last.price:
            alternating[-1] = pivot
        elif pivot.type == "low" and pivot.price < last.price:
            alternating[-1] = pivot

    return alternating


def detect_pivots(
    data: list[OHLCBar],
    lookback: int = 5,
    count: int = 10,
) -> PivotDetectionResult:
    """Detect swing highs and lows in OHLC data.

    A swing high occurs when the high price at index i is greater than
    all high prices in the lookback window [i-lookback, i+lookback].

    A swing low occurs when the low price at index i is less than
    all low prices in the lookback window [i-lookback, i+lookback].

    The algorithm enforces alternating high-low patterns. When consecutive
    pivots of the same type are found, only the most extreme one is kept
    (highest high or lowest low).

    Args:
        data: List of OHLC bars in chronological order.
        lookback: Number of bars to check on each side for swing detection.
        count: Maximum number of recent pivots to return.

    Returns:
        PivotDetectionResult with detected pivots and summary statistics.
    """
    min_bars = lookback * 2 + 1
    if len(data) < min_bars:
        return PivotDetectionResult(
            pivots=[],
            recent_pivots=[],
            pivot_high=0.0,
            pivot_low=0.0,
            swing_high=None,
            swing_low=None,
        )

    raw_pivots = _find_raw_pivots(data, lookback)
    alternating_pivots = _enforce_alternation(raw_pivots)

    high_pivots = [p for p in alternating_pivots if p.type == "high"]
    low_pivots = [p for p in alternating_pivots if p.type == "low"]

    return PivotDetectionResult(
        pivots=alternating_pivots,
        recent_pivots=alternating_pivots[-count:] if count > 0 else alternating_pivots,
        pivot_high=max((p.price for p in high_pivots), default=0.0),
        pivot_low=min((p.price for p in low_pivots), default=0.0),
        swing_high=high_pivots[-1] if high_pivots else None,
        swing_low=low_pivots[-1] if low_pivots else None,
    )


def classify_swings(pivots: list[PivotPoint]) -> list[SwingMarker]:
    """Classify pivot points into swing patterns (HH/HL/LH/LL).

    Compares consecutive pivots of the same type:
    - HH (Higher High): current high > previous high
    - HL (Higher Low): current low > previous low
    - LH (Lower High): current high < previous high
    - LL (Lower Low): current low < previous low

    The first pivot of each type cannot be classified since there's
    no previous pivot to compare against.

    Args:
        pivots: List of PivotPoint objects from detect_pivots().

    Returns:
        List of SwingMarker objects with classified swing types.
    """
    if len(pivots) < 2:
        return []

    markers: list[SwingMarker] = []
    prev_high: PivotPoint | None = None
    prev_low: PivotPoint | None = None

    for pivot in pivots:
        if pivot.type == "high":
            if prev_high is not None:
                swing_type: Literal["HH", "HL", "LH", "LL"]
                if pivot.price > prev_high.price:
                    swing_type = "HH"
                else:
                    swing_type = "LH"
                markers.append(
                    SwingMarker(
                        index=pivot.index,
                        price=pivot.price,
                        time=pivot.time,
                        swing_type=swing_type,
                    )
                )
            prev_high = pivot
        else:  # pivot.type == "low"
            if prev_low is not None:
                if pivot.price > prev_low.price:
                    swing_type = "HL"
                else:
                    swing_type = "LL"
                markers.append(
                    SwingMarker(
                        index=pivot.index,
                        price=pivot.price,
                        time=pivot.time,
                        swing_type=swing_type,
                    )
                )
            prev_low = pivot

    return markers
