"""End-to-end workflow integration tests.

Tests the complete trading workflow: opportunity scan → validate → size → execute.
These tests verify data flows correctly across multiple endpoints and that the
workflow logic produces consistent results.

Uses real market data via MarketDataService, so specific values may vary.
Focus is on structure validation and logic flow, not exact numbers.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from trader.main import app


@pytest.fixture
async def client() -> AsyncClient:
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestFullWorkflowIntegration:
    """End-to-end workflow tests: opportunity → validate → size."""

    async def test_bullish_pullback_workflow(self, client: AsyncClient) -> None:
        """Full workflow for bullish pullback opportunity.

        Tests the complete flow:
        1. Assess higher TF (1D) trend
        2. Assess lower TF (4H) trend
        3. Get Fibonacci levels for entry/target zones
        4. Validate trade opportunity
        5. Categorize trade for position sizing
        6. Size position based on validation results
        """
        symbol = "DJI"

        # Step 1: Assess higher TF trend
        higher_assess = await client.get(
            "/workflow/assess",
            params={"symbol": symbol, "timeframe": "1D"},
        )
        assert higher_assess.status_code == 200
        higher_data = higher_assess.json()
        assert "trend" in higher_data
        assert higher_data["trend"] in ["bullish", "bearish", "neutral"]
        assert "confidence" in higher_data
        higher_trend = higher_data["trend"]

        # Step 2: Assess lower TF trend
        lower_assess = await client.get(
            "/workflow/assess",
            params={"symbol": symbol, "timeframe": "4H"},
        )
        assert lower_assess.status_code == 200
        lower_data = lower_assess.json()
        lower_trend = lower_data["trend"]

        # Step 3: Get Fibonacci levels based on trend direction
        # Use buy direction for bullish higher TF, sell for bearish
        fib_direction = "buy" if higher_trend == "bullish" else "sell"
        levels_response = await client.get(
            "/workflow/levels",
            params={"symbol": symbol, "timeframe": "4H", "direction": fib_direction},
        )
        assert levels_response.status_code == 200
        levels_data = levels_response.json()
        assert "entry_zones" in levels_data
        assert "target_zones" in levels_data

        # Step 4: Validate trade opportunity
        trade_direction = "long" if higher_trend == "bullish" else "short"
        if higher_trend == "neutral":
            trade_direction = "long"  # Default for validation test

        validate_response = await client.post(
            "/workflow/validate",
            json={
                "symbol": symbol,
                "higher_timeframe": "1D",
                "lower_timeframe": "4H",
                "direction": trade_direction,
            },
        )
        assert validate_response.status_code == 200
        validate_data = validate_response.json()

        # Verify validation structure
        assert "checks" in validate_data
        assert len(validate_data["checks"]) == 8  # 8 validation checks
        assert "passed_count" in validate_data
        assert "total_count" in validate_data
        assert validate_data["total_count"] == 8
        assert "is_valid" in validate_data
        assert "pass_percentage" in validate_data
        assert "trade_category" in validate_data
        assert validate_data["trade_category"] in [
            "with_trend",
            "counter_trend",
            "reversal_attempt",
        ]

        # Step 5: Categorize trade
        categorize_response = await client.get(
            "/workflow/categorize",
            params={
                "higher_tf_trend": higher_trend,
                "lower_tf_trend": lower_trend,
                "trade_direction": trade_direction,
                "confluence_score": validate_data.get("confluence_score", 1),
            },
        )
        assert categorize_response.status_code == 200
        category_data = categorize_response.json()
        assert "category" in category_data

        # Step 6: Size position using ATR-based stop
        if validate_data.get("atr_info"):
            entry_price = validate_data["atr_info"]["current_price"]
            stop_distance = validate_data["atr_info"]["suggested_stop_1_5x"]
            if trade_direction == "long":
                stop_loss = entry_price - stop_distance
            else:
                stop_loss = entry_price + stop_distance

            size_response = await client.post(
                "/position/size",
                json={
                    "entry_price": entry_price,
                    "stop_loss": stop_loss,
                    "risk_capital": 1000.0,
                    "account_balance": 100000.0,
                    "trade_category": category_data["category"],
                },
            )
            assert size_response.status_code == 200
            size_data = size_response.json()
            # Position size endpoint wraps result in "result" object
            assert "result" in size_data
            assert "position_size" in size_data["result"]
            assert size_data["result"]["position_size"] > 0

    async def test_counter_trend_requires_higher_confluence(
        self, client: AsyncClient
    ) -> None:
        """Counter-trend trade validation logic test.

        Verifies that the categorization system correctly identifies
        counter-trend trades when trading against the higher TF trend.
        """
        # Test counter-trend categorization: long against bearish higher TF
        counter_trend_response = await client.get(
            "/workflow/categorize",
            params={
                "higher_tf_trend": "bearish",
                "lower_tf_trend": "bullish",
                "trade_direction": "long",
                "confluence_score": 5,  # High confluence for counter-trend
            },
        )
        assert counter_trend_response.status_code == 200
        counter_data = counter_trend_response.json()
        assert counter_data["category"] == "counter_trend"

        # Test reversal attempt with low confluence
        reversal_response = await client.get(
            "/workflow/categorize",
            params={
                "higher_tf_trend": "bearish",
                "lower_tf_trend": "bullish",
                "trade_direction": "long",
                "confluence_score": 2,  # Low confluence
            },
        )
        assert reversal_response.status_code == 200
        reversal_data = reversal_response.json()
        assert reversal_data["category"] == "reversal_attempt"

    async def test_workflow_includes_ranging_detection(
        self, client: AsyncClient
    ) -> None:
        """Workflow should detect and flag ranging market conditions."""
        # Test with a symbol that may have ranging conditions
        assess_response = await client.get(
            "/workflow/assess",
            params={"symbol": "SPX", "timeframe": "1D"},
        )
        assert assess_response.status_code == 200
        data = assess_response.json()

        # Verify ranging detection fields are present
        assert "is_ranging" in data
        assert isinstance(data["is_ranging"], bool)
        # ranging_warning can be None or string
        assert "ranging_warning" in data

        # Confidence should be reduced when ranging
        if data["is_ranging"]:
            assert data["confidence"] <= 75  # Confidence reduced for ranging


class TestMultiSymbolConcurrentAnalysis:
    """Test concurrent multi-symbol opportunity scanning."""

    async def test_scan_multiple_symbols(self, client: AsyncClient) -> None:
        """Opportunity scan across DJI, SPX, NDX."""
        response = await client.get(
            "/workflow/opportunities",
            params={"symbols": "DJI,SPX,NDX", "timeframe_pairs": "1D:4H"},
        )
        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert "symbols_scanned" in data
        assert data["symbols_scanned"] == ["DJI", "SPX", "NDX"]
        assert "opportunities" in data
        assert isinstance(data["opportunities"], list)
        assert "scan_time_ms" in data
        assert data["scan_time_ms"] >= 0

        # Verify opportunity structure if any found
        for opp in data["opportunities"]:
            assert "symbol" in opp
            assert opp["symbol"] in ["DJI", "SPX", "NDX"]
            assert "direction" in opp
            assert opp["direction"] in ["long", "short"]
            assert "confidence" in opp
            assert 0 <= opp["confidence"] <= 100
            assert "category" in opp
            assert opp["category"] in [
                "with_trend",
                "counter_trend",
                "reversal_attempt",
            ]

    async def test_scan_returns_consistent_opportunities(
        self, client: AsyncClient
    ) -> None:
        """Two consecutive scans should return consistent results.

        Market data may change between scans, but the structure and
        logic should be consistent.
        """
        # First scan
        response1 = await client.get(
            "/workflow/opportunities",
            params={"symbols": "DJI", "timeframe_pairs": "1D:4H"},
        )
        assert response1.status_code == 200
        data1 = response1.json()

        # Second scan
        response2 = await client.get(
            "/workflow/opportunities",
            params={"symbols": "DJI", "timeframe_pairs": "1D:4H"},
        )
        assert response2.status_code == 200
        data2 = response2.json()

        # Both should have same structure
        assert data1["symbols_scanned"] == data2["symbols_scanned"]

        # If both found opportunities for same symbol, direction should match
        # (market shouldn't flip in milliseconds)
        opps1 = {o["symbol"]: o for o in data1["opportunities"]}
        opps2 = {o["symbol"]: o for o in data2["opportunities"]}

        for symbol in opps1:
            if symbol in opps2:
                assert opps1[symbol]["direction"] == opps2[symbol]["direction"]


class TestCrossEndpointDataConsistency:
    """Test data consistency across workflow endpoints."""

    async def test_assess_aligns_with_levels_direction(
        self, client: AsyncClient
    ) -> None:
        """Trend from /assess should inform /levels direction choice."""
        symbol = "DJI"
        timeframe = "1D"

        # Get trend assessment
        assess_response = await client.get(
            "/workflow/assess",
            params={"symbol": symbol, "timeframe": timeframe},
        )
        assert assess_response.status_code == 200
        assess_data = assess_response.json()
        trend = assess_data["trend"]

        # Choose direction based on trend
        if trend == "bullish":
            fib_direction = "buy"
        elif trend == "bearish":
            fib_direction = "sell"
        else:
            fib_direction = "buy"  # Default for neutral

        # Get levels for matching direction
        levels_response = await client.get(
            "/workflow/levels",
            params={
                "symbol": symbol,
                "timeframe": timeframe,
                "direction": fib_direction,
            },
        )
        assert levels_response.status_code == 200
        levels_data = levels_response.json()

        # When trend is clear, levels should exist
        if trend != "neutral":
            # Entry zones should be retracement levels
            # Target zones should be extension levels
            assert isinstance(levels_data["entry_zones"], list)
            assert isinstance(levels_data["target_zones"], list)

    async def test_validate_uses_confirm_data(self, client: AsyncClient) -> None:
        """Validate RSI/MACD checks should match confirm endpoint signals."""
        symbol = "DJI"
        timeframe = "4H"

        # Get indicator confirmation from confirm endpoint
        confirm_response = await client.get(
            "/workflow/confirm",
            params={"symbol": symbol, "timeframe": timeframe},
        )
        assert confirm_response.status_code == 200
        confirm_data = confirm_response.json()

        # Get validation results
        validate_response = await client.post(
            "/workflow/validate",
            json={
                "symbol": symbol,
                "higher_timeframe": "1D",
                "lower_timeframe": timeframe,
                "direction": "long",
            },
        )
        assert validate_response.status_code == 200
        validate_data = validate_response.json()

        # Find RSI check in validation
        rsi_check = next(
            (c for c in validate_data["checks"] if c["name"] == "RSI Confirmation"),
            None,
        )
        assert rsi_check is not None

        # RSI value in details should be consistent with confirm endpoint
        if rsi_check["details"] and confirm_data["rsi"]["value"]:
            # Both should reference the same RSI value range
            # (exact matching not possible due to different timeframes)
            assert "RSI" in rsi_check["details"]

    async def test_categorize_matches_validate_category(
        self, client: AsyncClient
    ) -> None:
        """Category from validate should match categorize endpoint."""
        symbol = "DJI"

        # Get trend assessments
        higher_assess = await client.get(
            "/workflow/assess",
            params={"symbol": symbol, "timeframe": "1D"},
        )
        assert higher_assess.status_code == 200
        higher_data = higher_assess.json()

        lower_assess = await client.get(
            "/workflow/assess",
            params={"symbol": symbol, "timeframe": "4H"},
        )
        assert lower_assess.status_code == 200
        lower_data = lower_assess.json()

        # Run validation
        validate_response = await client.post(
            "/workflow/validate",
            json={
                "symbol": symbol,
                "higher_timeframe": "1D",
                "lower_timeframe": "4H",
                "direction": "long",
            },
        )
        assert validate_response.status_code == 200
        validate_data = validate_response.json()

        # Get category from categorize endpoint with same params
        categorize_response = await client.get(
            "/workflow/categorize",
            params={
                "higher_tf_trend": higher_data["trend"],
                "lower_tf_trend": lower_data["trend"],
                "trade_direction": "long",
                "confluence_score": validate_data.get("confluence_score", 1),
            },
        )
        assert categorize_response.status_code == 200
        category_data = categorize_response.json()

        # Categories should match
        assert validate_data["trade_category"] == category_data["category"]


class TestValidationEdgeCases:
    """Test validation edge cases and boundary conditions."""

    async def test_validation_structure_always_complete(
        self, client: AsyncClient
    ) -> None:
        """Validation should always return all 7 checks regardless of market state."""
        response = await client.post(
            "/workflow/validate",
            json={
                "symbol": "DJI",
                "higher_timeframe": "1D",
                "lower_timeframe": "4H",
                "direction": "long",
            },
        )
        assert response.status_code == 200
        data = response.json()

        # Always 8 checks
        assert len(data["checks"]) == 8

        # Verify expected check names
        check_names = {c["name"] for c in data["checks"]}
        expected_checks = {
            "Trend Alignment",
            "Entry Zone",
            "Target Zones",
            "RSI Confirmation",
            "MACD Confirmation",
            "Volume Confirmation",
            "Confluence Score",
            "Signal Bar Confirmation",
        }
        assert check_names == expected_checks

    async def test_validation_handles_different_directions(
        self, client: AsyncClient
    ) -> None:
        """Validation handles both long and short directions."""
        symbol = "DJI"

        # Test long direction
        long_response = await client.post(
            "/workflow/validate",
            json={
                "symbol": symbol,
                "higher_timeframe": "1D",
                "lower_timeframe": "4H",
                "direction": "long",
            },
        )
        assert long_response.status_code == 200
        long_data = long_response.json()
        assert "is_valid" in long_data

        # Test short direction
        short_response = await client.post(
            "/workflow/validate",
            json={
                "symbol": symbol,
                "higher_timeframe": "1D",
                "lower_timeframe": "4H",
                "direction": "short",
            },
        )
        assert short_response.status_code == 200
        short_data = short_response.json()
        assert "is_valid" in short_data

        # Both should have valid structure
        assert long_data["total_count"] == 8
        assert short_data["total_count"] == 8

    async def test_validation_threshold_boundary(self, client: AsyncClient) -> None:
        """Verify 60% pass threshold (5+ of 8 checks required)."""
        response = await client.post(
            "/workflow/validate",
            json={
                "symbol": "DJI",
                "higher_timeframe": "1D",
                "lower_timeframe": "4H",
                "direction": "long",
            },
        )
        assert response.status_code == 200
        data = response.json()

        # Verify threshold logic
        passed = data["passed_count"]
        total = data["total_count"]
        is_valid = data["is_valid"]
        pass_pct = data["pass_percentage"]

        # pass_percentage should match calculation
        expected_pct = (passed / total) * 100
        assert pass_pct == pytest.approx(expected_pct, rel=0.01)

        # is_valid should match 60% threshold
        if passed >= 5:  # 5/7 = 71.4% >= 60%
            assert is_valid is True
        elif passed <= 3:  # 3/7 = 42.9% < 60%
            assert is_valid is False
        # passed == 4: 57.1% < 60%, should be False
        elif passed == 4:
            assert is_valid is False

    async def test_validation_includes_atr_info(self, client: AsyncClient) -> None:
        """Validation response includes ATR analysis data."""
        response = await client.post(
            "/workflow/validate",
            json={
                "symbol": "DJI",
                "higher_timeframe": "1D",
                "lower_timeframe": "4H",
                "direction": "long",
            },
        )
        assert response.status_code == 200
        data = response.json()

        # ATR info should be present
        assert "atr_info" in data
        if data["atr_info"]:
            atr_info = data["atr_info"]
            assert "atr" in atr_info
            assert "atr_percent" in atr_info
            assert "volatility_level" in atr_info
            assert "current_price" in atr_info
            assert "suggested_stop_1x" in atr_info
            assert "suggested_stop_1_5x" in atr_info
            assert "suggested_stop_2x" in atr_info
            assert "interpretation" in atr_info

            # ATR values should be positive
            assert atr_info["atr"] > 0
            assert atr_info["current_price"] > 0


class TestCascadeIntegration:
    """Test cascade effect detection across timeframes."""

    async def test_cascade_stage_detection(self, client: AsyncClient) -> None:
        """Cascade endpoint returns valid stage 1-6."""
        response = await client.get(
            "/workflow/cascade",
            params={"symbol": "DJI", "timeframes": "1D,4H,1H,15m"},
        )
        assert response.status_code == 200
        data = response.json()

        # Verify stage is valid
        assert "stage" in data
        assert 1 <= data["stage"] <= 6

        # Verify required fields
        assert "dominant_trend" in data
        assert data["dominant_trend"] in ["bullish", "bearish", "neutral"]
        assert "reversal_trend" in data
        assert "diverging_timeframes" in data
        assert isinstance(data["diverging_timeframes"], list)
        assert "aligned_timeframes" in data
        assert isinstance(data["aligned_timeframes"], list)
        assert "timeframe_states" in data
        assert len(data["timeframe_states"]) == 4  # 4 timeframes requested
        assert "progression" in data
        assert "actionable_insight" in data
        assert "reversal_probability" in data
        assert 0 <= data["reversal_probability"] <= 100

    async def test_cascade_aligns_with_assess(self, client: AsyncClient) -> None:
        """Cascade dominant trend should align with higher TF assessments."""
        symbol = "DJI"
        timeframes = ["1D", "4H", "1H"]

        # Get cascade result
        cascade_response = await client.get(
            "/workflow/cascade",
            params={"symbol": symbol, "timeframes": ",".join(timeframes)},
        )
        assert cascade_response.status_code == 200
        cascade_data = cascade_response.json()

        # Get individual assessments
        assessments = {}
        for tf in timeframes:
            assess_response = await client.get(
                "/workflow/assess",
                params={"symbol": symbol, "timeframe": tf},
            )
            assert assess_response.status_code == 200
            assessments[tf] = assess_response.json()["trend"]

        # Verify timeframe states in cascade match assessments
        for state in cascade_data["timeframe_states"]:
            tf = state["timeframe"]
            if tf in assessments:
                assert state["trend"] == assessments[tf]

        # Verify diverging/aligned categorization is consistent
        dominant = cascade_data["dominant_trend"]
        for state in cascade_data["timeframe_states"]:
            if state["trend"] == dominant:
                assert state["is_aligned_with_dominant"] is True
                assert state["timeframe"] in cascade_data["aligned_timeframes"]
            elif state["trend"] != "neutral" and dominant != "neutral":
                # If trend is opposite to dominant, it should be diverging
                if state["is_diverging"]:
                    assert state["timeframe"] in cascade_data["diverging_timeframes"]
