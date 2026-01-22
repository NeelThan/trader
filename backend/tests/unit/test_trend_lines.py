"""Unit tests for trend line calculations.

Tests cover:
- Extracting HH/LL points from swing markers
- Calculating trend line slope via linear regression
- Detecting breaks above/below trend lines
- Extending trend lines forward
"""

import pytest

from trader.pivots import SwingMarker
from trader.trend_lines import (
    ChannelPattern,
    TrendLine,
    TrendLinePoint,
    analyze_trend_lines,
    calculate_trend_line,
    classify_channel_pattern,
    detect_reversal_signals,
    detect_trend_line_breaks,
    extend_trend_line,
    extract_trend_line_points,
)


class TestExtractTrendLinePoints:
    """Tests for extracting HH or LL points from swing markers."""

    def test_extract_hh_points(self) -> None:
        """Should extract only HH points from markers."""
        markers = [
            SwingMarker(index=5, price=100.0, time="2024-01-01", swing_type="HH"),
            SwingMarker(index=10, price=98.0, time="2024-01-02", swing_type="HL"),
            SwingMarker(index=15, price=105.0, time="2024-01-03", swing_type="HH"),
            SwingMarker(index=20, price=102.0, time="2024-01-04", swing_type="LH"),
            SwingMarker(index=25, price=110.0, time="2024-01-05", swing_type="HH"),
        ]

        points = extract_trend_line_points(markers, "HH")

        assert len(points) == 3
        assert points[0].index == 5
        assert points[0].price == 100.0
        assert points[1].index == 15
        assert points[1].price == 105.0
        assert points[2].index == 25
        assert points[2].price == 110.0

    def test_extract_ll_points(self) -> None:
        """Should extract only LL points from markers."""
        markers = [
            SwingMarker(index=5, price=90.0, time="2024-01-01", swing_type="LL"),
            SwingMarker(index=10, price=95.0, time="2024-01-02", swing_type="HL"),
            SwingMarker(index=15, price=88.0, time="2024-01-03", swing_type="LL"),
            SwingMarker(index=20, price=85.0, time="2024-01-04", swing_type="LL"),
        ]

        points = extract_trend_line_points(markers, "LL")

        assert len(points) == 3
        assert points[0].price == 90.0
        assert points[1].price == 88.0
        assert points[2].price == 85.0

    def test_extract_empty_markers(self) -> None:
        """Should return empty list for no markers."""
        points = extract_trend_line_points([], "HH")
        assert len(points) == 0

    def test_extract_no_matching_type(self) -> None:
        """Should return empty list when no matching swing type."""
        markers = [
            SwingMarker(index=5, price=100.0, time="2024-01-01", swing_type="HL"),
            SwingMarker(index=10, price=98.0, time="2024-01-02", swing_type="LH"),
        ]

        points = extract_trend_line_points(markers, "HH")
        assert len(points) == 0


class TestCalculateTrendLine:
    """Tests for calculating trend line slope via linear regression."""

    def test_upward_trend_line(self) -> None:
        """Should calculate positive slope for upward trend."""
        points = [
            TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
            TrendLinePoint(index=10, price=110.0, time="2024-01-02"),
            TrendLinePoint(index=20, price=120.0, time="2024-01-03"),
        ]

        trend_line = calculate_trend_line(points, "HH")

        assert trend_line.is_valid
        assert trend_line.slope == pytest.approx(1.0, rel=0.01)  # 10 price per 10 bars
        assert trend_line.swing_type == "HH"
        assert len(trend_line.points) == 3

    def test_downward_trend_line(self) -> None:
        """Should calculate negative slope for downward trend."""
        points = [
            TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
            TrendLinePoint(index=10, price=90.0, time="2024-01-02"),
            TrendLinePoint(index=20, price=80.0, time="2024-01-03"),
        ]

        trend_line = calculate_trend_line(points, "LL")

        assert trend_line.is_valid
        assert trend_line.slope == pytest.approx(-1.0, rel=0.01)
        assert trend_line.swing_type == "LL"

    def test_flat_trend_line(self) -> None:
        """Should calculate zero slope for flat trend."""
        points = [
            TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
            TrendLinePoint(index=10, price=100.0, time="2024-01-02"),
            TrendLinePoint(index=20, price=100.0, time="2024-01-03"),
        ]

        trend_line = calculate_trend_line(points, "HH")

        assert trend_line.is_valid
        assert trend_line.slope == pytest.approx(0.0, abs=0.001)

    def test_invalid_with_single_point(self) -> None:
        """Should be invalid with only one point."""
        points = [TrendLinePoint(index=0, price=100.0, time="2024-01-01")]

        trend_line = calculate_trend_line(points, "HH")

        assert not trend_line.is_valid
        assert trend_line.slope == 0.0

    def test_invalid_with_no_points(self) -> None:
        """Should be invalid with no points."""
        trend_line = calculate_trend_line([], "HH")

        assert not trend_line.is_valid
        assert trend_line.slope == 0.0

    def test_intercept_calculation(self) -> None:
        """Should correctly calculate the y-intercept."""
        points = [
            TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
            TrendLinePoint(index=10, price=110.0, time="2024-01-02"),
        ]

        trend_line = calculate_trend_line(points, "HH")

        assert trend_line.intercept == pytest.approx(100.0, rel=0.01)


class TestDetectTrendLineBreaks:
    """Tests for detecting trend line breaks."""

    def test_detect_break_above_upper_line(self) -> None:
        """Should detect when price breaks above upper (HH) trend line."""
        # Trend line: starts at 100, slope of 1 (price = 100 + index)
        trend_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=110.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=100.0,
            is_valid=True,
        )

        # Price data where only index 14 breaks above (expected level = 115)
        # At index 11: line=111, high=110 (no break)
        # At index 12: line=112, high=111 (no break)
        # At index 13: line=113, high=112 (no break)
        # At index 14: line=114, high=118 (BREAK!)
        closes = [108.0, 109.0, 110.0, 116.0, 115.0]  # indices 11-15
        highs = [110.0, 111.0, 112.0, 118.0, 113.0]

        breaks = detect_trend_line_breaks(trend_line, closes, highs, [], start_index=11)

        assert len(breaks) == 1
        assert breaks[0].line_type == "HH"
        assert breaks[0].break_index == 14  # index 14 (4th bar from start_index 11)
        assert breaks[0].break_direction == "above"

    def test_detect_break_below_lower_line(self) -> None:
        """Should detect when price breaks below lower (LL) trend line."""
        # Trend line: starts at 100, slope of -0.5
        trend_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=95.0, time="2024-01-02"),
            ],
            slope=-0.5,
            intercept=100.0,
            is_valid=True,
        )

        # Price data where only index 12 breaks below
        # At index 10: line=95, low=96 (no break)
        # At index 11: line=94.5, low=96 (no break)
        # At index 12: line=94, low=91 (BREAK!)
        # At index 13: line=93.5, low=95 (no break)
        closes = [96.0, 96.0, 93.0, 95.0]  # indices 10-13
        lows = [96.0, 96.0, 91.0, 95.0]

        breaks = detect_trend_line_breaks(
            trend_line, closes, [], lows, start_index=10
        )

        assert len(breaks) == 1
        assert breaks[0].line_type == "LL"
        assert breaks[0].break_index == 12
        assert breaks[0].break_direction == "below"

    def test_no_break_detected(self) -> None:
        """Should return empty list when no break occurs."""
        trend_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=110.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=100.0,
            is_valid=True,
        )

        # All prices stay below the trend line
        closes = [108.0, 109.0, 110.0, 111.0]  # indices 10-13
        highs = [109.0, 110.0, 111.0, 112.0]  # Still below expected line values

        breaks = detect_trend_line_breaks(trend_line, closes, highs, [], start_index=10)

        assert len(breaks) == 0

    def test_invalid_trend_line(self) -> None:
        """Should return empty list for invalid trend line."""
        trend_line = TrendLine(
            swing_type="HH",
            points=[],
            slope=0.0,
            intercept=0.0,
            is_valid=False,
        )

        breaks = detect_trend_line_breaks(
            trend_line, [100.0, 101.0], [101.0, 102.0], [], start_index=0
        )

        assert len(breaks) == 0


class TestExtendTrendLine:
    """Tests for extending trend line forward."""

    def test_extend_upward_line(self) -> None:
        """Should correctly project upward trend line."""
        trend_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=110.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=100.0,
            is_valid=True,
        )

        projected = extend_trend_line(trend_line, target_index=30)

        assert projected == pytest.approx(130.0, rel=0.01)  # 100 + 30*1

    def test_extend_downward_line(self) -> None:
        """Should correctly project downward trend line."""
        trend_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=90.0, time="2024-01-02"),
            ],
            slope=-1.0,
            intercept=100.0,
            is_valid=True,
        )

        projected = extend_trend_line(trend_line, target_index=25)

        assert projected == pytest.approx(75.0, rel=0.01)  # 100 + 25*(-1)

    def test_extend_invalid_line(self) -> None:
        """Should return None for invalid trend line."""
        trend_line = TrendLine(
            swing_type="HH",
            points=[],
            slope=0.0,
            intercept=0.0,
            is_valid=False,
        )

        projected = extend_trend_line(trend_line, target_index=30)

        assert projected is None


class TestAnalyzeTrendLines:
    """Tests for the full trend line analysis function."""

    def test_analyze_with_hh_and_ll_markers(self) -> None:
        """Should create both upper and lower trend lines."""
        markers = [
            SwingMarker(index=0, price=100.0, time="2024-01-01", swing_type="HH"),
            SwingMarker(index=5, price=90.0, time="2024-01-02", swing_type="LL"),
            SwingMarker(index=10, price=110.0, time="2024-01-03", swing_type="HH"),
            SwingMarker(index=15, price=88.0, time="2024-01-04", swing_type="LL"),
            SwingMarker(index=20, price=120.0, time="2024-01-05", swing_type="HH"),
            SwingMarker(index=25, price=85.0, time="2024-01-06", swing_type="LL"),
        ]

        # Close prices to check current position
        closes = [95.0] * 30  # Neutral prices in channel

        result = analyze_trend_lines(markers, closes)

        assert result.upper_line is not None
        assert result.lower_line is not None
        assert result.upper_line.is_valid
        assert result.lower_line.is_valid
        assert result.upper_line.swing_type == "HH"
        assert result.lower_line.swing_type == "LL"

    def test_analyze_in_channel_position(self) -> None:
        """Should detect when price is within the channel."""
        markers = [
            SwingMarker(index=0, price=110.0, time="2024-01-01", swing_type="HH"),
            SwingMarker(index=5, price=90.0, time="2024-01-02", swing_type="LL"),
            SwingMarker(index=10, price=110.0, time="2024-01-03", swing_type="HH"),
            SwingMarker(index=15, price=90.0, time="2024-01-04", swing_type="LL"),
        ]

        closes = [100.0] * 20  # Price at 100, within 90-110 channel

        result = analyze_trend_lines(markers, closes)

        assert result.current_position == "in_channel"

    def test_analyze_above_upper_position(self) -> None:
        """Should detect when price is above upper trend line."""
        markers = [
            SwingMarker(index=0, price=100.0, time="2024-01-01", swing_type="HH"),
            SwingMarker(index=10, price=100.0, time="2024-01-02", swing_type="HH"),
        ]

        closes = [115.0] * 15  # Price above flat 100 line

        result = analyze_trend_lines(markers, closes)

        assert result.current_position == "above_upper"

    def test_analyze_below_lower_position(self) -> None:
        """Should detect when price is below lower trend line."""
        markers = [
            SwingMarker(index=0, price=100.0, time="2024-01-01", swing_type="LL"),
            SwingMarker(index=10, price=100.0, time="2024-01-02", swing_type="LL"),
        ]

        closes = [85.0] * 15  # Price below flat 100 line

        result = analyze_trend_lines(markers, closes)

        assert result.current_position == "below_lower"

    def test_analyze_insufficient_markers(self) -> None:
        """Should return no_channel when not enough markers."""
        markers = [
            SwingMarker(index=0, price=100.0, time="2024-01-01", swing_type="HH"),
        ]

        closes = [100.0] * 5

        result = analyze_trend_lines(markers, closes)

        # Either upper_line is None or not valid
        if result.upper_line is not None:
            assert not result.upper_line.is_valid
        assert result.current_position == "no_channel"

    def test_analyze_empty_markers(self) -> None:
        """Should handle empty markers list."""
        result = analyze_trend_lines([], [100.0] * 5)

        assert result.upper_line is None
        assert result.lower_line is None
        assert result.current_position == "no_channel"
        assert len(result.breaks) == 0


class TestClassifyChannelPattern:
    """Tests for pattern classification based on trend line slopes."""

    def test_rising_wedge_both_positive_converging(self) -> None:
        """Rising wedge: both lines going up, but lower line steeper (converging)."""
        # Upper: slope 0.5 (less steep up)
        upper_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=20, price=110.0, time="2024-01-02"),
            ],
            slope=0.5,
            intercept=100.0,
            is_valid=True,
        )
        # Lower: slope 0.8 (steeper up, converging toward upper)
        lower_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=90.0, time="2024-01-01"),
                TrendLinePoint(index=20, price=106.0, time="2024-01-02"),
            ],
            slope=0.8,
            intercept=90.0,
            is_valid=True,
        )

        pattern = classify_channel_pattern(upper_line, lower_line, current_index=20)

        assert pattern.pattern_type == "rising_wedge"
        assert pattern.reversal_bias == "bearish"
        assert pattern.bars_to_apex is not None
        assert pattern.bars_to_apex > 0
        assert pattern.width_change_rate < 0  # Converging

    def test_falling_wedge_both_negative_converging(self) -> None:
        """Falling wedge: both lines going down, upper line steeper (converging)."""
        # Upper: slope -0.8 (steeper down, catching up to lower)
        upper_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=110.0, time="2024-01-01"),
                TrendLinePoint(index=20, price=94.0, time="2024-01-02"),
            ],
            slope=-0.8,
            intercept=110.0,
            is_valid=True,
        )
        # Lower: slope -0.3 (less steep down)
        lower_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=20, price=94.0, time="2024-01-02"),
            ],
            slope=-0.3,
            intercept=100.0,
            is_valid=True,
        )

        # Test at index 10, apex is at index 20
        pattern = classify_channel_pattern(upper_line, lower_line, current_index=10)

        assert pattern.pattern_type == "falling_wedge"
        assert pattern.reversal_bias == "bullish"
        assert pattern.bars_to_apex is not None
        assert pattern.bars_to_apex > 0  # Should be ~10 bars to apex
        assert pattern.width_change_rate < 0  # Converging

    def test_parallel_channel_similar_slopes(self) -> None:
        """Parallel channel: both lines have similar slopes (within 10%)."""
        # Both lines with slope ~1.0 (parallel)
        upper_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=110.0, time="2024-01-01"),
                TrendLinePoint(index=20, price=130.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=110.0,
            is_valid=True,
        )
        lower_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=20, price=120.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=100.0,
            is_valid=True,
        )

        pattern = classify_channel_pattern(upper_line, lower_line, current_index=20)

        assert pattern.pattern_type == "parallel_channel"
        assert pattern.reversal_bias == "neutral"
        assert pattern.bars_to_apex is None  # No apex for parallel lines
        # Width change rate should be near zero for parallel
        assert abs(pattern.width_change_rate) < 0.15

    def test_expanding_pattern_diverging_lines(self) -> None:
        """Expanding pattern: lines diverging away from each other."""
        # Upper: slope 1.0 (going up)
        upper_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=20, price=120.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=100.0,
            is_valid=True,
        )
        # Lower: slope -0.5 (going down, diverging)
        lower_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=90.0, time="2024-01-01"),
                TrendLinePoint(index=20, price=80.0, time="2024-01-02"),
            ],
            slope=-0.5,
            intercept=90.0,
            is_valid=True,
        )

        pattern = classify_channel_pattern(upper_line, lower_line, current_index=20)

        assert pattern.pattern_type == "expanding"
        assert pattern.reversal_bias == "neutral"
        assert pattern.width_change_rate > 0  # Diverging = positive rate

    def test_no_pattern_invalid_lines(self) -> None:
        """No pattern when either line is invalid."""
        upper_line = TrendLine(
            swing_type="HH",
            points=[],
            slope=0.0,
            intercept=0.0,
            is_valid=False,
        )
        lower_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=90.0, time="2024-01-01"),
                TrendLinePoint(index=20, price=100.0, time="2024-01-02"),
            ],
            slope=0.5,
            intercept=90.0,
            is_valid=True,
        )

        pattern = classify_channel_pattern(upper_line, lower_line, current_index=20)

        assert pattern.pattern_type == "no_pattern"
        assert pattern.reversal_bias == "neutral"

    def test_no_pattern_none_lines(self) -> None:
        """No pattern when lines are None."""
        pattern = classify_channel_pattern(None, None, current_index=20)

        assert pattern.pattern_type == "no_pattern"
        assert pattern.reversal_bias == "neutral"

    def test_channel_width_calculation(self) -> None:
        """Should calculate current channel width correctly."""
        upper_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=120.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=130.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=120.0,
            is_valid=True,
        )
        lower_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=110.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=100.0,
            is_valid=True,
        )

        pattern = classify_channel_pattern(upper_line, lower_line, current_index=10)

        # At index 10: upper = 120 + 1*10 = 130, lower = 100 + 1*10 = 110
        # Width = 130 - 110 = 20
        assert pattern.channel_width == pytest.approx(20.0, rel=0.01)


class TestDetectReversalSignals:
    """Tests for reversal signal detection."""

    def test_wedge_squeeze_signal(self) -> None:
        """Should detect wedge squeeze when bars_to_apex <= 10."""
        pattern = ChannelPattern(
            pattern_type="falling_wedge",
            reversal_bias="bullish",
            confidence=75.0,
            bars_to_apex=8,
            channel_width=5.0,
            width_change_rate=-0.5,
            upper_slope=-0.3,
            lower_slope=-0.8,
        )

        signals = detect_reversal_signals(
            pattern=pattern,
            closes=[100.0] * 30,
            highs=[105.0] * 30,
            lows=[95.0] * 30,
            upper_line=None,  # Not needed for wedge squeeze
            lower_line=None,
            current_index=25,
        )

        wedge_signals = [s for s in signals if s.signal_type == "wedge_squeeze"]
        assert len(wedge_signals) == 1
        assert wedge_signals[0].direction == "bullish"
        assert "8 bars" in wedge_signals[0].explanation.lower()

    def test_apex_reached_signal(self) -> None:
        """Should detect apex reached when bars_to_apex <= 2."""
        pattern = ChannelPattern(
            pattern_type="rising_wedge",
            reversal_bias="bearish",
            confidence=85.0,
            bars_to_apex=2,
            channel_width=1.0,
            width_change_rate=-0.3,
            upper_slope=0.5,
            lower_slope=0.8,
        )

        signals = detect_reversal_signals(
            pattern=pattern,
            closes=[100.0] * 30,
            highs=[105.0] * 30,
            lows=[95.0] * 30,
            upper_line=None,
            lower_line=None,
            current_index=25,
        )

        apex_signals = [s for s in signals if s.signal_type == "apex_reached"]
        assert len(apex_signals) == 1
        assert apex_signals[0].direction == "bearish"

    def test_channel_break_above_signal(self) -> None:
        """Should detect channel break when price closes above upper line."""
        pattern = ChannelPattern(
            pattern_type="parallel_channel",
            reversal_bias="neutral",
            confidence=60.0,
            bars_to_apex=None,
            channel_width=10.0,
            width_change_rate=0.0,
            upper_slope=1.0,
            lower_slope=1.0,
        )

        upper_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=110.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=100.0,
            is_valid=True,
        )
        lower_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=90.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=100.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=90.0,
            is_valid=True,
        )

        # Close at index 15 is 120, upper line at 15 = 100 + 15*1 = 115
        # So 120 > 115 = break above
        closes = [100.0] * 14 + [120.0, 122.0]  # 16 bars
        highs = [105.0] * 14 + [125.0, 127.0]
        lows = [95.0] * 14 + [115.0, 117.0]

        signals = detect_reversal_signals(
            pattern=pattern,
            closes=closes,
            highs=highs,
            lows=lows,
            upper_line=upper_line,
            lower_line=lower_line,
            current_index=15,
        )

        break_signals = [s for s in signals if s.signal_type == "channel_break"]
        assert len(break_signals) == 1
        assert break_signals[0].direction == "bullish"

    def test_channel_break_below_signal(self) -> None:
        """Should detect channel break when price closes below lower line."""
        pattern = ChannelPattern(
            pattern_type="parallel_channel",
            reversal_bias="neutral",
            confidence=60.0,
            bars_to_apex=None,
            channel_width=10.0,
            width_change_rate=0.0,
            upper_slope=1.0,
            lower_slope=1.0,
        )

        upper_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=110.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=120.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=110.0,
            is_valid=True,
        )
        lower_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=110.0, time="2024-01-02"),
            ],
            slope=1.0,
            intercept=100.0,
            is_valid=True,
        )

        # Close at index 15 is 90, lower line at 15 = 100 + 15*1 = 115
        # So 90 < 115 = break below
        closes = [108.0] * 14 + [90.0, 88.0]
        highs = [112.0] * 14 + [95.0, 93.0]
        lows = [104.0] * 14 + [85.0, 83.0]

        signals = detect_reversal_signals(
            pattern=pattern,
            closes=closes,
            highs=highs,
            lows=lows,
            upper_line=upper_line,
            lower_line=lower_line,
            current_index=15,
        )

        break_signals = [s for s in signals if s.signal_type == "channel_break"]
        assert len(break_signals) == 1
        assert break_signals[0].direction == "bearish"

    def test_no_signals_for_no_pattern(self) -> None:
        """Should return empty list for no_pattern."""
        pattern = ChannelPattern(
            pattern_type="no_pattern",
            reversal_bias="neutral",
            confidence=0.0,
            bars_to_apex=None,
            channel_width=0.0,
            width_change_rate=0.0,
            upper_slope=None,
            lower_slope=None,
        )

        signals = detect_reversal_signals(
            pattern=pattern,
            closes=[100.0] * 10,
            highs=[105.0] * 10,
            lows=[95.0] * 10,
            upper_line=None,
            lower_line=None,
            current_index=9,
        )

        assert len(signals) == 0

    def test_failed_test_signal_upper_line(self) -> None:
        """Should detect failed test when price touches upper line then reverses."""
        pattern = ChannelPattern(
            pattern_type="parallel_channel",
            reversal_bias="neutral",
            confidence=60.0,
            bars_to_apex=None,
            channel_width=10.0,
            width_change_rate=0.0,
            upper_slope=0.0,
            lower_slope=0.0,
        )

        upper_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=110.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=110.0, time="2024-01-02"),
            ],
            slope=0.0,
            intercept=110.0,
            is_valid=True,
        )
        lower_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=100.0, time="2024-01-02"),
            ],
            slope=0.0,
            intercept=100.0,
            is_valid=True,
        )

        # Prev bar (index 14): high=110 (touches upper line), close=108
        # Current bar (index 15): close=105 < prev close 108 (reversal down)
        closes = [105.0] * 14 + [108.0, 105.0]  # 16 bars total
        highs = [107.0] * 14 + [110.0, 106.0]  # Prev bar touched upper line
        lows = [103.0] * 14 + [106.0, 103.0]

        signals = detect_reversal_signals(
            pattern=pattern,
            closes=closes,
            highs=highs,
            lows=lows,
            upper_line=upper_line,
            lower_line=lower_line,
            current_index=15,
        )

        failed_test_signals = [s for s in signals if s.signal_type == "failed_test"]
        assert len(failed_test_signals) == 1
        assert failed_test_signals[0].direction == "bearish"

    def test_failed_test_signal_lower_line(self) -> None:
        """Should detect failed test when price touches lower line then reverses."""
        pattern = ChannelPattern(
            pattern_type="parallel_channel",
            reversal_bias="neutral",
            confidence=60.0,
            bars_to_apex=None,
            channel_width=10.0,
            width_change_rate=0.0,
            upper_slope=0.0,
            lower_slope=0.0,
        )

        upper_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=110.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=110.0, time="2024-01-02"),
            ],
            slope=0.0,
            intercept=110.0,
            is_valid=True,
        )
        lower_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=10, price=100.0, time="2024-01-02"),
            ],
            slope=0.0,
            intercept=100.0,
            is_valid=True,
        )

        # Prev bar (index 14): low=100 (touches lower line), close=102
        # Current bar (index 15): close=105 > prev close 102 (reversal up)
        closes = [105.0] * 14 + [102.0, 105.0]  # 16 bars total
        highs = [107.0] * 14 + [104.0, 107.0]
        lows = [103.0] * 14 + [100.0, 103.0]  # Prev bar touched lower line

        signals = detect_reversal_signals(
            pattern=pattern,
            closes=closes,
            highs=highs,
            lows=lows,
            upper_line=upper_line,
            lower_line=lower_line,
            current_index=15,
        )

        failed_test_signals = [s for s in signals if s.signal_type == "failed_test"]
        assert len(failed_test_signals) == 1
        assert failed_test_signals[0].direction == "bullish"


class TestClassifyChannelPatternEdgeCases:
    """Additional edge case tests for pattern classification."""

    def test_mixed_slopes_converging(self) -> None:
        """Mixed slopes (one positive, one negative) that converge."""
        # Upper: slope 0.5 (going up)
        upper_line = TrendLine(
            swing_type="HH",
            points=[
                TrendLinePoint(index=0, price=100.0, time="2024-01-01"),
                TrendLinePoint(index=20, price=110.0, time="2024-01-02"),
            ],
            slope=0.5,
            intercept=100.0,
            is_valid=True,
        )
        # Lower: slope 0.8 (going up faster, converging)
        lower_line = TrendLine(
            swing_type="LL",
            points=[
                TrendLinePoint(index=0, price=80.0, time="2024-01-01"),
                TrendLinePoint(index=20, price=96.0, time="2024-01-02"),
            ],
            slope=0.8,
            intercept=80.0,
            is_valid=True,
        )

        pattern = classify_channel_pattern(upper_line, lower_line, current_index=10)

        # width_change_rate = 0.5 - 0.8 = -0.3 (converging)
        # But upper is positive and lower is also positive -> rising wedge
        # Actually, both are positive so this should be rising_wedge
        assert pattern.pattern_type == "rising_wedge"
        assert pattern.width_change_rate < 0
