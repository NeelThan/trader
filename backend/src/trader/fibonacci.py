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


def calculate_retracement_levels(
    high: float,
    low: float,
    direction: Literal["buy", "sell"],
) -> dict[FibonacciLevel, float]:
    """
    Calculate Fibonacci retracement levels.

    Args:
        high: The high price point
        low: The low price point
        direction: 'buy' or 'sell' setup

    Returns:
        Dictionary mapping FibonacciLevel to calculated price level

    Formula:
        BUY:  Level = High - (Range × Ratio)
        SELL: Level = Low + (Range × Ratio)
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
    Calculate Fibonacci extension levels.

    Extensions project beyond the origin point for profit targets.

    Args:
        high: The high price point
        low: The low price point
        direction: 'buy' or 'sell' setup

    Returns:
        Dictionary mapping ExtensionLevel to calculated price level

    Formula:
        BUY (target below):  Level = High - (Range × Ratio)
        SELL (target above): Level = Low + (Range × Ratio)
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
    Calculate Fibonacci projection levels from 3 pivot points.

    Projection measures a previous swing (A→B) and projects from C.

    Args:
        point_a: First pivot point price
        point_b: Second pivot point price
        point_c: Third pivot point (projection origin)
        direction: 'buy' or 'sell' setup

    Returns:
        Dictionary mapping ProjectionLevel to calculated price level

    Formula:
        Swing = |A - B|
        BUY (project down):  D = C - (Swing × Ratio)
        SELL (project up):   D = C + (Swing × Ratio)
    """
    swing = abs(point_a - point_b)

    levels: dict[ProjectionLevel, float] = {}

    for level in ProjectionLevel:
        if direction == "buy":
            levels[level] = point_c - (swing * level.value)
        else:
            levels[level] = point_c + (swing * level.value)

    return levels
