"""Unit tests for velocity and time estimation calculations.

Tests cover:
- Calculate velocity (price change per bar, ATR-normalized)
- Estimate time to reach Fibonacci levels
- Handle various market conditions (uptrend, downtrend, sideways)
"""

from datetime import datetime

import pytest

from trader.velocity import (
    VelocityMetrics,
    calculate_velocity,
    estimate_reversal_times,
    estimate_time_to_level,
)


class TestCalculateVelocity:
    """Tests for velocity calculation."""

    def test_uptrend_velocity(self) -> None:
        """Should calculate positive velocity in uptrend."""
        # Price moving up: 100 -> 110 over 10 bars
        closes = [100.0 + i for i in range(11)]  # 100, 101, ..., 110
        highs = [c + 1 for c in closes]
        lows = [c - 1 for c in closes]

        metrics = calculate_velocity(closes, highs, lows, lookback=10)

        assert metrics.direction == "up"
        assert metrics.price_per_bar > 0
        assert metrics.price_per_bar == pytest.approx(1.0, rel=0.1)

    def test_downtrend_velocity(self) -> None:
        """Should calculate negative velocity in downtrend."""
        # Price moving down: 110 -> 100 over 10 bars
        closes = [110.0 - i for i in range(11)]  # 110, 109, ..., 100
        highs = [c + 1 for c in closes]
        lows = [c - 1 for c in closes]

        metrics = calculate_velocity(closes, highs, lows, lookback=10)

        assert metrics.direction == "down"
        assert metrics.price_per_bar < 0
        assert metrics.price_per_bar == pytest.approx(-1.0, rel=0.1)

    def test_sideways_velocity(self) -> None:
        """Should detect sideways when velocity is near zero."""
        # Price flat: all closes at 100
        closes = [100.0] * 15
        highs = [101.0] * 15
        lows = [99.0] * 15

        metrics = calculate_velocity(closes, highs, lows, lookback=10)

        assert metrics.direction == "sideways"
        assert abs(metrics.price_per_bar) < 0.1

    def test_velocity_with_atr_normalization(self) -> None:
        """Should provide ATR-normalized velocity (bars_per_atr)."""
        # Price moving 1 point per bar, ATR roughly 2 points
        closes = [100.0 + i for i in range(20)]
        highs = [c + 1 for c in closes]
        lows = [c - 1 for c in closes]

        metrics = calculate_velocity(closes, highs, lows, lookback=10, atr_period=14)

        assert metrics.bars_per_atr > 0  # Should take bars to move 1 ATR

    def test_velocity_consistency(self) -> None:
        """Should calculate consistency score (0-100)."""
        # Consistent uptrend
        closes = [100.0 + i for i in range(15)]
        highs = [c + 0.5 for c in closes]
        lows = [c - 0.5 for c in closes]

        metrics = calculate_velocity(closes, highs, lows, lookback=10)

        assert 0 <= metrics.consistency <= 100
        # Consistent trend should have high consistency
        assert metrics.consistency >= 50

    def test_velocity_insufficient_data(self) -> None:
        """Should handle insufficient data gracefully."""
        closes = [100.0, 101.0]  # Only 2 bars
        highs = [101.0, 102.0]
        lows = [99.0, 100.0]

        metrics = calculate_velocity(closes, highs, lows, lookback=10)

        assert metrics.direction == "sideways"
        assert metrics.price_per_bar == 0.0

    def test_velocity_empty_data(self) -> None:
        """Should handle empty data gracefully."""
        metrics = calculate_velocity([], [], [], lookback=10)

        assert metrics.direction == "sideways"
        assert metrics.price_per_bar == 0.0


class TestEstimateTimeToLevel:
    """Tests for time estimation to reach a level."""

    def test_estimate_bars_to_higher_level(self) -> None:
        """Should estimate bars to reach a higher price level."""
        current_price = 100.0
        target_price = 110.0
        velocity = VelocityMetrics(
            bars_per_atr=5.0,
            price_per_bar=1.0,  # 1 point per bar
            direction="up",
            consistency=80.0,
        )

        estimate = estimate_time_to_level(
            current_price, target_price, velocity, timeframe="1D"
        )

        assert estimate.estimated_bars == 10  # 10 points / 1 per bar = 10 bars
        assert estimate.target_price == 110.0
        assert estimate.confidence > 0

    def test_estimate_bars_to_lower_level(self) -> None:
        """Should estimate bars to reach a lower price level."""
        current_price = 100.0
        target_price = 90.0
        velocity = VelocityMetrics(
            bars_per_atr=5.0,
            price_per_bar=-2.0,  # -2 points per bar (downtrend)
            direction="down",
            consistency=75.0,
        )

        estimate = estimate_time_to_level(
            current_price, target_price, velocity, timeframe="1D"
        )

        assert estimate.estimated_bars == 5  # 10 points / 2 per bar = 5 bars
        assert estimate.confidence > 0

    def test_estimate_with_wrong_direction(self) -> None:
        """Should return high bar count when moving away from target."""
        current_price = 100.0
        target_price = 90.0  # Target is lower
        velocity = VelocityMetrics(
            bars_per_atr=5.0,
            price_per_bar=1.0,  # Moving UP, away from target
            direction="up",
            consistency=80.0,
        )

        estimate = estimate_time_to_level(
            current_price, target_price, velocity, timeframe="1D"
        )

        # Should be a very high estimate or max value
        assert estimate.estimated_bars >= 100
        assert estimate.confidence < 20  # Low confidence

    def test_estimate_with_sideways_velocity(self) -> None:
        """Should handle sideways velocity."""
        current_price = 100.0
        target_price = 110.0
        velocity = VelocityMetrics(
            bars_per_atr=0.0,
            price_per_bar=0.0,
            direction="sideways",
            consistency=50.0,
        )

        estimate = estimate_time_to_level(
            current_price, target_price, velocity, timeframe="1D"
        )

        # Should return max bars with low confidence
        assert estimate.estimated_bars >= 100
        assert estimate.confidence < 20

    def test_estimate_time_calculation(self) -> None:
        """Should calculate estimated time for daily timeframe."""
        current_price = 100.0
        target_price = 110.0
        velocity = VelocityMetrics(
            bars_per_atr=5.0,
            price_per_bar=1.0,
            direction="up",
            consistency=80.0,
        )

        estimate = estimate_time_to_level(
            current_price, target_price, velocity, timeframe="1D"
        )

        # 10 bars on daily = 10 days from now
        assert estimate.estimated_time is not None
        # Verify it's a valid ISO timestamp
        datetime.fromisoformat(estimate.estimated_time.replace("Z", "+00:00"))

    def test_estimate_atr_distance(self) -> None:
        """Should calculate distance in ATR units."""
        current_price = 100.0
        target_price = 110.0
        velocity = VelocityMetrics(
            bars_per_atr=5.0,  # 5 bars to move 1 ATR
            price_per_bar=2.0,  # 2 points per bar
            direction="up",
            consistency=80.0,
        )
        # ATR = price_per_bar * bars_per_atr = 2 * 5 = 10 points
        # Distance = 10 points = 1 ATR

        estimate = estimate_time_to_level(
            current_price, target_price, velocity, timeframe="1D"
        )

        assert estimate.distance_atr == pytest.approx(1.0, rel=0.1)


class TestEstimateReversalTimes:
    """Tests for estimating times to multiple Fibonacci levels."""

    def test_estimate_multiple_levels(self) -> None:
        """Should estimate times for multiple Fibonacci levels."""
        closes = [100.0 + i for i in range(20)]  # Uptrend
        highs = [c + 1 for c in closes]
        lows = [c - 1 for c in closes]

        fib_levels = [
            {"label": "R38.2%", "price": 125.0},
            {"label": "R50%", "price": 130.0},
            {"label": "R61.8%", "price": 135.0},
        ]

        result = estimate_reversal_times(
            closes, highs, lows, fib_levels, timeframe="1D"
        )

        assert len(result.estimates) == 3
        assert result.velocity is not None
        assert result.current_price == closes[-1]

    def test_estimate_empty_levels(self) -> None:
        """Should handle empty levels list."""
        closes = [100.0 + i for i in range(20)]
        highs = [c + 1 for c in closes]
        lows = [c - 1 for c in closes]

        result = estimate_reversal_times(closes, highs, lows, [], timeframe="1D")

        assert len(result.estimates) == 0
        assert result.velocity is not None

    def test_estimate_with_insufficient_data(self) -> None:
        """Should handle insufficient price data."""
        fib_levels = [{"label": "R38.2%", "price": 125.0}]

        result = estimate_reversal_times([], [], [], fib_levels, timeframe="1D")

        assert result.velocity.direction == "sideways"
        assert len(result.estimates) == 1
        assert result.estimates[0].confidence < 20

    def test_estimate_levels_sorted_by_distance(self) -> None:
        """Estimates should be sorted by distance (closest first)."""
        closes = [100.0 + i for i in range(20)]  # Current price: 119
        highs = [c + 1 for c in closes]
        lows = [c - 1 for c in closes]

        fib_levels = [
            {"label": "Far", "price": 150.0},
            {"label": "Close", "price": 125.0},
            {"label": "Medium", "price": 135.0},
        ]

        result = estimate_reversal_times(
            closes, highs, lows, fib_levels, timeframe="1D"
        )

        # Should be sorted by distance from current price
        assert result.estimates[0].target_label == "Close"
        assert result.estimates[1].target_label == "Medium"
        assert result.estimates[2].target_label == "Far"

    def test_estimate_with_different_timeframes(self) -> None:
        """Should calculate different times for different timeframes."""
        closes = [100.0 + i for i in range(20)]
        highs = [c + 1 for c in closes]
        lows = [c - 1 for c in closes]
        fib_levels = [{"label": "Target", "price": 130.0}]

        result_daily = estimate_reversal_times(
            closes, highs, lows, fib_levels, timeframe="1D"
        )
        result_hourly = estimate_reversal_times(
            closes, highs, lows, fib_levels, timeframe="1H"
        )

        # Same bars estimate, different time estimate
        daily_bars = result_daily.estimates[0].estimated_bars
        hourly_bars = result_hourly.estimates[0].estimated_bars
        assert daily_bars == hourly_bars
        # Hourly should have shorter time span
        daily_time_str = result_daily.estimates[0].estimated_time
        hourly_time_str = result_hourly.estimates[0].estimated_time
        if daily_time_str and hourly_time_str:
            daily_time = datetime.fromisoformat(
                daily_time_str.replace("Z", "+00:00")
            )
            hourly_time = datetime.fromisoformat(
                hourly_time_str.replace("Z", "+00:00")
            )
            assert hourly_time < daily_time
