"""SQLAlchemy 2.0 models for persistence layer.

This module defines the database models for storing historical OHLC data,
ingestion metadata, and backtest results using SQLAlchemy 2.0 ORM.
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


class OHLCData(Base):
    """Historical OHLC price bar data.

    Stores OHLC (Open, High, Low, Close) price data for various symbols
    and timeframes. Indexed for efficient time-series queries.

    Attributes:
        id: Auto-incrementing primary key.
        symbol: Market symbol (e.g., "DJI", "SPX").
        timeframe: Timeframe identifier (e.g., "1D", "4H", "1H").
        bar_time: Timestamp of the bar (timezone-aware).
        open: Opening price.
        high: Highest price during the bar.
        low: Lowest price during the bar.
        close: Closing price.
        volume: Trading volume (optional).
        provider: Data provider name (default: "yahoo").
        created_at: Record creation timestamp.
    """

    __tablename__ = "ohlc_data"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(10), nullable=False)
    bar_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    open: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    high: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    low: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    close: Mapped[Decimal] = mapped_column(Numeric(15, 4), nullable=False)
    volume: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    provider: Mapped[str] = mapped_column(String(50), default="yahoo")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint("symbol", "timeframe", "bar_time", name="uq_ohlc"),
        Index("idx_ohlc_query", "symbol", "timeframe", "bar_time"),
    )

    def __repr__(self) -> str:
        """Return string representation."""
        return (
            f"OHLCData(symbol={self.symbol!r}, timeframe={self.timeframe!r}, "
            f"bar_time={self.bar_time!r}, close={self.close})"
        )


class IngestionMetadata(Base):
    """Data ingestion tracking for incremental syncs.

    Tracks the last synced bar time for each symbol/timeframe combination
    to enable efficient incremental data fetching.

    Attributes:
        id: Auto-incrementing primary key.
        symbol: Market symbol (e.g., "DJI", "SPX").
        timeframe: Timeframe identifier (e.g., "1D", "4H").
        last_bar_time: Timestamp of the last synced bar.
        total_bars: Total number of bars stored.
        last_sync_at: When the last sync completed.
        last_sync_status: Status of the last sync (success, error, etc.).
    """

    __tablename__ = "ingestion_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False)
    timeframe: Mapped[str] = mapped_column(String(10), nullable=False)
    last_bar_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    total_bars: Mapped[int] = mapped_column(BigInteger, default=0)
    last_sync_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_sync_status: Mapped[str | None] = mapped_column(String(20), nullable=True)

    __table_args__ = (
        UniqueConstraint("symbol", "timeframe", name="uq_ingestion"),
    )

    def __repr__(self) -> str:
        """Return string representation."""
        return (
            f"IngestionMetadata(symbol={self.symbol!r}, "
            f"timeframe={self.timeframe!r}, total_bars={self.total_bars})"
        )


class BacktestResult(Base):
    """Stored backtest results for analysis and comparison.

    Stores complete backtest results including configuration,
    performance metrics, trade list, and equity curve data.

    Attributes:
        id: UUID primary key.
        config: Backtest configuration (JSONB).
        metrics: Performance metrics (JSONB).
        trades: List of simulated trades (JSONB).
        equity_curve: Equity curve data points (JSONB).
        created_at: Record creation timestamp.
    """

    __tablename__ = "backtest_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    metrics: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    trades: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    equity_curve: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def __repr__(self) -> str:
        """Return string representation."""
        return f"BacktestResult(id={self.id!r}, created_at={self.created_at!r})"
