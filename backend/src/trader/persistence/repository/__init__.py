"""Repository layer for database operations.

This package provides repository classes for CRUD operations on
database entities, following the repository pattern for clean separation
between business logic and data access.
"""

from trader.persistence.repository.metadata import IngestionMetadataRepository
from trader.persistence.repository.ohlc import OHLCRepository
from trader.persistence.repository.results import BacktestResultsRepository

__all__ = [
    "OHLCRepository",
    "IngestionMetadataRepository",
    "BacktestResultsRepository",
]
