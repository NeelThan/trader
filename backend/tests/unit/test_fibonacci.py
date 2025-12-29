"""Tests for Fibonacci calculations."""

import pytest

from trader.fibonacci import (
    ExpansionLevel,
    ExtensionLevel,
    FibonacciLevel,
    ProjectionLevel,
    calculate_expansion_levels,
    calculate_extension_levels,
    calculate_projection_levels,
    calculate_retracement_levels,
)


class TestRetracementLevels:
    """Tests for Fibonacci retracement level calculations."""

    def test_buy_retracement_returns_correct_levels(self) -> None:
        """
        BUY retracement: Level = High - (Range × Ratio)

        Given: High = 100, Low = 50, Range = 50
        Expected levels:
        - 38.2%: 100 - (50 × 0.382) = 80.9
        - 50.0%: 100 - (50 × 0.500) = 75.0
        - 61.8%: 100 - (50 × 0.618) = 69.1
        - 78.6%: 100 - (50 × 0.786) = 60.7
        """
        high = 100.0
        low = 50.0

        levels = calculate_retracement_levels(high=high, low=low, direction="buy")

        assert len(levels) == 4
        assert levels[FibonacciLevel.LEVEL_382] == pytest.approx(80.9, rel=0.01)
        assert levels[FibonacciLevel.LEVEL_500] == pytest.approx(75.0, rel=0.01)
        assert levels[FibonacciLevel.LEVEL_618] == pytest.approx(69.1, rel=0.01)
        assert levels[FibonacciLevel.LEVEL_786] == pytest.approx(60.7, rel=0.01)

    def test_sell_retracement_returns_correct_levels(self) -> None:
        """
        SELL retracement: Level = Low + (Range × Ratio)

        Given: High = 100, Low = 50, Range = 50
        Expected levels:
        - 38.2%: 50 + (50 × 0.382) = 69.1
        - 50.0%: 50 + (50 × 0.500) = 75.0
        - 61.8%: 50 + (50 × 0.618) = 80.9
        - 78.6%: 50 + (50 × 0.786) = 89.3
        """
        high = 100.0
        low = 50.0

        levels = calculate_retracement_levels(high=high, low=low, direction="sell")

        assert len(levels) == 4
        assert levels[FibonacciLevel.LEVEL_382] == pytest.approx(69.1, rel=0.01)
        assert levels[FibonacciLevel.LEVEL_500] == pytest.approx(75.0, rel=0.01)
        assert levels[FibonacciLevel.LEVEL_618] == pytest.approx(80.9, rel=0.01)
        assert levels[FibonacciLevel.LEVEL_786] == pytest.approx(89.3, rel=0.01)

    def test_retracement_with_zero_range_returns_same_levels(self) -> None:
        """When high equals low, all levels should equal that price."""
        high = 100.0
        low = 100.0

        levels = calculate_retracement_levels(high=high, low=low, direction="buy")

        for level in FibonacciLevel:
            assert levels[level] == 100.0

    def test_retracement_with_decimal_prices(self) -> None:
        """Verify calculations work with decimal prices (real market data)."""
        high = 1.2345
        low = 1.1234

        levels = calculate_retracement_levels(high=high, low=low, direction="buy")

        price_range = high - low  # 0.1111
        expected_382 = high - (price_range * 0.382)

        assert levels[FibonacciLevel.LEVEL_382] == pytest.approx(
            expected_382, rel=0.001
        )


class TestExtensionLevels:
    """Tests for Fibonacci extension level calculations."""

    def test_buy_extension_returns_correct_levels(self) -> None:
        """
        BUY extension (target below origin): Level = High - (Range × Ratio)

        Given: High = 100, Low = 50, Range = 50
        Expected levels:
        - 127.2%: 100 - (50 × 1.272) = 36.4
        - 161.8%: 100 - (50 × 1.618) = 19.1
        - 261.8%: 100 - (50 × 2.618) = -30.9
        """
        high = 100.0
        low = 50.0

        levels = calculate_extension_levels(high=high, low=low, direction="buy")

        assert len(levels) == 3
        assert levels[ExtensionLevel.LEVEL_1272] == pytest.approx(36.4, rel=0.01)
        assert levels[ExtensionLevel.LEVEL_1618] == pytest.approx(19.1, rel=0.01)
        assert levels[ExtensionLevel.LEVEL_2618] == pytest.approx(-30.9, rel=0.01)

    def test_sell_extension_returns_correct_levels(self) -> None:
        """
        SELL extension (target above origin): Level = Low + (Range × Ratio)

        Given: High = 100, Low = 50, Range = 50
        Expected levels:
        - 127.2%: 50 + (50 × 1.272) = 113.6
        - 161.8%: 50 + (50 × 1.618) = 130.9
        - 261.8%: 50 + (50 × 2.618) = 180.9
        """
        high = 100.0
        low = 50.0

        levels = calculate_extension_levels(high=high, low=low, direction="sell")

        assert len(levels) == 3
        assert levels[ExtensionLevel.LEVEL_1272] == pytest.approx(113.6, rel=0.01)
        assert levels[ExtensionLevel.LEVEL_1618] == pytest.approx(130.9, rel=0.01)
        assert levels[ExtensionLevel.LEVEL_2618] == pytest.approx(180.9, rel=0.01)


class TestProjectionLevels:
    """Tests for Fibonacci projection level calculations (3-point A,B,C → D)."""

    def test_buy_projection_returns_correct_levels(self) -> None:
        """
        BUY projection: D = C - (Swing × Ratio)

        Given: A = 100, B = 50, C = 75, Swing = 50
        Expected levels:
        - 61.8%:  75 - (50 × 0.618) = 44.1
        - 78.6%:  75 - (50 × 0.786) = 35.7
        - 100.0%: 75 - (50 × 1.000) = 25.0
        - 127.2%: 75 - (50 × 1.272) = 11.4
        - 161.8%: 75 - (50 × 1.618) = -5.9
        """
        point_a = 100.0
        point_b = 50.0
        point_c = 75.0

        levels = calculate_projection_levels(
            point_a=point_a, point_b=point_b, point_c=point_c, direction="buy"
        )

        assert len(levels) == 5
        assert levels[ProjectionLevel.LEVEL_618] == pytest.approx(44.1, rel=0.01)
        assert levels[ProjectionLevel.LEVEL_786] == pytest.approx(35.7, rel=0.01)
        assert levels[ProjectionLevel.LEVEL_1000] == pytest.approx(25.0, rel=0.01)
        assert levels[ProjectionLevel.LEVEL_1272] == pytest.approx(11.4, rel=0.01)
        assert levels[ProjectionLevel.LEVEL_1618] == pytest.approx(-5.9, rel=0.01)

    def test_sell_projection_returns_correct_levels(self) -> None:
        """
        SELL projection: D = C + (Swing × Ratio)

        Given: A = 50, B = 100, C = 75, Swing = 50
        Expected levels:
        - 61.8%:  75 + (50 × 0.618) = 105.9
        - 78.6%:  75 + (50 × 0.786) = 114.3
        - 100.0%: 75 + (50 × 1.000) = 125.0
        - 127.2%: 75 + (50 × 1.272) = 138.6
        - 161.8%: 75 + (50 × 1.618) = 155.9
        """
        point_a = 50.0
        point_b = 100.0
        point_c = 75.0

        levels = calculate_projection_levels(
            point_a=point_a, point_b=point_b, point_c=point_c, direction="sell"
        )

        assert len(levels) == 5
        assert levels[ProjectionLevel.LEVEL_618] == pytest.approx(105.9, rel=0.01)
        assert levels[ProjectionLevel.LEVEL_786] == pytest.approx(114.3, rel=0.01)
        assert levels[ProjectionLevel.LEVEL_1000] == pytest.approx(125.0, rel=0.01)
        assert levels[ProjectionLevel.LEVEL_1272] == pytest.approx(138.6, rel=0.01)
        assert levels[ProjectionLevel.LEVEL_1618] == pytest.approx(155.9, rel=0.01)


class TestExpansionLevels:
    """Tests for Fibonacci expansion level calculations (forecast from B)."""

    def test_buy_expansion_returns_correct_levels(self) -> None:
        """
        BUY expansion: D = B - (Range × Ratio)

        Given: A = 100 (high), B = 50 (low), Range = 50
        Expected levels (forecast down from B=50):
        - 38.2%:  50 - (50 × 0.382) = 30.9
        - 50.0%:  50 - (50 × 0.500) = 25.0
        - 61.8%:  50 - (50 × 0.618) = 19.1
        - 100.0%: 50 - (50 × 1.000) = 0.0
        - 161.8%: 50 - (50 × 1.618) = -30.9
        """
        point_a = 100.0  # High
        point_b = 50.0   # Low

        levels = calculate_expansion_levels(
            point_a=point_a, point_b=point_b, direction="buy"
        )

        assert len(levels) == 5
        assert levels[ExpansionLevel.LEVEL_382] == pytest.approx(30.9, rel=0.01)
        assert levels[ExpansionLevel.LEVEL_500] == pytest.approx(25.0, rel=0.01)
        assert levels[ExpansionLevel.LEVEL_618] == pytest.approx(19.1, rel=0.01)
        assert levels[ExpansionLevel.LEVEL_1000] == pytest.approx(0.0, abs=0.01)
        assert levels[ExpansionLevel.LEVEL_1618] == pytest.approx(-30.9, rel=0.01)

    def test_sell_expansion_returns_correct_levels(self) -> None:
        """
        SELL expansion: D = B + (Range × Ratio)

        Given: A = 50 (low), B = 100 (high), Range = 50
        Expected levels (forecast up from B=100):
        - 38.2%:  100 + (50 × 0.382) = 119.1
        - 50.0%:  100 + (50 × 0.500) = 125.0
        - 61.8%:  100 + (50 × 0.618) = 130.9
        - 100.0%: 100 + (50 × 1.000) = 150.0
        - 161.8%: 100 + (50 × 1.618) = 180.9
        """
        point_a = 50.0   # Low
        point_b = 100.0  # High

        levels = calculate_expansion_levels(
            point_a=point_a, point_b=point_b, direction="sell"
        )

        assert len(levels) == 5
        assert levels[ExpansionLevel.LEVEL_382] == pytest.approx(119.1, rel=0.01)
        assert levels[ExpansionLevel.LEVEL_500] == pytest.approx(125.0, rel=0.01)
        assert levels[ExpansionLevel.LEVEL_618] == pytest.approx(130.9, rel=0.01)
        assert levels[ExpansionLevel.LEVEL_1000] == pytest.approx(150.0, rel=0.01)
        assert levels[ExpansionLevel.LEVEL_1618] == pytest.approx(180.9, rel=0.01)
