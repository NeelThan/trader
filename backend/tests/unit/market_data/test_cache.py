"""Unit tests for market data cache (TDD - RED phase)."""

from datetime import UTC, datetime

import pytest

from trader.market_data.cache import MarketDataCache
from trader.market_data.models import MarketDataResult, MarketStatus, OHLCBar


@pytest.fixture
def cache() -> MarketDataCache:
    """Create a fresh cache instance."""
    return MarketDataCache()


@pytest.fixture
def sample_result() -> MarketDataResult:
    """Create a sample market data result for testing."""
    bars = [
        OHLCBar(time="2024-01-15", open=100.0, high=105.0, low=98.0, close=103.0),
        OHLCBar(time="2024-01-16", open=103.0, high=108.0, low=101.0, close=106.0),
    ]
    return MarketDataResult.from_success(
        data=bars,
        market_status=MarketStatus.simulated(),
        provider="yahoo",
    )


class TestCacheBasics:
    """Tests for basic cache operations."""

    def test_get_returns_none_for_empty_cache(self, cache: MarketDataCache) -> None:
        """Get should return None when cache is empty."""
        result = cache.get("DJI", "1D")
        assert result is None

    def test_set_and_get_returns_cached_data(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Set and get should store and retrieve data."""
        cache.set("DJI", "1D", sample_result)
        result = cache.get("DJI", "1D")

        assert result is not None
        assert result.provider == "yahoo"
        assert len(result.data) == 2

    def test_cached_result_has_cached_flag_true(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Cached results should have cached=True."""
        cache.set("DJI", "1D", sample_result)
        result = cache.get("DJI", "1D")

        assert result is not None
        assert result.cached is True

    def test_cached_result_has_expiration_time(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Cached results should include cache_expires_at."""
        cache.set("DJI", "1D", sample_result)
        result = cache.get("DJI", "1D")

        assert result is not None
        assert result.cache_expires_at is not None

    def test_different_keys_are_independent(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Different symbol/timeframe combinations should be independent."""
        cache.set("DJI", "1D", sample_result)

        assert cache.get("SPX", "1D") is None
        assert cache.get("DJI", "1H") is None
        assert cache.get("DJI", "1D") is not None


class TestCacheTTL:
    """Tests for cache TTL (Time To Live) behavior."""

    def test_ttl_for_1m_is_30_seconds(self, cache: MarketDataCache) -> None:
        """1-minute timeframe should have 30-second TTL."""
        assert cache.get_ttl("1m") == 30

    def test_ttl_for_15m_is_60_seconds(self, cache: MarketDataCache) -> None:
        """15-minute timeframe should have 60-second TTL."""
        assert cache.get_ttl("15m") == 60

    def test_ttl_for_1h_is_120_seconds(self, cache: MarketDataCache) -> None:
        """1-hour timeframe should have 120-second TTL."""
        assert cache.get_ttl("1H") == 120

    def test_ttl_for_4h_is_300_seconds(self, cache: MarketDataCache) -> None:
        """4-hour timeframe should have 300-second TTL."""
        assert cache.get_ttl("4H") == 300

    def test_ttl_for_1d_is_900_seconds(self, cache: MarketDataCache) -> None:
        """Daily timeframe should have 900-second TTL (15 min)."""
        assert cache.get_ttl("1D") == 900

    def test_ttl_for_1w_is_3600_seconds(self, cache: MarketDataCache) -> None:
        """Weekly timeframe should have 3600-second TTL (1 hour)."""
        assert cache.get_ttl("1W") == 3600

    def test_ttl_for_1m_monthly_is_3600_seconds(self, cache: MarketDataCache) -> None:
        """Monthly timeframe should have 3600-second TTL (1 hour)."""
        assert cache.get_ttl("1M") == 3600

    def test_unknown_timeframe_uses_default_ttl(
        self, cache: MarketDataCache
    ) -> None:
        """Unknown timeframe should use default TTL (300 seconds)."""
        assert cache.get_ttl("unknown") == 300


class TestCacheExpiration:
    """Tests for cache expiration behavior."""

    def test_expired_entry_returns_none(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Expired cache entries should return None."""
        # Set with very short TTL
        cache.set("DJI", "1m", sample_result)

        # Manually expire the entry (simulate time passing)
        cache._expire_entry("DJI", "1m")

        result = cache.get("DJI", "1m")
        assert result is None

    def test_is_expired_returns_false_for_fresh_entry(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Fresh entries should not be expired."""
        cache.set("DJI", "1D", sample_result)
        assert cache.is_expired("DJI", "1D") is False

    def test_is_expired_returns_true_for_missing_entry(
        self, cache: MarketDataCache
    ) -> None:
        """Missing entries should be considered expired."""
        assert cache.is_expired("DJI", "1D") is True


class TestCacheInvalidation:
    """Tests for cache invalidation."""

    def test_invalidate_removes_specific_entry(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Invalidate should remove a specific cache entry."""
        cache.set("DJI", "1D", sample_result)
        cache.set("SPX", "1D", sample_result)

        cache.invalidate("DJI", "1D")

        assert cache.get("DJI", "1D") is None
        assert cache.get("SPX", "1D") is not None

    def test_invalidate_symbol_removes_all_timeframes(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Invalidate by symbol should remove all timeframes for that symbol."""
        cache.set("DJI", "1D", sample_result)
        cache.set("DJI", "1H", sample_result)
        cache.set("SPX", "1D", sample_result)

        cache.invalidate_symbol("DJI")

        assert cache.get("DJI", "1D") is None
        assert cache.get("DJI", "1H") is None
        assert cache.get("SPX", "1D") is not None

    def test_clear_removes_all_entries(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Clear should remove all cache entries."""
        cache.set("DJI", "1D", sample_result)
        cache.set("SPX", "1H", sample_result)

        cache.clear()

        assert cache.get("DJI", "1D") is None
        assert cache.get("SPX", "1H") is None


class TestCacheMetadata:
    """Tests for cache metadata and stats."""

    def test_size_returns_number_of_entries(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Size should return the number of cached entries."""
        assert cache.size() == 0

        cache.set("DJI", "1D", sample_result)
        assert cache.size() == 1

        cache.set("SPX", "1H", sample_result)
        assert cache.size() == 2

    def test_contains_returns_true_for_cached_entry(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Contains should return True for cached entries."""
        cache.set("DJI", "1D", sample_result)
        assert cache.contains("DJI", "1D") is True

    def test_contains_returns_false_for_missing_entry(
        self, cache: MarketDataCache
    ) -> None:
        """Contains should return False for missing entries."""
        assert cache.contains("DJI", "1D") is False

    def test_get_expiration_time_returns_datetime(
        self, cache: MarketDataCache, sample_result: MarketDataResult
    ) -> None:
        """Get expiration time should return the expiration datetime."""
        cache.set("DJI", "1D", sample_result)
        expires = cache.get_expiration_time("DJI", "1D")

        assert expires is not None
        assert isinstance(expires, datetime)
        assert expires > datetime.now(UTC)
