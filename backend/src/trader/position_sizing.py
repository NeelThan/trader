"""Position sizing calculations for trading risk management.

This module provides functions to calculate:
- Position size based on risk capital and stop loss distance
- Risk:Reward ratios based on target prices
- Trade validity based on risk parameters

All financial calculations are performed here to ensure consistency
and testability. The frontend should use these endpoints rather than
implementing the calculations itself.
"""

from dataclasses import dataclass
from enum import Enum


class TradeRecommendation(str, Enum):
    """Trade recommendation based on risk/reward analysis."""

    EXCELLENT = "excellent"  # R:R >= 3:1
    GOOD = "good"  # R:R >= 2:1
    MARGINAL = "marginal"  # R:R >= 1:1
    POOR = "poor"  # R:R < 1:1


@dataclass(frozen=True)
class PositionSizeResult:
    """Result of position size calculation."""

    position_size: float
    distance_to_stop: float
    risk_amount: float
    account_risk_percentage: float
    is_valid: bool


@dataclass(frozen=True)
class RiskRewardResult:
    """Result of risk/reward calculation."""

    risk_reward_ratio: float
    target_ratios: list[float]
    potential_profit: float
    potential_loss: float
    recommendation: TradeRecommendation
    is_valid: bool


def calculate_position_size(
    entry_price: float,
    stop_loss: float,
    risk_capital: float,
    account_balance: float = 0.0,
) -> PositionSizeResult:
    """Calculate position size based on risk parameters.

    Formula: Position Size = Risk Capital / Distance to Stop
    Where: Distance = |Entry Price - Stop Loss|

    Args:
        entry_price: The planned entry price for the trade.
        stop_loss: The stop loss price.
        risk_capital: The amount of capital to risk on this trade.
        account_balance: Optional account balance for risk percentage calculation.

    Returns:
        PositionSizeResult with position size and validity status.
    """
    # Validate inputs
    if entry_price <= 0:
        return PositionSizeResult(
            position_size=0.0,
            distance_to_stop=0.0,
            risk_amount=risk_capital,
            account_risk_percentage=0.0,
            is_valid=False,
        )

    if stop_loss <= 0:
        return PositionSizeResult(
            position_size=0.0,
            distance_to_stop=0.0,
            risk_amount=risk_capital,
            account_risk_percentage=0.0,
            is_valid=False,
        )

    if risk_capital < 0:
        return PositionSizeResult(
            position_size=0.0,
            distance_to_stop=0.0,
            risk_amount=0.0,
            account_risk_percentage=0.0,
            is_valid=False,
        )

    # Calculate distance to stop
    distance_to_stop = abs(entry_price - stop_loss)

    # Handle zero distance (stop equals entry)
    if distance_to_stop == 0:
        return PositionSizeResult(
            position_size=0.0,
            distance_to_stop=0.0,
            risk_amount=risk_capital,
            account_risk_percentage=0.0,
            is_valid=False,
        )

    # Calculate position size
    position_size = risk_capital / distance_to_stop

    # Calculate account risk percentage
    account_risk_percentage = 0.0
    if account_balance > 0:
        account_risk_percentage = (risk_capital / account_balance) * 100

    # Determine validity - trades risking more than 5% of account are invalid
    is_valid = True
    if account_balance > 0 and account_risk_percentage > 5.0:
        is_valid = False

    return PositionSizeResult(
        position_size=position_size,
        distance_to_stop=distance_to_stop,
        risk_amount=risk_capital,
        account_risk_percentage=account_risk_percentage,
        is_valid=is_valid,
    )


def calculate_risk_reward(
    entry_price: float,
    stop_loss: float,
    targets: list[float],
    position_size: float = 0.0,
) -> RiskRewardResult:
    """Calculate risk/reward ratio based on entry, stop, and targets.

    Formula: R:R Ratio = Target Distance / Stop Distance
    Where: Target Distance = |Target - Entry|
           Stop Distance = |Entry - Stop|

    Args:
        entry_price: The planned entry price for the trade.
        stop_loss: The stop loss price.
        targets: List of target prices (first target is primary).
        position_size: Optional position size for P&L calculations.

    Returns:
        RiskRewardResult with ratio and recommendation.
    """
    # Calculate stop distance
    stop_distance = abs(entry_price - stop_loss)

    # Handle invalid cases
    if stop_distance == 0:
        return RiskRewardResult(
            risk_reward_ratio=0.0,
            target_ratios=[],
            potential_profit=0.0,
            potential_loss=0.0,
            recommendation=TradeRecommendation.POOR,
            is_valid=False,
        )

    if not targets:
        return RiskRewardResult(
            risk_reward_ratio=0.0,
            target_ratios=[],
            potential_profit=0.0,
            potential_loss=position_size * stop_distance,
            recommendation=TradeRecommendation.POOR,
            is_valid=False,
        )

    # Calculate ratios for all targets
    target_ratios: list[float] = []
    for target in targets:
        target_distance = abs(target - entry_price)
        ratio = target_distance / stop_distance
        target_ratios.append(ratio)

    # Primary ratio is based on first target
    primary_ratio = target_ratios[0] if target_ratios else 0.0

    # Calculate potential profit/loss
    first_target_distance = abs(targets[0] - entry_price) if targets else 0.0
    potential_profit = position_size * first_target_distance
    potential_loss = position_size * stop_distance

    # Determine recommendation based on ratio
    if primary_ratio >= 3.0:
        recommendation = TradeRecommendation.EXCELLENT
    elif primary_ratio >= 2.0:
        recommendation = TradeRecommendation.GOOD
    elif primary_ratio >= 1.0:
        recommendation = TradeRecommendation.MARGINAL
    else:
        recommendation = TradeRecommendation.POOR

    return RiskRewardResult(
        risk_reward_ratio=primary_ratio,
        target_ratios=target_ratios,
        potential_profit=potential_profit,
        potential_loss=potential_loss,
        recommendation=recommendation,
        is_valid=True,
    )
