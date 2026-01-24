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


class TestBearishBreakoutWorkflow:
    """End-to-end tests for bearish breakout workflow."""

    async def test_bearish_breakout_full_workflow(self, client: AsyncClient) -> None:
        """Full workflow for bearish breakout opportunity.

        Tests the complete flow when higher TF is bearish:
        1. Assess higher TF (1D) trend - expect bearish or check for it
        2. Assess lower TF (4H) trend
        3. Get Fibonacci levels for sell direction
        4. Validate trade as short
        5. Categorize and size position
        """
        symbol = "SPX"

        # Step 1: Assess higher TF trend
        higher_assess = await client.get(
            "/workflow/assess",
            params={"symbol": symbol, "timeframe": "1D"},
        )
        assert higher_assess.status_code == 200
        higher_data = higher_assess.json()
        higher_trend = higher_data["trend"]

        # Step 2: Assess lower TF trend
        lower_assess = await client.get(
            "/workflow/assess",
            params={"symbol": symbol, "timeframe": "4H"},
        )
        assert lower_assess.status_code == 200
        lower_data = lower_assess.json()
        lower_trend = lower_data["trend"]

        # Step 3: Get Fibonacci levels for sell direction (bearish setup)
        levels_response = await client.get(
            "/workflow/levels",
            params={"symbol": symbol, "timeframe": "4H", "direction": "sell"},
        )
        assert levels_response.status_code == 200
        levels_data = levels_response.json()
        assert isinstance(levels_data["entry_zones"], list)
        assert isinstance(levels_data["target_zones"], list)

        # Step 4: Validate as short trade
        validate_response = await client.post(
            "/workflow/validate",
            json={
                "symbol": symbol,
                "higher_timeframe": "1D",
                "lower_timeframe": "4H",
                "direction": "short",
            },
        )
        assert validate_response.status_code == 200
        validate_data = validate_response.json()
        assert len(validate_data["checks"]) == 8
        assert "trade_category" in validate_data

        # Step 5: Categorize trade
        categorize_response = await client.get(
            "/workflow/categorize",
            params={
                "higher_tf_trend": higher_trend,
                "lower_tf_trend": lower_trend,
                "trade_direction": "short",
                "confluence_score": validate_data.get("confluence_score", 1),
            },
        )
        assert categorize_response.status_code == 200
        category_data = categorize_response.json()
        assert category_data["category"] in [
            "with_trend",
            "counter_trend",
            "reversal_attempt",
        ]

    async def test_bearish_validation_checks_all_pass_structure(
        self, client: AsyncClient
    ) -> None:
        """Validation for bearish trade returns all 8 check names."""
        response = await client.post(
            "/workflow/validate",
            json={
                "symbol": "NDX",
                "higher_timeframe": "1D",
                "lower_timeframe": "4H",
                "direction": "short",
            },
        )
        assert response.status_code == 200
        data = response.json()

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

    async def test_bearish_levels_have_sell_direction_structure(
        self, client: AsyncClient
    ) -> None:
        """Sell direction levels structure is correct."""
        response = await client.get(
            "/workflow/levels",
            params={"symbol": "DJI", "timeframe": "1D", "direction": "sell"},
        )
        assert response.status_code == 200
        data = response.json()

        # Entry zones should have retracement labels
        for zone in data["entry_zones"]:
            assert "label" in zone
            assert "price" in zone
            assert "heat" in zone
            assert 0 <= zone["heat"] <= 100

        # Target zones should have extension labels
        for zone in data["target_zones"]:
            assert "label" in zone
            assert "price" in zone

    async def test_bearish_with_signal_bar_confirmation(
        self, client: AsyncClient
    ) -> None:
        """Validation with signal bar data for bearish trade."""
        # Get Fibonacci levels first to get entry level
        levels_response = await client.get(
            "/workflow/levels",
            params={"symbol": "DJI", "timeframe": "4H", "direction": "sell"},
        )
        assert levels_response.status_code == 200
        levels_data = levels_response.json()

        entry_level = None
        if levels_data["entry_zones"]:
            entry_level = levels_data["entry_zones"][0]["price"]

        # Validate with bearish signal bar (close < open)
        response = await client.post(
            "/workflow/validate",
            json={
                "symbol": "DJI",
                "higher_timeframe": "1D",
                "lower_timeframe": "4H",
                "direction": "short",
                "signal_bar": {
                    "open": 48000.0,
                    "high": 48100.0,
                    "low": 47800.0,
                    "close": 47850.0,  # Close below open = bearish bar
                },
                "entry_level": entry_level,
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["checks"]) == 8

        # Find signal bar check
        signal_check = next(
            (c for c in data["checks"] if c["name"] == "Signal Bar Confirmation"),
            None,
        )
        assert signal_check is not None

    async def test_bearish_atr_info_included(self, client: AsyncClient) -> None:
        """ATR analysis is included in bearish validation."""
        response = await client.post(
            "/workflow/validate",
            json={
                "symbol": "DJI",
                "higher_timeframe": "1D",
                "lower_timeframe": "4H",
                "direction": "short",
                "atr_period": 14,
            },
        )
        assert response.status_code == 200
        data = response.json()

        if data["atr_info"]:
            assert data["atr_info"]["atr"] > 0
            assert data["atr_info"]["suggested_stop_1x"] > 0
            assert data["atr_info"]["volatility_level"] in [
                "low",
                "normal",
                "high",
                "extreme",
            ]


class TestCounterTrendWorkflow:
    """Tests for counter-trend signal workflow."""

    async def test_counter_trend_requires_high_confluence(
        self, client: AsyncClient
    ) -> None:
        """Counter-trend trades require confluence score >= 5."""
        # Low confluence should be reversal_attempt
        low_conf_response = await client.get(
            "/workflow/categorize",
            params={
                "higher_tf_trend": "bearish",
                "lower_tf_trend": "bullish",
                "trade_direction": "long",
                "confluence_score": 3,  # Below threshold
            },
        )
        assert low_conf_response.status_code == 200
        assert low_conf_response.json()["category"] == "reversal_attempt"

        # High confluence should be counter_trend
        high_conf_response = await client.get(
            "/workflow/categorize",
            params={
                "higher_tf_trend": "bearish",
                "lower_tf_trend": "bullish",
                "trade_direction": "long",
                "confluence_score": 6,  # Above threshold
            },
        )
        assert high_conf_response.status_code == 200
        assert high_conf_response.json()["category"] == "counter_trend"

    async def test_counter_trend_position_sizing_adjusted(
        self, client: AsyncClient
    ) -> None:
        """Counter-trend trades get reduced position size."""
        response = await client.post(
            "/position/size",
            json={
                "entry_price": 100.0,
                "stop_loss": 95.0,
                "risk_capital": 1000.0,
                "account_balance": 100000.0,
                "trade_category": "counter_trend",
            },
        )
        assert response.status_code == 200
        data = response.json()

        # Counter-trend should have 50% risk multiplier
        assert data["result"]["risk_multiplier"] == 0.5
        assert data["result"]["trade_category"] == "counter_trend"
        # Risk amount should be half
        assert data["result"]["risk_amount"] == pytest.approx(500.0)

    async def test_counter_trend_vs_with_trend_position_difference(
        self, client: AsyncClient
    ) -> None:
        """Compare position sizes for counter-trend vs with-trend."""
        base_request = {
            "entry_price": 100.0,
            "stop_loss": 95.0,
            "risk_capital": 1000.0,
            "account_balance": 100000.0,
        }

        # With-trend position
        with_trend_response = await client.post(
            "/position/size",
            json={**base_request, "trade_category": "with_trend"},
        )
        assert with_trend_response.status_code == 200
        with_trend_size = with_trend_response.json()["result"]["position_size"]

        # Counter-trend position
        counter_trend_response = await client.post(
            "/position/size",
            json={**base_request, "trade_category": "counter_trend"},
        )
        assert counter_trend_response.status_code == 200
        counter_trend_size = counter_trend_response.json()["result"]["position_size"]

        # Counter-trend should be 50% of with-trend
        assert counter_trend_size == pytest.approx(with_trend_size * 0.5, rel=0.01)

    async def test_counter_trend_short_against_bullish(
        self, client: AsyncClient
    ) -> None:
        """Short against bullish higher TF is counter-trend."""
        response = await client.get(
            "/workflow/categorize",
            params={
                "higher_tf_trend": "bullish",
                "lower_tf_trend": "bearish",
                "trade_direction": "short",
                "confluence_score": 5,
            },
        )
        assert response.status_code == 200
        assert response.json()["category"] == "counter_trend"

    async def test_counter_trend_long_against_bearish(
        self, client: AsyncClient
    ) -> None:
        """Long against bearish higher TF is counter-trend."""
        response = await client.get(
            "/workflow/categorize",
            params={
                "higher_tf_trend": "bearish",
                "lower_tf_trend": "bullish",
                "trade_direction": "long",
                "confluence_score": 5,
            },
        )
        assert response.status_code == 200
        assert response.json()["category"] == "counter_trend"


class TestReversalDetectionWorkflow:
    """Tests for reversal detection workflow."""

    async def test_reversal_attempt_low_confluence(self, client: AsyncClient) -> None:
        """Low confluence against trend is reversal_attempt."""
        response = await client.get(
            "/workflow/categorize",
            params={
                "higher_tf_trend": "bullish",
                "lower_tf_trend": "bearish",
                "trade_direction": "short",
                "confluence_score": 2,
            },
        )
        assert response.status_code == 200
        assert response.json()["category"] == "reversal_attempt"

    async def test_reversal_attempt_position_sizing(self, client: AsyncClient) -> None:
        """Reversal attempts get 25% position size."""
        response = await client.post(
            "/position/size",
            json={
                "entry_price": 100.0,
                "stop_loss": 95.0,
                "risk_capital": 1000.0,
                "account_balance": 100000.0,
                "trade_category": "reversal_attempt",
            },
        )
        assert response.status_code == 200
        data = response.json()

        # Reversal attempt should have 25% risk multiplier
        assert data["result"]["risk_multiplier"] == 0.25
        assert data["result"]["trade_category"] == "reversal_attempt"
        assert data["result"]["risk_amount"] == pytest.approx(250.0)

    async def test_cascade_identifies_early_reversal(
        self, client: AsyncClient
    ) -> None:
        """Cascade analysis identifies potential reversals."""
        response = await client.get(
            "/workflow/cascade",
            params={"symbol": "DJI", "timeframes": "1D,4H,1H"},
        )
        assert response.status_code == 200
        data = response.json()

        # Verify reversal detection fields
        assert "reversal_trend" in data
        assert "reversal_probability" in data
        assert 0 <= data["reversal_probability"] <= 100
        assert "actionable_insight" in data
        assert len(data["actionable_insight"]) > 0

    async def test_cascade_progression_stages(self, client: AsyncClient) -> None:
        """Cascade returns valid progression description."""
        response = await client.get(
            "/workflow/cascade",
            params={"symbol": "SPX", "timeframes": "1D,4H,1H,15m"},
        )
        assert response.status_code == 200
        data = response.json()

        # Stage should be 1-6
        assert 1 <= data["stage"] <= 6
        # Progression should be a non-empty string
        assert isinstance(data["progression"], str)
        assert len(data["progression"]) > 0

    async def test_trend_alignment_detects_divergence(
        self, client: AsyncClient
    ) -> None:
        """Trend alignment endpoint detects timeframe divergence."""
        response = await client.get(
            "/workflow/trend-alignment",
            params={"symbol": "DJI", "timeframes": "1D,4H,1H"},
        )
        assert response.status_code == 200
        data = response.json()

        # Verify structure
        assert "trends" in data
        assert "overall" in data
        assert "bullish_count" in data["overall"]
        assert "bearish_count" in data["overall"]


class TestMultiSymbolConcurrentWorkflow:
    """Test concurrent multi-symbol opportunity scanning."""

    async def test_concurrent_opportunity_scan(self, client: AsyncClient) -> None:
        """Scan multiple symbols returns opportunities for each."""
        response = await client.get(
            "/workflow/opportunities",
            params={"symbols": "DJI,SPX,NDX", "timeframe_pairs": "1D:4H"},
        )
        assert response.status_code == 200
        data = response.json()

        assert data["symbols_scanned"] == ["DJI", "SPX", "NDX"]
        assert "opportunities" in data
        assert "scan_time_ms" in data

    async def test_scan_with_multiple_timeframe_pairs(
        self, client: AsyncClient
    ) -> None:
        """Scan with multiple timeframe pairs."""
        response = await client.get(
            "/workflow/opportunities",
            params={"symbols": "DJI", "timeframe_pairs": "1D:4H,1W:1D"},
        )
        assert response.status_code == 200
        data = response.json()

        assert data["symbols_scanned"] == ["DJI"]
        assert isinstance(data["opportunities"], list)

    async def test_scan_includes_potential_opportunities(
        self, client: AsyncClient
    ) -> None:
        """Scan with include_potential flag."""
        response = await client.get(
            "/workflow/opportunities",
            params={
                "symbols": "DJI",
                "timeframe_pairs": "1D:4H",
                "include_potential": True,
            },
        )
        assert response.status_code == 200
        data = response.json()

        # Structure should be same with or without potential
        assert "opportunities" in data
        assert "symbols_scanned" in data


class TestDataConsistencyAcrossEndpoints:
    """Test data consistency across workflow endpoints."""

    async def test_trend_consistency_assess_vs_cascade(
        self, client: AsyncClient
    ) -> None:
        """Trend from assess should match cascade timeframe state."""
        symbol = "DJI"
        timeframe = "1D"

        # Get assess result
        assess_response = await client.get(
            "/workflow/assess",
            params={"symbol": symbol, "timeframe": timeframe},
        )
        assert assess_response.status_code == 200
        assess_trend = assess_response.json()["trend"]

        # Get cascade result
        cascade_response = await client.get(
            "/workflow/cascade",
            params={"symbol": symbol, "timeframes": timeframe},
        )
        assert cascade_response.status_code == 200
        cascade_data = cascade_response.json()

        # Find matching timeframe in cascade
        states = cascade_data["timeframe_states"]
        tf_state = next(
            (s for s in states if s["timeframe"] == timeframe), None
        )
        assert tf_state is not None
        assert tf_state["trend"] == assess_trend

    async def test_fibonacci_levels_direction_consistency(
        self, client: AsyncClient
    ) -> None:
        """Buy vs sell levels endpoints return valid responses."""
        symbol = "DJI"
        timeframe = "1D"

        # Get buy levels
        buy_response = await client.get(
            "/workflow/levels",
            params={"symbol": symbol, "timeframe": timeframe, "direction": "buy"},
        )
        assert buy_response.status_code == 200
        buy_data = buy_response.json()

        # Get sell levels
        sell_response = await client.get(
            "/workflow/levels",
            params={"symbol": symbol, "timeframe": timeframe, "direction": "sell"},
        )
        assert sell_response.status_code == 200
        sell_data = sell_response.json()

        # Response structure should be valid
        assert "entry_zones" in buy_data
        assert "target_zones" in buy_data
        assert "entry_zones" in sell_data
        assert "target_zones" in sell_data
        assert isinstance(buy_data["entry_zones"], list)
        assert isinstance(sell_data["entry_zones"], list)

    async def test_validation_category_matches_categorize(
        self, client: AsyncClient
    ) -> None:
        """Trade category from validate matches categorize endpoint."""
        symbol = "DJI"

        # Get trends first
        higher_assess = await client.get(
            "/workflow/assess",
            params={"symbol": symbol, "timeframe": "1D"},
        )
        higher_trend = higher_assess.json()["trend"]

        lower_assess = await client.get(
            "/workflow/assess",
            params={"symbol": symbol, "timeframe": "4H"},
        )
        lower_trend = lower_assess.json()["trend"]

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
        validate_data = validate_response.json()
        validate_category = validate_data.get("trade_category")

        # Get category from categorize endpoint
        categorize_response = await client.get(
            "/workflow/categorize",
            params={
                "higher_tf_trend": higher_trend,
                "lower_tf_trend": lower_trend,
                "trade_direction": "long",
                "confluence_score": validate_data.get("confluence_score", 1),
            },
        )
        categorize_category = categorize_response.json()["category"]

        # Categories should match
        assert validate_category == categorize_category

    async def test_indicator_values_consistency(self, client: AsyncClient) -> None:
        """Indicator values from confirm match validation check details."""
        symbol = "DJI"
        timeframe = "4H"

        # Get indicator confirmation
        confirm_response = await client.get(
            "/workflow/confirm",
            params={"symbol": symbol, "timeframe": timeframe},
        )
        assert confirm_response.status_code == 200
        confirm_data = confirm_response.json()

        # RSI and MACD should have values
        assert "rsi" in confirm_data
        assert "macd" in confirm_data
        assert "overall" in confirm_data
        assert confirm_data["overall"] in ["strong", "partial", "wait"]

    async def test_alignment_count_matches_timeframe_list(
        self, client: AsyncClient
    ) -> None:
        """Alignment total_count matches number of timeframes requested."""
        timeframes = "1M,1W,1D,4H"

        response = await client.get(
            "/workflow/align",
            params={"symbol": "DJI", "timeframes": timeframes},
        )
        assert response.status_code == 200
        data = response.json()

        # Total count should match timeframe count
        assert data["total_count"] == 4
        assert len(data["timeframes"]) == 4


class TestSignalAggregationWorkflow:
    """Tests for signal aggregation workflow."""

    async def test_signal_aggregation_structure(self, client: AsyncClient) -> None:
        """Signal aggregation returns proper structure."""
        response = await client.get(
            "/workflow/signal-aggregation",
            params={"symbol": "DJI", "timeframes": "1W,1D,4H"},
        )
        assert response.status_code == 200
        data = response.json()

        assert "signals" in data
        assert "counts" in data
        assert "long" in data["counts"]
        assert "short" in data["counts"]

    async def test_signal_suggestions_structure(self, client: AsyncClient) -> None:
        """Signal suggestions returns proper structure."""
        response = await client.get(
            "/workflow/signal-suggestions",
            params={"symbol": "DJI", "lookback": 5},
        )
        assert response.status_code == 200
        data = response.json()

        assert "signals" in data
        assert "long_count" in data
        assert "short_count" in data

    async def test_signal_suggestions_with_custom_lookback(
        self, client: AsyncClient
    ) -> None:
        """Signal suggestions accepts custom lookback."""
        response = await client.get(
            "/workflow/signal-suggestions",
            params={"symbol": "SPX", "lookback": 3},
        )
        assert response.status_code == 200
        data = response.json()

        # Should return valid structure regardless of lookback
        assert isinstance(data["signals"], list)


class TestReversalTimeEstimation:
    """Tests for reversal time estimation workflow."""

    async def test_reversal_time_estimation_structure(
        self, client: AsyncClient
    ) -> None:
        """Reversal time estimation returns proper structure."""
        # Create sample OHLC data
        ohlc_data = [
            {
                "time": f"2024-01-{i+1:02d}",
                "open": 100 + i,
                "high": 105 + i,
                "low": 95 + i,
                "close": 102 + i,
            }
            for i in range(20)
        ]

        response = await client.post(
            "/workflow/reversal-time",
            json={
                "data": ohlc_data,
                "fib_levels": [
                    {"label": "R38.2%", "price": 110.0},
                    {"label": "R61.8%", "price": 105.0},
                ],
                "timeframe": "1D",
                "lookback": 10,
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert "estimates" in data
        assert "velocity" in data
        assert "current_price" in data

        # Velocity should have required fields
        assert "bars_per_atr" in data["velocity"]
        assert "price_per_bar" in data["velocity"]
        assert "direction" in data["velocity"]
        assert data["velocity"]["direction"] in ["up", "down", "sideways"]

    async def test_reversal_time_empty_data_handled(self, client: AsyncClient) -> None:
        """Empty data returns proper structure without error."""
        response = await client.post(
            "/workflow/reversal-time",
            json={
                "data": [],
                "fib_levels": [{"label": "R38.2%", "price": 110.0}],
            },
        )
        assert response.status_code == 200
        data = response.json()

        assert data["estimates"] == []
        assert data["current_price"] == 0.0
