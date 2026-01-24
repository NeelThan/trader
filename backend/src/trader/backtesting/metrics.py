"""Performance metrics calculation for backtesting.

This module calculates performance metrics from backtest results
including Sharpe ratio, drawdown, win rate, and category breakdowns.
"""

import math
from collections import defaultdict
from typing import Any

from trader.backtesting.models import (
    BacktestMetrics,
    EquityCurvePoint,
    SimulatedTrade,
    TradeStatus,
)


class MetricsCalculator:
    """Calculates performance metrics from backtest trades.

    Computes standard trading metrics including risk-adjusted
    returns, drawdown analysis, and category breakdowns.
    """

    def __init__(
        self,
        risk_free_rate: float = 0.0,
        annualization_factor: float = 252.0,
    ) -> None:
        """Initialize the metrics calculator.

        Args:
            risk_free_rate: Annual risk-free rate for Sharpe/Sortino.
            annualization_factor: Trading days per year.
        """
        self.risk_free_rate = risk_free_rate
        self.annualization_factor = annualization_factor

    def calculate_metrics(
        self,
        trades: list[SimulatedTrade],
        equity_curve: list[EquityCurvePoint],
        initial_capital: float = 100000.0,
    ) -> BacktestMetrics:
        """Calculate all performance metrics.

        Args:
            trades: List of completed trades.
            equity_curve: Equity curve data points.
            initial_capital: Starting capital.

        Returns:
            BacktestMetrics with all calculated metrics.
        """
        if not trades:
            return BacktestMetrics()

        # Basic counts
        closed_trades = [t for t in trades if t.status != TradeStatus.OPEN]
        total = len(closed_trades)

        if total == 0:
            return BacktestMetrics()

        # Win/loss classification
        winners = [t for t in closed_trades if t.pnl > 0]
        losers = [t for t in closed_trades if t.pnl < 0]
        breakevens = [t for t in closed_trades if t.pnl == 0]

        winning_trades = len(winners)
        losing_trades = len(losers)
        breakeven_trades = len(breakevens)

        # PnL calculations
        total_pnl = sum(t.pnl for t in closed_trades)
        gross_profit = sum(t.pnl for t in winners) if winners else 0.0
        gross_loss = abs(sum(t.pnl for t in losers)) if losers else 0.0

        # Averages
        average_pnl = total_pnl / total
        average_winner = gross_profit / winning_trades if winning_trades > 0 else 0.0
        average_loser = -gross_loss / losing_trades if losing_trades > 0 else 0.0

        # R-multiples
        r_multiples = [t.r_multiple for t in closed_trades]
        average_r = sum(r_multiples) / len(r_multiples) if r_multiples else 0.0

        # Extremes
        largest_winner = max(t.pnl for t in winners) if winners else 0.0
        largest_loser = min(t.pnl for t in losers) if losers else 0.0

        # Ratios
        win_rate = winning_trades / total if total > 0 else 0.0
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')

        # Drawdown calculations
        max_dd, max_dd_duration = self._calculate_drawdown(equity_curve)

        # Risk-adjusted returns
        sharpe = self._calculate_sharpe_ratio(equity_curve, initial_capital)
        sortino = self._calculate_sortino_ratio(equity_curve, initial_capital)
        calmar = self._calculate_calmar_ratio(equity_curve, initial_capital, max_dd)

        # Category breakdown
        by_category = self._calculate_category_breakdown(closed_trades)

        return BacktestMetrics(
            total_trades=total,
            winning_trades=winning_trades,
            losing_trades=losing_trades,
            breakeven_trades=breakeven_trades,
            win_rate=win_rate,
            profit_factor=profit_factor if profit_factor != float('inf') else 999.99,
            total_pnl=total_pnl,
            average_pnl=average_pnl,
            average_winner=average_winner,
            average_loser=average_loser,
            average_r=average_r,
            largest_winner=largest_winner,
            largest_loser=largest_loser,
            max_drawdown=max_dd,
            max_drawdown_duration=max_dd_duration,
            sharpe_ratio=sharpe,
            sortino_ratio=sortino,
            calmar_ratio=calmar,
            by_category=by_category,
        )

    def _calculate_drawdown(
        self,
        equity_curve: list[EquityCurvePoint],
    ) -> tuple[float, int]:
        """Calculate maximum drawdown and duration.

        Args:
            equity_curve: Equity curve data points.

        Returns:
            Tuple of (max_drawdown_percentage, max_duration_bars).
        """
        if not equity_curve:
            return 0.0, 0

        peak = equity_curve[0].equity
        max_dd = 0.0
        max_duration = 0
        current_duration = 0
        for point in equity_curve:
            if point.equity > peak:
                peak = point.equity
                current_duration = 0
            else:
                dd = (peak - point.equity) / peak if peak > 0 else 0.0
                if dd > max_dd:
                    max_dd = dd

                if dd > 0:
                    current_duration += 1
                    if current_duration > max_duration:
                        max_duration = current_duration

        return max_dd, max_duration

    def _calculate_sharpe_ratio(
        self,
        equity_curve: list[EquityCurvePoint],
        initial_capital: float,
    ) -> float:
        """Calculate annualized Sharpe ratio.

        Args:
            equity_curve: Equity curve data points.
            initial_capital: Starting capital.

        Returns:
            Annualized Sharpe ratio.
        """
        if len(equity_curve) < 2:
            return 0.0

        # Calculate daily returns
        returns = []
        for i in range(1, len(equity_curve)):
            prev_equity = equity_curve[i - 1].equity
            curr_equity = equity_curve[i].equity
            if prev_equity > 0:
                ret = (curr_equity - prev_equity) / prev_equity
                returns.append(ret)

        if not returns:
            return 0.0

        # Calculate Sharpe
        mean_return = sum(returns) / len(returns)
        daily_rf = self.risk_free_rate / self.annualization_factor

        excess_returns = [r - daily_rf for r in returns]
        mean_excess = sum(excess_returns) / len(excess_returns)

        variance = sum((r - mean_return) ** 2 for r in returns) / len(returns)
        std_dev = math.sqrt(variance) if variance > 0 else 0.0

        if std_dev == 0:
            return 0.0

        sharpe = (mean_excess / std_dev) * math.sqrt(self.annualization_factor)
        return sharpe

    def _calculate_sortino_ratio(
        self,
        equity_curve: list[EquityCurvePoint],
        initial_capital: float,
    ) -> float:
        """Calculate annualized Sortino ratio.

        Args:
            equity_curve: Equity curve data points.
            initial_capital: Starting capital.

        Returns:
            Annualized Sortino ratio.
        """
        if len(equity_curve) < 2:
            return 0.0

        # Calculate daily returns
        returns = []
        for i in range(1, len(equity_curve)):
            prev_equity = equity_curve[i - 1].equity
            curr_equity = equity_curve[i].equity
            if prev_equity > 0:
                ret = (curr_equity - prev_equity) / prev_equity
                returns.append(ret)

        if not returns:
            return 0.0

        # Calculate Sortino (only downside deviation)
        mean_return = sum(returns) / len(returns)
        daily_rf = self.risk_free_rate / self.annualization_factor

        negative_returns = [r for r in returns if r < daily_rf]
        if not negative_returns:
            return 0.0 if mean_return <= daily_rf else 999.99

        downside_variance = sum(
            (r - daily_rf) ** 2 for r in negative_returns
        ) / len(negative_returns)
        downside_std = math.sqrt(downside_variance) if downside_variance > 0 else 0.0

        if downside_std == 0:
            return 0.0

        sortino = ((mean_return - daily_rf) / downside_std) * math.sqrt(
            self.annualization_factor
        )
        return sortino

    def _calculate_calmar_ratio(
        self,
        equity_curve: list[EquityCurvePoint],
        initial_capital: float,
        max_drawdown: float,
    ) -> float:
        """Calculate Calmar ratio (annual return / max drawdown).

        Args:
            equity_curve: Equity curve data points.
            initial_capital: Starting capital.
            max_drawdown: Maximum drawdown as a decimal.

        Returns:
            Calmar ratio.
        """
        if not equity_curve or max_drawdown == 0:
            return 0.0

        # Calculate total return
        final_equity = equity_curve[-1].equity
        total_return = (final_equity - initial_capital) / initial_capital

        # Annualize (assuming 252 trading days)
        num_bars = len(equity_curve)
        years = num_bars / self.annualization_factor
        if years <= 0:
            return 0.0

        annual_return = ((1 + total_return) ** (1 / years)) - 1

        return float(annual_return / max_drawdown)

    def _calculate_category_breakdown(
        self,
        trades: list[SimulatedTrade],
    ) -> dict[str, dict[str, Any]]:
        """Calculate metrics by trade category.

        Args:
            trades: List of trades.

        Returns:
            Dictionary of category to metrics.
        """
        categories: dict[str, list[SimulatedTrade]] = defaultdict(list)

        for trade in trades:
            categories[trade.trade_category].append(trade)

        breakdown = {}

        for category, cat_trades in categories.items():
            if not cat_trades:
                continue

            winners = [t for t in cat_trades if t.pnl > 0]
            losers = [t for t in cat_trades if t.pnl < 0]

            total = len(cat_trades)
            win_count = len(winners)
            loss_count = len(losers)

            total_pnl = sum(t.pnl for t in cat_trades)
            avg_r = sum(t.r_multiple for t in cat_trades) / total if total > 0 else 0.0

            gross_profit = sum(t.pnl for t in winners) if winners else 0.0
            gross_loss = abs(sum(t.pnl for t in losers)) if losers else 0.0
            pf = gross_profit / gross_loss if gross_loss > 0 else float('inf')

            breakdown[category] = {
                "total_trades": total,
                "winning_trades": win_count,
                "losing_trades": loss_count,
                "win_rate": win_count / total if total > 0 else 0.0,
                "total_pnl": total_pnl,
                "average_r": avg_r,
                "profit_factor": pf if pf != float('inf') else 999.99,
            }

        return breakdown
