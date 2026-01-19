"""TTL-based cache for market data.

Provides caching with timeframe-specific expiration times to reduce
API calls while keeping data fresh enough for each use case.
"""

from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta

from trader.market_data.models import MarketDataResult

# TTL in seconds per timeframe
TTL_MAP: dict[str, int] = {
    "1m": 30,      # 30 seconds for 1-minute data
    "3m": 30,      # 30 seconds for 3-minute data
    "5m": 45,      # 45 seconds for 5-minute data
    "15m": 60,     # 1 minute for 15-minute data
    "1H": 120,     # 2 minutes for hourly data
    "4H": 300,     # 5 minutes for 4-hour data
    "1D": 900,     # 15 minutes for daily data
    "1W": 3600,    # 1 hour for weekly data
    "1M": 3600,    # 1 hour for monthly data
}

DEFAULT_TTL = 300  # 5 minutes default


@dataclass
class CacheEntry:
    """A cached market data entry with expiration."""

    result: MarketDataResult
    expires_at: datetime
    timeframe: str


class MarketDataCache:
    """In-memory cache for market data with TTL per timeframe.

    Cache keys are composed of symbol + timeframe.
    Each entry expires based on the timeframe's configured TTL.
    """

    def __init__(self) -> None:
        """Initialize empty cache."""
        self._cache: dict[str, CacheEntry] = {}

    def _make_key(self, symbol: str, timeframe: str) -> str:
        """Create cache key from symbol and timeframe."""
        return f"{symbol}:{timeframe}"

    def get_ttl(self, timeframe: str) -> int:
        """Get TTL in seconds for a timeframe.

        Args:
            timeframe: Timeframe string (e.g., "1D", "1H")

        Returns:
            TTL in seconds
        """
        return TTL_MAP.get(timeframe, DEFAULT_TTL)

    def get(self, symbol: str, timeframe: str) -> MarketDataResult | None:
        """Get cached data if available and not expired.

        Args:
            symbol: Market symbol
            timeframe: Timeframe

        Returns:
            Cached MarketDataResult or None if not found/expired
        """
        key = self._make_key(symbol, timeframe)
        entry = self._cache.get(key)

        if entry is None:
            return None

        # Check expiration
        if datetime.now(UTC) >= entry.expires_at:
            del self._cache[key]
            return None

        # Return result with cached flag and expiration
        return replace(
            entry.result,
            cached=True,
            cache_expires_at=entry.expires_at.isoformat(),
        )

    def set(
        self, symbol: str, timeframe: str, result: MarketDataResult
    ) -> None:
        """Store data in cache with appropriate TTL.

        Args:
            symbol: Market symbol
            timeframe: Timeframe
            result: MarketDataResult to cache
        """
        key = self._make_key(symbol, timeframe)
        ttl = self.get_ttl(timeframe)
        expires_at = datetime.now(UTC) + timedelta(seconds=ttl)

        self._cache[key] = CacheEntry(
            result=result,
            expires_at=expires_at,
            timeframe=timeframe,
        )

    def is_expired(self, symbol: str, timeframe: str) -> bool:
        """Check if a cache entry is expired or missing.

        Args:
            symbol: Market symbol
            timeframe: Timeframe

        Returns:
            True if expired or missing, False if valid
        """
        key = self._make_key(symbol, timeframe)
        entry = self._cache.get(key)

        if entry is None:
            return True

        return datetime.now(UTC) >= entry.expires_at

    def invalidate(self, symbol: str, timeframe: str) -> None:
        """Remove a specific cache entry.

        Args:
            symbol: Market symbol
            timeframe: Timeframe
        """
        key = self._make_key(symbol, timeframe)
        self._cache.pop(key, None)

    def invalidate_symbol(self, symbol: str) -> None:
        """Remove all cache entries for a symbol.

        Args:
            symbol: Market symbol
        """
        prefix = f"{symbol}:"
        keys_to_remove = [k for k in self._cache if k.startswith(prefix)]
        for key in keys_to_remove:
            del self._cache[key]

    def clear(self) -> None:
        """Remove all cache entries."""
        self._cache.clear()

    def size(self) -> int:
        """Get number of cached entries.

        Returns:
            Number of entries in cache
        """
        return len(self._cache)

    def contains(self, symbol: str, timeframe: str) -> bool:
        """Check if cache contains an entry (expired or not).

        Args:
            symbol: Market symbol
            timeframe: Timeframe

        Returns:
            True if entry exists, False otherwise
        """
        key = self._make_key(symbol, timeframe)
        return key in self._cache

    def get_expiration_time(
        self, symbol: str, timeframe: str
    ) -> datetime | None:
        """Get the expiration time for a cache entry.

        Args:
            symbol: Market symbol
            timeframe: Timeframe

        Returns:
            Expiration datetime or None if not found
        """
        key = self._make_key(symbol, timeframe)
        entry = self._cache.get(key)
        return entry.expires_at if entry else None

    def _expire_entry(self, symbol: str, timeframe: str) -> None:
        """Manually expire an entry (for testing).

        Args:
            symbol: Market symbol
            timeframe: Timeframe
        """
        key = self._make_key(symbol, timeframe)
        entry = self._cache.get(key)
        if entry:
            self._cache[key] = CacheEntry(
                result=entry.result,
                expires_at=datetime.now(UTC) - timedelta(seconds=1),
                timeframe=entry.timeframe,
            )
