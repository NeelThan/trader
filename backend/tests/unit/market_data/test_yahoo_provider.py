"""Unit tests for Yahoo Finance provider (TDD - RED phase)."""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

from trader.market_data.providers.yahoo import (
    SYMBOL_MAP,
    YahooFinanceProvider,
)


@pytest.fixture
def provider() -> YahooFinanceProvider:
    """Create a Yahoo Finance provider instance."""
    return YahooFinanceProvider()


@pytest.fixture
def mock_ohlc_data() -> pd.DataFrame:
    """Create mock OHLC data that mimics yfinance response."""
    dates = pd.date_range(end=datetime.now(), periods=10, freq="D")
    return pd.DataFrame(
        {
            "Open": [100.0 + i for i in range(10)],
            "High": [105.0 + i for i in range(10)],
            "Low": [98.0 + i for i in range(10)],
            "Close": [103.0 + i for i in range(10)],
            "Volume": [1000000 + i * 10000 for i in range(10)],
        },
        index=dates,
    )


class TestYahooProviderConfig:
    """Tests for Yahoo provider configuration."""

    def test_has_highest_priority(self, provider: YahooFinanceProvider) -> None:
        """Yahoo provider should have highest priority (lowest number)."""
        assert provider.priority == 1

    def test_does_not_require_api_key(
        self, provider: YahooFinanceProvider
    ) -> None:
        """Yahoo provider should not require an API key."""
        assert provider.config.requires_api_key is False

    def test_has_rate_limit(self, provider: YahooFinanceProvider) -> None:
        """Yahoo provider should have a rate limit."""
        # Yahoo has informal rate limits, we use 360/hour as safe default
        assert provider.config.rate_limit_per_hour == 360

    def test_name_is_yahoo(self, provider: YahooFinanceProvider) -> None:
        """Provider name should be yahoo."""
        assert provider.name == "yahoo"


class TestSymbolMapping:
    """Tests for symbol to Yahoo ticker mapping."""

    def test_dji_maps_to_yahoo_ticker(self) -> None:
        """DJI should map to Yahoo's ^DJI ticker."""
        assert SYMBOL_MAP["DJI"] == "^DJI"

    def test_spx_maps_to_yahoo_ticker(self) -> None:
        """SPX should map to Yahoo's ^GSPC ticker."""
        assert SYMBOL_MAP["SPX"] == "^GSPC"

    def test_ndx_maps_to_yahoo_ticker(self) -> None:
        """NDX should map to Yahoo's ^NDX ticker."""
        assert SYMBOL_MAP["NDX"] == "^NDX"

    def test_btcusd_maps_to_yahoo_ticker(self) -> None:
        """BTCUSD should map to Yahoo's BTC-USD ticker."""
        assert SYMBOL_MAP["BTCUSD"] == "BTC-USD"

    def test_eurusd_maps_to_yahoo_ticker(self) -> None:
        """EURUSD should map to Yahoo's EURUSD=X ticker."""
        assert SYMBOL_MAP["EURUSD"] == "EURUSD=X"

    def test_gold_maps_to_yahoo_ticker(self) -> None:
        """GOLD should map to Yahoo's GC=F ticker."""
        assert SYMBOL_MAP["GOLD"] == "GC=F"


class TestYahooProviderFetch:
    """Tests for fetching data from Yahoo Finance."""

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_fetch_returns_success_with_data(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
        mock_ohlc_data: pd.DataFrame,
    ) -> None:
        """Successful fetch should return MarketDataResult with data."""
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_ohlc_data
        mock_ticker_class.return_value = mock_ticker

        result = await provider.fetch_ohlc("DJI", "1D", periods=10)

        assert result.success is True
        assert len(result.data) == 10
        assert result.provider == "yahoo"

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_fetch_converts_ohlc_correctly(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
        mock_ohlc_data: pd.DataFrame,
    ) -> None:
        """Fetched data should have correct OHLC values."""
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_ohlc_data
        mock_ticker_class.return_value = mock_ticker

        result = await provider.fetch_ohlc("DJI", "1D", periods=10)

        # Check first bar matches mock data
        first_bar = result.data[0]
        assert first_bar.open == 100.0
        assert first_bar.high == 105.0
        assert first_bar.low == 98.0
        assert first_bar.close == 103.0

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_fetch_uses_correct_ticker_symbol(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
        mock_ohlc_data: pd.DataFrame,
    ) -> None:
        """Fetch should use the mapped Yahoo ticker symbol."""
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_ohlc_data
        mock_ticker_class.return_value = mock_ticker

        await provider.fetch_ohlc("DJI", "1D", periods=10)

        # Should use mapped ticker ^DJI
        mock_ticker_class.assert_called_once_with("^DJI")

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_fetch_unknown_symbol_returns_error(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
    ) -> None:
        """Unknown symbol should return error result."""
        result = await provider.fetch_ohlc("UNKNOWN_SYMBOL", "1D", periods=10)

        assert result.success is False
        assert "Unknown symbol" in (result.error or "")

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_fetch_empty_data_returns_error(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
    ) -> None:
        """Empty response from Yahoo should return error."""
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = pd.DataFrame()
        mock_ticker_class.return_value = mock_ticker

        result = await provider.fetch_ohlc("DJI", "1D", periods=10)

        assert result.success is False
        assert "No data" in (result.error or "")

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_fetch_exception_returns_error(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
    ) -> None:
        """Exception during fetch should return error result."""
        mock_ticker_class.side_effect = Exception("Network error")

        result = await provider.fetch_ohlc("DJI", "1D", periods=10)

        assert result.success is False
        assert result.error is not None


class TestYahooProviderTimeframe:
    """Tests for timeframe handling."""

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_daily_timeframe_uses_1d_interval(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
        mock_ohlc_data: pd.DataFrame,
    ) -> None:
        """Daily timeframe should use 1d interval."""
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_ohlc_data
        mock_ticker_class.return_value = mock_ticker

        await provider.fetch_ohlc("DJI", "1D", periods=10)

        mock_ticker.history.assert_called_once()
        call_kwargs = mock_ticker.history.call_args.kwargs
        assert call_kwargs["interval"] == "1d"

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_hourly_timeframe_uses_1h_interval(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
        mock_ohlc_data: pd.DataFrame,
    ) -> None:
        """Hourly timeframe should use 1h interval."""
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_ohlc_data
        mock_ticker_class.return_value = mock_ticker

        await provider.fetch_ohlc("DJI", "1H", periods=10)

        call_kwargs = mock_ticker.history.call_args.kwargs
        assert call_kwargs["interval"] == "1h"

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_daily_data_uses_date_strings(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
        mock_ohlc_data: pd.DataFrame,
    ) -> None:
        """Daily timeframe should return date strings for time."""
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_ohlc_data
        mock_ticker_class.return_value = mock_ticker

        result = await provider.fetch_ohlc("DJI", "1D", periods=10)

        for bar in result.data:
            assert isinstance(bar.time, str)
            assert "-" in bar.time  # YYYY-MM-DD format

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_intraday_data_uses_timestamps(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
    ) -> None:
        """Intraday timeframes should return Unix timestamps."""
        # Create intraday mock data
        dates = pd.date_range(end=datetime.now(), periods=10, freq="h")
        mock_data = pd.DataFrame(
            {
                "Open": [100.0] * 10,
                "High": [105.0] * 10,
                "Low": [98.0] * 10,
                "Close": [103.0] * 10,
                "Volume": [1000000] * 10,
            },
            index=dates,
        )

        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_data
        mock_ticker_class.return_value = mock_ticker

        result = await provider.fetch_ohlc("DJI", "1H", periods=10)

        for bar in result.data:
            assert isinstance(bar.time, int)


class TestYahooProviderAvailability:
    """Tests for provider availability check."""

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_is_available_returns_true_on_success(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
        mock_ohlc_data: pd.DataFrame,
    ) -> None:
        """Provider should be available when Yahoo responds."""
        mock_ticker = MagicMock()
        mock_ticker.history.return_value = mock_ohlc_data
        mock_ticker_class.return_value = mock_ticker

        result = await provider.is_available()
        assert result is True

    @patch("trader.market_data.providers.yahoo.yf.Ticker")
    async def test_is_available_returns_false_on_error(
        self,
        mock_ticker_class: MagicMock,
        provider: YahooFinanceProvider,
    ) -> None:
        """Provider should not be available when Yahoo errors."""
        mock_ticker_class.side_effect = Exception("Service unavailable")

        result = await provider.is_available()
        assert result is False
