"""Simulated market data provider for fallback.

This provider generates realistic-looking market data when
real data sources are unavailable (rate limited, offline, etc.)
"""

import random
from datetime import datetime, timedelta

from trader.market_data.models import MarketDataResult, MarketStatus, OHLCBar
from trader.market_data.providers.base import MarketDataProvider, ProviderConfig

# Market configurations with base prices and volatility multipliers
MARKET_CONFIG: dict[str, dict[str, float]] = {
    "DJI": {"base_price": 42500, "volatility": 1.0},
    "SPX": {"base_price": 5950, "volatility": 0.15},
    "NDX": {"base_price": 21200, "volatility": 0.5},
    "BTCUSD": {"base_price": 95000, "volatility": 2.5},
    "EURUSD": {"base_price": 1.04, "volatility": 0.00005},
    "GOLD": {"base_price": 2620, "volatility": 0.08},
}

# Base volatility per timeframe (price movement range)
VOLATILITY_MAP: dict[str, float] = {
    "1m": 10,
    "3m": 15,
    "5m": 20,
    "15m": 25,
    "1H": 50,
    "4H": 100,
    "1D": 200,
    "1W": 500,
    "1M": 1500,
}

# Interval in milliseconds per timeframe
INTERVAL_MS: dict[str, int] = {
    "1m": 60 * 1000,
    "3m": 3 * 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1H": 60 * 60 * 1000,
    "4H": 4 * 60 * 60 * 1000,
    "1D": 24 * 60 * 60 * 1000,
    "1W": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
}


class SimulatedProvider(MarketDataProvider):
    """Simulated data provider for fallback when real data unavailable.

    This provider always succeeds and generates realistic market data.
    It has the lowest priority (999) so it's only used when all other
    providers fail.
    """

    def __init__(self) -> None:
        """Initialize simulated provider with default config."""
        super().__init__(
            ProviderConfig(
                name="simulated",
                priority=999,  # Lowest priority (used as fallback)
                rate_limit_per_hour=float("inf"),  # Unlimited
                requires_api_key=False,
            )
        )

    async def fetch_ohlc(
        self,
        symbol: str,
        timeframe: str,
        periods: int,
        before: str | None = None,
    ) -> MarketDataResult:
        """Generate simulated OHLC data.

        Args:
            symbol: Market symbol (e.g., "DJI")
            timeframe: Timeframe (e.g., "1D")
            periods: Number of bars to generate
            before: Optional ISO date to generate data before

        Returns:
            MarketDataResult with simulated data
        """
        config = MARKET_CONFIG.get(symbol)
        if not config:
            return MarketDataResult.from_error(f"Unknown symbol: {symbol}")

        base_price = config["base_price"]
        volatility_mult = config["volatility"]
        base_volatility = VOLATILITY_MAP.get(timeframe, 200) * volatility_mult
        interval = INTERVAL_MS.get(timeframe, 86400000)

        # Parse end time or use now
        if before:
            end_time = datetime.fromisoformat(before.replace("Z", "+00:00"))
        else:
            end_time = datetime.now()

        bars: list[OHLCBar] = []
        current_price = base_price

        for i in range(periods):
            # Calculate timestamp for this bar
            bar_offset = periods - i - 1
            timestamp = end_time - timedelta(milliseconds=interval * bar_offset)

            # Skip weekends for daily data
            if timeframe == "1D" and timestamp.weekday() >= 5:
                continue

            # Generate OHLC with random walk
            volatility = base_volatility * (0.5 + random.random())
            trend = 1 if random.random() > 0.48 else -1  # Slight bullish bias

            open_price = current_price
            change = (random.random() - 0.5) * volatility + trend * (volatility * 0.1)
            close_price = open_price + change
            wick = random.random() * volatility * 0.3
            high_price = max(open_price, close_price) + wick
            low_price = min(open_price, close_price) - wick

            # Format time based on timeframe
            if timeframe in ("1D", "1W", "1M"):
                time: str | int = timestamp.strftime("%Y-%m-%d")
            else:
                time = int(timestamp.timestamp())

            bars.append(
                OHLCBar(
                    time=time,
                    open=round(open_price, 2),
                    high=round(high_price, 2),
                    low=round(low_price, 2),
                    close=round(close_price, 2),
                )
            )

            current_price = close_price

        return MarketDataResult.from_success(
            data=bars,
            market_status=MarketStatus.simulated(),
            provider="simulated",
        )

    async def is_available(self) -> bool:
        """Simulated provider is always available.

        Returns:
            Always True
        """
        return True
