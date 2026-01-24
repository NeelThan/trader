"""Backtest results repository for storing and querying backtest runs.

This module provides CRUD operations for storing and retrieving
backtest results, including configuration, metrics, trades, and equity curves.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from trader.persistence.models import BacktestResult


class BacktestResultsRepository:
    """Repository for backtest results operations.

    Provides methods for storing and querying backtest runs with
    their associated configuration, metrics, and trade data.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize the repository.

        Args:
            session: Async database session for operations.
        """
        self.session = session

    async def create(
        self,
        config: dict[str, Any],
        metrics: dict[str, Any],
        trades: list[dict[str, Any]],
        equity_curve: list[dict[str, Any]],
    ) -> BacktestResult:
        """Create a new backtest result.

        Args:
            config: Backtest configuration parameters.
            metrics: Performance metrics from the backtest.
            trades: List of simulated trades.
            equity_curve: Equity curve data points.

        Returns:
            Created BacktestResult with generated ID.
        """
        result = BacktestResult(
            config=config,
            metrics=metrics,
            trades=trades,
            equity_curve=equity_curve,
        )

        self.session.add(result)
        await self.session.flush()  # Get the generated ID

        return result

    async def get_by_id(self, result_id: uuid.UUID) -> BacktestResult | None:
        """Get a backtest result by ID.

        Args:
            result_id: UUID of the backtest result.

        Returns:
            BacktestResult or None if not found.
        """
        stmt = select(BacktestResult).where(BacktestResult.id == result_id)

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_results(
        self,
        symbol: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[BacktestResult]:
        """List backtest results with optional filtering.

        Args:
            symbol: Optional symbol to filter by (matches config.symbol).
            limit: Maximum number of results to return.
            offset: Number of results to skip.

        Returns:
            List of BacktestResult objects.
        """
        stmt = select(BacktestResult).order_by(BacktestResult.created_at.desc())

        if symbol is not None:
            # Filter by symbol in JSONB config
            stmt = stmt.where(BacktestResult.config["symbol"].astext == symbol)

        stmt = stmt.limit(limit).offset(offset)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def delete(self, result_id: uuid.UUID) -> bool:
        """Delete a backtest result by ID.

        Args:
            result_id: UUID of the backtest result to delete.

        Returns:
            True if deleted, False if not found.
        """
        result = await self.get_by_id(result_id)
        if result is None:
            return False

        await self.session.delete(result)
        return True

    async def get_best_results(
        self,
        symbol: str,
        metric: str = "sharpe_ratio",
        limit: int = 10,
    ) -> list[BacktestResult]:
        """Get the best backtest results by a specific metric.

        Args:
            symbol: Symbol to filter by.
            metric: Metric to sort by (e.g., "sharpe_ratio", "profit_factor").
            limit: Maximum number of results to return.

        Returns:
            List of BacktestResult objects sorted by the metric descending.
        """
        stmt = (
            select(BacktestResult)
            .where(BacktestResult.config["symbol"].astext == symbol)
            .order_by(BacktestResult.metrics[metric].desc())
            .limit(limit)
        )

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_results(self, symbol: str | None = None) -> int:
        """Count backtest results.

        Args:
            symbol: Optional symbol to filter by.

        Returns:
            Number of matching backtest results.
        """
        from sqlalchemy import func

        stmt = select(func.count()).select_from(BacktestResult)

        if symbol is not None:
            stmt = stmt.where(BacktestResult.config["symbol"].astext == symbol)

        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def get_results_in_date_range(
        self,
        start_date: datetime,
        end_date: datetime,
        symbol: str | None = None,
    ) -> list[BacktestResult]:
        """Get backtest results created within a date range.

        Args:
            start_date: Start of date range.
            end_date: End of date range.
            symbol: Optional symbol to filter by.

        Returns:
            List of BacktestResult objects.
        """
        stmt = (
            select(BacktestResult)
            .where(BacktestResult.created_at >= start_date)
            .where(BacktestResult.created_at <= end_date)
            .order_by(BacktestResult.created_at.desc())
        )

        if symbol is not None:
            stmt = stmt.where(BacktestResult.config["symbol"].astext == symbol)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())
