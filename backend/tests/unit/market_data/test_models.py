"""Unit tests for market data models (TDD - RED phase)."""

import pytest

from trader.market_data.models import (
    MarketDataResult,
    MarketStatus,
    OHLCBar,
    ProviderMetadata,
)


class TestOHLCBar:
    """Tests for OHLCBar dataclass."""

    def test_creates_with_required_fields(self) -> None:
        """OHLCBar should be created with all required fields."""
        bar = OHLCBar(
            time="2024-01-15",
            open=100.0,
            high=105.0,
            low=98.0,
            close=103.0,
        )

        assert bar.time == "2024-01-15"
        assert bar.open == 100.0
        assert bar.high == 105.0
        assert bar.low == 98.0
        assert bar.close == 103.0

    def test_accepts_unix_timestamp_for_time(self) -> None:
        """OHLCBar should accept Unix timestamp for intraday data."""
        bar = OHLCBar(
            time=1705320000,
            open=100.0,
            high=105.0,
            low=98.0,
            close=103.0,
        )

        assert bar.time == 1705320000
        assert isinstance(bar.time, int)

    def test_is_immutable(self) -> None:
        """OHLCBar should be frozen (immutable)."""
        bar = OHLCBar(
            time="2024-01-15",
            open=100.0,
            high=105.0,
            low=98.0,
            close=103.0,
        )

        with pytest.raises(AttributeError):
            bar.close = 110.0  # type: ignore


class TestMarketStatus:
    """Tests for MarketStatus dataclass."""

    def test_creates_with_all_fields(self) -> None:
        """MarketStatus should be created with all status fields."""
        status = MarketStatus(
            state="REGULAR",
            state_display="Market Open",
            is_open=True,
            is_pre_market=False,
            is_after_hours=False,
            is_closed=False,
        )

        assert status.state == "REGULAR"
        assert status.state_display == "Market Open"
        assert status.is_open is True
        assert status.is_pre_market is False

    def test_unknown_factory_method(self) -> None:
        """MarketStatus.unknown() should return unknown state."""
        status = MarketStatus.unknown()

        assert status.state == "UNKNOWN"
        assert status.is_open is False
        assert status.is_closed is False

    def test_simulated_factory_method(self) -> None:
        """MarketStatus.simulated() should return simulated state."""
        status = MarketStatus.simulated()

        assert status.state == "SIMULATED"
        assert "Simulated" in status.state_display

    def test_is_immutable(self) -> None:
        """MarketStatus should be frozen (immutable)."""
        status = MarketStatus.unknown()

        with pytest.raises(AttributeError):
            status.is_open = True  # type: ignore


class TestProviderMetadata:
    """Tests for ProviderMetadata dataclass."""

    def test_creates_with_required_fields(self) -> None:
        """ProviderMetadata should capture provider info."""
        metadata = ProviderMetadata(
            provider_name="yahoo",
            priority=1,
            requires_api_key=False,
        )

        assert metadata.provider_name == "yahoo"
        assert metadata.priority == 1
        assert metadata.requires_api_key is False


class TestMarketDataResult:
    """Tests for MarketDataResult dataclass."""

    def test_from_success_factory_creates_successful_result(self) -> None:
        """MarketDataResult.from_success() should create a successful result."""
        bars = [
            OHLCBar(time="2024-01-15", open=100.0, high=105.0, low=98.0, close=103.0),
            OHLCBar(time="2024-01-16", open=103.0, high=108.0, low=101.0, close=106.0),
        ]
        status = MarketStatus.unknown()

        result = MarketDataResult.from_success(
            data=bars,
            market_status=status,
            provider="yahoo",
        )

        assert result.success is True
        assert len(result.data) == 2
        assert result.provider == "yahoo"
        assert result.error is None

    def test_from_error_factory_creates_error_result(self) -> None:
        """MarketDataResult.from_error() should create an error result."""
        result = MarketDataResult.from_error("Rate limit exceeded")

        assert result.success is False
        assert result.error == "Rate limit exceeded"
        assert len(result.data) == 0

    def test_cached_flag_defaults_to_false(self) -> None:
        """MarketDataResult should have cached=False by default."""
        result = MarketDataResult.from_success(
            data=[],
            market_status=MarketStatus.unknown(),
            provider="yahoo",
        )

        assert result.cached is False

    def test_cached_flag_can_be_set(self) -> None:
        """MarketDataResult should allow cached=True."""
        result = MarketDataResult.from_success(
            data=[],
            market_status=MarketStatus.unknown(),
            provider="yahoo",
            cached=True,
        )

        assert result.cached is True

    def test_rate_limit_remaining_is_optional(self) -> None:
        """MarketDataResult should have optional rate_limit_remaining."""
        result = MarketDataResult.from_success(
            data=[],
            market_status=MarketStatus.unknown(),
            provider="yahoo",
        )

        assert result.rate_limit_remaining is None

    def test_cache_expires_at_is_optional(self) -> None:
        """MarketDataResult should have optional cache_expires_at."""
        result = MarketDataResult.from_success(
            data=[],
            market_status=MarketStatus.unknown(),
            provider="yahoo",
        )

        assert result.cache_expires_at is None
