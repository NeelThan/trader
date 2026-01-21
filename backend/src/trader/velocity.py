"""Velocity and time estimation for reversal prediction.

This module provides functions to:
- Calculate price velocity (change per bar) normalized by ATR
- Estimate time (in bars and clock time) to reach Fibonacci levels
- Assess confidence based on trend consistency

Velocity is ATR-normalized to account for different volatility levels:
- bars_per_atr: How many bars it takes to move 1 ATR
- price_per_bar: Average price change per bar (can be negative)

Time estimates use the formula:
  bars_to_target = abs(target - current) / abs(price_per_bar)

Confidence is based on:
- Trend consistency (how steady the velocity has been)
- Direction alignment (is velocity moving toward or away from target)
- Proximity (closer targets have higher confidence)
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Literal

from trader.atr_indicators import calculate_atr


@dataclass(frozen=True)
class VelocityMetrics:
    """Metrics describing price velocity.

    Attributes:
        bars_per_atr: Average bars needed to move 1 ATR.
        price_per_bar: Average price change per bar (positive=up, negative=down).
        direction: Overall direction ("up", "down", or "sideways").
        consistency: How consistent the velocity has been (0-100).
    """

    bars_per_atr: float
    price_per_bar: float
    direction: Literal["up", "down", "sideways"]
    consistency: float


@dataclass(frozen=True)
class LevelTimeEstimate:
    """Time estimate to reach a specific price level.

    Attributes:
        target_price: The price level to reach.
        target_label: Label for the level (e.g., "R61.8%").
        estimated_bars: Estimated number of bars to reach the level.
        estimated_time: ISO timestamp when the level might be reached.
        confidence: Confidence in the estimate (0-100).
        distance_atr: Distance to target in ATR units.
    """

    target_price: float
    target_label: str
    estimated_bars: int
    estimated_time: str | None
    confidence: float
    distance_atr: float


@dataclass(frozen=True)
class ReversalTimeResult:
    """Result of reversal time estimation.

    Attributes:
        estimates: List of time estimates for each Fibonacci level.
        velocity: The calculated velocity metrics.
        current_price: Current price used for calculations.
    """

    estimates: list[LevelTimeEstimate]
    velocity: VelocityMetrics
    current_price: float


# Timeframe to timedelta mapping for time calculations
TIMEFRAME_DURATIONS: dict[str, timedelta] = {
    "1m": timedelta(minutes=1),
    "3m": timedelta(minutes=3),
    "5m": timedelta(minutes=5),
    "15m": timedelta(minutes=15),
    "1H": timedelta(hours=1),
    "4H": timedelta(hours=4),
    "1D": timedelta(days=1),
    "1W": timedelta(weeks=1),
    "1M": timedelta(days=30),  # Approximate
}

# Max bars to estimate (avoid infinite estimates)
MAX_ESTIMATED_BARS = 500


def calculate_velocity(
    closes: list[float],
    highs: list[float],
    lows: list[float],
    lookback: int = 10,
    atr_period: int = 14,
) -> VelocityMetrics:
    """Calculate price velocity from recent price data.

    Velocity is the average price change per bar over the lookback period,
    normalized by ATR to account for volatility.

    Args:
        closes: List of closing prices.
        highs: List of high prices.
        lows: List of low prices.
        lookback: Number of bars to calculate velocity over.
        atr_period: Period for ATR calculation.

    Returns:
        VelocityMetrics with direction, speed, and consistency.
    """
    if len(closes) < 2:
        return VelocityMetrics(
            bars_per_atr=0.0,
            price_per_bar=0.0,
            direction="sideways",
            consistency=0.0,
        )

    # Use available data up to lookback
    actual_lookback = min(lookback, len(closes) - 1)
    if actual_lookback < 2:
        return VelocityMetrics(
            bars_per_atr=0.0,
            price_per_bar=0.0,
            direction="sideways",
            consistency=0.0,
        )

    # Calculate price change over lookback period
    recent_closes = closes[-actual_lookback - 1 :]
    price_change = recent_closes[-1] - recent_closes[0]
    price_per_bar = price_change / actual_lookback

    # Calculate ATR for normalization
    atr_values = calculate_atr(highs, lows, closes, atr_period)
    recent_atr = None
    for val in reversed(atr_values):
        if val is not None:
            recent_atr = val
            break

    # Calculate bars per ATR
    if recent_atr and recent_atr > 0 and abs(price_per_bar) > 0:
        bars_per_atr = recent_atr / abs(price_per_bar)
    else:
        bars_per_atr = 0.0

    # Determine direction
    if abs(price_per_bar) < 0.0001 * closes[-1]:  # < 0.01% per bar
        direction: Literal["up", "down", "sideways"] = "sideways"
    elif price_per_bar > 0:
        direction = "up"
    else:
        direction = "down"

    # Calculate consistency (how steady the movement has been)
    consistency = _calculate_consistency(recent_closes)

    return VelocityMetrics(
        bars_per_atr=round(bars_per_atr, 2),
        price_per_bar=round(price_per_bar, 4),
        direction=direction,
        consistency=round(consistency, 1),
    )


def _calculate_consistency(prices: list[float]) -> float:
    """Calculate how consistent price movement has been.

    Uses the ratio of actual movement to sum of absolute bar changes.
    A value of 100 means perfectly consistent movement.
    A value near 0 means very choppy movement.

    Args:
        prices: List of prices over the period.

    Returns:
        Consistency score from 0 to 100.
    """
    if len(prices) < 2:
        return 0.0

    total_change = prices[-1] - prices[0]
    sum_of_changes = sum(abs(prices[i] - prices[i - 1]) for i in range(1, len(prices)))

    if sum_of_changes == 0:
        return 100.0 if total_change == 0 else 0.0

    # Ratio: abs(total) / sum(abs) * 100
    # Perfect consistency = 100, complete chop = 0
    consistency = (abs(total_change) / sum_of_changes) * 100

    return min(100.0, max(0.0, consistency))


def estimate_time_to_level(
    current_price: float,
    target_price: float,
    velocity: VelocityMetrics,
    timeframe: str,
    target_label: str = "",
) -> LevelTimeEstimate:
    """Estimate time to reach a specific price level.

    Args:
        current_price: Current price.
        target_price: Target price level.
        velocity: Velocity metrics from calculate_velocity().
        timeframe: Timeframe for time calculations (e.g., "1D", "1H").
        target_label: Label for the target level.

    Returns:
        LevelTimeEstimate with bars, time, and confidence.
    """
    distance = target_price - current_price
    abs_distance = abs(distance)

    # Calculate estimated bars
    if abs(velocity.price_per_bar) < 1e-10:
        # No velocity - can't estimate
        estimated_bars = MAX_ESTIMATED_BARS
        confidence = 5.0
    else:
        # Check if moving toward or away from target
        moving_toward = (distance > 0 and velocity.price_per_bar > 0) or (
            distance < 0 and velocity.price_per_bar < 0
        )

        if moving_toward:
            estimated_bars = int(abs_distance / abs(velocity.price_per_bar))
            estimated_bars = min(estimated_bars, MAX_ESTIMATED_BARS)

            # Confidence based on consistency and proximity
            confidence = velocity.consistency
            # Reduce confidence for far targets
            if estimated_bars > 50:
                confidence *= 0.5
            elif estimated_bars > 20:
                confidence *= 0.75
        else:
            # Moving away from target
            estimated_bars = MAX_ESTIMATED_BARS
            confidence = 10.0  # Low confidence when moving wrong direction

    # Calculate estimated time
    estimated_time = _calculate_estimated_time(estimated_bars, timeframe)

    # Calculate distance in ATR units
    if velocity.bars_per_atr > 0 and abs(velocity.price_per_bar) > 0:
        atr_estimate = abs(velocity.price_per_bar) * velocity.bars_per_atr
        distance_atr = abs_distance / atr_estimate if atr_estimate > 0 else 0.0
    else:
        distance_atr = 0.0

    return LevelTimeEstimate(
        target_price=target_price,
        target_label=target_label,
        estimated_bars=estimated_bars,
        estimated_time=estimated_time,
        confidence=round(max(0.0, min(100.0, confidence)), 1),
        distance_atr=round(distance_atr, 2),
    )


def _calculate_estimated_time(
    bars: int,
    timeframe: str,
) -> str | None:
    """Calculate estimated time from bars and timeframe.

    Args:
        bars: Number of bars.
        timeframe: Timeframe string (e.g., "1D", "1H").

    Returns:
        ISO timestamp string or None if timeframe unknown.
    """
    duration = TIMEFRAME_DURATIONS.get(timeframe)
    if duration is None:
        return None

    if bars >= MAX_ESTIMATED_BARS:
        return None

    estimated_datetime = datetime.now(UTC) + (duration * bars)
    return estimated_datetime.isoformat().replace("+00:00", "Z")


def estimate_reversal_times(
    closes: list[float],
    highs: list[float],
    lows: list[float],
    fib_levels: list[dict[str, str | float]],
    timeframe: str,
    lookback: int = 10,
    atr_period: int = 14,
) -> ReversalTimeResult:
    """Estimate times to reach multiple Fibonacci levels.

    Args:
        closes: List of closing prices.
        highs: List of high prices.
        lows: List of low prices.
        fib_levels: List of dicts with "label" and "price" keys.
        timeframe: Timeframe for time calculations.
        lookback: Lookback for velocity calculation.
        atr_period: Period for ATR calculation.

    Returns:
        ReversalTimeResult with estimates sorted by distance.
    """
    # Calculate velocity
    velocity = calculate_velocity(closes, highs, lows, lookback, atr_period)

    # Get current price
    current_price = closes[-1] if closes else 0.0

    # Calculate estimates for each level
    estimates: list[LevelTimeEstimate] = []
    for level in fib_levels:
        label = str(level.get("label", ""))
        price = float(level.get("price", 0.0))

        estimate = estimate_time_to_level(
            current_price=current_price,
            target_price=price,
            velocity=velocity,
            timeframe=timeframe,
            target_label=label,
        )
        estimates.append(estimate)

    # Sort by distance (closest first)
    estimates.sort(key=lambda e: abs(e.target_price - current_price))

    return ReversalTimeResult(
        estimates=estimates,
        velocity=velocity,
        current_price=current_price,
    )
