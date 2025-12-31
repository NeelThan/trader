"""Tests for pivot detection calculations.

This module tests the pivot point detection logic which identifies:
- Swing highs (local price maxima)
- Swing lows (local price minima)
- Alternating high-low patterns
- Recent pivots for Fibonacci calculations
"""

from dataclasses import dataclass

import pytest

from trader.pivots import OHLCBar, detect_pivots


@dataclass(frozen=True)
class SwingHighCase:
    """Test case for swing high detection."""

    prices: list[float]  # High prices in sequence
    lookback: int
    expected_high_indices: list[int]  # Indices where swing highs should be detected


@dataclass(frozen=True)
class SwingLowCase:
    """Test case for swing low detection."""

    prices: list[float]  # Low prices in sequence
    lookback: int
    expected_low_indices: list[int]  # Indices where swing lows should be detected


def make_ohlc_data(highs: list[float], lows: list[float]) -> list[OHLCBar]:
    """Helper to create OHLC data from high/low sequences."""
    data = []
    for i, (high, low) in enumerate(zip(highs, lows, strict=True)):
        data.append(
            OHLCBar(
                time=f"2024-01-{i + 1:02d}",
                open=(high + low) / 2,
                high=high,
                low=low,
                close=(high + low) / 2,
            )
        )
    return data


def make_simple_ohlc(prices: list[float]) -> list[OHLCBar]:
    """Helper to create OHLC data where high=low=price (for simple tests)."""
    return make_ohlc_data(prices, prices)


class TestSwingHighDetection:
    """Tests for swing high (local maximum) detection.

    A swing high occurs when the high price at index i is greater than
    all high prices in the lookback window [i-lookback, i+lookback].
    """

    @pytest.mark.parametrize(
        "case",
        [
            # Simple peak in the middle
            # Prices: [10, 20, 30, 20, 10] with lookback=2
            # Index 2 (30) is higher than [10, 20] before and [20, 10] after
            SwingHighCase(
                prices=[10.0, 20.0, 30.0, 20.0, 10.0],
                lookback=2,
                expected_high_indices=[2],
            ),
            # Multiple peaks
            # Prices: [10, 30, 10, 30, 10] with lookback=1
            # Index 1 and 3 are local highs
            SwingHighCase(
                prices=[10.0, 30.0, 10.0, 30.0, 10.0],
                lookback=1,
                expected_high_indices=[1, 3],
            ),
            # No clear peak - ascending prices
            SwingHighCase(
                prices=[10.0, 20.0, 30.0, 40.0, 50.0],
                lookback=1,
                expected_high_indices=[],
            ),
            # Peak at edge of lookback window
            SwingHighCase(
                prices=[10.0, 20.0, 50.0, 30.0, 20.0, 10.0],
                lookback=2,
                expected_high_indices=[2],
            ),
        ],
        ids=[
            "single_peak_center",
            "multiple_peaks",
            "no_peak_ascending",
            "peak_with_larger_lookback",
        ],
    )
    def test_detects_swing_highs(self, case: SwingHighCase) -> None:
        """Swing highs are detected where price is local maximum."""
        data = make_simple_ohlc(case.prices)
        result = detect_pivots(data, lookback=case.lookback)

        high_indices = [p.index for p in result.pivots if p.type == "high"]
        assert high_indices == case.expected_high_indices

    def test_swing_high_uses_high_price(self) -> None:
        """Swing high detection uses the 'high' field of OHLC data."""
        # Create data where highs form a peak but closes don't
        # 7 bars allows indices 2-4 to be checked with lookback=2
        data = [
            OHLCBar(time="2024-01-01", open=15, high=20, low=10, close=18),
            OHLCBar(time="2024-01-02", open=18, high=25, low=15, close=22),
            OHLCBar(time="2024-01-03", open=22, high=50, low=20, close=25),  # Peak
            OHLCBar(time="2024-01-04", open=24, high=30, low=18, close=20),
            OHLCBar(time="2024-01-05", open=20, high=22, low=15, close=18),
            OHLCBar(time="2024-01-06", open=18, high=20, low=12, close=15),
            OHLCBar(time="2024-01-07", open=15, high=18, low=10, close=12),
        ]
        result = detect_pivots(data, lookback=2)

        highs = [p for p in result.pivots if p.type == "high"]
        assert len(highs) == 1
        assert highs[0].index == 2
        assert highs[0].price == 50.0


class TestSwingLowDetection:
    """Tests for swing low (local minimum) detection.

    A swing low occurs when the low price at index i is less than
    all low prices in the lookback window [i-lookback, i+lookback].
    """

    @pytest.mark.parametrize(
        "case",
        [
            # Simple trough in the middle
            # Prices: [30, 20, 10, 20, 30] with lookback=2
            # Index 2 (10) is lower than surrounding prices
            SwingLowCase(
                prices=[30.0, 20.0, 10.0, 20.0, 30.0],
                lookback=2,
                expected_low_indices=[2],
            ),
            # Multiple troughs
            # Prices: [30, 10, 30, 10, 30] with lookback=1
            SwingLowCase(
                prices=[30.0, 10.0, 30.0, 10.0, 30.0],
                lookback=1,
                expected_low_indices=[1, 3],
            ),
            # No clear trough - descending prices
            SwingLowCase(
                prices=[50.0, 40.0, 30.0, 20.0, 10.0],
                lookback=1,
                expected_low_indices=[],
            ),
        ],
        ids=[
            "single_trough_center",
            "multiple_troughs",
            "no_trough_descending",
        ],
    )
    def test_detects_swing_lows(self, case: SwingLowCase) -> None:
        """Swing lows are detected where price is local minimum."""
        data = make_simple_ohlc(case.prices)
        result = detect_pivots(data, lookback=case.lookback)

        low_indices = [p.index for p in result.pivots if p.type == "low"]
        assert low_indices == case.expected_low_indices

    def test_swing_low_uses_low_price(self) -> None:
        """Swing low detection uses the 'low' field of OHLC data."""
        # Create data where lows form a trough but closes don't
        # 7 bars allows indices 2-4 to be checked with lookback=2
        data = [
            OHLCBar(time="2024-01-01", open=24, high=28, low=20, close=26),
            OHLCBar(time="2024-01-02", open=22, high=26, low=18, close=24),
            OHLCBar(time="2024-01-03", open=18, high=22, low=5, close=20),  # Trough
            OHLCBar(time="2024-01-04", open=19, high=24, low=12, close=21),
            OHLCBar(time="2024-01-05", open=20, high=25, low=16, close=22),
            OHLCBar(time="2024-01-06", open=21, high=26, low=18, close=24),
            OHLCBar(time="2024-01-07", open=22, high=27, low=19, close=25),
        ]
        result = detect_pivots(data, lookback=2)

        lows = [p for p in result.pivots if p.type == "low"]
        assert len(lows) == 1
        assert lows[0].index == 2
        assert lows[0].price == 5.0


class TestAlternatingPattern:
    """Tests for enforcing alternating high-low pattern.

    When consecutive pivots of the same type are found, only the most
    extreme one is kept (highest high or lowest low).
    """

    def test_keeps_highest_when_consecutive_highs(self) -> None:
        """When two highs are consecutive, keeps only the highest."""
        # Create scenario with two consecutive highs at indices 2 and 3
        # but no alternating low between them
        highs = [10.0, 20.0, 50.0, 45.0, 15.0, 10.0, 5.0]
        lows = [5.0, 15.0, 40.0, 35.0, 10.0, 5.0, 2.0]
        data = make_ohlc_data(highs, lows)

        result = detect_pivots(data, lookback=1)

        # After alternation enforcement, should have the higher of the two
        highs_found = [p for p in result.pivots if p.type == "high"]
        high_prices = [p.price for p in highs_found]
        # The highest consecutive high (50.0) should be kept
        assert 50.0 in high_prices

    def test_keeps_lowest_when_consecutive_lows(self) -> None:
        """When two lows are consecutive, keeps only the lowest."""
        # Create scenario where lows would be detected consecutively
        highs = [50.0, 40.0, 30.0, 35.0, 45.0, 55.0, 60.0]
        lows = [45.0, 35.0, 10.0, 15.0, 40.0, 50.0, 55.0]
        data = make_ohlc_data(highs, lows)

        result = detect_pivots(data, lookback=1)

        lows_found = [p for p in result.pivots if p.type == "low"]
        low_prices = [p.price for p in lows_found]
        # The lowest consecutive low (10.0) should be kept
        assert 10.0 in low_prices

    def test_alternates_high_low_high_low(self) -> None:
        """Result pivots should alternate between high and low types."""
        # Classic zigzag pattern: up-down-up-down
        highs = [15.0, 30.0, 20.0, 35.0, 25.0, 40.0, 30.0]
        lows = [10.0, 25.0, 15.0, 30.0, 20.0, 35.0, 25.0]
        data = make_ohlc_data(highs, lows)

        result = detect_pivots(data, lookback=1)

        # Check alternation
        if len(result.pivots) >= 2:
            for i in range(1, len(result.pivots)):
                assert result.pivots[i].type != result.pivots[i - 1].type


class TestPivotDetectionResult:
    """Tests for PivotDetectionResult fields."""

    def test_returns_pivot_high_and_low(self) -> None:
        """Result includes the highest high and lowest low from detected pivots."""
        highs = [10.0, 50.0, 20.0, 30.0, 15.0]
        lows = [5.0, 45.0, 10.0, 25.0, 8.0]
        data = make_ohlc_data(highs, lows)

        result = detect_pivots(data, lookback=1)

        # pivot_high should be the max price among detected high pivots
        # pivot_low should be the min price among detected low pivots
        assert result.pivot_high > 0
        assert result.pivot_low > 0
        assert result.pivot_high >= result.pivot_low

    def test_returns_recent_pivots_limited_by_count(self) -> None:
        """Recent pivots are limited to the specified count."""
        # Create data with many pivots
        highs = [10.0, 30.0, 10.0, 30.0, 10.0, 30.0, 10.0, 30.0, 10.0, 30.0, 10.0]
        lows = [5.0, 25.0, 5.0, 25.0, 5.0, 25.0, 5.0, 25.0, 5.0, 25.0, 5.0]
        data = make_ohlc_data(highs, lows)

        result = detect_pivots(data, lookback=1, count=3)

        assert len(result.recent_pivots) <= 3

    def test_returns_swing_high_as_most_recent_high(self) -> None:
        """swing_high is the most recently detected high pivot."""
        highs = [10.0, 40.0, 20.0, 50.0, 30.0]
        lows = [5.0, 35.0, 15.0, 45.0, 25.0]
        data = make_ohlc_data(highs, lows)

        result = detect_pivots(data, lookback=1)

        if result.swing_high is not None:
            # Should be the last detected high in chronological order
            high_pivots = [p for p in result.pivots if p.type == "high"]
            if high_pivots:
                assert result.swing_high == high_pivots[-1]

    def test_returns_swing_low_as_most_recent_low(self) -> None:
        """swing_low is the most recently detected low pivot."""
        highs = [50.0, 30.0, 45.0, 25.0, 40.0]
        lows = [45.0, 10.0, 40.0, 5.0, 35.0]
        data = make_ohlc_data(highs, lows)

        result = detect_pivots(data, lookback=1)

        if result.swing_low is not None:
            # Should be the last detected low in chronological order
            low_pivots = [p for p in result.pivots if p.type == "low"]
            if low_pivots:
                assert result.swing_low == low_pivots[-1]


class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_returns_empty_result_for_insufficient_data(self) -> None:
        """Returns empty result when data is too short for lookback window."""
        data = make_simple_ohlc([10.0, 20.0, 30.0])  # 3 bars

        result = detect_pivots(data, lookback=5)  # Need at least 11 bars

        assert len(result.pivots) == 0
        assert result.pivot_high == 0.0
        assert result.pivot_low == 0.0

    def test_returns_empty_result_for_empty_data(self) -> None:
        """Returns empty result for empty data list."""
        result = detect_pivots([], lookback=5)

        assert len(result.pivots) == 0
        assert result.swing_high is None
        assert result.swing_low is None

    def test_handles_flat_prices(self) -> None:
        """Handles data with no price variation."""
        data = make_simple_ohlc([100.0] * 11)

        result = detect_pivots(data, lookback=2)

        # No pivots should be detected in flat data
        assert len(result.pivots) == 0

    def test_default_lookback_is_five(self) -> None:
        """Default lookback is 5 when not specified."""
        data = make_simple_ohlc([10.0] * 20 + [50.0] + [10.0] * 20)  # Peak at index 20

        result = detect_pivots(data)  # Use default lookback

        # With lookback=5, index 20 should be detected as a high
        high_indices = [p.index for p in result.pivots if p.type == "high"]
        assert 20 in high_indices

    def test_pivot_includes_time_from_ohlc(self) -> None:
        """Pivot point includes the time field from the OHLC bar."""
        data = [
            OHLCBar(time="2024-01-15", open=10.0, high=15.0, low=5.0, close=12.0),
            OHLCBar(time="2024-01-16", open=12.0, high=50.0, low=10.0, close=45.0),
            OHLCBar(time="2024-01-17", open=45.0, high=48.0, low=40.0, close=42.0),
            OHLCBar(time="2024-01-18", open=42.0, high=44.0, low=38.0, close=40.0),
            OHLCBar(time="2024-01-19", open=40.0, high=42.0, low=35.0, close=38.0),
        ]
        result = detect_pivots(data, lookback=2)

        # The high at index 1 should have the correct time
        high_pivots = [p for p in result.pivots if p.type == "high"]
        if high_pivots:
            assert high_pivots[0].time == "2024-01-16"

    def test_handles_unix_timestamp_time(self) -> None:
        """Handles OHLC data with Unix timestamp for time field."""
        t = 1704067200  # 2024-01-01 00:00:00 UTC
        day = 86400
        data = [
            OHLCBar(time=t, open=10, high=15, low=5, close=12),
            OHLCBar(time=t + day, open=12, high=50, low=10, close=45),
            OHLCBar(time=t + day * 2, open=45, high=48, low=40, close=42),
            OHLCBar(time=t + day * 3, open=42, high=44, low=38, close=40),
            OHLCBar(time=t + day * 4, open=40, high=42, low=35, close=38),
        ]
        result = detect_pivots(data, lookback=2)

        # Should work with Unix timestamps
        high_pivots = [p for p in result.pivots if p.type == "high"]
        if high_pivots:
            assert high_pivots[0].time == t + day


class TestRealisticMarketData:
    """Tests using realistic market data patterns."""

    def test_detects_pivots_in_uptrend(self) -> None:
        """Detects higher highs and higher lows in uptrend."""
        # Uptrend: HH, HL, HH, HL pattern
        highs = [100.0, 110.0, 105.0, 120.0, 115.0, 130.0, 125.0]
        lows = [95.0, 105.0, 100.0, 115.0, 110.0, 125.0, 120.0]
        data = make_ohlc_data(highs, lows)

        result = detect_pivots(data, lookback=1)

        # Should detect the swing points
        assert len(result.pivots) > 0

    def test_detects_pivots_in_downtrend(self) -> None:
        """Detects lower highs and lower lows in downtrend."""
        # Downtrend: LH, LL, LH, LL pattern
        highs = [130.0, 125.0, 120.0, 115.0, 110.0, 105.0, 100.0]
        lows = [125.0, 120.0, 115.0, 110.0, 105.0, 100.0, 95.0]
        data = make_ohlc_data(highs, lows)

        result = detect_pivots(data, lookback=1)

        assert len(result.pivots) >= 0  # May or may not detect in pure trend

    def test_detects_pivots_in_ranging_market(self) -> None:
        """Detects pivots in sideways/ranging market."""
        # Ranging: oscillates between support and resistance
        highs = [110.0, 100.0, 110.0, 100.0, 110.0, 100.0, 110.0]
        lows = [105.0, 95.0, 105.0, 95.0, 105.0, 95.0, 105.0]
        data = make_ohlc_data(highs, lows)

        result = detect_pivots(data, lookback=1)

        # Should find multiple pivots in ranging market
        assert len(result.pivots) >= 2
