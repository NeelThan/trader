"""Rate limiter for market data providers.

Tracks request counts per provider and enforces rate limits
to prevent API throttling.
"""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

# Default window size (1 hour)
WINDOW_SECONDS = 3600


@dataclass
class ProviderWindow:
    """Tracks requests within a time window for a provider."""

    request_count: int
    window_start: datetime


class RateLimiter:
    """Per-provider rate limiting with sliding time windows.

    Tracks requests per provider within a configurable time window
    (default: 1 hour) and blocks requests when the limit is reached.
    """

    def __init__(self, window_seconds: int = WINDOW_SECONDS) -> None:
        """Initialize rate limiter.

        Args:
            window_seconds: Time window in seconds (default: 3600 = 1 hour)
        """
        self._windows: dict[str, ProviderWindow] = {}
        self._window_seconds = window_seconds

    def _get_or_create_window(self, provider: str) -> ProviderWindow:
        """Get or create a window for a provider."""
        if provider not in self._windows:
            self._windows[provider] = ProviderWindow(
                request_count=0,
                window_start=datetime.now(UTC),
            )
        return self._windows[provider]

    def _check_window_expired(self, provider: str) -> bool:
        """Check if the window has expired and reset if so."""
        if provider not in self._windows:
            return True

        window = self._windows[provider]
        elapsed = (datetime.now(UTC) - window.window_start).total_seconds()

        if elapsed >= self._window_seconds:
            # Window expired, reset
            del self._windows[provider]
            return True

        return False

    def can_request(self, provider: str, rate_limit: float) -> bool:
        """Check if a request is allowed for a provider.

        Args:
            provider: Provider name
            rate_limit: Maximum requests per hour (use float("inf") for unlimited)

        Returns:
            True if request is allowed, False if rate limited
        """
        # Unlimited rate limit always allows
        if rate_limit == float("inf"):
            return True

        # Check for window expiration first
        self._check_window_expired(provider)

        # Get current count
        count = self.get_request_count(provider)
        return count < rate_limit

    def record_request(self, provider: str) -> None:
        """Record a request for a provider.

        Args:
            provider: Provider name
        """
        # Check for window expiration first
        self._check_window_expired(provider)

        window = self._get_or_create_window(provider)
        self._windows[provider] = ProviderWindow(
            request_count=window.request_count + 1,
            window_start=window.window_start,
        )

    def get_request_count(self, provider: str) -> int:
        """Get the number of requests made in the current window.

        Args:
            provider: Provider name

        Returns:
            Number of requests made
        """
        if provider not in self._windows:
            return 0
        return self._windows[provider].request_count

    def get_remaining(self, provider: str, rate_limit: float) -> float:
        """Get the number of remaining requests allowed.

        Args:
            provider: Provider name
            rate_limit: Maximum requests per hour

        Returns:
            Number of remaining requests (float("inf") for unlimited)
        """
        if rate_limit == float("inf"):
            return float("inf")

        count = self.get_request_count(provider)
        return max(0, rate_limit - count)

    def is_rate_limited(self, provider: str, rate_limit: float) -> bool:
        """Check if a provider is currently rate limited.

        Args:
            provider: Provider name
            rate_limit: Maximum requests per hour

        Returns:
            True if rate limited, False otherwise
        """
        return not self.can_request(provider, rate_limit)

    def get_reset_time(self, provider: str) -> datetime | None:
        """Get when the current window resets.

        Args:
            provider: Provider name

        Returns:
            Reset datetime or None if no window exists
        """
        if provider not in self._windows:
            return None

        window = self._windows[provider]
        return window.window_start + timedelta(seconds=self._window_seconds)

    def get_window_start(self, provider: str) -> datetime | None:
        """Get when the current window started.

        Args:
            provider: Provider name

        Returns:
            Window start datetime or None if no window exists
        """
        if provider not in self._windows:
            return None
        return self._windows[provider].window_start

    def clear(self) -> None:
        """Clear all rate limiting data."""
        self._windows.clear()

    def clear_provider(self, provider: str) -> None:
        """Clear rate limiting data for a specific provider.

        Args:
            provider: Provider name
        """
        self._windows.pop(provider, None)

    def _expire_window(self, provider: str) -> None:
        """Manually expire a window (for testing).

        Args:
            provider: Provider name
        """
        self._windows.pop(provider, None)
