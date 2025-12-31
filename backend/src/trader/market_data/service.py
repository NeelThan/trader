"""Market data service with provider fallback and caching.

This service orchestrates multiple data providers, manages caching,
and handles rate limiting to provide reliable market data access.
"""

from dataclasses import replace
from typing import Any

from trader.market_data.cache import MarketDataCache
from trader.market_data.models import MarketDataResult
from trader.market_data.providers.base import MarketDataProvider
from trader.market_data.providers.simulated import SimulatedProvider
from trader.market_data.providers.yahoo import YahooFinanceProvider
from trader.market_data.rate_limiter import RateLimiter


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
    ) -> None:
        """Initialize the market data service.

        Args:
            cache: Optional cache instance (creates new if not provided)
            rate_limiter: Optional rate limiter (creates new if not provided)
        """
        self.cache = cache or MarketDataCache()
        self.rate_limiter = rate_limiter or RateLimiter()

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

        Args:
            symbol: Market symbol (e.g., "DJI")
            timeframe: Timeframe (e.g., "1D")
            periods: Number of bars to fetch
            force_refresh: If True, bypass cache

        Returns:
            MarketDataResult with data or error
        """
        # Check cache first (unless force refresh)
        if not force_refresh:
            cached = self.cache.get(symbol, timeframe)
            if cached is not None:
                return cached

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

                # Cache the successful result
                self.cache.set(symbol, timeframe, result)

                return result

        # All providers failed - this shouldn't happen since simulated always works
        return MarketDataResult.from_error("All providers failed")

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
