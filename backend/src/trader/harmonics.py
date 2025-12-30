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
class ReversalZone:
    """Reversal zone for pattern completion (the D point)."""

    d_level: float
    direction: Literal["buy", "sell"]
    pattern_type: PatternType


@dataclass(frozen=True)
class PatternRatios:
    """Calculated Fibonacci ratios for pattern validation."""

    ab_ratio: float  # AB retracement of XA
    bc_ratio: float  # BC retracement of AB
    xd_ratio: float  # XD retracement/extension of XA


# Tolerance for Fibonacci ratio matching (5%)
TOLERANCE = 0.05

# BC ratio range is consistent across all harmonic patterns
BC_RATIO_MIN = 0.382
BC_RATIO_MAX = 0.886

# D point ratios for each pattern type
PATTERN_D_RATIOS = {
    PatternType.GARTLEY: 0.786,
    PatternType.BUTTERFLY: 1.272,
    PatternType.BAT: 0.886,
    PatternType.CRAB: 1.618,
}


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


def _has_valid_bc_ratio(ratios: PatternRatios) -> bool:
    """Check if BC ratio is within valid range (common to all patterns)."""
    return _is_within_range(ratios.bc_ratio, BC_RATIO_MIN, BC_RATIO_MAX)


def _get_direction(x: float, a: float) -> Literal["buy", "sell"]:
    """Determine pattern direction based on XA leg."""
    return "buy" if x > a else "sell"


def _calculate_ratios(
    xa_leg: float, ab_leg: float, bc_leg: float, xd_leg: float
) -> PatternRatios:
    """Calculate Fibonacci ratios from leg distances."""
    return PatternRatios(
        ab_ratio=_ratio(ab_leg, xa_leg),
        bc_ratio=_ratio(bc_leg, ab_leg),
        xd_ratio=_ratio(xd_leg, xa_leg),
    )


def _check_gartley(ratios: PatternRatios) -> bool:
    """Check Gartley pattern: AB=61.8%, BC=38.2-88.6%, D=78.6%."""
    return (
        _is_near(ratios.ab_ratio, 0.618)
        and _has_valid_bc_ratio(ratios)
        and _is_near(ratios.xd_ratio, PATTERN_D_RATIOS[PatternType.GARTLEY])
    )


def _check_butterfly(ratios: PatternRatios) -> bool:
    """Check Butterfly pattern: AB=78.6%, BC=38.2-88.6%, D=127.2-161.8%."""
    return (
        _is_near(ratios.ab_ratio, 0.786)
        and _has_valid_bc_ratio(ratios)
        and _is_within_range(ratios.xd_ratio, 1.272, 1.618)
    )


def _check_bat(ratios: PatternRatios) -> bool:
    """Check Bat pattern: AB=38.2-50%, BC=38.2-88.6%, D=88.6%."""
    return (
        _is_within_range(ratios.ab_ratio, 0.382, 0.50)
        and _has_valid_bc_ratio(ratios)
        and _is_near(ratios.xd_ratio, PATTERN_D_RATIOS[PatternType.BAT])
    )


def _check_crab(ratios: PatternRatios) -> bool:
    """Check Crab pattern: AB=38.2-61.8%, BC=38.2-88.6%, D=161.8%."""
    return (
        _is_within_range(ratios.ab_ratio, 0.382, 0.618)
        and _has_valid_bc_ratio(ratios)
        and _is_near(ratios.xd_ratio, PATTERN_D_RATIOS[PatternType.CRAB])
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

    # Calculate leg distances and ratios
    xa_leg, ab_leg, bc_leg, xd_leg = a - x, b - a, c - b, d - x
    ratios = _calculate_ratios(xa_leg, ab_leg, bc_leg, xd_leg)

    # Check patterns in order of specificity
    pattern_checks = [
        (PatternType.GARTLEY, _check_gartley),
        (PatternType.BUTTERFLY, _check_butterfly),
        (PatternType.BAT, _check_bat),
        (PatternType.CRAB, _check_crab),
    ]

    for pattern_type, check_fn in pattern_checks:
        if check_fn(ratios):
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


def calculate_reversal_zone(
    x: float,
    a: float,
    pattern_type: PatternType,
) -> ReversalZone | None:
    """
    Calculate the reversal zone (D point) for pattern completion.

    Args:
        x: First point (start of XA leg)
        a: Second point (end of XA leg)
        pattern_type: Type of pattern to calculate D for

    Returns:
        ReversalZone with calculated D level, or None if invalid pattern type
    """
    direction = _get_direction(x, a)
    xa_leg = a - x

    ratio = PATTERN_D_RATIOS.get(pattern_type)
    if ratio is None:
        return None

    # Calculate D level based on direction
    if direction == "buy":
        # Bullish: X > A, D below X
        d_level = x - (abs(xa_leg) * ratio)
    else:
        # Bearish: X < A, D above X
        d_level = x + (abs(xa_leg) * ratio)

    return ReversalZone(
        d_level=d_level,
        direction=direction,
        pattern_type=pattern_type,
    )
