"""Unit tests for MarketDataService (TDD - RED phase)."""

from unittest.mock import AsyncMock, patch

import pytest

from trader.market_data.cache import MarketDataCache
from trader.market_data.models import MarketDataResult, MarketStatus, OHLCBar
from trader.market_data.rate_limiter import RateLimiter
from trader.market_data.service import MarketDataService


@pytest.fixture
def sample_result() -> MarketDataResult:
    """Create a sample successful result."""
    bars = [
        OHLCBar(time="2024-01-15", open=100.0, high=105.0, low=98.0, close=103.0),
        OHLCBar(time="2024-01-16", open=103.0, high=108.0, low=101.0, close=106.0),
    ]
    return MarketDataResult.from_success(
        data=bars,
        market_status=MarketStatus.unknown(),
        provider="yahoo",
    )


@pytest.fixture
def error_result() -> MarketDataResult:
    """Create a sample error result."""
    return MarketDataResult.from_error("Provider error")


@pytest.fixture
def simulated_result() -> MarketDataResult:
    """Create a sample simulated result."""
    bars = [
        OHLCBar(time="2024-01-15", open=100.0, high=105.0, low=98.0, close=103.0),
    ]
    return MarketDataResult.from_success(
        data=bars,
        market_status=MarketStatus.simulated(),
        provider="simulated",
    )


class TestServiceInitialization:
    """Tests for service initialization."""

    def test_creates_with_default_providers(self) -> None:
        """Service should initialize with default providers."""
        service = MarketDataService()

        providers = service.get_providers()
        assert len(providers) >= 2  # At least Yahoo and Simulated

    def test_creates_with_cache(self) -> None:
        """Service should have a cache."""
        service = MarketDataService()
        assert service.cache is not None
        assert isinstance(service.cache, MarketDataCache)

    def test_creates_with_rate_limiter(self) -> None:
        """Service should have a rate limiter."""
        service = MarketDataService()
        assert service.rate_limiter is not None
        assert isinstance(service.rate_limiter, RateLimiter)

    def test_providers_sorted_by_priority(self) -> None:
        """Providers should be sorted by priority (lowest first)."""
        service = MarketDataService()
        providers = service.get_providers()

        priorities = [p.priority for p in providers]
        assert priorities == sorted(priorities)


class TestServiceCaching:
    """Tests for service caching behavior."""

    async def test_returns_cached_data_when_available(
        self, sample_result: MarketDataResult
    ) -> None:
        """Should return cached data when available."""
        service = MarketDataService()

        # Pre-populate cache
        service.cache.set("DJI", "1D", sample_result)

        result = await service.get_ohlc("DJI", "1D", periods=50)

        assert result.success is True
        assert result.cached is True
        assert result.provider == "yahoo"

    async def test_fetches_from_provider_when_cache_empty(
        self, sample_result: MarketDataResult
    ) -> None:
        """Should fetch from provider when cache is empty."""
        service = MarketDataService()

        # Mock the primary provider
        with patch.object(
            service._providers[0], "fetch_ohlc", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = sample_result

            result = await service.get_ohlc("DJI", "1D", periods=50)

            assert result.success is True
            mock_fetch.assert_called_once()

    async def test_force_refresh_bypasses_cache(
        self, sample_result: MarketDataResult
    ) -> None:
        """Force refresh should bypass cache and fetch fresh data."""
        service = MarketDataService()

        # Pre-populate cache with old data
        old_bar = OHLCBar(
            time="2024-01-10", open=90.0, high=95.0, low=88.0, close=93.0
        )
        old_result = MarketDataResult.from_success(
            data=[old_bar],
            market_status=MarketStatus.unknown(),
            provider="yahoo",
        )
        service.cache.set("DJI", "1D", old_result)

        # Mock provider to return fresh data
        with patch.object(
            service._providers[0], "fetch_ohlc", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = sample_result

            result = await service.get_ohlc("DJI", "1D", periods=50, force_refresh=True)

            assert result.success is True
            mock_fetch.assert_called_once()
            # Should have fresh data, not cached
            assert len(result.data) == 2  # sample_result has 2 bars

    async def test_caches_successful_fetches(
        self, sample_result: MarketDataResult
    ) -> None:
        """Successful fetches should be cached."""
        service = MarketDataService()

        with patch.object(
            service._providers[0], "fetch_ohlc", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = sample_result

            await service.get_ohlc("DJI", "1D", periods=50)

            # Should now be in cache
            cached = service.cache.get("DJI", "1D")
            assert cached is not None


class TestServiceFallback:
    """Tests for provider fallback behavior."""

    async def test_falls_back_to_next_provider_on_error(
        self, error_result: MarketDataResult, simulated_result: MarketDataResult
    ) -> None:
        """Should try next provider when one fails."""
        service = MarketDataService()

        # Mock first provider to fail
        with patch.object(
            service._providers[0], "fetch_ohlc", new_callable=AsyncMock
        ) as mock_yahoo:
            mock_yahoo.return_value = error_result

            # Mock simulated provider to succeed
            with patch.object(
                service._providers[-1], "fetch_ohlc", new_callable=AsyncMock
            ) as mock_simulated:
                mock_simulated.return_value = simulated_result

                result = await service.get_ohlc("DJI", "1D", periods=50)

                assert result.success is True
                assert result.provider == "simulated"

    async def test_simulated_provider_always_available_as_fallback(
        self,
    ) -> None:
        """Simulated provider should always be available as final fallback."""
        service = MarketDataService()

        # Get the last provider (should be simulated)
        last_provider = service._providers[-1]
        assert last_provider.name == "simulated"
        assert last_provider.priority == 999


class TestServiceRateLimiting:
    """Tests for rate limiting behavior."""

    async def test_skips_rate_limited_providers(
        self, simulated_result: MarketDataResult
    ) -> None:
        """Should skip providers that are rate limited."""
        service = MarketDataService()

        # Fill up rate limit for Yahoo
        yahoo_provider = service._providers[0]
        for _ in range(int(yahoo_provider.config.rate_limit_per_hour)):
            service.rate_limiter.record_request(yahoo_provider.name)

        # Mock simulated provider
        with patch.object(
            service._providers[-1], "fetch_ohlc", new_callable=AsyncMock
        ) as mock_simulated:
            mock_simulated.return_value = simulated_result

            result = await service.get_ohlc("DJI", "1D", periods=50)

            # Should use simulated since yahoo is rate limited
            assert result.success is True
            assert result.provider == "simulated"

    async def test_records_request_after_fetch(
        self, sample_result: MarketDataResult
    ) -> None:
        """Should record request after successful fetch."""
        service = MarketDataService()

        initial_count = service.rate_limiter.get_request_count("yahoo")

        with patch.object(
            service._providers[0], "fetch_ohlc", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = sample_result

            await service.get_ohlc("DJI", "1D", periods=50)

            new_count = service.rate_limiter.get_request_count("yahoo")
            assert new_count == initial_count + 1


class TestServiceMetadata:
    """Tests for service metadata and stats."""

    async def test_result_includes_rate_limit_remaining(
        self, sample_result: MarketDataResult
    ) -> None:
        """Result should include remaining rate limit info."""
        service = MarketDataService()

        with patch.object(
            service._providers[0], "fetch_ohlc", new_callable=AsyncMock
        ) as mock_fetch:
            mock_fetch.return_value = sample_result

            result = await service.get_ohlc("DJI", "1D", periods=50)

            assert result.rate_limit_remaining is not None

    def test_get_provider_status_returns_all_providers(self) -> None:
        """Get provider status should return info about all providers."""
        service = MarketDataService()

        status = service.get_provider_status()

        assert len(status) >= 2
        assert any(p["name"] == "yahoo" for p in status)
        assert any(p["name"] == "simulated" for p in status)

    def test_provider_status_includes_rate_limit_info(self) -> None:
        """Provider status should include rate limit information."""
        service = MarketDataService()

        # Make some requests
        service.rate_limiter.record_request("yahoo")

        status = service.get_provider_status()

        yahoo_status = next(p for p in status if p["name"] == "yahoo")
        assert "requests_made" in yahoo_status
        assert "rate_limit" in yahoo_status
        assert yahoo_status["requests_made"] == 1
