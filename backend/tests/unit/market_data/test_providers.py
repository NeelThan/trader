"""Unit tests for market data providers (TDD - RED phase)."""

import pytest

from trader.market_data.providers.base import ProviderConfig
from trader.market_data.providers.simulated import SimulatedProvider


class TestProviderConfig:
    """Tests for ProviderConfig dataclass."""

    def test_creates_with_required_fields(self) -> None:
        """ProviderConfig should store provider configuration."""
        config = ProviderConfig(
            name="yahoo",
            priority=1,
            rate_limit_per_hour=360,
            requires_api_key=False,
        )

        assert config.name == "yahoo"
        assert config.priority == 1
        assert config.rate_limit_per_hour == 360
        assert config.requires_api_key is False

    def test_accepts_optional_api_key(self) -> None:
        """ProviderConfig should accept optional API key."""
        config = ProviderConfig(
            name="finnhub",
            priority=2,
            rate_limit_per_hour=3600,
            requires_api_key=True,
            api_key="test-key",
        )

        assert config.api_key == "test-key"


class TestSimulatedProvider:
    """Tests for SimulatedProvider."""

    @pytest.fixture
    def provider(self) -> SimulatedProvider:
        """Create a simulated provider instance."""
        return SimulatedProvider()

    def test_has_lowest_priority(self, provider: SimulatedProvider) -> None:
        """Simulated provider should have lowest priority (highest number)."""
        assert provider.priority == 999

    def test_does_not_require_api_key(self, provider: SimulatedProvider) -> None:
        """Simulated provider should not require an API key."""
        assert provider.config.requires_api_key is False

    def test_has_unlimited_rate_limit(self, provider: SimulatedProvider) -> None:
        """Simulated provider should have unlimited rate limit."""
        assert provider.config.rate_limit_per_hour == float("inf")

    async def test_is_always_available(self, provider: SimulatedProvider) -> None:
        """Simulated provider should always be available."""
        assert await provider.is_available() is True

    async def test_fetch_returns_correct_number_of_bars(
        self, provider: SimulatedProvider
    ) -> None:
        """Provider should return requested number of bars."""
        result = await provider.fetch_ohlc("DJI", "1D", periods=50)

        assert result.success is True
        # Daily data filters weekends (~28% removed), so 50 periods -> ~35 weekdays
        assert len(result.data) >= 30

    async def test_fetch_returns_valid_ohlc_structure(
        self, provider: SimulatedProvider
    ) -> None:
        """Each bar should have valid OHLC values (high >= low)."""
        result = await provider.fetch_ohlc("DJI", "1D", periods=10)

        for bar in result.data:
            assert bar.high >= bar.low
            assert bar.high >= bar.open
            assert bar.high >= bar.close
            assert bar.low <= bar.open
            assert bar.low <= bar.close

    async def test_fetch_unknown_symbol_returns_error(
        self, provider: SimulatedProvider
    ) -> None:
        """Unknown symbol should return error result."""
        result = await provider.fetch_ohlc("UNKNOWN_SYMBOL", "1D", periods=10)

        assert result.success is False
        assert "Unknown symbol" in (result.error or "")

    async def test_daily_data_uses_date_strings(
        self, provider: SimulatedProvider
    ) -> None:
        """Daily timeframe should use date strings for time."""
        result = await provider.fetch_ohlc("DJI", "1D", periods=5)

        for bar in result.data:
            assert isinstance(bar.time, str)
            assert "-" in bar.time  # YYYY-MM-DD format

    async def test_intraday_data_uses_timestamps(
        self, provider: SimulatedProvider
    ) -> None:
        """Intraday timeframes should use Unix timestamps."""
        result = await provider.fetch_ohlc("DJI", "1H", periods=5)

        for bar in result.data:
            assert isinstance(bar.time, int)

    async def test_returns_simulated_market_status(
        self, provider: SimulatedProvider
    ) -> None:
        """Result should have simulated market status."""
        result = await provider.fetch_ohlc("DJI", "1D", periods=5)

        assert result.market_status is not None
        assert result.market_status.state == "SIMULATED"

    async def test_returns_simulated_as_provider(
        self, provider: SimulatedProvider
    ) -> None:
        """Result should indicate simulated as provider."""
        result = await provider.fetch_ohlc("DJI", "1D", periods=5)

        assert result.provider == "simulated"

    async def test_supports_all_configured_symbols(
        self, provider: SimulatedProvider
    ) -> None:
        """Provider should support all configured market symbols."""
        symbols = ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"]

        for symbol in symbols:
            result = await provider.fetch_ohlc(symbol, "1D", periods=5)
            assert result.success is True, f"Failed for symbol: {symbol}"

    async def test_supports_all_timeframes(
        self, provider: SimulatedProvider
    ) -> None:
        """Provider should support all timeframes."""
        timeframes = ["1m", "15m", "1H", "4H", "1D", "1W", "1M"]

        for tf in timeframes:
            result = await provider.fetch_ohlc("DJI", tf, periods=5)
            assert result.success is True, f"Failed for timeframe: {tf}"

    async def test_bars_are_in_chronological_order(
        self, provider: SimulatedProvider
    ) -> None:
        """Bars should be in ascending chronological order."""
        result = await provider.fetch_ohlc("DJI", "1H", periods=10)

        times = [bar.time for bar in result.data]
        assert times == sorted(times), "Bars should be in chronological order"


class TestMarketDataProviderInterface:
    """Tests for MarketDataProvider abstract base class."""

    def test_provider_has_name_property(self) -> None:
        """Provider should expose name from config."""
        provider = SimulatedProvider()
        assert provider.name == "simulated"

    def test_provider_has_priority_property(self) -> None:
        """Provider should expose priority from config."""
        provider = SimulatedProvider()
        assert provider.priority == 999

    def test_provider_returns_metadata(self) -> None:
        """Provider should return metadata via get_metadata()."""
        provider = SimulatedProvider()
        metadata = provider.get_metadata()

        assert metadata.provider_name == "simulated"
        assert metadata.priority == 999
        assert metadata.requires_api_key is False
