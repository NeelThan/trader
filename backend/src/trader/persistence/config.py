"""Database configuration from environment variables.

This module provides configuration for PostgreSQL database connections,
reading from environment variables with sensible defaults for development.
"""

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class DatabaseConfig:
    """Database connection configuration.

    Attributes:
        host: Database host address.
        port: Database port number.
        database: Database name.
        user: Database user.
        password: Database password.
        pool_size: Connection pool size.
        max_overflow: Maximum overflow connections.
        echo: Whether to echo SQL statements (for debugging).
    """

    host: str
    port: int
    database: str
    user: str
    password: str
    pool_size: int = 5
    max_overflow: int = 10
    echo: bool = False

    @property
    def async_url(self) -> str:
        """Get async database URL for asyncpg driver.

        Returns:
            PostgreSQL connection URL for asyncpg.
        """
        return (
            f"postgresql+asyncpg://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.database}"
        )

    @property
    def sync_url(self) -> str:
        """Get sync database URL for Alembic migrations.

        Returns:
            PostgreSQL connection URL for psycopg2.
        """
        return (
            f"postgresql://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.database}"
        )


def get_database_config() -> DatabaseConfig:
    """Get database configuration from environment variables.

    Environment Variables:
        DB_HOST: Database host (default: localhost)
        DB_PORT: Database port (default: 5432)
        DB_NAME: Database name (default: trader)
        DB_USER: Database user (default: postgres)
        DB_PASSWORD: Database password (default: trader_dev)
        DB_POOL_SIZE: Connection pool size (default: 5)
        DB_MAX_OVERFLOW: Max overflow connections (default: 10)
        DB_ECHO: Echo SQL statements (default: false)

    Returns:
        DatabaseConfig instance with settings from environment.
    """
    return DatabaseConfig(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "5432")),
        database=os.getenv("DB_NAME", "trader"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "trader_dev"),
        pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
        echo=os.getenv("DB_ECHO", "false").lower() == "true",
    )
