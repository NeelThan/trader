"""Data models for market data module.

These models define the core data structures used throughout
the market data fetching and caching system.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class OHLCBar:
    """Single OHLC price bar.

    Attributes:
        time: ISO date string (e.g., "2024-01-15") for daily+ data,
              or Unix timestamp (int) for intraday data.
        open: Opening price
        high: Highest price
        low: Lowest price
        close: Closing price
        volume: Trading volume (optional, may not be available from all providers)
    """

    time: str | int
    open: float
    high: float
    low: float
    close: float
    volume: int | None = None


@dataclass(frozen=True)
class MarketStatus:
    """Market trading status.

    Captures the current state of the market (open, closed, pre-market, etc.)
    """

    state: str
    state_display: str
    is_open: bool
    is_pre_market: bool
    is_after_hours: bool
    is_closed: bool

    @classmethod
    def unknown(cls) -> "MarketStatus":
        """Create an unknown market status."""
        return cls(
            state="UNKNOWN",
            state_display="Unknown",
            is_open=False,
            is_pre_market=False,
            is_after_hours=False,
            is_closed=False,
        )

    @classmethod
    def simulated(cls) -> "MarketStatus":
        """Create a simulated market status."""
        return cls(
            state="SIMULATED",
            state_display="Simulated Data",
            is_open=False,
            is_pre_market=False,
            is_after_hours=False,
            is_closed=False,
        )


@dataclass(frozen=True)
class ProviderMetadata:
    """Metadata about a data provider.

    Used to communicate provider info in API responses.
    """

    provider_name: str
    priority: int
    requires_api_key: bool


@dataclass
class MarketDataResult:
    """Result from market data fetch operation.

    This is a mutable dataclass (not frozen) because some fields
    like cached and cache_expires_at are set after initial creation.
    """

    success: bool
    data: list[OHLCBar] = field(default_factory=list)
    error: str | None = None
    provider: str | None = None
    market_status: MarketStatus | None = None
    cached: bool = False
    cache_expires_at: str | None = None
    rate_limit_remaining: int | None = None

    @classmethod
    def from_success(
        cls,
        data: list[OHLCBar],
        market_status: MarketStatus,
        provider: str,
        cached: bool = False,
    ) -> "MarketDataResult":
        """Create a successful result."""
        return cls(
            success=True,
            data=data,
            provider=provider,
            market_status=market_status,
            cached=cached,
        )

    @classmethod
    def from_error(cls, error_message: str) -> "MarketDataResult":
        """Create an error result."""
        return cls(success=False, error=error_message)
