"""Data loader for backtesting with caching support.

This module provides efficient data loading from the persistence layer
or market data providers for use in backtesting.
"""

from datetime import datetime
from typing import TYPE_CHECKING

from trader.market_data.models import OHLCBar

if TYPE_CHECKING:
    from trader.market_data.service import MarketDataService
    from trader.persistence.service import PersistenceService


class DataLoader:
    """Loads and caches historical data for backtesting.

    Provides efficient access to OHLC data from the database
    or market data providers with local caching.
    """

    def __init__(
        self,
        persistence_service: "PersistenceService | None" = None,
        market_service: "MarketDataService | None" = None,
    ) -> None:
        """Initialize the data loader.

        Args:
            persistence_service: Optional persistence service for DB access.
            market_service: Optional market data service for API access.
        """
        self._persistence = persistence_service
        self._market_service = market_service
        self._cache: dict[str, list[OHLCBar]] = {}

    def _cache_key(self, symbol: str, timeframe: str) -> str:
        """Generate cache key for symbol/timeframe."""
        return f"{symbol}:{timeframe}"

    async def load_data(
        self,
        symbol: str,
        timeframe: str,
        start_date: datetime,
        end_date: datetime,
    ) -> list[OHLCBar]:
        """Load OHLC data for the specified range.

        Tries persistence service first, falls back to market service.
        Caches results for repeated access.

        Args:
            symbol: Market symbol (e.g., "DJI").
            timeframe: Timeframe identifier (e.g., "1D").
            start_date: Start of date range.
            end_date: End of date range.

        Returns:
            List of OHLCBar objects sorted by time ascending.

        Raises:
            ValueError: If no data source is available.
        """
        cache_key = self._cache_key(symbol, timeframe)

        # Check cache
        if cache_key in self._cache:
            return self._filter_by_date(
                self._cache[cache_key], start_date, end_date
            )

        # Try persistence service first
        if self._persistence is not None:
            bars = await self._load_from_persistence(
                symbol, timeframe, start_date, end_date
            )
            if bars:
                self._cache[cache_key] = bars
                return bars

        # Fall back to market service
        if self._market_service is not None:
            bars = await self._load_from_market_service(
                symbol, timeframe, start_date, end_date
            )
            if bars:
                self._cache[cache_key] = bars
                return bars

        raise ValueError(
            f"No data source available for {symbol} {timeframe}"
        )

    async def _load_from_persistence(
        self,
        symbol: str,
        timeframe: str,
        start_date: datetime,
        end_date: datetime,
    ) -> list[OHLCBar]:
        """Load data from persistence service."""
        if self._persistence is None:
            return []

        try:
            return await self._persistence.get_bars(
                symbol=symbol,
                timeframe=timeframe,
                start_date=start_date,
                end_date=end_date,
            )
        except Exception:
            return []

    async def _load_from_market_service(
        self,
        symbol: str,
        timeframe: str,
        start_date: datetime,
        end_date: datetime,
    ) -> list[OHLCBar]:
        """Load data from market data service."""
        if self._market_service is None:
            return []

        try:
            # Calculate approximate periods needed
            delta = end_date - start_date
            if timeframe in ("1M",):
                periods = delta.days // 30 + 12
            elif timeframe in ("1W",):
                periods = delta.days // 7 + 10
            elif timeframe in ("1D",):
                periods = delta.days + 10
            elif timeframe in ("4H",):
                periods = (delta.days * 6) + 10  # ~6 4H bars per day
            elif timeframe in ("1H",):
                periods = (delta.days * 24) + 10
            else:
                periods = delta.days * 24 * 4 + 10

            result = await self._market_service.get_ohlc(
                symbol=symbol,
                timeframe=timeframe,
                periods=min(periods, 1000),  # Cap at 1000
            )

            if result.success:
                return self._filter_by_date(result.data, start_date, end_date)

            return []
        except Exception:
            return []

    def _filter_by_date(
        self,
        bars: list[OHLCBar],
        start_date: datetime,
        end_date: datetime,
    ) -> list[OHLCBar]:
        """Filter bars to the specified date range."""
        result = []

        for bar in bars:
            bar_time = self._get_bar_datetime(bar)
            if start_date <= bar_time <= end_date:
                result.append(bar)

        return sorted(result, key=lambda b: self._get_bar_datetime(b))

    def _get_bar_datetime(self, bar: OHLCBar) -> datetime:
        """Convert bar time to datetime."""
        if isinstance(bar.time, int):
            return datetime.fromtimestamp(bar.time)
        else:
            # ISO date string
            if "T" in bar.time:
                return datetime.fromisoformat(bar.time.replace("Z", "+00:00"))
            else:
                return datetime.fromisoformat(bar.time)

    def clear_cache(self) -> None:
        """Clear the data cache."""
        self._cache.clear()

    def preload_data(
        self,
        symbol: str,
        timeframe: str,
        bars: list[OHLCBar],
    ) -> None:
        """Preload data into cache.

        Useful for testing or when data is already available.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.
            bars: OHLC bars to cache.
        """
        cache_key = self._cache_key(symbol, timeframe)
        self._cache[cache_key] = bars

    async def get_bar_count(
        self,
        symbol: str,
        timeframe: str,
        start_date: datetime,
        end_date: datetime,
    ) -> int:
        """Get count of available bars for the date range.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.
            start_date: Start of date range.
            end_date: End of date range.

        Returns:
            Number of bars available.
        """
        bars = await self.load_data(symbol, timeframe, start_date, end_date)
        return len(bars)
