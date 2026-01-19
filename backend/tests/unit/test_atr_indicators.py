"""Tests for ATR (Average True Range) indicators module."""

import pytest

from trader.atr_indicators import (
    ATRAnalysis,
    analyze_atr,
    calculate_atr,
    calculate_true_range,
    classify_volatility,
    get_atr_series,
)


class TestCalculateTrueRange:
    """Tests for calculate_true_range function."""

    def test_first_bar_uses_high_minus_low(self) -> None:
        """Should use High - Low when no previous close."""
        result = calculate_true_range(high=110, low=100, previous_close=None)
        assert result == 10.0

    def test_uses_high_minus_low_when_largest(self) -> None:
        """Should use High - Low when it's the largest range."""
        # H-L = 10, |H-PC| = 5, |L-PC| = 5
        result = calculate_true_range(high=110, low=100, previous_close=105)
        assert result == 10.0

    def test_uses_high_minus_previous_close_when_gap_up(self) -> None:
        """Should use |High - Previous Close| on gap up."""
        # H-L = 5, |H-PC| = 15, |L-PC| = 10
        result = calculate_true_range(high=115, low=110, previous_close=100)
        assert result == 15.0

    def test_uses_low_minus_previous_close_when_gap_down(self) -> None:
        """Should use |Low - Previous Close| on gap down."""
        # H-L = 5, |H-PC| = 10, |L-PC| = 15
        result = calculate_true_range(high=95, low=90, previous_close=105)
        assert result == 15.0


class TestCalculateATR:
    """Tests for calculate_atr function."""

    def test_returns_empty_for_empty_input(self) -> None:
        """Should return empty list for empty input."""
        result = calculate_atr([], [], [])
        assert result == []

    def test_returns_none_for_insufficient_data(self) -> None:
        """Should return all None when less than period bars."""
        highs = [110, 112]
        lows = [100, 102]
        closes = [105, 108]
        result = calculate_atr(highs, lows, closes, period=14)
        assert result == [None, None]

    def test_calculates_first_atr_as_simple_average(self) -> None:
        """Should calculate first ATR as SMA of true ranges."""
        # 3 bars with TR = 10 each
        highs = [110, 112, 114]
        lows = [100, 102, 104]
        closes = [105, 108, 110]
        result = calculate_atr(highs, lows, closes, period=3)

        # First two should be None
        assert result[0] is None
        assert result[1] is None
        # Third should be average of TRs
        assert result[2] is not None
        assert result[2] == pytest.approx(10.0, rel=0.1)

    def test_subsequent_atr_uses_wilder_smoothing(self) -> None:
        """Should use Wilder's smoothing for subsequent ATRs."""
        # 4 bars
        highs = [110, 112, 114, 120]
        lows = [100, 102, 104, 105]
        closes = [105, 108, 110, 115]
        result = calculate_atr(highs, lows, closes, period=3)

        # Fourth value uses Wilder's formula
        # Previous ATR ≈ 10, Current TR = 15
        # New ATR = (10 * 2 + 15) / 3 ≈ 11.67
        assert result[3] is not None
        assert result[3] > 10.0  # Should be higher due to larger TR

    def test_mismatched_lengths_returns_empty(self) -> None:
        """Should return empty list for mismatched input lengths."""
        result = calculate_atr([110, 112], [100], [105, 108])
        assert result == []


class TestClassifyVolatility:
    """Tests for classify_volatility function."""

    def test_low_volatility(self) -> None:
        """Should classify < 0.5% as low."""
        level, _ = classify_volatility(0.3)
        assert level == "low"

    def test_normal_volatility(self) -> None:
        """Should classify 0.5-1.5% as normal."""
        level, _ = classify_volatility(1.0)
        assert level == "normal"

    def test_high_volatility(self) -> None:
        """Should classify 1.5-3% as high."""
        level, _ = classify_volatility(2.0)
        assert level == "high"

    def test_extreme_volatility(self) -> None:
        """Should classify > 3% as extreme."""
        level, _ = classify_volatility(4.0)
        assert level == "extreme"

    def test_returns_interpretation(self) -> None:
        """Should return interpretation string."""
        _, interpretation = classify_volatility(1.0)
        assert "Normal volatility" in interpretation


class TestAnalyzeATR:
    """Tests for analyze_atr function."""

    def test_returns_none_for_insufficient_data(self) -> None:
        """Should return None when not enough data."""
        result = analyze_atr([110] * 5, [100] * 5, [105] * 5, period=14)
        assert result is None

    def test_calculates_atr_percent(self) -> None:
        """Should calculate ATR as percentage of price."""
        # Create data with consistent TR of ~10 and close of ~500
        highs = [510] * 20
        lows = [500] * 20
        closes = [505] * 20
        result = analyze_atr(highs, lows, closes, period=14)

        assert result is not None
        # ATR ≈ 10, Price = 505, ATR% ≈ 2%
        assert result.atr == pytest.approx(10.0, rel=0.1)
        assert result.atr_percent == pytest.approx(2.0, rel=0.1)

    def test_calculates_stop_suggestions(self) -> None:
        """Should calculate stop loss suggestions."""
        highs = [110] * 20
        lows = [100] * 20
        closes = [105] * 20
        result = analyze_atr(highs, lows, closes, period=14)

        assert result is not None
        # ATR ≈ 10
        assert result.suggested_stop_1x == pytest.approx(10.0, rel=0.1)
        assert result.suggested_stop_1_5x == pytest.approx(15.0, rel=0.1)
        assert result.suggested_stop_2x == pytest.approx(20.0, rel=0.1)

    def test_returns_volatility_level(self) -> None:
        """Should return volatility classification."""
        highs = [110] * 20
        lows = [100] * 20
        closes = [105] * 20
        result = analyze_atr(highs, lows, closes, period=14)

        assert result is not None
        # ATR% ≈ 9.5% (10/105) - should be extreme
        assert result.volatility_level == "extreme"

    def test_returns_current_price(self) -> None:
        """Should return current price used in calculations."""
        highs = [110] * 20
        lows = [100] * 20
        closes = [105] * 20
        result = analyze_atr(highs, lows, closes, period=14)

        assert result is not None
        assert result.current_price == 105.0


class TestGetATRSeries:
    """Tests for get_atr_series function."""

    def test_returns_series_aligned_with_input(self) -> None:
        """Should return ATR series same length as input."""
        highs = [110] * 20
        lows = [100] * 20
        closes = [105] * 20
        result = get_atr_series(highs, lows, closes, period=14)

        assert len(result) == 20

    def test_first_values_are_none(self) -> None:
        """Should have None for first period-1 values."""
        highs = [110] * 20
        lows = [100] * 20
        closes = [105] * 20
        result = get_atr_series(highs, lows, closes, period=14)

        # First 13 values should be None (period - 1)
        for i in range(13):
            assert result[i] is None
        # 14th value (index 13) should have value
        assert result[13] is not None


class TestATRAnalysisDataclass:
    """Tests for ATRAnalysis dataclass."""

    def test_creates_immutable_instance(self) -> None:
        """Should create frozen dataclass."""
        analysis = ATRAnalysis(
            atr=10.0,
            atr_percent=1.0,
            volatility_level="normal",
            current_price=1000.0,
            suggested_stop_1x=10.0,
            suggested_stop_1_5x=15.0,
            suggested_stop_2x=20.0,
            interpretation="Normal volatility",
        )

        with pytest.raises(AttributeError):
            analysis.atr = 20.0  # type: ignore[misc]

    def test_stores_all_fields(self) -> None:
        """Should store all analysis fields correctly."""
        analysis = ATRAnalysis(
            atr=10.0,
            atr_percent=1.0,
            volatility_level="normal",
            current_price=1000.0,
            suggested_stop_1x=10.0,
            suggested_stop_1_5x=15.0,
            suggested_stop_2x=20.0,
            interpretation="Test interpretation",
        )

        assert analysis.atr == 10.0
        assert analysis.atr_percent == 1.0
        assert analysis.volatility_level == "normal"
        assert analysis.current_price == 1000.0
        assert analysis.suggested_stop_1x == 10.0
        assert analysis.suggested_stop_1_5x == 15.0
        assert analysis.suggested_stop_2x == 20.0
        assert analysis.interpretation == "Test interpretation"
