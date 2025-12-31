"""Unit tests for rate limiter (TDD - RED phase)."""

from datetime import UTC, datetime

import pytest

from trader.market_data.rate_limiter import RateLimiter


@pytest.fixture
def limiter() -> RateLimiter:
    """Create a fresh rate limiter instance."""
    return RateLimiter()


class TestRateLimiterBasics:
    """Tests for basic rate limiter operations."""

    def test_allows_request_when_under_limit(self, limiter: RateLimiter) -> None:
        """Requests should be allowed when under the rate limit."""
        # Yahoo allows 360 requests/hour
        assert limiter.can_request("yahoo", rate_limit=360) is True

    def test_tracks_request_counts(self, limiter: RateLimiter) -> None:
        """Rate limiter should track request counts per provider."""
        limiter.record_request("yahoo")
        limiter.record_request("yahoo")

        assert limiter.get_request_count("yahoo") == 2

    def test_different_providers_are_independent(
        self, limiter: RateLimiter
    ) -> None:
        """Request counts for different providers should be independent."""
        limiter.record_request("yahoo")
        limiter.record_request("yahoo")
        limiter.record_request("finnhub")

        assert limiter.get_request_count("yahoo") == 2
        assert limiter.get_request_count("finnhub") == 1

    def test_blocks_request_when_at_limit(self, limiter: RateLimiter) -> None:
        """Requests should be blocked when at the rate limit."""
        rate_limit = 3

        # Make 3 requests (at limit)
        for _ in range(rate_limit):
            limiter.record_request("yahoo")

        assert limiter.can_request("yahoo", rate_limit=rate_limit) is False

    def test_returns_remaining_requests(self, limiter: RateLimiter) -> None:
        """Should return the number of remaining requests."""
        rate_limit = 10
        limiter.record_request("yahoo")
        limiter.record_request("yahoo")
        limiter.record_request("yahoo")

        remaining = limiter.get_remaining("yahoo", rate_limit=rate_limit)
        assert remaining == 7


class TestRateLimiterTimeWindow:
    """Tests for time window behavior."""

    def test_resets_after_window_expires(self, limiter: RateLimiter) -> None:
        """Request counts should reset after the time window expires."""
        rate_limit = 3

        # Fill up the rate limit
        for _ in range(rate_limit):
            limiter.record_request("yahoo")

        # Simulate window expiration
        limiter._expire_window("yahoo")

        # Should allow requests again
        assert limiter.can_request("yahoo", rate_limit=rate_limit) is True
        assert limiter.get_request_count("yahoo") == 0

    def test_get_reset_time_returns_window_end(
        self, limiter: RateLimiter
    ) -> None:
        """Get reset time should return when the current window ends."""
        limiter.record_request("yahoo")
        reset_time = limiter.get_reset_time("yahoo")

        assert reset_time is not None
        assert isinstance(reset_time, datetime)
        # Reset should be ~1 hour from first request
        assert reset_time > datetime.now(UTC)

    def test_get_reset_time_returns_none_for_new_provider(
        self, limiter: RateLimiter
    ) -> None:
        """Get reset time should return None for providers with no requests."""
        reset_time = limiter.get_reset_time("yahoo")
        assert reset_time is None


class TestRateLimiterUnlimited:
    """Tests for unlimited rate limits (infinity)."""

    def test_allows_request_with_infinite_rate_limit(
        self, limiter: RateLimiter
    ) -> None:
        """Requests should always be allowed with infinite rate limit."""
        # Simulated provider has unlimited rate
        assert limiter.can_request("simulated", rate_limit=float("inf")) is True

    def test_allows_many_requests_with_infinite_rate_limit(
        self, limiter: RateLimiter
    ) -> None:
        """Many requests should be allowed with infinite rate limit."""
        for _ in range(1000):
            limiter.record_request("simulated")

        # Still allowed with infinite rate
        assert limiter.can_request("simulated", rate_limit=float("inf")) is True

    def test_remaining_is_infinite_for_unlimited(
        self, limiter: RateLimiter
    ) -> None:
        """Remaining should be infinite for unlimited providers."""
        for _ in range(100):
            limiter.record_request("simulated")

        remaining = limiter.get_remaining("simulated", rate_limit=float("inf"))
        assert remaining == float("inf")


class TestRateLimiterMetadata:
    """Tests for rate limiter metadata and stats."""

    def test_is_rate_limited_returns_true_when_blocked(
        self, limiter: RateLimiter
    ) -> None:
        """Is rate limited should return True when requests are blocked."""
        rate_limit = 2
        limiter.record_request("yahoo")
        limiter.record_request("yahoo")

        assert limiter.is_rate_limited("yahoo", rate_limit=rate_limit) is True

    def test_is_rate_limited_returns_false_when_not_blocked(
        self, limiter: RateLimiter
    ) -> None:
        """Is rate limited should return False when requests are allowed."""
        limiter.record_request("yahoo")

        assert limiter.is_rate_limited("yahoo", rate_limit=360) is False

    def test_get_window_start_returns_first_request_time(
        self, limiter: RateLimiter
    ) -> None:
        """Get window start should return when the window began."""
        before = datetime.now(UTC)
        limiter.record_request("yahoo")
        after = datetime.now(UTC)

        window_start = limiter.get_window_start("yahoo")
        assert window_start is not None
        assert before <= window_start <= after

    def test_clear_resets_all_counts(self, limiter: RateLimiter) -> None:
        """Clear should reset all request counts."""
        limiter.record_request("yahoo")
        limiter.record_request("finnhub")

        limiter.clear()

        assert limiter.get_request_count("yahoo") == 0
        assert limiter.get_request_count("finnhub") == 0

    def test_clear_provider_resets_specific_provider(
        self, limiter: RateLimiter
    ) -> None:
        """Clear provider should reset only that provider's count."""
        limiter.record_request("yahoo")
        limiter.record_request("finnhub")

        limiter.clear_provider("yahoo")

        assert limiter.get_request_count("yahoo") == 0
        assert limiter.get_request_count("finnhub") == 1
