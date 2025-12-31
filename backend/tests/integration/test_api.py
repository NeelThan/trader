"""Integration tests for Fibonacci API endpoints."""

import pytest
from httpx import ASGITransport, AsyncClient

from trader.main import app


@pytest.fixture
async def client() -> AsyncClient:
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    async def test_health_returns_ok(self, client: AsyncClient) -> None:
        """Health endpoint should return status ok."""
        response = await client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestRetracementEndpoint:
    """Tests for retracement calculation endpoint."""

    async def test_buy_retracement_returns_levels(self, client: AsyncClient) -> None:
        """POST /fibonacci/retracement returns correct levels for BUY."""
        response = await client.post(
            "/fibonacci/retracement",
            json={"high": 100.0, "low": 50.0, "direction": "buy"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "levels" in data
        assert data["levels"]["382"] == pytest.approx(80.9, rel=0.01)
        assert data["levels"]["500"] == pytest.approx(75.0, rel=0.01)
        assert data["levels"]["618"] == pytest.approx(69.1, rel=0.01)
        assert data["levels"]["786"] == pytest.approx(60.7, rel=0.01)

    async def test_sell_retracement_returns_levels(self, client: AsyncClient) -> None:
        """POST /fibonacci/retracement returns correct levels for SELL."""
        response = await client.post(
            "/fibonacci/retracement",
            json={"high": 100.0, "low": 50.0, "direction": "sell"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["levels"]["618"] == pytest.approx(80.9, rel=0.01)

    async def test_invalid_direction_returns_422(self, client: AsyncClient) -> None:
        """Invalid direction should return validation error."""
        response = await client.post(
            "/fibonacci/retracement",
            json={"high": 100.0, "low": 50.0, "direction": "invalid"},
        )

        assert response.status_code == 422


class TestExtensionEndpoint:
    """Tests for extension calculation endpoint."""

    async def test_buy_extension_returns_levels(self, client: AsyncClient) -> None:
        """POST /fibonacci/extension returns correct levels."""
        response = await client.post(
            "/fibonacci/extension",
            json={"high": 100.0, "low": 50.0, "direction": "buy"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "levels" in data
        assert data["levels"]["1272"] == pytest.approx(36.4, rel=0.01)
        assert data["levels"]["1618"] == pytest.approx(19.1, rel=0.01)


class TestProjectionEndpoint:
    """Tests for projection calculation endpoint."""

    async def test_buy_projection_returns_levels(self, client: AsyncClient) -> None:
        """POST /fibonacci/projection returns correct levels."""
        response = await client.post(
            "/fibonacci/projection",
            json={
                "point_a": 100.0,
                "point_b": 50.0,
                "point_c": 75.0,
                "direction": "buy",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "levels" in data
        assert data["levels"]["1000"] == pytest.approx(25.0, rel=0.01)


class TestExpansionEndpoint:
    """Tests for expansion calculation endpoint."""

    async def test_sell_expansion_returns_levels(self, client: AsyncClient) -> None:
        """POST /fibonacci/expansion returns correct levels."""
        response = await client.post(
            "/fibonacci/expansion",
            json={"point_a": 50.0, "point_b": 100.0, "direction": "sell"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "levels" in data
        assert data["levels"]["1000"] == pytest.approx(150.0, rel=0.01)


class TestSignalEndpoint:
    """Tests for signal detection endpoint."""

    async def test_buy_signal_detected(self, client: AsyncClient) -> None:
        """POST /signal/detect returns buy signal when conditions met."""
        response = await client.post(
            "/signal/detect",
            json={
                "open": 60.0,
                "high": 72.0,
                "low": 58.0,
                "close": 70.0,
                "fibonacci_level": 65.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["signal"] is not None
        assert data["signal"]["direction"] == "buy"
        assert data["signal"]["signal_type"] == "type_1"
        assert 0.0 <= data["signal"]["strength"] <= 1.0

    async def test_sell_signal_detected(self, client: AsyncClient) -> None:
        """POST /signal/detect returns sell signal when conditions met."""
        response = await client.post(
            "/signal/detect",
            json={
                "open": 70.0,
                "high": 72.0,
                "low": 58.0,
                "close": 60.0,
                "fibonacci_level": 65.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["signal"] is not None
        assert data["signal"]["direction"] == "sell"

    async def test_no_signal_returns_null(self, client: AsyncClient) -> None:
        """POST /signal/detect returns null when no signal conditions met."""
        response = await client.post(
            "/signal/detect",
            json={
                "open": 65.0,
                "high": 70.0,
                "low": 60.0,
                "close": 65.0,  # Doji - no signal
                "fibonacci_level": 65.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["signal"] is None


class TestHarmonicValidateEndpoint:
    """Tests for harmonic pattern validation endpoint."""

    async def test_valid_gartley_pattern_detected(self, client: AsyncClient) -> None:
        """POST /harmonic/validate returns Gartley pattern when valid."""
        response = await client.post(
            "/harmonic/validate",
            json={
                "x": 100.0,
                "a": 50.0,
                "b": 80.9,
                "c": 61.8,
                "d": 60.7,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["pattern"] is not None
        assert data["pattern"]["pattern_type"] == "gartley"
        assert data["pattern"]["direction"] == "buy"

    async def test_valid_butterfly_pattern_detected(self, client: AsyncClient) -> None:
        """POST /harmonic/validate returns Butterfly pattern when valid."""
        response = await client.post(
            "/harmonic/validate",
            json={
                "x": 100.0,
                "a": 50.0,
                "b": 89.3,
                "c": 65.0,
                "d": 36.4,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["pattern"] is not None
        assert data["pattern"]["pattern_type"] == "butterfly"

    async def test_no_pattern_returns_null(self, client: AsyncClient) -> None:
        """POST /harmonic/validate returns null when no valid pattern."""
        response = await client.post(
            "/harmonic/validate",
            json={
                "x": 100.0,
                "a": 50.0,
                "b": 60.0,
                "c": 55.0,
                "d": 45.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["pattern"] is None


class TestHarmonicReversalZoneEndpoint:
    """Tests for harmonic reversal zone calculation endpoint."""

    async def test_calculate_gartley_reversal_zone(self, client: AsyncClient) -> None:
        """POST /harmonic/reversal-zone returns D level for Gartley pattern."""
        response = await client.post(
            "/harmonic/reversal-zone",
            json={
                "x": 100.0,
                "a": 50.0,
                "b": 80.9,
                "c": 61.8,
                "pattern_type": "gartley",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["reversal_zone"] is not None
        assert data["reversal_zone"]["d_level"] == pytest.approx(60.7, rel=0.01)
        assert data["reversal_zone"]["direction"] == "buy"
        assert data["reversal_zone"]["pattern_type"] == "gartley"

    async def test_calculate_crab_reversal_zone(self, client: AsyncClient) -> None:
        """POST /harmonic/reversal-zone returns D level for Crab pattern."""
        response = await client.post(
            "/harmonic/reversal-zone",
            json={
                "x": 100.0,
                "a": 50.0,
                "b": 75.0,
                "c": 59.55,
                "pattern_type": "crab",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["reversal_zone"] is not None
        assert data["reversal_zone"]["d_level"] == pytest.approx(19.1, rel=0.01)
        assert data["reversal_zone"]["pattern_type"] == "crab"


class TestPositionSizeEndpoint:
    """Tests for position size calculation endpoint."""

    async def test_calculate_position_size(self, client: AsyncClient) -> None:
        """POST /position/size returns correct position size."""
        response = await client.post(
            "/position/size",
            json={
                "entry_price": 100.0,
                "stop_loss": 95.0,
                "risk_capital": 500.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"]["position_size"] == pytest.approx(100.0)
        assert data["result"]["distance_to_stop"] == pytest.approx(5.0)
        assert data["result"]["risk_amount"] == pytest.approx(500.0)
        assert data["result"]["is_valid"] is True

    async def test_position_size_with_account_balance(
        self, client: AsyncClient
    ) -> None:
        """POST /position/size calculates account risk percentage."""
        response = await client.post(
            "/position/size",
            json={
                "entry_price": 100.0,
                "stop_loss": 95.0,
                "risk_capital": 500.0,
                "account_balance": 10000.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"]["account_risk_percentage"] == pytest.approx(5.0)
        assert data["result"]["is_valid"] is True

    async def test_position_size_high_risk_invalid(
        self, client: AsyncClient
    ) -> None:
        """POST /position/size marks high risk trades as invalid."""
        response = await client.post(
            "/position/size",
            json={
                "entry_price": 100.0,
                "stop_loss": 95.0,
                "risk_capital": 600.0,  # 6% of 10000
                "account_balance": 10000.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"]["account_risk_percentage"] == pytest.approx(6.0)
        assert data["result"]["is_valid"] is False

    async def test_position_size_zero_distance_invalid(
        self, client: AsyncClient
    ) -> None:
        """POST /position/size returns invalid for zero stop distance."""
        response = await client.post(
            "/position/size",
            json={
                "entry_price": 100.0,
                "stop_loss": 100.0,  # Same as entry
                "risk_capital": 500.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"]["position_size"] == 0.0
        assert data["result"]["is_valid"] is False


class TestRiskRewardEndpoint:
    """Tests for risk/reward calculation endpoint."""

    async def test_calculate_risk_reward(self, client: AsyncClient) -> None:
        """POST /position/risk-reward returns correct R:R ratio."""
        response = await client.post(
            "/position/risk-reward",
            json={
                "entry_price": 100.0,
                "stop_loss": 95.0,
                "targets": [110.0],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"]["risk_reward_ratio"] == pytest.approx(2.0)
        assert data["result"]["recommendation"] == "good"
        assert data["result"]["is_valid"] is True

    async def test_risk_reward_excellent_ratio(self, client: AsyncClient) -> None:
        """POST /position/risk-reward returns excellent for R:R >= 3."""
        response = await client.post(
            "/position/risk-reward",
            json={
                "entry_price": 100.0,
                "stop_loss": 98.0,
                "targets": [106.0],  # 3:1 ratio
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"]["risk_reward_ratio"] == pytest.approx(3.0)
        assert data["result"]["recommendation"] == "excellent"

    async def test_risk_reward_multiple_targets(self, client: AsyncClient) -> None:
        """POST /position/risk-reward returns ratios for all targets."""
        response = await client.post(
            "/position/risk-reward",
            json={
                "entry_price": 100.0,
                "stop_loss": 95.0,
                "targets": [110.0, 115.0, 120.0],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["result"]["target_ratios"]) == 3
        assert data["result"]["target_ratios"][0] == pytest.approx(2.0)
        assert data["result"]["target_ratios"][1] == pytest.approx(3.0)
        assert data["result"]["target_ratios"][2] == pytest.approx(4.0)

    async def test_risk_reward_with_position_size(self, client: AsyncClient) -> None:
        """POST /position/risk-reward calculates potential P&L."""
        response = await client.post(
            "/position/risk-reward",
            json={
                "entry_price": 100.0,
                "stop_loss": 95.0,
                "targets": [110.0],
                "position_size": 10.0,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"]["potential_loss"] == pytest.approx(50.0)  # 10 * 5
        assert data["result"]["potential_profit"] == pytest.approx(100.0)  # 10 * 10


class TestPivotDetectEndpoint:
    """Tests for pivot detection endpoint."""

    async def test_detects_swing_highs_and_lows(self, client: AsyncClient) -> None:
        """POST /pivot/detect returns swing highs and lows."""
        data = [
            {"time": "2024-01-01", "open": 10, "high": 15, "low": 5, "close": 12},
            {"time": "2024-01-02", "open": 12, "high": 30, "low": 10, "close": 25},
            {"time": "2024-01-03", "open": 25, "high": 28, "low": 20, "close": 22},
            {"time": "2024-01-04", "open": 22, "high": 24, "low": 8, "close": 12},
            {"time": "2024-01-05", "open": 12, "high": 18, "low": 10, "close": 15},
        ]
        response = await client.post(
            "/pivot/detect",
            json={"data": data, "lookback": 2},
        )

        assert response.status_code == 200
        result = response.json()
        assert "pivots" in result
        assert "pivot_high" in result
        assert "pivot_low" in result

    async def test_returns_recent_pivots_limited_by_count(
        self, client: AsyncClient
    ) -> None:
        """POST /pivot/detect limits recent pivots by count parameter."""
        # Create data with many oscillations
        data = []
        for i in range(15):
            is_high = i % 2 == 1
            price = 100.0 + (10.0 if is_high else -10.0)
            data.append({
                "time": f"2024-01-{i + 1:02d}",
                "open": price - 2,
                "high": price + 5 if is_high else price + 2,
                "low": price - 2 if is_high else price - 5,
                "close": price + 2,
            })

        response = await client.post(
            "/pivot/detect",
            json={"data": data, "lookback": 1, "count": 3},
        )

        assert response.status_code == 200
        result = response.json()
        assert len(result["recent_pivots"]) <= 3

    async def test_returns_empty_for_insufficient_data(
        self, client: AsyncClient
    ) -> None:
        """POST /pivot/detect returns empty result for insufficient data."""
        data = [
            {"time": "2024-01-01", "open": 10, "high": 15, "low": 5, "close": 12},
            {"time": "2024-01-02", "open": 12, "high": 20, "low": 10, "close": 18},
        ]
        response = await client.post(
            "/pivot/detect",
            json={"data": data, "lookback": 5},
        )

        assert response.status_code == 200
        result = response.json()
        assert len(result["pivots"]) == 0
        assert result["pivot_high"] == 0.0
        assert result["pivot_low"] == 0.0
        assert result["swing_high"] is None
        assert result["swing_low"] is None

    async def test_preserves_time_field(self, client: AsyncClient) -> None:
        """POST /pivot/detect preserves time field in pivot response."""
        data = [
            {"time": "2024-01-01", "open": 10, "high": 15, "low": 5, "close": 12},
            {"time": "2024-01-02", "open": 12, "high": 18, "low": 10, "close": 15},
            {"time": "2024-01-03", "open": 15, "high": 50, "low": 12, "close": 45},
            {"time": "2024-01-04", "open": 45, "high": 48, "low": 40, "close": 42},
            {"time": "2024-01-05", "open": 42, "high": 44, "low": 38, "close": 40},
            {"time": "2024-01-06", "open": 40, "high": 42, "low": 35, "close": 38},
            {"time": "2024-01-07", "open": 38, "high": 40, "low": 32, "close": 35},
        ]
        response = await client.post(
            "/pivot/detect",
            json={"data": data, "lookback": 2},
        )

        assert response.status_code == 200
        result = response.json()
        # Check that pivots have time field
        if result["pivots"]:
            assert "time" in result["pivots"][0]

    async def test_handles_unix_timestamps(self, client: AsyncClient) -> None:
        """POST /pivot/detect handles Unix timestamp time values."""
        t = 1704067200  # 2024-01-01 00:00:00 UTC
        day = 86400
        data = [
            {"time": t, "open": 10, "high": 15, "low": 5, "close": 12},
            {"time": t + day, "open": 12, "high": 18, "low": 10, "close": 15},
            {"time": t + day * 2, "open": 15, "high": 50, "low": 12, "close": 45},
            {"time": t + day * 3, "open": 45, "high": 48, "low": 40, "close": 42},
            {"time": t + day * 4, "open": 42, "high": 44, "low": 38, "close": 40},
            {"time": t + day * 5, "open": 40, "high": 42, "low": 35, "close": 38},
            {"time": t + day * 6, "open": 38, "high": 40, "low": 32, "close": 35},
        ]
        response = await client.post(
            "/pivot/detect",
            json={"data": data, "lookback": 2},
        )

        assert response.status_code == 200
        result = response.json()
        assert "pivots" in result

    async def test_risk_reward_no_targets_invalid(self, client: AsyncClient) -> None:
        """POST /position/risk-reward returns invalid with no targets."""
        response = await client.post(
            "/position/risk-reward",
            json={
                "entry_price": 100.0,
                "stop_loss": 95.0,
                "targets": [],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["result"]["risk_reward_ratio"] == 0.0
        assert data["result"]["is_valid"] is False


class TestMarketDataEndpoint:
    """Tests for market data endpoint."""

    async def test_fetches_market_data_for_valid_symbol(
        self, client: AsyncClient
    ) -> None:
        """GET /market-data returns data for valid symbol."""
        response = await client.get(
            "/market-data",
            params={"symbol": "DJI", "timeframe": "1D", "periods": 10},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]) > 0
        assert data["provider"] in ["yahoo", "simulated"]

    async def test_returns_error_for_unknown_symbol(
        self, client: AsyncClient
    ) -> None:
        """GET /market-data returns error for unknown symbol."""
        response = await client.get(
            "/market-data",
            params={"symbol": "UNKNOWN_SYMBOL_XYZ", "timeframe": "1D"},
        )

        assert response.status_code == 200
        data = response.json()
        # Will fall back to simulated, which also fails for unknown symbols
        assert data["success"] is False
        assert data["error"] is not None

    async def test_returns_ohlc_bar_structure(
        self, client: AsyncClient
    ) -> None:
        """GET /market-data returns proper OHLC structure."""
        response = await client.get(
            "/market-data",
            params={"symbol": "DJI", "timeframe": "1D", "periods": 5},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        bar = data["data"][0]
        assert "time" in bar
        assert "open" in bar
        assert "high" in bar
        assert "low" in bar
        assert "close" in bar

    async def test_caches_results(self, client: AsyncClient) -> None:
        """GET /market-data caches results for subsequent requests."""
        # First request
        await client.get(
            "/market-data",
            params={"symbol": "DJI", "timeframe": "1D", "periods": 10},
        )

        # Second request should be cached
        response = await client.get(
            "/market-data",
            params={"symbol": "DJI", "timeframe": "1D", "periods": 10},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["cached"] is True

    async def test_force_refresh_bypasses_cache(
        self, client: AsyncClient
    ) -> None:
        """GET /market-data with force_refresh=true bypasses cache."""
        # First request to populate cache
        await client.get(
            "/market-data",
            params={"symbol": "SPX", "timeframe": "1D", "periods": 5},
        )

        # Force refresh request
        response = await client.get(
            "/market-data",
            params={
                "symbol": "SPX",
                "timeframe": "1D",
                "periods": 5,
                "force_refresh": True,
            },
        )

        assert response.status_code == 200
        data = response.json()
        # Fresh data should have cached=False
        assert data["cached"] is False


class TestProviderStatusEndpoint:
    """Tests for provider status endpoint."""

    async def test_returns_provider_list(self, client: AsyncClient) -> None:
        """GET /market-data/providers returns list of providers."""
        response = await client.get("/market-data/providers")

        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        assert len(data["providers"]) >= 2

    async def test_includes_yahoo_provider(self, client: AsyncClient) -> None:
        """GET /market-data/providers includes Yahoo provider."""
        response = await client.get("/market-data/providers")

        assert response.status_code == 200
        data = response.json()

        yahoo = next(
            (p for p in data["providers"] if p["name"] == "yahoo"),
            None,
        )
        assert yahoo is not None
        assert yahoo["priority"] == 1

    async def test_includes_simulated_provider(self, client: AsyncClient) -> None:
        """GET /market-data/providers includes simulated provider."""
        response = await client.get("/market-data/providers")

        assert response.status_code == 200
        data = response.json()

        simulated = next(
            (p for p in data["providers"] if p["name"] == "simulated"),
            None,
        )
        assert simulated is not None
        assert simulated["priority"] == 999

    async def test_includes_rate_limit_info(self, client: AsyncClient) -> None:
        """GET /market-data/providers includes rate limit information."""
        response = await client.get("/market-data/providers")

        assert response.status_code == 200
        data = response.json()

        provider = data["providers"][0]
        assert "rate_limit" in provider
        assert "requests_made" in provider
        assert "remaining" in provider
        assert "is_rate_limited" in provider
