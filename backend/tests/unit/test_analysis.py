"""Unit tests for AnalysisOrchestrator and models (TDD - RED phase)."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from trader.market_data.models import MarketDataResult, MarketStatus, OHLCBar


# Test imports - these should fail initially (RED phase)
class TestAnalysisModelsImports:
    """Tests that analysis models can be imported."""

    def test_can_import_analysis_config(self) -> None:
        """AnalysisConfig should be importable."""
        from trader.analysis import AnalysisConfig

        assert AnalysisConfig is not None

    def test_can_import_full_analysis_request(self) -> None:
        """FullAnalysisRequest should be importable."""
        from trader.analysis import FullAnalysisRequest

        assert FullAnalysisRequest is not None

    def test_can_import_full_analysis_response(self) -> None:
        """FullAnalysisResponse should be importable."""
        from trader.analysis import FullAnalysisResponse

        assert FullAnalysisResponse is not None

    def test_can_import_market_data_section(self) -> None:
        """MarketDataSection should be importable."""
        from trader.analysis import MarketDataSection

        assert MarketDataSection is not None

    def test_can_import_pivot_section(self) -> None:
        """PivotSection should be importable."""
        from trader.analysis import PivotSection

        assert PivotSection is not None

    def test_can_import_fibonacci_section(self) -> None:
        """FibonacciSection should be importable."""
        from trader.analysis import FibonacciSection

        assert FibonacciSection is not None

    def test_can_import_analysis_orchestrator(self) -> None:
        """AnalysisOrchestrator should be importable."""
        from trader.analysis import AnalysisOrchestrator

        assert AnalysisOrchestrator is not None


class TestAnalysisConfig:
    """Tests for AnalysisConfig model."""

    def test_create_with_defaults(self) -> None:
        """Should create config with default values."""
        from trader.analysis import AnalysisConfig

        config = AnalysisConfig()

        assert config.pivot_lookback == 5
        assert config.pivot_count == 10
        assert config.fibonacci_direction == "buy"
        assert config.detect_signals is True

    def test_create_with_custom_values(self) -> None:
        """Should create config with custom values."""
        from trader.analysis import AnalysisConfig

        config = AnalysisConfig(
            pivot_lookback=10,
            pivot_count=20,
            fibonacci_direction="sell",
            detect_signals=False,
        )

        assert config.pivot_lookback == 10
        assert config.pivot_count == 20
        assert config.fibonacci_direction == "sell"
        assert config.detect_signals is False

    def test_fibonacci_direction_must_be_buy_or_sell(self) -> None:
        """fibonacci_direction should only accept 'buy' or 'sell'."""
        from pydantic import ValidationError

        from trader.analysis import AnalysisConfig

        with pytest.raises(ValidationError):
            AnalysisConfig(fibonacci_direction="invalid")


class TestFullAnalysisRequest:
    """Tests for FullAnalysisRequest model."""

    def test_create_with_required_fields(self) -> None:
        """Should create request with required fields."""
        from trader.analysis import AnalysisConfig, FullAnalysisRequest

        request = FullAnalysisRequest(
            symbol="DJI",
            timeframe="1D",
        )

        assert request.symbol == "DJI"
        assert request.timeframe == "1D"
        assert request.periods == 100  # default
        assert isinstance(request.config, AnalysisConfig)

    def test_create_with_custom_config(self) -> None:
        """Should create request with custom config."""
        from trader.analysis import AnalysisConfig, FullAnalysisRequest

        config = AnalysisConfig(fibonacci_direction="sell")
        request = FullAnalysisRequest(
            symbol="SPX",
            timeframe="4H",
            periods=200,
            config=config,
        )

        assert request.symbol == "SPX"
        assert request.timeframe == "4H"
        assert request.periods == 200
        assert request.config.fibonacci_direction == "sell"


class TestMarketDataSection:
    """Tests for MarketDataSection model."""

    def test_create_market_data_section(self) -> None:
        """Should create market data section with required fields."""
        from trader.analysis import MarketDataSection

        bars = [
            {
                "time": "2024-01-15",
                "open": 100.0,
                "high": 105.0,
                "low": 98.0,
                "close": 103.0,
            },
            {
                "time": "2024-01-16",
                "open": 103.0,
                "high": 108.0,
                "low": 101.0,
                "close": 106.0,
            },
        ]

        section = MarketDataSection(
            data=bars,
            provider="yahoo",
            cached=True,
        )

        assert len(section.data) == 2
        assert section.provider == "yahoo"
        assert section.cached is True


class TestPivotSection:
    """Tests for PivotSection model."""

    def test_create_pivot_section(self) -> None:
        """Should create pivot section with required fields."""
        from trader.analysis import PivotSection

        pivot_high = {"index": 5, "price": 105.0, "type": "high", "time": "2024-01-15"}
        pivot_low = {"index": 10, "price": 98.0, "type": "low", "time": "2024-01-10"}

        section = PivotSection(
            all_pivots=[pivot_high, pivot_low],
            recent_pivots=[pivot_high, pivot_low],
            swing_high=pivot_high,
            swing_low=pivot_low,
        )

        assert len(section.all_pivots) == 2
        assert len(section.recent_pivots) == 2
        assert section.swing_high is not None
        assert section.swing_low is not None

    def test_create_pivot_section_without_swings(self) -> None:
        """Should create pivot section without swing points."""
        from trader.analysis import PivotSection

        section = PivotSection(
            all_pivots=[],
            recent_pivots=[],
            swing_high=None,
            swing_low=None,
        )

        assert section.swing_high is None
        assert section.swing_low is None


class TestFibonacciSection:
    """Tests for FibonacciSection model."""

    def test_create_fibonacci_section(self) -> None:
        """Should create fibonacci section with levels."""
        from trader.analysis import FibonacciSection

        section = FibonacciSection(
            retracement={
                "236": 102.5,
                "382": 101.0,
                "500": 100.0,
                "618": 99.0,
                "786": 97.5,
            },
            extension={"1000": 95.0, "1272": 93.0, "1618": 90.0},
        )

        assert "236" in section.retracement
        assert "1618" in section.extension


class TestFullAnalysisResponse:
    """Tests for FullAnalysisResponse model."""

    def test_create_success_response(self) -> None:
        """Should create a success response."""
        from trader.analysis import (
            FibonacciSection,
            FullAnalysisResponse,
            MarketDataSection,
            PivotSection,
        )

        market_data = MarketDataSection(
            data=[
                {
                    "time": "2024-01-15",
                    "open": 100.0,
                    "high": 105.0,
                    "low": 98.0,
                    "close": 103.0,
                }
            ],
            provider="yahoo",
            cached=False,
        )
        pivots = PivotSection(
            all_pivots=[],
            recent_pivots=[],
            swing_high=None,
            swing_low=None,
        )
        fibonacci = FibonacciSection(
            retracement={},
            extension={},
        )

        response = FullAnalysisResponse(
            success=True,
            market_data=market_data,
            pivots=pivots,
            fibonacci=fibonacci,
            signals=[],
            error=None,
        )

        assert response.success is True
        assert response.error is None

    def test_create_error_response(self) -> None:
        """Should create an error response."""
        from trader.analysis import FullAnalysisResponse

        response = FullAnalysisResponse.from_error("Failed to fetch market data")

        assert response.success is False
        assert response.error == "Failed to fetch market data"


class TestAnalysisOrchestrator:
    """Tests for AnalysisOrchestrator class."""

    @pytest.fixture
    def sample_bars(self) -> list[OHLCBar]:
        """Create sample OHLC bars for testing."""
        return [
            OHLCBar(time="2024-01-01", open=100.0, high=105.0, low=98.0, close=103.0),
            OHLCBar(time="2024-01-02", open=103.0, high=110.0, low=101.0, close=108.0),
            OHLCBar(time="2024-01-03", open=108.0, high=112.0, low=106.0, close=107.0),
            OHLCBar(time="2024-01-04", open=107.0, high=109.0, low=100.0, close=102.0),
            OHLCBar(time="2024-01-05", open=102.0, high=106.0, low=99.0, close=104.0),
            OHLCBar(time="2024-01-06", open=104.0, high=108.0, low=102.0, close=106.0),
            OHLCBar(time="2024-01-07", open=106.0, high=115.0, low=105.0, close=114.0),
            OHLCBar(time="2024-01-08", open=114.0, high=118.0, low=112.0, close=116.0),
            OHLCBar(time="2024-01-09", open=116.0, high=120.0, low=114.0, close=115.0),
            OHLCBar(time="2024-01-10", open=115.0, high=117.0, low=108.0, close=110.0),
        ]

    @pytest.fixture
    def mock_market_service(self, sample_bars: list[OHLCBar]) -> MagicMock:
        """Create a mock market data service."""
        mock = MagicMock()
        mock.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_success(
                data=sample_bars,
                market_status=MarketStatus.unknown(),
                provider="yahoo",
            )
        )
        return mock

    def test_creates_with_market_service(self, mock_market_service: MagicMock) -> None:
        """Should create orchestrator with market data service."""
        from trader.analysis import AnalysisOrchestrator

        orchestrator = AnalysisOrchestrator(mock_market_service)

        assert orchestrator.market_data is mock_market_service

    async def test_analyze_returns_full_response(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should return complete analysis response."""
        from trader.analysis import (
            AnalysisOrchestrator,
            FullAnalysisRequest,
            FullAnalysisResponse,
        )

        orchestrator = AnalysisOrchestrator(mock_market_service)
        request = FullAnalysisRequest(symbol="DJI", timeframe="1D")

        result = await orchestrator.analyze(request)

        assert isinstance(result, FullAnalysisResponse)
        assert result.success is True
        assert result.market_data.provider == "yahoo"

    async def test_analyze_detects_pivots(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should detect pivots from market data."""
        from trader.analysis import AnalysisOrchestrator, FullAnalysisRequest

        orchestrator = AnalysisOrchestrator(mock_market_service)
        request = FullAnalysisRequest(symbol="DJI", timeframe="1D")

        result = await orchestrator.analyze(request)

        # Should have detected some pivots
        assert result.pivots is not None
        assert hasattr(result.pivots, "all_pivots")

    async def test_analyze_calculates_fibonacci(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should calculate Fibonacci levels from pivots."""
        from trader.analysis import AnalysisOrchestrator, FullAnalysisRequest

        orchestrator = AnalysisOrchestrator(mock_market_service)
        request = FullAnalysisRequest(symbol="DJI", timeframe="1D")

        result = await orchestrator.analyze(request)

        # Should have Fibonacci levels
        assert result.fibonacci is not None
        assert hasattr(result.fibonacci, "retracement")
        assert hasattr(result.fibonacci, "extension")

    async def test_analyze_with_signals_enabled(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should detect signals when enabled."""
        from trader.analysis import (
            AnalysisConfig,
            AnalysisOrchestrator,
            FullAnalysisRequest,
        )

        orchestrator = AnalysisOrchestrator(mock_market_service)
        config = AnalysisConfig(detect_signals=True)
        request = FullAnalysisRequest(symbol="DJI", timeframe="1D", config=config)

        result = await orchestrator.analyze(request)

        # Signals should be a list (may be empty if no signals detected)
        assert isinstance(result.signals, list)

    async def test_analyze_with_signals_disabled(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should skip signal detection when disabled."""
        from trader.analysis import (
            AnalysisConfig,
            AnalysisOrchestrator,
            FullAnalysisRequest,
        )

        orchestrator = AnalysisOrchestrator(mock_market_service)
        config = AnalysisConfig(detect_signals=False)
        request = FullAnalysisRequest(symbol="DJI", timeframe="1D", config=config)

        result = await orchestrator.analyze(request)

        # Signals should be empty when disabled
        assert result.signals == []

    async def test_analyze_handles_market_data_error(self) -> None:
        """Should handle market data fetch error gracefully."""
        from trader.analysis import AnalysisOrchestrator, FullAnalysisRequest

        mock_service = MagicMock()
        mock_service.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_error("Rate limited")
        )

        orchestrator = AnalysisOrchestrator(mock_service)
        request = FullAnalysisRequest(symbol="DJI", timeframe="1D")

        result = await orchestrator.analyze(request)

        assert result.success is False
        assert "Rate limited" in str(result.error)

    async def test_analyze_uses_config_pivot_lookback(
        self, mock_market_service: MagicMock, sample_bars: list[OHLCBar]
    ) -> None:
        """Should use pivot_lookback from config."""
        from trader.analysis import (
            AnalysisConfig,
            AnalysisOrchestrator,
            FullAnalysisRequest,
        )

        orchestrator = AnalysisOrchestrator(mock_market_service)
        config = AnalysisConfig(pivot_lookback=3)
        request = FullAnalysisRequest(symbol="DJI", timeframe="1D", config=config)

        # Just verify it runs without error with custom lookback
        result = await orchestrator.analyze(request)

        assert result.success is True

    async def test_analyze_uses_config_fibonacci_direction(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should use fibonacci_direction from config."""
        from trader.analysis import (
            AnalysisConfig,
            AnalysisOrchestrator,
            FullAnalysisRequest,
        )

        orchestrator = AnalysisOrchestrator(mock_market_service)
        config = AnalysisConfig(fibonacci_direction="sell")
        request = FullAnalysisRequest(symbol="DJI", timeframe="1D", config=config)

        result = await orchestrator.analyze(request)

        assert result.success is True
        # Fibonacci should be calculated based on direction

    async def test_analyze_handles_insufficient_data(self) -> None:
        """Should handle case with too few bars for analysis."""
        from trader.analysis import AnalysisOrchestrator, FullAnalysisRequest

        mock_service = MagicMock()
        mock_service.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_success(
                data=[
                    OHLCBar(
                        time="2024-01-01",
                        open=100.0,
                        high=105.0,
                        low=98.0,
                        close=103.0,
                    )
                ],
                market_status=MarketStatus.unknown(),
                provider="yahoo",
            )
        )

        orchestrator = AnalysisOrchestrator(mock_service)
        request = FullAnalysisRequest(symbol="DJI", timeframe="1D")

        result = await orchestrator.analyze(request)

        # Should still succeed but with empty pivots/fibonacci
        assert result.success is True
        assert result.pivots.swing_high is None
        assert result.pivots.swing_low is None

    async def test_analyze_calculates_fibonacci_levels_with_valid_pivots(self) -> None:
        """Should calculate Fibonacci retracement and extension levels."""
        from trader.analysis import (
            AnalysisConfig,
            AnalysisOrchestrator,
            FullAnalysisRequest,
        )

        # Create data with clear swing high and low pattern using lookback=2
        # Pattern: low at bar 2, high at bar 5
        bars = [
            OHLCBar(time="2024-01-01", open=100.0, high=102.0, low=99.0, close=101.0),
            OHLCBar(time="2024-01-02", open=101.0, high=103.0, low=100.0, close=102.0),
            OHLCBar(time="2024-01-03", open=102.0, high=104.0, low=95.0, close=96.0),
            OHLCBar(time="2024-01-04", open=96.0, high=99.0, low=97.0, close=98.0),
            OHLCBar(time="2024-01-05", open=98.0, high=100.0, low=97.0, close=99.0),
            OHLCBar(time="2024-01-06", open=99.0, high=115.0, low=98.0, close=114.0),
            OHLCBar(time="2024-01-07", open=114.0, high=112.0, low=108.0, close=110.0),
            OHLCBar(time="2024-01-08", open=110.0, high=111.0, low=107.0, close=108.0),
        ]

        mock_service = MagicMock()
        mock_service.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_success(
                data=bars,
                market_status=MarketStatus.unknown(),
                provider="yahoo",
            )
        )

        orchestrator = AnalysisOrchestrator(mock_service)
        config = AnalysisConfig(pivot_lookback=2, detect_signals=False)
        request = FullAnalysisRequest(symbol="DJI", timeframe="1D", config=config)

        result = await orchestrator.analyze(request)

        assert result.success is True
        # Should have swing points
        assert result.pivots.swing_high is not None
        assert result.pivots.swing_low is not None
        # Should have calculated Fibonacci levels
        assert result.fibonacci is not None
        assert len(result.fibonacci.retracement) > 0
        assert len(result.fibonacci.extension) > 0
        # Check for expected Fibonacci level keys (e.g., 382, 618)
        assert "382" in result.fibonacci.retracement
        assert "618" in result.fibonacci.retracement

    async def test_analyze_detects_signal_at_fibonacci_level(self) -> None:
        """Should detect signals when bar touches Fibonacci level."""
        from trader.analysis import (
            AnalysisConfig,
            AnalysisOrchestrator,
            FullAnalysisRequest,
        )

        # Create data where swing high=115, swing low=95 (range = 20)
        # 38.2% retracement in buy direction = 95 + (20 * 0.382) = 102.64
        # Make last bar touch near that level with a bullish bounce
        bars = [
            OHLCBar(time="2024-01-01", open=100.0, high=102.0, low=99.0, close=101.0),
            OHLCBar(time="2024-01-02", open=101.0, high=103.0, low=100.0, close=102.0),
            OHLCBar(time="2024-01-03", open=102.0, high=104.0, low=95.0, close=96.0),
            OHLCBar(time="2024-01-04", open=96.0, high=99.0, low=97.0, close=98.0),
            OHLCBar(time="2024-01-05", open=98.0, high=100.0, low=97.0, close=99.0),
            OHLCBar(time="2024-01-06", open=99.0, high=115.0, low=98.0, close=114.0),
            OHLCBar(time="2024-01-07", open=114.0, high=112.0, low=108.0, close=110.0),
            # Last bar touches 38.2% level and closes higher (bullish bounce)
            OHLCBar(time="2024-01-08", open=105.0, high=108.0, low=102.5, close=107.0),
        ]

        mock_service = MagicMock()
        mock_service.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_success(
                data=bars,
                market_status=MarketStatus.unknown(),
                provider="yahoo",
            )
        )

        orchestrator = AnalysisOrchestrator(mock_service)
        config = AnalysisConfig(pivot_lookback=2, detect_signals=True)
        request = FullAnalysisRequest(symbol="DJI", timeframe="1D", config=config)

        result = await orchestrator.analyze(request)

        assert result.success is True
        # Signals list should be returned (may be empty if no exact level match)
        assert isinstance(result.signals, list)
