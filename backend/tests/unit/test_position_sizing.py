"""Tests for position sizing calculations.

This module tests the financial position sizing logic which calculates:
- Position size based on risk capital and stop loss distance
- Risk:Reward ratio based on targets
- Trade validity based on risk parameters
"""

from dataclasses import dataclass

import pytest

from trader.position_sizing import (
    PositionSizeResult,
    RiskRewardResult,
    TradeRecommendation,
    calculate_position_size,
    calculate_risk_reward,
)


@dataclass(frozen=True)
class PositionSizeCase:
    """Test case for position size calculations."""

    entry_price: float
    stop_loss: float
    risk_capital: float
    expected_position_size: float
    expected_distance: float


@dataclass(frozen=True)
class RiskRewardCase:
    """Test case for risk/reward calculations."""

    entry_price: float
    stop_loss: float
    targets: list[float]
    expected_ratio: float
    expected_recommendation: TradeRecommendation


class TestCalculatePositionSize:
    """Tests for position size calculation.

    Formula: Position Size = Risk Capital / Distance to Stop
    Distance = |Entry Price - Stop Loss|
    """

    @pytest.mark.parametrize(
        "case",
        [
            # Standard long trade: Entry 100, Stop 95, Risk $500
            # Distance = 5, Position Size = 500/5 = 100
            PositionSizeCase(
                entry_price=100.0,
                stop_loss=95.0,
                risk_capital=500.0,
                expected_position_size=100.0,
                expected_distance=5.0,
            ),
            # Standard short trade: Entry 100, Stop 105, Risk $500
            # Distance = 5, Position Size = 500/5 = 100
            PositionSizeCase(
                entry_price=100.0,
                stop_loss=105.0,
                risk_capital=500.0,
                expected_position_size=100.0,
                expected_distance=5.0,
            ),
            # Larger stop distance: Entry 50, Stop 40, Risk $200
            # Distance = 10, Position Size = 200/10 = 20
            PositionSizeCase(
                entry_price=50.0,
                stop_loss=40.0,
                risk_capital=200.0,
                expected_position_size=20.0,
                expected_distance=10.0,
            ),
            # Small stop distance (tight stop): Entry 100, Stop 99, Risk $100
            # Distance = 1, Position Size = 100/1 = 100
            PositionSizeCase(
                entry_price=100.0,
                stop_loss=99.0,
                risk_capital=100.0,
                expected_position_size=100.0,
                expected_distance=1.0,
            ),
            # Fractional prices: Entry 1.2500, Stop 1.2450, Risk $100
            # Distance = 0.005, Position Size = 100/0.005 = 20000
            PositionSizeCase(
                entry_price=1.2500,
                stop_loss=1.2450,
                risk_capital=100.0,
                expected_position_size=20000.0,
                expected_distance=0.005,
            ),
        ],
        ids=[
            "standard_long_trade",
            "standard_short_trade",
            "larger_stop_distance",
            "tight_stop",
            "fractional_forex_prices",
        ],
    )
    def test_calculates_position_size_correctly(self, case: PositionSizeCase) -> None:
        """Position size equals risk capital divided by stop distance."""
        result = calculate_position_size(
            entry_price=case.entry_price,
            stop_loss=case.stop_loss,
            risk_capital=case.risk_capital,
        )

        assert isinstance(result, PositionSizeResult)
        assert result.position_size == pytest.approx(case.expected_position_size)
        assert result.distance_to_stop == pytest.approx(case.expected_distance)
        assert result.risk_amount == pytest.approx(case.risk_capital)

    def test_returns_zero_when_stop_equals_entry(self) -> None:
        """Returns zero position size when stop equals entry."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=100.0,
            risk_capital=500.0,
        )

        assert result.position_size == 0.0
        assert result.distance_to_stop == 0.0
        assert result.is_valid is False

    def test_returns_invalid_for_zero_entry_price(self) -> None:
        """Returns invalid result for zero entry price."""
        result = calculate_position_size(
            entry_price=0.0,
            stop_loss=50.0,
            risk_capital=100.0,
        )

        assert result.is_valid is False

    def test_returns_invalid_for_zero_stop_loss(self) -> None:
        """Returns invalid result for zero stop loss."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=0.0,
            risk_capital=100.0,
        )

        assert result.is_valid is False

    def test_returns_invalid_for_negative_risk_capital(self) -> None:
        """Returns invalid result for negative risk capital."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=-100.0,
        )

        assert result.is_valid is False

    def test_returns_invalid_for_zero_risk_capital(self) -> None:
        """Returns zero position size for zero risk capital."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=0.0,
        )

        assert result.position_size == 0.0


class TestCalculateRiskReward:
    """Tests for risk/reward ratio calculation.

    Formula: R:R Ratio = Target Distance / Stop Distance
    Target Distance = |Target - Entry|
    Stop Distance = |Entry - Stop|
    """

    @pytest.mark.parametrize(
        "case",
        [
            # 2:1 R:R (long): Entry 100, Stop 95, Target 110
            # Stop Distance = 5, Target Distance = 10, R:R = 2.0
            RiskRewardCase(
                entry_price=100.0,
                stop_loss=95.0,
                targets=[110.0],
                expected_ratio=2.0,
                expected_recommendation=TradeRecommendation.GOOD,
            ),
            # 1:1 R:R (long): Entry 100, Stop 95, Target 105
            # Stop Distance = 5, Target Distance = 5, R:R = 1.0
            RiskRewardCase(
                entry_price=100.0,
                stop_loss=95.0,
                targets=[105.0],
                expected_ratio=1.0,
                expected_recommendation=TradeRecommendation.MARGINAL,
            ),
            # Poor R:R (< 1): Entry 100, Stop 95, Target 103
            # Stop Distance = 5, Target Distance = 3, R:R = 0.6
            RiskRewardCase(
                entry_price=100.0,
                stop_loss=95.0,
                targets=[103.0],
                expected_ratio=0.6,
                expected_recommendation=TradeRecommendation.POOR,
            ),
            # Excellent R:R (>= 3): Entry 100, Stop 98, Target 106
            # Stop Distance = 2, Target Distance = 6, R:R = 3.0
            RiskRewardCase(
                entry_price=100.0,
                stop_loss=98.0,
                targets=[106.0],
                expected_ratio=3.0,
                expected_recommendation=TradeRecommendation.EXCELLENT,
            ),
            # 2:1 R:R (short): Entry 100, Stop 105, Target 90
            # Stop Distance = 5, Target Distance = 10, R:R = 2.0
            RiskRewardCase(
                entry_price=100.0,
                stop_loss=105.0,
                targets=[90.0],
                expected_ratio=2.0,
                expected_recommendation=TradeRecommendation.GOOD,
            ),
        ],
        ids=[
            "long_trade_2_to_1",
            "long_trade_1_to_1",
            "long_trade_poor_rr",
            "long_trade_excellent_rr",
            "short_trade_2_to_1",
        ],
    )
    def test_calculates_risk_reward_correctly(self, case: RiskRewardCase) -> None:
        """Risk:reward ratio equals target distance divided by stop distance."""
        result = calculate_risk_reward(
            entry_price=case.entry_price,
            stop_loss=case.stop_loss,
            targets=case.targets,
        )

        assert isinstance(result, RiskRewardResult)
        assert result.risk_reward_ratio == pytest.approx(case.expected_ratio)
        assert result.recommendation == case.expected_recommendation

    def test_uses_first_target_for_ratio(self) -> None:
        """Uses first target to calculate primary R:R ratio."""
        result = calculate_risk_reward(
            entry_price=100.0,
            stop_loss=95.0,
            targets=[110.0, 120.0, 130.0],  # First target: 110
        )

        # R:R based on first target only
        assert result.risk_reward_ratio == pytest.approx(2.0)

    def test_calculates_multiple_target_ratios(self) -> None:
        """Calculates R:R for each target in the list."""
        result = calculate_risk_reward(
            entry_price=100.0,
            stop_loss=95.0,
            targets=[110.0, 115.0, 120.0],
        )

        # Primary ratio uses first target
        assert result.risk_reward_ratio == pytest.approx(2.0)
        # Also provides ratios for all targets
        assert len(result.target_ratios) == 3
        assert result.target_ratios[0] == pytest.approx(2.0)  # 10/5
        assert result.target_ratios[1] == pytest.approx(3.0)  # 15/5
        assert result.target_ratios[2] == pytest.approx(4.0)  # 20/5

    def test_calculates_potential_profit_and_loss(self) -> None:
        """Calculates potential profit based on targets and loss based on stop."""
        result = calculate_risk_reward(
            entry_price=100.0,
            stop_loss=95.0,
            targets=[110.0],
            position_size=10.0,
        )

        # Potential loss = position_size * stop_distance = 10 * 5 = 50
        assert result.potential_loss == pytest.approx(50.0)
        # Potential profit = position_size * target_distance = 10 * 10 = 100
        assert result.potential_profit == pytest.approx(100.0)

    def test_returns_zero_ratio_with_no_targets(self) -> None:
        """Returns zero ratio when no targets are provided."""
        result = calculate_risk_reward(
            entry_price=100.0,
            stop_loss=95.0,
            targets=[],
        )

        assert result.risk_reward_ratio == 0.0
        assert result.is_valid is False

    def test_returns_invalid_when_stop_equals_entry(self) -> None:
        """Returns invalid result when stop equals entry (avoids division by zero)."""
        result = calculate_risk_reward(
            entry_price=100.0,
            stop_loss=100.0,
            targets=[110.0],
        )

        assert result.is_valid is False


class TestAccountRiskCalculation:
    """Tests for account risk percentage calculations."""

    def test_calculates_account_risk_percentage(self) -> None:
        """Calculates risk as percentage of account balance."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=500.0,
            account_balance=10000.0,
        )

        # 500 / 10000 = 5%
        assert result.account_risk_percentage == pytest.approx(5.0)

    def test_marks_high_risk_trade(self) -> None:
        """Marks trade as high risk when exceeding 5% of account."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=600.0,  # 6% of 10000
            account_balance=10000.0,
        )

        assert result.account_risk_percentage == pytest.approx(6.0)
        assert result.is_valid is False  # Exceeds safe risk threshold

    def test_default_account_balance_returns_zero_percentage(self) -> None:
        """Returns zero risk percentage when account balance is not provided."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=500.0,
        )

        assert result.account_risk_percentage == 0.0


class TestCategoryBasedPositionSizing:
    """Tests for category-based risk adjustment in position sizing.

    Trade categories determine what percentage of base risk to use:
    - with_trend: 100% of risk (full position)
    - counter_trend: 50% of risk (half position)
    - reversal_attempt: 25% of risk (quarter position)
    """

    def test_with_trend_uses_full_risk(self) -> None:
        """With-trend trades should use 100% of requested risk."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=500.0,
            trade_category="with_trend",
        )

        # Full risk: $500 / $5 = 100 shares
        assert result.position_size == pytest.approx(100.0)
        assert result.risk_amount == pytest.approx(500.0)
        assert result.risk_multiplier == 1.0
        assert result.trade_category == "with_trend"
        assert result.original_risk_amount == 500.0

    def test_counter_trend_uses_half_risk(self) -> None:
        """Counter-trend trades should use 50% of requested risk."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=500.0,
            trade_category="counter_trend",
        )

        # Half risk: $250 / $5 = 50 shares
        assert result.position_size == pytest.approx(50.0)
        assert result.risk_amount == pytest.approx(250.0)
        assert result.risk_multiplier == 0.5
        assert result.trade_category == "counter_trend"
        assert result.original_risk_amount == 500.0

    def test_reversal_attempt_uses_quarter_risk(self) -> None:
        """Reversal attempt trades should use 25% of requested risk."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=500.0,
            trade_category="reversal_attempt",
        )

        # Quarter risk: $125 / $5 = 25 shares
        assert result.position_size == pytest.approx(25.0)
        assert result.risk_amount == pytest.approx(125.0)
        assert result.risk_multiplier == 0.25
        assert result.trade_category == "reversal_attempt"
        assert result.original_risk_amount == 500.0

    def test_no_category_uses_full_risk(self) -> None:
        """No category specified should use 100% of risk (default behavior)."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=500.0,
            trade_category=None,
        )

        # Full risk: $500 / $5 = 100 shares
        assert result.position_size == pytest.approx(100.0)
        assert result.risk_amount == pytest.approx(500.0)
        assert result.risk_multiplier == 1.0
        assert result.trade_category is None
        assert result.original_risk_amount is None

    def test_category_explanation_populated(self) -> None:
        """Category explanation should be populated when category provided."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=500.0,
            trade_category="counter_trend",
        )

        assert result.category_explanation is not None
        assert "50%" in result.category_explanation

    def test_account_risk_uses_adjusted_amount(self) -> None:
        """Account risk percentage should be based on adjusted risk amount."""
        result = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=500.0,
            account_balance=10000.0,
            trade_category="counter_trend",
        )

        # Adjusted risk is $250 (50% of $500)
        # Account risk = $250 / $10000 = 2.5%
        assert result.account_risk_percentage == pytest.approx(2.5)
        assert result.is_valid is True  # Under 5% threshold

    def test_high_base_risk_becomes_valid_with_reversal_category(self) -> None:
        """High base risk that exceeds 5% becomes valid when adjusted."""
        # 8% base risk would normally be invalid
        result_no_category = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=800.0,  # 8% of 10000
            account_balance=10000.0,
            trade_category=None,
        )
        assert result_no_category.is_valid is False  # 8% > 5%

        # With reversal_attempt (25%), adjusted risk is 2%
        result_reversal = calculate_position_size(
            entry_price=100.0,
            stop_loss=95.0,
            risk_capital=800.0,  # 8% base, but 2% after adjustment
            account_balance=10000.0,
            trade_category="reversal_attempt",
        )
        assert result_reversal.risk_amount == pytest.approx(200.0)  # 25% of 800
        assert result_reversal.account_risk_percentage == pytest.approx(2.0)
        assert result_reversal.is_valid is True  # 2% < 5%

    def test_category_included_in_invalid_results(self) -> None:
        """Category info should be included even when result is invalid."""
        result = calculate_position_size(
            entry_price=0.0,  # Invalid entry
            stop_loss=95.0,
            risk_capital=500.0,
            trade_category="counter_trend",
        )

        assert result.is_valid is False
        assert result.trade_category == "counter_trend"
        assert result.risk_multiplier == 0.5
        assert result.original_risk_amount == 500.0
