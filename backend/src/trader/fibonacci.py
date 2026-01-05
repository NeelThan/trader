"""Fibonacci calculation tools for trading analysis."""

from enum import Enum
from typing import Literal


class FibonacciLevel(Enum):
    """Standard Fibonacci retracement levels."""

    LEVEL_382 = 0.382
    LEVEL_500 = 0.500
    LEVEL_618 = 0.618
    LEVEL_786 = 0.786


class ExtensionLevel(Enum):
    """Fibonacci extension levels (beyond 100%)."""

    LEVEL_1272 = 1.272
    LEVEL_1618 = 1.618
    LEVEL_2618 = 2.618


class ProjectionLevel(Enum):
    """Fibonacci projection levels for 3-point swing projections."""

    LEVEL_618 = 0.618
    LEVEL_786 = 0.786
    LEVEL_1000 = 1.000
    LEVEL_1272 = 1.272
    LEVEL_1618 = 1.618


class ExpansionLevel(Enum):
    """Fibonacci expansion levels (range expansion from pivot B)."""

    LEVEL_382 = 0.382
    LEVEL_500 = 0.500
    LEVEL_618 = 0.618
    LEVEL_1000 = 1.000
    LEVEL_1618 = 1.618


def calculate_retracement_levels(
    high: float,
    low: float,
    direction: Literal["buy", "sell"],
) -> dict[FibonacciLevel, float]:
    """
    Calculate Fibonacci retracement levels using pivot points B and C.

    Retracements measure pullback levels within the B→C swing.

    Args:
        high: The high price point (C if B < C, else B)
        low: The low price point (B if B < C, else C)
        direction: 'buy' if B < C (swing up), 'sell' if B > C (swing down)

    Returns:
        Dictionary mapping FibonacciLevel to calculated price level

    Setup:
        BUY:  B < C (swing UP) → levels between B and C for buying pullback
        SELL: B > C (swing DOWN) → levels between C and B for selling pullback

    Formula:
        BUY:  Level = C - (Range × Ratio) = High - (Range × Ratio)
        SELL: Level = C + (Range × Ratio) = Low + (Range × Ratio)
    """
    price_range = high - low

    levels: dict[FibonacciLevel, float] = {}

    for level in FibonacciLevel:
        if direction == "buy":
            levels[level] = high - (price_range * level.value)
        else:
            levels[level] = low + (price_range * level.value)

    return levels


def calculate_extension_levels(
    high: float,
    low: float,
    direction: Literal["buy", "sell"],
) -> dict[ExtensionLevel, float]:
    """
    Calculate Fibonacci extension levels using pivot points B and C.

    Extensions project targets BEYOND the B→C swing (ratios > 1.0).

    Args:
        high: The high price point (C if B < C, else B)
        low: The low price point (B if B < C, else C)
        direction: 'buy' if B < C (swing up), 'sell' if B > C (swing down)

    Returns:
        Dictionary mapping ExtensionLevel to calculated price level

    Setup:
        BUY:  B < C (swing UP) → targets BELOW B
        SELL: B > C (swing DOWN) → targets ABOVE B

    Formula:
        BUY:  Level = C - (Range × Ratio) = High - (Range × Ratio)
        SELL: Level = C + (Range × Ratio) = Low + (Range × Ratio)
    """
    price_range = high - low

    levels: dict[ExtensionLevel, float] = {}

    for level in ExtensionLevel:
        if direction == "buy":
            levels[level] = high - (price_range * level.value)
        else:
            levels[level] = low + (price_range * level.value)

    return levels


def calculate_projection_levels(
    point_a: float,
    point_b: float,
    point_c: float,
    direction: Literal["buy", "sell"],
) -> dict[ProjectionLevel, float]:
    """
    Calculate Fibonacci projection levels from 3 pivot points (A, B, C).

    Projection uses all three alternating pivots:
    - A = Oldest pivot
    - B = Middle pivot
    - C = Most recent pivot (projection origin)

    Args:
        point_a: First pivot point price (oldest)
        point_b: Second pivot point price (middle)
        point_c: Third pivot point price (most recent, projection origin)
        direction: 'buy' if A > B (bearish ABC), 'sell' if A < B (bullish ABC)

    Returns:
        Dictionary mapping ProjectionLevel to calculated price level

    Setup:
        BUY:  A > B (A high, B low) → targets BELOW C
        SELL: A < B (A low, B high) → targets ABOVE C

    Formula:
        Range = |A - B|
        BUY:  Level = C - (Range × Ratio)
        SELL: Level = C + (Range × Ratio)
    """
    swing = abs(point_a - point_b)

    levels: dict[ProjectionLevel, float] = {}

    for level in ProjectionLevel:
        if direction == "buy":
            levels[level] = point_c - (swing * level.value)
        else:
            levels[level] = point_c + (swing * level.value)

    return levels


def calculate_expansion_levels(
    point_a: float,
    point_b: float,
    direction: Literal["buy", "sell"],
) -> dict[ExpansionLevel, float]:
    """
    Calculate Fibonacci expansion levels using pivot points B and C.

    Expansion projects from C using the B-C range.
    Note: API parameters are named point_a/point_b for backward compatibility,
    but they represent pivot B and pivot C respectively in the ABC pattern.

    Args:
        point_a: Pivot B price (middle alternating pivot)
        point_b: Pivot C price (most recent alternating pivot, expansion origin)
        direction: 'buy' if B > C (swing down), 'sell' if B < C (swing up)

    Returns:
        Dictionary mapping ExpansionLevel to calculated price level

    Setup:
        BUY:  B > C (B high, C low) → targets BELOW C
        SELL: B < C (B low, C high) → targets ABOVE C

    Formula:
        Range = |B - C| = |point_a - point_b|
        BUY:  Level = C - (Range × Ratio) = point_b - (Range × Ratio)
        SELL: Level = C + (Range × Ratio) = point_b + (Range × Ratio)
    """
    price_range = abs(point_a - point_b)

    levels: dict[ExpansionLevel, float] = {}

    for level in ExpansionLevel:
        if direction == "buy":
            levels[level] = point_b - (price_range * level.value)
        else:
            levels[level] = point_b + (price_range * level.value)

    return levels
