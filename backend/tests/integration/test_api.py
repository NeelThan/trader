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
