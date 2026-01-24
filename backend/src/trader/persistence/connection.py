"""Database connection management with SQLAlchemy 2.0 async support.

This module provides async database engine and session factory
for PostgreSQL connections using asyncpg driver.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from trader.persistence.config import DatabaseConfig, get_database_config

# Module-level engine and session factory (lazy initialization)
_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def get_engine(config: DatabaseConfig | None = None) -> AsyncEngine:
    """Get or create the async database engine.

    Args:
        config: Optional database configuration. Uses environment config if None.

    Returns:
        AsyncEngine instance for database operations.
    """
    global _engine

    if _engine is None:
        cfg = config or get_database_config()
        _engine = create_async_engine(
            cfg.async_url,
            pool_size=cfg.pool_size,
            max_overflow=cfg.max_overflow,
            echo=cfg.echo,
            pool_pre_ping=True,  # Verify connections before use
        )

    return _engine


def get_session_factory(
    config: DatabaseConfig | None = None,
) -> async_sessionmaker[AsyncSession]:
    """Get or create the async session factory.

    Args:
        config: Optional database configuration. Uses environment config if None.

    Returns:
        async_sessionmaker for creating AsyncSession instances.
    """
    global _session_factory

    if _session_factory is None:
        engine = get_engine(config)
        _session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    return _session_factory


@asynccontextmanager
async def get_session(
    config: DatabaseConfig | None = None,
) -> AsyncGenerator[AsyncSession, None]:
    """Get an async database session as a context manager.

    Args:
        config: Optional database configuration.

    Yields:
        AsyncSession for database operations.

    Example:
        async with get_session() as session:
            result = await session.execute(select(OHLCData))
    """
    factory = get_session_factory(config)
    session = factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


async def init_database(config: DatabaseConfig | None = None) -> None:
    """Initialize database connection pool.

    Call this at application startup to ensure connections are ready.

    Args:
        config: Optional database configuration.
    """
    engine = get_engine(config)
    # Test the connection
    async with engine.begin():
        pass


async def close_database() -> None:
    """Close database connection pool.

    Call this at application shutdown to clean up connections.
    """
    global _engine, _session_factory

    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None


def reset_engine() -> None:
    """Reset the engine and session factory.

    Useful for testing to ensure clean state between tests.
    """
    global _engine, _session_factory
    _engine = None
    _session_factory = None


def create_engine_for_config(config: DatabaseConfig) -> AsyncEngine:
    """Create a new engine for a specific configuration.

    Use this for testing with different database configurations.

    Args:
        config: Database configuration to use.

    Returns:
        New AsyncEngine instance.
    """
    return create_async_engine(
        config.async_url,
        pool_size=config.pool_size,
        max_overflow=config.max_overflow,
        echo=config.echo,
        pool_pre_ping=True,
    )


def create_session_factory_for_engine(
    engine: AsyncEngine,
) -> async_sessionmaker[AsyncSession]:
    """Create a session factory for a specific engine.

    Use this for testing with custom engines.

    Args:
        engine: AsyncEngine to use for sessions.

    Returns:
        async_sessionmaker for creating sessions.
    """
    return async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


@asynccontextmanager
async def session_scope(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncGenerator[AsyncSession, None]:
    """Create a session scope with automatic commit/rollback.

    Args:
        session_factory: Session factory to use.

    Yields:
        AsyncSession for database operations.
    """
    session = session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
