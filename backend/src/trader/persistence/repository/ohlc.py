"""OHLC data repository for database operations.

This module provides CRUD operations for historical OHLC price data,
including bulk inserts and time-range queries optimized for backtesting.
"""

from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from trader.persistence.models import OHLCData


class OHLCRepository:
    """Repository for OHLC price bar data operations.

    Provides methods for storing and querying historical OHLC data
    with support for bulk operations and incremental syncing.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize the repository.

        Args:
            session: Async database session for operations.
        """
        self.session = session

    async def upsert_bars(
        self,
        bars: list[dict[str, str | int | float | datetime | None]],
    ) -> int:
        """Upsert multiple OHLC bars (insert or update on conflict).

        Uses PostgreSQL ON CONFLICT DO UPDATE for efficient upserts.

        Args:
            bars: List of bar dictionaries with keys:
                - symbol: Market symbol
                - timeframe: Timeframe identifier
                - bar_time: Bar timestamp
                - open, high, low, close: Price values
                - volume: Optional trading volume
                - provider: Optional provider name

        Returns:
            Number of rows affected.
        """
        if not bars:
            return 0

        # Use PostgreSQL upsert (INSERT ... ON CONFLICT DO UPDATE)
        stmt = insert(OHLCData).values(bars)
        stmt = stmt.on_conflict_do_update(
            constraint="uq_ohlc",
            set_={
                "open": stmt.excluded.open,
                "high": stmt.excluded.high,
                "low": stmt.excluded.low,
                "close": stmt.excluded.close,
                "volume": stmt.excluded.volume,
                "provider": stmt.excluded.provider,
            },
        )

        result = await self.session.execute(stmt)
        # CursorResult has rowcount attribute
        return int(getattr(result, "rowcount", 0))

    async def get_bars(
        self,
        symbol: str,
        timeframe: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int | None = None,
    ) -> list[OHLCData]:
        """Query OHLC bars for a symbol and timeframe.

        Args:
            symbol: Market symbol (e.g., "DJI").
            timeframe: Timeframe identifier (e.g., "1D").
            start_time: Optional start of time range (inclusive).
            end_time: Optional end of time range (inclusive).
            limit: Optional maximum number of bars to return.

        Returns:
            List of OHLCData objects ordered by bar_time ascending.
        """
        stmt = (
            select(OHLCData)
            .where(OHLCData.symbol == symbol)
            .where(OHLCData.timeframe == timeframe)
        )

        if start_time is not None:
            stmt = stmt.where(OHLCData.bar_time >= start_time)

        if end_time is not None:
            stmt = stmt.where(OHLCData.bar_time <= end_time)

        stmt = stmt.order_by(OHLCData.bar_time.asc())

        if limit is not None:
            stmt = stmt.limit(limit)

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_latest_bar(
        self,
        symbol: str,
        timeframe: str,
    ) -> OHLCData | None:
        """Get the most recent bar for a symbol and timeframe.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.

        Returns:
            Most recent OHLCData or None if no data exists.
        """
        stmt = (
            select(OHLCData)
            .where(OHLCData.symbol == symbol)
            .where(OHLCData.timeframe == timeframe)
            .order_by(OHLCData.bar_time.desc())
            .limit(1)
        )

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_oldest_bar(
        self,
        symbol: str,
        timeframe: str,
    ) -> OHLCData | None:
        """Get the oldest bar for a symbol and timeframe.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.

        Returns:
            Oldest OHLCData or None if no data exists.
        """
        stmt = (
            select(OHLCData)
            .where(OHLCData.symbol == symbol)
            .where(OHLCData.timeframe == timeframe)
            .order_by(OHLCData.bar_time.asc())
            .limit(1)
        )

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_bars(
        self,
        symbol: str,
        timeframe: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> int:
        """Count bars for a symbol and timeframe.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.
            start_time: Optional start of time range.
            end_time: Optional end of time range.

        Returns:
            Number of bars matching the criteria.
        """
        from sqlalchemy import func

        stmt = (
            select(func.count())
            .select_from(OHLCData)
            .where(OHLCData.symbol == symbol)
            .where(OHLCData.timeframe == timeframe)
        )

        if start_time is not None:
            stmt = stmt.where(OHLCData.bar_time >= start_time)

        if end_time is not None:
            stmt = stmt.where(OHLCData.bar_time <= end_time)

        result = await self.session.execute(stmt)
        return result.scalar() or 0

    async def delete_bars(
        self,
        symbol: str,
        timeframe: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
    ) -> int:
        """Delete bars for a symbol and timeframe.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.
            start_time: Optional start of time range.
            end_time: Optional end of time range.

        Returns:
            Number of rows deleted.
        """
        stmt = (
            delete(OHLCData)
            .where(OHLCData.symbol == symbol)
            .where(OHLCData.timeframe == timeframe)
        )

        if start_time is not None:
            stmt = stmt.where(OHLCData.bar_time >= start_time)

        if end_time is not None:
            stmt = stmt.where(OHLCData.bar_time <= end_time)

        result = await self.session.execute(stmt)
        # CursorResult has rowcount attribute
        return int(getattr(result, "rowcount", 0))

    async def get_available_timeframes(self, symbol: str) -> list[str]:
        """Get all timeframes with data for a symbol.

        Args:
            symbol: Market symbol.

        Returns:
            List of timeframe identifiers.
        """
        stmt = (
            select(OHLCData.timeframe)
            .where(OHLCData.symbol == symbol)
            .distinct()
        )

        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]

    async def get_available_symbols(self) -> list[str]:
        """Get all symbols with stored data.

        Returns:
            List of market symbols.
        """
        stmt = select(OHLCData.symbol).distinct()

        result = await self.session.execute(stmt)
        return [row[0] for row in result.all()]

    async def get_time_range(
        self,
        symbol: str,
        timeframe: str,
    ) -> tuple[datetime, datetime] | None:
        """Get the time range of stored data.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.

        Returns:
            Tuple of (oldest_time, newest_time) or None if no data.
        """
        from sqlalchemy import func

        stmt = (
            select(func.min(OHLCData.bar_time), func.max(OHLCData.bar_time))
            .where(OHLCData.symbol == symbol)
            .where(OHLCData.timeframe == timeframe)
        )

        result = await self.session.execute(stmt)
        row = result.one_or_none()

        if row is None or row[0] is None:
            return None

        return (row[0], row[1])
