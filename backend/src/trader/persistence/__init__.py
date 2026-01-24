"""Persistence layer for historical data storage.

This package provides PostgreSQL-backed storage for OHLC data,
ingestion tracking, and backtest results using SQLAlchemy 2.0.

Example usage:
    from trader.persistence import get_session, OHLCRepository

    async with get_session() as session:
        repo = OHLCRepository(session)
        bars = await repo.get_bars("DJI", "1D")
"""

from trader.persistence.config import DatabaseConfig, get_database_config
from trader.persistence.connection import (
    close_database,
    get_engine,
    get_session,
    get_session_factory,
    init_database,
    reset_engine,
)
from trader.persistence.models import BacktestResult, IngestionMetadata, OHLCData
from trader.persistence.repository import (
    BacktestResultsRepository,
    IngestionMetadataRepository,
    OHLCRepository,
)
from trader.persistence.service import (
    PersistenceService,
    get_persistence_service,
    reset_persistence_service,
)

__all__ = [
    # Config
    "DatabaseConfig",
    "get_database_config",
    # Connection
    "get_engine",
    "get_session",
    "get_session_factory",
    "init_database",
    "close_database",
    "reset_engine",
    # Models
    "OHLCData",
    "IngestionMetadata",
    "BacktestResult",
    # Repositories
    "OHLCRepository",
    "IngestionMetadataRepository",
    "BacktestResultsRepository",
    # Service
    "PersistenceService",
    "get_persistence_service",
    "reset_persistence_service",
]
