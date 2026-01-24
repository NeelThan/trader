"""Unit tests for persistence config module."""

import os
from unittest.mock import patch

import pytest

from trader.persistence.config import DatabaseConfig, get_database_config


class TestDatabaseConfig:
    """Tests for DatabaseConfig dataclass."""

    def test_create_with_defaults(self) -> None:
        """Test creating config with default values."""
        config = DatabaseConfig(
            host="localhost",
            port=5432,
            database="test_db",
            user="test_user",
            password="test_pass",
        )

        assert config.host == "localhost"
        assert config.port == 5432
        assert config.database == "test_db"
        assert config.user == "test_user"
        assert config.password == "test_pass"
        assert config.pool_size == 5
        assert config.max_overflow == 10
        assert config.echo is False

    def test_create_with_custom_values(self) -> None:
        """Test creating config with custom values."""
        config = DatabaseConfig(
            host="db.example.com",
            port=5433,
            database="prod_db",
            user="prod_user",
            password="secure_pass",
            pool_size=10,
            max_overflow=20,
            echo=True,
        )

        assert config.pool_size == 10
        assert config.max_overflow == 20
        assert config.echo is True

    def test_async_url(self) -> None:
        """Test async URL generation for asyncpg."""
        config = DatabaseConfig(
            host="localhost",
            port=5432,
            database="trader",
            user="postgres",
            password="pass123",
        )

        expected = "postgresql+asyncpg://postgres:pass123@localhost:5432/trader"
        assert config.async_url == expected

    def test_sync_url(self) -> None:
        """Test sync URL generation for Alembic."""
        config = DatabaseConfig(
            host="localhost",
            port=5432,
            database="trader",
            user="postgres",
            password="pass123",
        )

        expected = "postgresql://postgres:pass123@localhost:5432/trader"
        assert config.sync_url == expected

    def test_config_is_frozen(self) -> None:
        """Test that config is immutable."""
        config = DatabaseConfig(
            host="localhost",
            port=5432,
            database="test",
            user="user",
            password="pass",
        )

        with pytest.raises(AttributeError):
            config.host = "newhost"  # type: ignore


class TestGetDatabaseConfig:
    """Tests for get_database_config function."""

    def test_default_values(self) -> None:
        """Test that defaults are used when no env vars set."""
        # Clear any existing env vars
        env_vars = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]
        with patch.dict(os.environ, {}, clear=True):
            for var in env_vars:
                os.environ.pop(var, None)

            config = get_database_config()

            assert config.host == "localhost"
            assert config.port == 5432
            assert config.database == "trader"
            assert config.user == "postgres"
            assert config.password == "trader_dev"

    def test_custom_env_values(self) -> None:
        """Test that env vars override defaults."""
        env = {
            "DB_HOST": "custom-host",
            "DB_PORT": "5433",
            "DB_NAME": "custom_db",
            "DB_USER": "custom_user",
            "DB_PASSWORD": "custom_pass",
            "DB_POOL_SIZE": "15",
            "DB_MAX_OVERFLOW": "25",
            "DB_ECHO": "true",
        }

        with patch.dict(os.environ, env, clear=False):
            config = get_database_config()

            assert config.host == "custom-host"
            assert config.port == 5433
            assert config.database == "custom_db"
            assert config.user == "custom_user"
            assert config.password == "custom_pass"
            assert config.pool_size == 15
            assert config.max_overflow == 25
            assert config.echo is True

    def test_echo_false_values(self) -> None:
        """Test that various false values for DB_ECHO work."""
        false_values = ["false", "False", "FALSE", "0", "no", "anything"]

        for value in false_values:
            with patch.dict(os.environ, {"DB_ECHO": value}, clear=False):
                config = get_database_config()
                assert config.echo is False
