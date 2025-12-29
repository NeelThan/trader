"""Fibonacci calculation tools for trading analysis."""

from enum import Enum
from typing import Literal


class FibonacciLevel(Enum):
    """Standard Fibonacci retracement levels."""

    LEVEL_382 = 0.382
    LEVEL_500 = 0.500
    LEVEL_618 = 0.618
    LEVEL_786 = 0.786


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
