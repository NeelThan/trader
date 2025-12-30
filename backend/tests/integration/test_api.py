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
                "fib_level": 65.0,
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
                "fib_level": 65.0,
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
                "fib_level": 65.0,
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
