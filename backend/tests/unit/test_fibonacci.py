"""Tests for Fibonacci calculations."""

import pytest

from trader.fibonacci import (
    ExtensionLevel,
    FibonacciLevel,
    calculate_extension_levels,
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
