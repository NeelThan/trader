"""Abstract base class for market data providers.

All data providers must implement this interface to be used
with the MarketDataService.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from trader.market_data.models import MarketDataResult, ProviderMetadata


@dataclass(frozen=True)
class ProviderConfig:
    """Configuration for a data provider.

    Attributes:
        name: Unique identifier for the provider
        priority: Lower = higher priority (1 = highest)
        rate_limit_per_hour: Max requests allowed per hour
        requires_api_key: Whether an API key is required
        api_key: Optional API key if required
    """

    name: str
    priority: int
    rate_limit_per_hour: float  # Use float to support inf for unlimited
    requires_api_key: bool
    api_key: str | None = None


class MarketDataProvider(ABC):
    """Abstract base class for market data providers.

    All providers must implement:
    - fetch_ohlc: Get OHLC data for a symbol/timeframe
    - is_available: Check if provider is currently usable
    """

    def __init__(self, config: ProviderConfig) -> None:
        """Initialize provider with configuration."""
        self.config = config

    @property
    def name(self) -> str:
        """Get provider name."""
        return self.config.name

    @property
    def priority(self) -> int:
        """Get provider priority (lower = higher priority)."""
        return self.config.priority

    @abstractmethod
    async def fetch_ohlc(
        self,
        symbol: str,
        timeframe: str,
        periods: int,
        before: str | None = None,
    ) -> MarketDataResult:
        """Fetch OHLC data from the provider.

        Args:
            symbol: Market symbol (e.g., "DJI", "BTCUSD")
            timeframe: Timeframe (e.g., "1m", "1D")
            periods: Number of bars to fetch
            before: Optional ISO date to fetch data before

        Returns:
            MarketDataResult with OHLC data or error
        """

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if provider is available for use.

        Returns:
            True if provider can accept requests
        """

    def get_metadata(self) -> ProviderMetadata:
        """Return metadata about this provider."""
        return ProviderMetadata(
            provider_name=self.config.name,
            priority=self.config.priority,
            requires_api_key=self.config.requires_api_key,
        )
