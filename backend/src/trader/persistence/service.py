"""High-level persistence service for data ingestion and querying.

This module provides a service layer that orchestrates data ingestion
from market data providers into the PostgreSQL database, and provides
high-level query methods for backtesting.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

from trader.market_data.models import OHLCBar as MarketOHLCBar
from trader.persistence.config import DatabaseConfig, get_database_config
from trader.persistence.connection import (
    create_engine_for_config,
    create_session_factory_for_engine,
    session_scope,
)
from trader.persistence.models import OHLCData
from trader.persistence.repository import (
    IngestionMetadataRepository,
    OHLCRepository,
)

# Timeframe to expected history depth mapping
TIMEFRAME_HISTORY_LIMITS = {
    "1M": timedelta(days=365 * 10),  # 10 years
    "1W": timedelta(days=365 * 10),  # 10 years
    "1D": timedelta(days=365 * 5),   # 5 years
    "4H": timedelta(days=365 * 2),   # 2 years (Yahoo limit)
    "1H": timedelta(days=365 * 2),   # 2 years (Yahoo limit)
    "15m": timedelta(days=60),       # 60 days (Yahoo limit)
    "5m": timedelta(days=60),        # 60 days (Yahoo limit)
    "3m": timedelta(days=60),        # 60 days (Yahoo limit)
    "1m": timedelta(days=7),         # 7 days (Yahoo limit)
}


class PersistenceService:
    """High-level service for data persistence operations.

    Orchestrates data ingestion from market data providers,
    manages incremental syncing, and provides query methods.
    """

    def __init__(
        self,
        config: DatabaseConfig | None = None,
    ) -> None:
        """Initialize the persistence service.

        Args:
            config: Optional database configuration.
        """
        self.config = config or get_database_config()
        self._engine = create_engine_for_config(self.config)
        self._session_factory = create_session_factory_for_engine(self._engine)

    async def store_bars(
        self,
        symbol: str,
        timeframe: str,
        bars: list[MarketOHLCBar],
        provider: str = "yahoo",
    ) -> int:
        """Store OHLC bars in the database.

        Args:
            symbol: Market symbol (e.g., "DJI").
            timeframe: Timeframe identifier (e.g., "1D").
            bars: List of OHLC bars to store.
            provider: Data provider name.

        Returns:
            Number of bars stored/updated.
        """
        if not bars:
            return 0

        async with session_scope(self._session_factory) as session:
            ohlc_repo = OHLCRepository(session)
            metadata_repo = IngestionMetadataRepository(session)

            # Convert bars to database format
            db_bars: list[dict[str, str | int | float | datetime | None]] = []
            latest_bar_time: datetime | None = None
            for bar in bars:
                # Handle time conversion
                if isinstance(bar.time, int):
                    bar_time = datetime.fromtimestamp(bar.time, tz=UTC)
                else:
                    bar_time = datetime.fromisoformat(bar.time.replace("Z", "+00:00"))

                if latest_bar_time is None or bar_time > latest_bar_time:
                    latest_bar_time = bar_time

                db_bars.append({
                    "symbol": symbol,
                    "timeframe": timeframe,
                    "bar_time": bar_time,
                    "open": float(bar.open),
                    "high": float(bar.high),
                    "low": float(bar.low),
                    "close": float(bar.close),
                    "volume": bar.volume,
                    "provider": provider,
                })

            # Upsert bars
            count = await ohlc_repo.upsert_bars(db_bars)

            # Update ingestion metadata
            if db_bars and latest_bar_time is not None:
                total = await ohlc_repo.count_bars(symbol, timeframe)
                await metadata_repo.upsert_metadata(
                    symbol=symbol,
                    timeframe=timeframe,
                    last_bar_time=latest_bar_time,
                    total_bars=total,
                    last_sync_status="success",
                )

            return count

    async def get_bars(
        self,
        symbol: str,
        timeframe: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        limit: int | None = None,
    ) -> list[MarketOHLCBar]:
        """Get OHLC bars from the database.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.
            start_date: Optional start of date range.
            end_date: Optional end of date range.
            limit: Optional maximum number of bars.

        Returns:
            List of OHLCBar objects.
        """
        async with session_scope(self._session_factory) as session:
            repo = OHLCRepository(session)
            db_bars = await repo.get_bars(
                symbol=symbol,
                timeframe=timeframe,
                start_time=start_date,
                end_time=end_date,
                limit=limit,
            )

            return [self._db_bar_to_market_bar(bar) for bar in db_bars]

    async def get_bar_count(
        self,
        symbol: str,
        timeframe: str,
    ) -> int:
        """Get count of bars for a symbol/timeframe.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.

        Returns:
            Number of bars stored.
        """
        async with session_scope(self._session_factory) as session:
            repo = OHLCRepository(session)
            return await repo.count_bars(symbol, timeframe)

    async def get_last_bar_time(
        self,
        symbol: str,
        timeframe: str,
    ) -> datetime | None:
        """Get the timestamp of the most recent bar.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.

        Returns:
            Timestamp of latest bar or None if no data.
        """
        async with session_scope(self._session_factory) as session:
            repo = OHLCRepository(session)
            bar = await repo.get_latest_bar(symbol, timeframe)
            return bar.bar_time if bar else None

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
            Tuple of (oldest, newest) timestamps or None.
        """
        async with session_scope(self._session_factory) as session:
            repo = OHLCRepository(session)
            return await repo.get_time_range(symbol, timeframe)

    async def needs_initial_load(
        self,
        symbol: str,
        timeframe: str,
    ) -> bool:
        """Check if initial data load is needed.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.

        Returns:
            True if no data exists, False otherwise.
        """
        count = await self.get_bar_count(symbol, timeframe)
        return count == 0

    async def get_available_symbols(self) -> list[str]:
        """Get all symbols with stored data.

        Returns:
            List of market symbols.
        """
        async with session_scope(self._session_factory) as session:
            repo = OHLCRepository(session)
            return await repo.get_available_symbols()

    async def get_available_timeframes(self, symbol: str) -> list[str]:
        """Get all timeframes with data for a symbol.

        Args:
            symbol: Market symbol.

        Returns:
            List of timeframe identifiers.
        """
        async with session_scope(self._session_factory) as session:
            repo = OHLCRepository(session)
            return await repo.get_available_timeframes(symbol)

    async def get_ingestion_status(
        self,
        symbol: str,
        timeframe: str,
    ) -> dict[str, Any] | None:
        """Get ingestion status for a symbol/timeframe.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.

        Returns:
            Status dictionary or None if no data.
        """
        async with session_scope(self._session_factory) as session:
            repo = IngestionMetadataRepository(session)
            metadata = await repo.get_metadata(symbol, timeframe)

            if metadata is None:
                return None

            return {
                "symbol": metadata.symbol,
                "timeframe": metadata.timeframe,
                "total_bars": metadata.total_bars,
                "last_bar_time": metadata.last_bar_time.isoformat()
                    if metadata.last_bar_time else None,
                "last_sync_at": metadata.last_sync_at.isoformat()
                    if metadata.last_sync_at else None,
                "last_sync_status": metadata.last_sync_status,
            }

    async def close(self) -> None:
        """Close database connections."""
        await self._engine.dispose()

    def _db_bar_to_market_bar(self, db_bar: OHLCData) -> MarketOHLCBar:
        """Convert database bar to market data bar.

        Args:
            db_bar: Database OHLC record.

        Returns:
            MarketOHLCBar instance.
        """
        # Use ISO format for daily+ data, Unix timestamp for intraday
        if db_bar.timeframe in ("1M", "1W", "1D"):
            time_value: str | int = db_bar.bar_time.date().isoformat()
        else:
            time_value = int(db_bar.bar_time.timestamp())

        return MarketOHLCBar(
            time=time_value,
            open=float(db_bar.open),
            high=float(db_bar.high),
            low=float(db_bar.low),
            close=float(db_bar.close),
            volume=db_bar.volume,
        )


# Module-level singleton
_persistence_service: PersistenceService | None = None


def get_persistence_service(
    config: DatabaseConfig | None = None,
) -> PersistenceService:
    """Get the persistence service singleton.

    Args:
        config: Optional database configuration.

    Returns:
        PersistenceService instance.
    """
    global _persistence_service

    if _persistence_service is None:
        _persistence_service = PersistenceService(config)

    return _persistence_service


def reset_persistence_service() -> None:
    """Reset the persistence service singleton.

    Useful for testing to ensure clean state.
    """
    global _persistence_service
    _persistence_service = None
