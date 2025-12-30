"""Harmonic pattern detection for trading analysis."""

from dataclasses import dataclass
from enum import Enum
from typing import Literal


class PatternType(Enum):
    """Harmonic pattern types."""

    GARTLEY = "gartley"
    BUTTERFLY = "butterfly"
    BAT = "bat"
    CRAB = "crab"


@dataclass(frozen=True)
class HarmonicPattern:
    """Detected harmonic pattern."""

    pattern_type: PatternType
    direction: Literal["buy", "sell"]
    x: float
    a: float
    b: float
    c: float
    d: float


@dataclass(frozen=True)
class PotentialReversalZone:
    """Potential Reversal Zone (PRZ) for pattern completion."""

    d_level: float
    direction: Literal["buy", "sell"]
    pattern_type: PatternType


# Tolerance for Fibonacci ratio matching (5%)
TOLERANCE = 0.05


def _ratio(value: float, base: float) -> float:
    """Calculate ratio of value to base."""
    if base == 0:
        return 0.0
    return abs(value) / abs(base)


def _is_within_range(ratio: float, low: float, high: float) -> bool:
    """Check if ratio is within range with tolerance."""
    return (low - TOLERANCE) <= ratio <= (high + TOLERANCE)


def _is_near(ratio: float, target: float) -> bool:
    """Check if ratio is near target with tolerance."""
    return abs(ratio - target) <= TOLERANCE


def _get_direction(x: float, a: float) -> Literal["buy", "sell"]:
    """Determine pattern direction based on XA leg."""
    return "buy" if x > a else "sell"


def _check_gartley(
    xa: float, ab: float, bc: float, xd: float, direction: Literal["buy", "sell"]
) -> bool:
    """
    Check Gartley pattern ratios.

    Requirements:
    - AB: 61.8% retracement of XA
    - BC: 38.2% - 88.6% retracement of AB
    - D: 78.6% retracement of XA
    """
    ab_ratio = _ratio(ab, xa)
    bc_ratio = _ratio(bc, ab)
    xd_ratio = _ratio(xd, xa)

    return (
        _is_near(ab_ratio, 0.618)
        and _is_within_range(bc_ratio, 0.382, 0.886)
        and _is_near(xd_ratio, 0.786)
    )


def _check_butterfly(
    xa: float, ab: float, bc: float, xd: float, direction: Literal["buy", "sell"]
) -> bool:
    """
    Check Butterfly pattern ratios.

    Requirements:
    - AB: 78.6% retracement of XA
    - BC: 38.2% - 88.6% retracement of AB
    - D: 127.2% - 161.8% extension of XA
    """
    ab_ratio = _ratio(ab, xa)
    bc_ratio = _ratio(bc, ab)
    xd_ratio = _ratio(xd, xa)

    return (
        _is_near(ab_ratio, 0.786)
        and _is_within_range(bc_ratio, 0.382, 0.886)
        and _is_within_range(xd_ratio, 1.272, 1.618)
    )


def _check_bat(
    xa: float, ab: float, bc: float, xd: float, direction: Literal["buy", "sell"]
) -> bool:
    """
    Check Bat pattern ratios.

    Requirements:
    - AB: 38.2% - 50% retracement of XA
    - BC: 38.2% - 88.6% retracement of AB
    - D: 88.6% retracement of XA
    """
    ab_ratio = _ratio(ab, xa)
    bc_ratio = _ratio(bc, ab)
    xd_ratio = _ratio(xd, xa)

    return (
        _is_within_range(ab_ratio, 0.382, 0.50)
        and _is_within_range(bc_ratio, 0.382, 0.886)
        and _is_near(xd_ratio, 0.886)
    )


def _check_crab(
    xa: float, ab: float, bc: float, xd: float, direction: Literal["buy", "sell"]
) -> bool:
    """
    Check Crab pattern ratios.

    Requirements:
    - AB: 38.2% - 61.8% retracement of XA
    - BC: 38.2% - 88.6% retracement of AB
    - D: 161.8% extension of XA
    """
    ab_ratio = _ratio(ab, xa)
    bc_ratio = _ratio(bc, ab)
    xd_ratio = _ratio(xd, xa)

    return (
        _is_within_range(ab_ratio, 0.382, 0.618)
        and _is_within_range(bc_ratio, 0.382, 0.886)
        and _is_near(xd_ratio, 1.618)
    )


def validate_pattern(
    x: float, a: float, b: float, c: float, d: float
) -> HarmonicPattern | None:
    """
    Validate if points form a harmonic pattern.

    Args:
        x: First point (start of XA leg)
        a: Second point (end of XA leg)
        b: Third point (end of AB leg)
        c: Fourth point (end of BC leg)
        d: Fifth point (potential reversal zone)

    Returns:
        HarmonicPattern if valid pattern detected, None otherwise
    """
    direction = _get_direction(x, a)

    # Calculate leg distances
    xa = a - x
    ab = b - a
    bc = c - b
    xd = d - x

    # Check patterns in order of specificity
    pattern_checks = [
        (PatternType.GARTLEY, _check_gartley),
        (PatternType.BUTTERFLY, _check_butterfly),
        (PatternType.BAT, _check_bat),
        (PatternType.CRAB, _check_crab),
    ]

    for pattern_type, check_fn in pattern_checks:
        if check_fn(xa, ab, bc, xd, direction):
            return HarmonicPattern(
                pattern_type=pattern_type,
                direction=direction,
                x=x,
                a=a,
                b=b,
                c=c,
                d=d,
            )

    return None


def calculate_prd(
    x: float,
    a: float,
    b: float,
    c: float,
    pattern_type: PatternType,
) -> PotentialReversalZone | None:
    """
    Calculate Potential Reversal Zone (PRZ) for pattern completion.

    Args:
        x: First point
        a: Second point
        b: Third point
        c: Fourth point
        pattern_type: Type of pattern to calculate D for

    Returns:
        PotentialReversalZone with calculated D level
    """
    direction = _get_direction(x, a)
    xa = a - x

    # D point ratios for each pattern type
    d_ratios = {
        PatternType.GARTLEY: 0.786,
        PatternType.BUTTERFLY: 1.272,
        PatternType.BAT: 0.886,
        PatternType.CRAB: 1.618,
    }

    ratio = d_ratios.get(pattern_type)
    if ratio is None:
        return None

    # Calculate D level
    d_level = x + (xa * ratio) if ratio < 1 else x - (abs(xa) * (ratio - 1)) - abs(xa)

    # Simplified: D is at ratio * XA from X
    if direction == "buy":
        # Bullish: X > A, D below X
        d_level = x - (abs(xa) * ratio)
    else:
        # Bearish: X < A, D above X
        d_level = x + (abs(xa) * ratio)

    return PotentialReversalZone(
        d_level=d_level,
        direction=direction,
        pattern_type=pattern_type,
    )
