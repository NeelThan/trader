"""Market data service with provider fallback and caching.

This service orchestrates multiple data providers, manages caching,
and handles rate limiting to provide reliable market data access.
Optionally checks PostgreSQL database before calling external providers.
"""

from dataclasses import replace
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from trader.market_data.cache import MarketDataCache
from trader.market_data.models import MarketDataResult, MarketStatus, OHLCBar
from trader.market_data.providers.base import MarketDataProvider
from trader.market_data.providers.simulated import SimulatedProvider
from trader.market_data.providers.yahoo import YahooFinanceProvider
from trader.market_data.rate_limiter import RateLimiter

if TYPE_CHECKING:
    from trader.persistence.service import PersistenceService


class MarketDataService:
    """Orchestrates market data fetching with caching and fallback.

    Manages multiple providers in priority order, caches results,
    and handles rate limiting. Falls back to simulated data when
    all real providers fail.
    """

    def __init__(
        self,
        cache: MarketDataCache | None = None,
        rate_limiter: RateLimiter | None = None,
        persistence_service: "PersistenceService | None" = None,
        use_db: bool = False,
    ) -> None:
        """Initialize the market data service.

        Args:
            cache: Optional cache instance (creates new if not provided)
            rate_limiter: Optional rate limiter (creates new if not provided)
            persistence_service: Optional persistence service for DB access
            use_db: Whether to check database before calling providers
        """
        self.cache = cache or MarketDataCache()
        self.rate_limiter = rate_limiter or RateLimiter()
        self._persistence_service = persistence_service
        self._use_db = use_db and persistence_service is not None

        # Initialize providers in priority order
        self._providers: list[MarketDataProvider] = sorted(
            [
                YahooFinanceProvider(),
                SimulatedProvider(),
            ],
            key=lambda p: p.priority,
        )

    def get_providers(self) -> list[MarketDataProvider]:
        """Get list of providers sorted by priority.

        Returns:
            List of providers (lowest priority number first)
        """
        return self._providers

    async def get_ohlc(
        self,
        symbol: str,
        timeframe: str,
        periods: int = 100,
        force_refresh: bool = False,
    ) -> MarketDataResult:
        """Get OHLC data with caching and provider fallback.

        Checks data sources in order:
        1. In-memory cache (unless force_refresh)
        2. PostgreSQL database (if enabled)
        3. External providers (Yahoo, then Simulated)

        Args:
            symbol: Market symbol (e.g., "DJI")
            timeframe: Timeframe (e.g., "1D")
            periods: Number of bars to fetch
            force_refresh: If True, bypass cache and DB

        Returns:
            MarketDataResult with data or error
        """
        # Check cache first (unless force refresh)
        if not force_refresh:
            cached = self.cache.get(symbol, timeframe)
            if cached is not None:
                return cached

        # Check database if enabled (unless force refresh)
        if self._use_db and not force_refresh:
            db_result = await self._get_from_database(symbol, timeframe, periods)
            if db_result is not None:
                # Cache the DB result
                self.cache.set(symbol, timeframe, db_result)
                return db_result

        # Try each provider in priority order
        for provider in self._providers:
            # Check rate limit
            if not self.rate_limiter.can_request(
                provider.name, provider.config.rate_limit_per_hour
            ):
                continue

            # Fetch from provider
            result = await provider.fetch_ohlc(symbol, timeframe, periods)

            if result.success:
                # Record the request for rate limiting
                self.rate_limiter.record_request(provider.name)

                # Add rate limit info to result
                remaining = self.rate_limiter.get_remaining(
                    provider.name, provider.config.rate_limit_per_hour
                )
                result = replace(
                    result,
                    rate_limit_remaining=(
                        int(remaining) if remaining != float("inf") else None
                    ),
                )

                # Store in database if enabled
                if self._use_db:
                    await self._store_in_database(
                        symbol, timeframe, result.data, provider.name
                    )

                # Cache the successful result
                self.cache.set(symbol, timeframe, result)

                return result

        # All providers failed - this shouldn't happen since simulated always works
        return MarketDataResult.from_error("All providers failed")

    async def _get_from_database(
        self,
        symbol: str,
        timeframe: str,
        periods: int,
    ) -> MarketDataResult | None:
        """Get OHLC data from the database.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.
            periods: Number of bars to fetch.

        Returns:
            MarketDataResult if sufficient data exists, None otherwise.
        """
        if self._persistence_service is None:
            return None

        try:
            bars = await self._persistence_service.get_bars(
                symbol=symbol,
                timeframe=timeframe,
                limit=periods,
            )

            if not bars or len(bars) < periods * 0.5:
                # Not enough data in DB, fall through to providers
                return None

            return MarketDataResult.from_success(
                data=bars,
                market_status=MarketStatus.unknown(),
                provider="database",
                cached=False,
            )
        except Exception:
            # DB error, fall through to providers
            return None

    async def _store_in_database(
        self,
        symbol: str,
        timeframe: str,
        bars: list[OHLCBar],
        provider: str,
    ) -> None:
        """Store OHLC data in the database.

        Args:
            symbol: Market symbol.
            timeframe: Timeframe identifier.
            bars: OHLC bars to store.
            provider: Data provider name.
        """
        if self._persistence_service is None:
            return

        try:
            await self._persistence_service.store_bars(
                symbol=symbol,
                timeframe=timeframe,
                bars=bars,
                provider=provider,
            )
        except Exception:
            # Don't fail the request if DB storage fails
            pass

    def get_provider_status(self) -> list[dict[str, Any]]:
        """Get status information for all providers.

        Returns:
            List of provider status dictionaries
        """
        status_list = []

        for provider in self._providers:
            rate_limit = provider.config.rate_limit_per_hour
            requests_made = self.rate_limiter.get_request_count(provider.name)

            status_list.append(
                {
                    "name": provider.name,
                    "priority": provider.priority,
                    "rate_limit": rate_limit,
                    "requests_made": requests_made,
                    "remaining": self.rate_limiter.get_remaining(
                        provider.name, rate_limit
                    ),
                    "is_rate_limited": self.rate_limiter.is_rate_limited(
                        provider.name, rate_limit
                    ),
                }
            )

        return status_list
