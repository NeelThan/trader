"""Yahoo Finance market data provider.

This provider fetches real market data from Yahoo Finance using the
yfinance library. It has highest priority (1) and is the primary
data source.
"""

import yfinance as yf  # type: ignore[import-untyped]

from trader.market_data.models import MarketDataResult, MarketStatus, OHLCBar
from trader.market_data.providers.base import MarketDataProvider, ProviderConfig

# Map internal symbols to Yahoo ticker symbols
SYMBOL_MAP: dict[str, str] = {
    "DJI": "^DJI",
    "SPX": "^GSPC",
    "NDX": "^NDX",
    "BTCUSD": "BTC-USD",
    "EURUSD": "EURUSD=X",
    "GOLD": "GC=F",
}

# Map internal timeframes to Yahoo interval values
INTERVAL_MAP: dict[str, str] = {
    "1m": "1m",
    "3m": "1m",  # Yahoo doesn't have 3m, use 1m and aggregate
    "5m": "5m",
    "15m": "15m",
    "1H": "1h",
    "4H": "1h",  # Yahoo doesn't have 4h, use 1h and aggregate
    "1D": "1d",
    "1W": "1wk",
    "1M": "1mo",
}

# Map timeframes to period for history fetch
PERIOD_MAP: dict[str, str] = {
    "1m": "7d",     # 1m data limited to 7 days
    "3m": "7d",     # 3m uses 1m data, same limitation
    "5m": "60d",    # 5m data limited to 60 days
    "15m": "60d",   # 15m data limited to 60 days
    "1H": "730d",   # 1h data limited to 730 days
    "4H": "730d",
    "1D": "max",
    "1W": "max",
    "1M": "max",
}


class YahooFinanceProvider(MarketDataProvider):
    """Yahoo Finance data provider.

    Fetches real market data from Yahoo Finance. This is the primary
    data source with highest priority.
    """

    def __init__(self) -> None:
        """Initialize Yahoo Finance provider."""
        super().__init__(
            ProviderConfig(
                name="yahoo",
                priority=1,  # Highest priority
                rate_limit_per_hour=360,  # Conservative rate limit
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
        """Fetch OHLC data from Yahoo Finance.

        Args:
            symbol: Internal symbol (e.g., "DJI")
            timeframe: Timeframe (e.g., "1D")
            periods: Number of bars to fetch
            before: Optional ISO date to fetch data before (not used by Yahoo)

        Returns:
            MarketDataResult with fetched data or error
        """
        # Map symbol to Yahoo ticker
        yahoo_ticker = SYMBOL_MAP.get(symbol)
        if not yahoo_ticker:
            return MarketDataResult.from_error(f"Unknown symbol: {symbol}")

        try:
            ticker = yf.Ticker(yahoo_ticker)

            # Get interval and period
            interval = INTERVAL_MAP.get(timeframe, "1d")
            period = PERIOD_MAP.get(timeframe, "max")

            # Fetch history
            df = ticker.history(period=period, interval=interval)

            if df.empty:
                return MarketDataResult.from_error(f"No data for {symbol}")

            # Limit to requested periods
            if len(df) > periods:
                df = df.tail(periods)

            # Convert to OHLCBar list
            bars: list[OHLCBar] = []
            is_daily = timeframe in ("1D", "1W", "1M")

            for idx, row in df.iterrows():
                # Format time based on timeframe
                if is_daily:
                    time: str | int = idx.strftime("%Y-%m-%d")
                else:
                    time = int(idx.timestamp())

                bars.append(
                    OHLCBar(
                        time=time,
                        open=round(float(row["Open"]), 2),
                        high=round(float(row["High"]), 2),
                        low=round(float(row["Low"]), 2),
                        close=round(float(row["Close"]), 2),
                    )
                )

            return MarketDataResult.from_success(
                data=bars,
                market_status=MarketStatus.unknown(),  # Could enhance later
                provider="yahoo",
            )

        except Exception as e:
            return MarketDataResult.from_error(f"Yahoo fetch error: {e}")

    async def is_available(self) -> bool:
        """Check if Yahoo Finance is available.

        Makes a simple test request to verify connectivity.

        Returns:
            True if Yahoo is responding, False otherwise
        """
        try:
            ticker = yf.Ticker("^DJI")
            df = ticker.history(period="1d", interval="1d")
            return not df.empty
        except Exception:
            return False
