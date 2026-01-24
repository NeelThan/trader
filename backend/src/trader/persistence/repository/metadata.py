"""Ingestion metadata repository for tracking data sync state.

This module provides CRUD operations for tracking data ingestion
progress, enabling efficient incremental syncs.
"""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from trader.persistence.models import IngestionMetadata


class IngestionMetadataRepository:
    """Repository for ingestion metadata operations.

    Tracks the state of data ingestion for each symbol/timeframe
    combination to support incremental syncing.
    """

    def __init__(self, session: AsyncSession) -> None:
        """Initialize the repository.

        Args:
            session: Async database session for operations.
        """
        self.session = session

    async def get_metadata(
        self,
        symbol: str,
        timeframe: str,
    ) -> IngestionMetadata | None:
        """Get ingestion metadata for a symbol/timeframe.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.

        Returns:
            IngestionMetadata or None if not found.
        """
        stmt = (
            select(IngestionMetadata)
            .where(IngestionMetadata.symbol == symbol)
            .where(IngestionMetadata.timeframe == timeframe)
        )

        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def upsert_metadata(
        self,
        symbol: str,
        timeframe: str,
        last_bar_time: datetime | None = None,
        total_bars: int | None = None,
        last_sync_status: str | None = None,
    ) -> IngestionMetadata:
        """Upsert ingestion metadata (insert or update on conflict).

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.
            last_bar_time: Timestamp of the last synced bar.
            total_bars: Total number of bars stored.
            last_sync_status: Status of the last sync operation.

        Returns:
            Updated or created IngestionMetadata.
        """
        now = datetime.now()

        stmt = insert(IngestionMetadata).values(
            symbol=symbol,
            timeframe=timeframe,
            last_bar_time=last_bar_time,
            total_bars=total_bars or 0,
            last_sync_at=now,
            last_sync_status=last_sync_status,
        )

        # Build update dict only with provided values
        update_dict: dict[str, datetime | int | str | None] = {"last_sync_at": now}
        if last_bar_time is not None:
            update_dict["last_bar_time"] = last_bar_time
        if total_bars is not None:
            update_dict["total_bars"] = total_bars
        if last_sync_status is not None:
            update_dict["last_sync_status"] = last_sync_status

        stmt = stmt.on_conflict_do_update(
            constraint="uq_ingestion",
            set_=update_dict,
        )

        await self.session.execute(stmt)

        # Fetch the updated record
        return await self.get_metadata(symbol, timeframe)  # type: ignore[return-value]

    async def update_sync_status(
        self,
        symbol: str,
        timeframe: str,
        status: str,
        last_bar_time: datetime | None = None,
        total_bars: int | None = None,
    ) -> None:
        """Update sync status for a symbol/timeframe.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.
            status: Sync status (e.g., "success", "error", "in_progress").
            last_bar_time: Optional last bar time to update.
            total_bars: Optional total bars to update.
        """
        await self.upsert_metadata(
            symbol=symbol,
            timeframe=timeframe,
            last_bar_time=last_bar_time,
            total_bars=total_bars,
            last_sync_status=status,
        )

    async def get_all_metadata(self) -> list[IngestionMetadata]:
        """Get all ingestion metadata records.

        Returns:
            List of all IngestionMetadata records.
        """
        stmt = select(IngestionMetadata).order_by(
            IngestionMetadata.symbol, IngestionMetadata.timeframe
        )

        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_symbols_needing_sync(
        self,
        max_age_hours: int = 24,
    ) -> list[tuple[str, str]]:
        """Get symbol/timeframe pairs that need syncing.

        Args:
            max_age_hours: Maximum hours since last sync before needing update.

        Returns:
            List of (symbol, timeframe) tuples needing sync.
        """
        from sqlalchemy import or_

        cutoff = datetime.now().replace(
            hour=datetime.now().hour - max_age_hours
        )

        stmt = select(IngestionMetadata.symbol, IngestionMetadata.timeframe).where(
            or_(
                IngestionMetadata.last_sync_at.is_(None),
                IngestionMetadata.last_sync_at < cutoff,
            )
        )

        result = await self.session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]
