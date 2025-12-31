"""Market data module for multi-provider data fetching.

This module provides:
- Provider abstraction for multiple data sources (Yahoo, Finnhub, etc.)
- Intelligent caching with timeframe-specific TTL
- Rate limiting per provider
- Graceful fallback to simulated data
"""

from trader.market_data.cache import MarketDataCache
from trader.market_data.models import (
    MarketDataResult,
    MarketStatus,
    OHLCBar,
    ProviderMetadata,
)
from trader.market_data.rate_limiter import RateLimiter
from trader.market_data.service import MarketDataService

__all__ = [
    "MarketDataCache",
    "MarketDataResult",
    "MarketDataService",
    "MarketStatus",
    "OHLCBar",
    "ProviderMetadata",
    "RateLimiter",
]
