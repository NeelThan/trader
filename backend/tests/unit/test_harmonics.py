"""Tests for harmonic pattern detection."""

from dataclasses import dataclass

import pytest

from trader.harmonics import (
    PatternType,
    calculate_reversal_zone,
    validate_pattern,
)


@dataclass(frozen=True)
class PatternCase:
    """Test case for pattern validation."""

    x: float
    a: float
    b: float
    c: float
    d: float
    expected_type: PatternType
    expected_direction: str


@dataclass(frozen=True)
class ReversalZoneCase:
    """Test case for reversal zone calculation."""

    x: float
    a: float
    expected_d_level: float
    expected_direction: str


class TestPatternValidation:
    """Tests for harmonic pattern validation."""

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                PatternCase(100.0, 50.0, 80.9, 61.8, 60.7, PatternType.GARTLEY, "buy"),
                id="bullish_gartley",
            ),
            pytest.param(
                PatternCase(50.0, 100.0, 69.1, 88.2, 89.3, PatternType.GARTLEY, "sell"),
                id="bearish_gartley",
            ),
            pytest.param(
                PatternCase(
                    100.0, 50.0, 89.3, 65.0, 36.4, PatternType.BUTTERFLY, "buy"
                ),
                id="bullish_butterfly",
            ),
            pytest.param(
                PatternCase(100.0, 50.0, 75.0, 59.55, 55.7, PatternType.BAT, "buy"),
                id="bullish_bat",
            ),
            pytest.param(
                PatternCase(100.0, 50.0, 75.0, 59.55, 19.1, PatternType.CRAB, "buy"),
                id="bullish_crab",
            ),
        ],
    )
    def test_valid_pattern_detected(self, case: PatternCase) -> None:
        """Validate that correct pattern type and direction are detected."""
        pattern = validate_pattern(
            x=case.x, a=case.a, b=case.b, c=case.c, d=case.d
        )

        assert pattern is not None
        assert pattern.pattern_type == case.expected_type
        assert pattern.direction == case.expected_direction


class TestNoPattern:
    """Tests for invalid patterns."""

    def test_no_pattern_random_points(self) -> None:
        """Random points should not form any pattern."""
        pattern = validate_pattern(
            x=100.0,
            a=50.0,
            b=60.0,
            c=55.0,
            d=45.0,
        )

        assert pattern is None


class TestReversalZoneCalculation:
    """Tests for reversal zone calculation."""

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                ReversalZoneCase(100.0, 50.0, 60.7, "buy"),
                id="bullish_gartley",
            ),
            pytest.param(
                ReversalZoneCase(50.0, 100.0, 89.3, "sell"),
                id="bearish_gartley",
            ),
        ],
    )
    def test_calculate_reversal_zone(self, case: ReversalZoneCase) -> None:
        """Calculate potential D point for Gartley pattern."""
        reversal_zone = calculate_reversal_zone(
            x=case.x, a=case.a, pattern_type=PatternType.GARTLEY
        )

        assert reversal_zone is not None
        assert reversal_zone.d_level == pytest.approx(case.expected_d_level, rel=0.01)
        assert reversal_zone.direction == case.expected_direction


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_zero_xa_leg_returns_no_pattern(self) -> None:
        """Pattern with zero XA leg should not match any pattern."""
        pattern = validate_pattern(
            x=100.0,
            a=100.0,  # Same as X, zero leg
            b=100.0,
            c=100.0,
            d=100.0,
        )

        assert pattern is None
