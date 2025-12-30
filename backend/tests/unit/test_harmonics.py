"""Tests for harmonic pattern detection."""

import pytest

from trader.harmonics import (
    PatternType,
    calculate_prd,
    validate_pattern,
)


class TestGartleyPattern:
    """Tests for Gartley pattern detection."""

    def test_valid_bullish_gartley(self) -> None:
        """
        Bullish Gartley pattern requirements:
        - AB: 61.8% retracement of XA
        - BC: 38.2% - 88.6% retracement of AB
        - CD: 127.2% - 161.8% extension of BC
        - D: 78.6% retracement of XA
        """
        # X=100, A=50 (XA=50 down)
        # B = A + 0.618 * XA = 50 + 30.9 = 80.9 (61.8% retracement)
        # C = B - 0.618 * AB = 80.9 - 19.1 = 61.8 (61.8% of AB)
        # D = X - 0.786 * XA = 100 - 39.3 = 60.7 (78.6% retracement of XA)
        pattern = validate_pattern(
            x=100.0,
            a=50.0,
            b=80.9,
            c=61.8,
            d=60.7,
        )

        assert pattern is not None
        assert pattern.pattern_type == PatternType.GARTLEY
        assert pattern.direction == "buy"

    def test_valid_bearish_gartley(self) -> None:
        """Bearish Gartley pattern (inverted)."""
        # X=50, A=100 (XA=50 up)
        # B = A - 0.618 * XA = 100 - 30.9 = 69.1
        # C = B + 0.618 * AB = 69.1 + 19.1 = 88.2
        # D = X + 0.786 * XA = 50 + 39.3 = 89.3
        pattern = validate_pattern(
            x=50.0,
            a=100.0,
            b=69.1,
            c=88.2,
            d=89.3,
        )

        assert pattern is not None
        assert pattern.pattern_type == PatternType.GARTLEY
        assert pattern.direction == "sell"


class TestButterflyPattern:
    """Tests for Butterfly pattern detection."""

    def test_valid_bullish_butterfly(self) -> None:
        """
        Bullish Butterfly pattern requirements:
        - AB: 78.6% retracement of XA
        - BC: 38.2% - 88.6% retracement of AB
        - D: 127.2% - 161.8% extension of XA
        """
        # X=100, A=50 (XA=50 down)
        # B = A + 0.786 * XA = 50 + 39.3 = 89.3
        # C = B - 0.618 * AB = 89.3 - 24.3 = 65.0
        # D = X - 1.272 * XA = 100 - 63.6 = 36.4 (127.2% extension)
        pattern = validate_pattern(
            x=100.0,
            a=50.0,
            b=89.3,
            c=65.0,
            d=36.4,
        )

        assert pattern is not None
        assert pattern.pattern_type == PatternType.BUTTERFLY
        assert pattern.direction == "buy"


class TestBatPattern:
    """Tests for Bat pattern detection."""

    def test_valid_bullish_bat(self) -> None:
        """
        Bullish Bat pattern requirements:
        - AB: 38.2% - 50% retracement of XA
        - BC: 38.2% - 88.6% retracement of AB
        - D: 88.6% retracement of XA
        """
        # X=100, A=50 (XA=50 down)
        # B = A + 0.5 * XA = 50 + 25 = 75 (50% retracement)
        # C = B - 0.618 * AB = 75 - 15.45 = 59.55
        # D = X - 0.886 * XA = 100 - 44.3 = 55.7 (88.6% retracement)
        pattern = validate_pattern(
            x=100.0,
            a=50.0,
            b=75.0,
            c=59.55,
            d=55.7,
        )

        assert pattern is not None
        assert pattern.pattern_type == PatternType.BAT
        assert pattern.direction == "buy"


class TestCrabPattern:
    """Tests for Crab pattern detection."""

    def test_valid_bullish_crab(self) -> None:
        """
        Bullish Crab pattern requirements:
        - AB: 38.2% - 61.8% retracement of XA
        - BC: 38.2% - 88.6% retracement of AB
        - D: 161.8% extension of XA
        """
        # X=100, A=50 (XA=50 down)
        # B = A + 0.5 * XA = 50 + 25 = 75 (50% retracement)
        # C = B - 0.618 * AB = 75 - 15.45 = 59.55
        # D = X - 1.618 * XA = 100 - 80.9 = 19.1 (161.8% extension)
        pattern = validate_pattern(
            x=100.0,
            a=50.0,
            b=75.0,
            c=59.55,
            d=19.1,
        )

        assert pattern is not None
        assert pattern.pattern_type == PatternType.CRAB
        assert pattern.direction == "buy"


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


class TestPRDCalculation:
    """Tests for Potential Reversal Zone (PRD) calculation."""

    def test_calculate_gartley_prd(self) -> None:
        """Calculate potential D point for Gartley pattern."""
        prd = calculate_prd(
            x=100.0,
            a=50.0,
            b=80.9,
            c=61.8,
            pattern_type=PatternType.GARTLEY,
        )

        assert prd is not None
        assert prd.d_level == pytest.approx(60.7, rel=0.01)
        assert prd.direction == "buy"

    def test_calculate_bearish_prd(self) -> None:
        """Calculate potential D point for bearish pattern."""
        prd = calculate_prd(
            x=50.0,
            a=100.0,
            b=69.1,
            c=88.2,
            pattern_type=PatternType.GARTLEY,
        )

        assert prd is not None
        assert prd.d_level == pytest.approx(89.3, rel=0.01)
        assert prd.direction == "sell"


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
