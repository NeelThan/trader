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
    TrendLine,
    TrendLineBreak,
    TrendLinesResult,
    TrendLinePoint,
    extract_trend_line_points,
    calculate_trend_line,
    detect_trend_line_breaks,
    extend_trend_line,
    analyze_trend_lines,
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
