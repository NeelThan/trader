"""Tests for Fibonacci calculations."""

from dataclasses import dataclass

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


@dataclass(frozen=True)
class RetracementCase:
    """Test case for retracement level calculations."""

    direction: str
    level_382: float
    level_500: float
    level_618: float
    level_786: float


@dataclass(frozen=True)
class ExtensionCase:
    """Test case for extension level calculations."""

    direction: str
    level_1272: float
    level_1618: float
    level_2618: float


@dataclass(frozen=True)
class ProjectionCase:
    """Test case for projection level calculations."""

    direction: str
    point_a: float
    point_b: float
    point_c: float
    level_618: float
    level_786: float
    level_1000: float
    level_1272: float
    level_1618: float


@dataclass(frozen=True)
class ExpansionCase:
    """Test case for expansion level calculations."""

    direction: str
    point_a: float
    point_b: float
    level_382: float
    level_500: float
    level_618: float
    level_1000: float
    level_1618: float


class TestRetracementLevels:
    """Tests for Fibonacci retracement level calculations.

    BUY retracement: Level = High - (Range × Ratio)
    SELL retracement: Level = Low + (Range × Ratio)

    Test data uses High=100, Low=50, Range=50.
    """

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                RetracementCase("buy", 80.9, 75.0, 69.1, 60.7),
                id="buy_retracement",
            ),
            pytest.param(
                RetracementCase("sell", 69.1, 75.0, 80.9, 89.3),
                id="sell_retracement",
            ),
        ],
    )
    def test_retracement_returns_correct_levels(self, case: RetracementCase) -> None:
        """Verify retracement levels are calculated correctly for both directions."""
        high = 100.0
        low = 50.0

        levels = calculate_retracement_levels(
            high=high, low=low, direction=case.direction
        )

        assert len(levels) == 4
        assert levels[FibonacciLevel.LEVEL_382] == pytest.approx(
            case.level_382, rel=0.01
        )
        assert levels[FibonacciLevel.LEVEL_500] == pytest.approx(
            case.level_500, rel=0.01
        )
        assert levels[FibonacciLevel.LEVEL_618] == pytest.approx(
            case.level_618, rel=0.01
        )
        assert levels[FibonacciLevel.LEVEL_786] == pytest.approx(
            case.level_786, rel=0.01
        )

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
    """Tests for Fibonacci extension level calculations.

    BUY extension (target below origin): Level = High - (Range × Ratio)
    SELL extension (target above origin): Level = Low + (Range × Ratio)

    Test data uses High=100, Low=50, Range=50.
    """

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                ExtensionCase("buy", 36.4, 19.1, -30.9),
                id="buy_extension",
            ),
            pytest.param(
                ExtensionCase("sell", 113.6, 130.9, 180.9),
                id="sell_extension",
            ),
        ],
    )
    def test_extension_returns_correct_levels(self, case: ExtensionCase) -> None:
        """Verify extension levels are calculated correctly for both directions."""
        high = 100.0
        low = 50.0

        levels = calculate_extension_levels(
            high=high, low=low, direction=case.direction
        )

        assert len(levels) == 3
        assert levels[ExtensionLevel.LEVEL_1272] == pytest.approx(
            case.level_1272, rel=0.01
        )
        assert levels[ExtensionLevel.LEVEL_1618] == pytest.approx(
            case.level_1618, rel=0.01
        )
        assert levels[ExtensionLevel.LEVEL_2618] == pytest.approx(
            case.level_2618, rel=0.01
        )


class TestProjectionLevels:
    """Tests for Fibonacci projection level calculations (3-point A,B,C → D).

    BUY projection: D = C - (Swing × Ratio)
    SELL projection: D = C + (Swing × Ratio)
    """

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                ProjectionCase(
                    "buy", 100.0, 50.0, 75.0, 44.1, 35.7, 25.0, 11.4, -5.9
                ),
                id="buy_projection",
            ),
            pytest.param(
                ProjectionCase(
                    "sell", 50.0, 100.0, 75.0, 105.9, 114.3, 125.0, 138.6, 155.9
                ),
                id="sell_projection",
            ),
        ],
    )
    def test_projection_returns_correct_levels(self, case: ProjectionCase) -> None:
        """Verify projection levels are calculated correctly for both directions."""
        levels = calculate_projection_levels(
            point_a=case.point_a,
            point_b=case.point_b,
            point_c=case.point_c,
            direction=case.direction,
        )

        assert len(levels) == 5
        assert levels[ProjectionLevel.LEVEL_618] == pytest.approx(
            case.level_618, rel=0.01
        )
        assert levels[ProjectionLevel.LEVEL_786] == pytest.approx(
            case.level_786, rel=0.01
        )
        assert levels[ProjectionLevel.LEVEL_1000] == pytest.approx(
            case.level_1000, rel=0.01
        )
        assert levels[ProjectionLevel.LEVEL_1272] == pytest.approx(
            case.level_1272, rel=0.01
        )
        assert levels[ProjectionLevel.LEVEL_1618] == pytest.approx(
            case.level_1618, rel=0.01
        )


class TestExpansionLevels:
    """Tests for Fibonacci expansion level calculations (forecast from B).

    BUY expansion: D = B - (Range × Ratio) [forecast down from B]
    SELL expansion: D = B + (Range × Ratio) [forecast up from B]
    """

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                ExpansionCase("buy", 100.0, 50.0, 30.9, 25.0, 19.1, 0.0, -30.9),
                id="buy_expansion",
            ),
            pytest.param(
                ExpansionCase("sell", 50.0, 100.0, 119.1, 125.0, 130.9, 150.0, 180.9),
                id="sell_expansion",
            ),
        ],
    )
    def test_expansion_returns_correct_levels(self, case: ExpansionCase) -> None:
        """Verify expansion levels are calculated correctly for both directions."""
        levels = calculate_expansion_levels(
            point_a=case.point_a, point_b=case.point_b, direction=case.direction
        )

        assert len(levels) == 5
        assert levels[ExpansionLevel.LEVEL_382] == pytest.approx(
            case.level_382, rel=0.01
        )
        assert levels[ExpansionLevel.LEVEL_500] == pytest.approx(
            case.level_500, rel=0.01
        )
        assert levels[ExpansionLevel.LEVEL_618] == pytest.approx(
            case.level_618, rel=0.01
        )
        assert levels[ExpansionLevel.LEVEL_1000] == pytest.approx(
            case.level_1000, abs=0.01
        )
        assert levels[ExpansionLevel.LEVEL_1618] == pytest.approx(
            case.level_1618, rel=0.01
        )
