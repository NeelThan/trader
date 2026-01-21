"""Trend line calculations for HH/LL swing points.

This module provides functions to:
- Extract HH (Higher High) and LL (Lower Low) points from swing markers
- Calculate trend lines using linear regression
- Detect breaks above/below trend lines
- Extend trend lines forward for projection

Trend lines are drawn separately for:
- Upper line: Connects HH points (resistance trend)
- Lower line: Connects LL points (support trend)

These separate lines help identify:
- Channel formation (parallel lines)
- Expanding/contracting patterns (diverging/converging lines)
- Breakout opportunities (price breaking through a line)
"""

from dataclasses import dataclass
from typing import Any, Literal


@dataclass(frozen=True)
class TrendLinePoint:
    """A point on a trend line.

    Attributes:
        index: Bar index in the data array.
        price: Price at this point.
        time: Timestamp (ISO string or Unix timestamp).
    """

    index: int
    price: float
    time: str | int


@dataclass(frozen=True)
class TrendLine:
    """A trend line calculated from swing points.

    Attributes:
        swing_type: Type of swing points used ("HH" or "LL").
        points: List of points used to calculate the line.
        slope: Price change per bar (positive = upward, negative = downward).
        intercept: Y-intercept of the line (price at index 0).
        is_valid: Whether the line has at least 2 points.
    """

    swing_type: Literal["HH", "LL"]
    points: list[TrendLinePoint]
    slope: float
    intercept: float
    is_valid: bool


@dataclass(frozen=True)
class TrendLineBreak:
    """A detected break of a trend line.

    Attributes:
        line_type: Which line was broken ("HH" for upper, "LL" for lower).
        break_index: Bar index where the break occurred.
        break_price: Price at the break point.
        break_time: Timestamp of the break (if available).
        break_direction: Direction of the break ("above" or "below").
    """

    line_type: Literal["HH", "LL"]
    break_index: int
    break_price: float
    break_time: str | int | None
    break_direction: Literal["above", "below"]


@dataclass(frozen=True)
class TrendLinesResult:
    """Result of trend line analysis.

    Attributes:
        upper_line: Trend line connecting HH points (or None).
        lower_line: Trend line connecting LL points (or None).
        breaks: List of detected trend line breaks.
        current_position: Where price is relative to the channel.
    """

    upper_line: TrendLine | None
    lower_line: TrendLine | None
    breaks: list[TrendLineBreak]
    current_position: Literal["above_upper", "in_channel", "below_lower", "no_channel"]


def extract_trend_line_points(
    markers: list[Any],  # list[SwingMarker] - using object to avoid circular import
    swing_type: Literal["HH", "LL"],
) -> list[TrendLinePoint]:
    """Extract points of a specific swing type from markers.

    Filters swing markers to only those matching the specified type
    (HH for upper trend line, LL for lower trend line).

    Args:
        markers: List of SwingMarker objects from pivot detection.
        swing_type: Type to filter for ("HH" or "LL").

    Returns:
        List of TrendLinePoint objects for matching markers.
    """
    points: list[TrendLinePoint] = []

    for marker in markers:
        if marker.swing_type == swing_type:
            points.append(
                TrendLinePoint(
                    index=marker.index,
                    price=marker.price,
                    time=marker.time,
                )
            )

    return points


def calculate_trend_line(
    points: list[TrendLinePoint],
    swing_type: Literal["HH", "LL"],
) -> TrendLine:
    """Calculate a trend line from swing points using linear regression.

    Uses simple linear regression to find the best-fit line through
    the points. The slope represents price change per bar.

    Args:
        points: List of TrendLinePoint objects.
        swing_type: Type of swing points ("HH" or "LL").

    Returns:
        TrendLine with calculated slope, intercept, and validity.
    """
    if len(points) < 2:
        return TrendLine(
            swing_type=swing_type,
            points=points,
            slope=0.0,
            intercept=0.0,
            is_valid=False,
        )

    # Extract x (index) and y (price) values
    x_values = [p.index for p in points]
    y_values = [p.price for p in points]

    # Calculate means
    n = len(points)
    x_mean = sum(x_values) / n
    y_mean = sum(y_values) / n

    # Calculate slope using least squares
    # slope = sum((x - x_mean) * (y - y_mean)) / sum((x - x_mean)^2)
    numerator = sum(
        (x - x_mean) * (y - y_mean) for x, y in zip(x_values, y_values, strict=True)
    )
    denominator = sum((x - x_mean) ** 2 for x in x_values)

    if abs(denominator) < 1e-10:
        # Vertical line or all same x values - slope is undefined
        slope = 0.0
    else:
        slope = numerator / denominator

    # Calculate intercept: y = mx + b => b = y_mean - m * x_mean
    intercept = y_mean - slope * x_mean

    return TrendLine(
        swing_type=swing_type,
        points=points,
        slope=slope,
        intercept=intercept,
        is_valid=True,
    )


def detect_trend_line_breaks(
    trend_line: TrendLine,
    closes: list[float],
    highs: list[float],
    lows: list[float],
    start_index: int = 0,
) -> list[TrendLineBreak]:
    """Detect where price breaks through a trend line.

    For HH (upper) lines: checks if high price exceeds the line value.
    For LL (lower) lines: checks if low price falls below the line value.

    Args:
        trend_line: The trend line to check for breaks.
        closes: List of closing prices.
        highs: List of high prices (for upper line breaks).
        lows: List of low prices (for lower line breaks).
        start_index: Index offset for the price data.

    Returns:
        List of TrendLineBreak objects for detected breaks.
    """
    if not trend_line.is_valid:
        return []

    breaks: list[TrendLineBreak] = []

    for i in range(len(closes)):
        actual_index = start_index + i
        # Calculate expected line value at this index
        line_value = trend_line.intercept + trend_line.slope * actual_index

        if trend_line.swing_type == "HH" and highs:
            # Check for break above upper line
            if i < len(highs) and highs[i] > line_value:
                breaks.append(
                    TrendLineBreak(
                        line_type="HH",
                        break_index=actual_index,
                        break_price=highs[i],
                        break_time=None,
                        break_direction="above",
                    )
                )
        elif trend_line.swing_type == "LL" and lows:
            # Check for break below lower line
            if i < len(lows) and lows[i] < line_value:
                breaks.append(
                    TrendLineBreak(
                        line_type="LL",
                        break_index=actual_index,
                        break_price=lows[i],
                        break_time=None,
                        break_direction="below",
                    )
                )

    return breaks


def extend_trend_line(
    trend_line: TrendLine,
    target_index: int,
) -> float | None:
    """Project a trend line to a future bar index.

    Uses the line equation (y = mx + b) to calculate the
    expected price at a future index.

    Args:
        trend_line: The trend line to extend.
        target_index: The future bar index to project to.

    Returns:
        Projected price at target_index, or None if invalid line.
    """
    if not trend_line.is_valid:
        return None

    return trend_line.intercept + trend_line.slope * target_index


def get_line_value_at_index(trend_line: TrendLine, index: int) -> float | None:
    """Get the trend line value at a specific index.

    Args:
        trend_line: The trend line.
        index: Bar index to evaluate.

    Returns:
        Price value at the index, or None if invalid line.
    """
    if not trend_line.is_valid:
        return None

    return trend_line.intercept + trend_line.slope * index


def analyze_trend_lines(
    markers: list[Any],  # list[SwingMarker]
    closes: list[float],
    highs: list[float] | None = None,
    lows: list[float] | None = None,
) -> TrendLinesResult:
    """Perform full trend line analysis.

    Extracts HH and LL points, calculates trend lines, detects breaks,
    and determines the current price position relative to the channel.

    Args:
        markers: List of SwingMarker objects from pivot detection.
        closes: List of closing prices.
        highs: List of high prices (optional, for break detection).
        lows: List of low prices (optional, for break detection).

    Returns:
        TrendLinesResult with both lines, breaks, and current position.
    """
    if not markers or not closes:
        return TrendLinesResult(
            upper_line=None,
            lower_line=None,
            breaks=[],
            current_position="no_channel",
        )

    # Extract HH and LL points
    hh_points = extract_trend_line_points(markers, "HH")
    ll_points = extract_trend_line_points(markers, "LL")

    # Calculate trend lines
    upper_line = calculate_trend_line(hh_points, "HH") if hh_points else None
    lower_line = calculate_trend_line(ll_points, "LL") if ll_points else None

    # Detect breaks
    all_breaks: list[TrendLineBreak] = []

    if upper_line and upper_line.is_valid and highs:
        # Find first index after last HH point
        last_hh_index = max(p.index for p in hh_points) if hh_points else 0
        if last_hh_index < len(closes):
            upper_breaks = detect_trend_line_breaks(
                upper_line,
                closes[last_hh_index:],
                highs[last_hh_index:] if highs else [],
                [],
                start_index=last_hh_index,
            )
            all_breaks.extend(upper_breaks)

    if lower_line and lower_line.is_valid and lows:
        # Find first index after last LL point
        last_ll_index = max(p.index for p in ll_points) if ll_points else 0
        if last_ll_index < len(closes):
            lower_breaks = detect_trend_line_breaks(
                lower_line,
                closes[last_ll_index:],
                [],
                lows[last_ll_index:] if lows else [],
                start_index=last_ll_index,
            )
            all_breaks.extend(lower_breaks)

    # Determine current position
    current_position = _determine_current_position(
        upper_line, lower_line, closes
    )

    return TrendLinesResult(
        upper_line=upper_line,
        lower_line=lower_line,
        breaks=all_breaks,
        current_position=current_position,
    )


def _determine_current_position(
    upper_line: TrendLine | None,
    lower_line: TrendLine | None,
    closes: list[float],
) -> Literal["above_upper", "in_channel", "below_lower", "no_channel"]:
    """Determine where current price is relative to trend lines.

    Args:
        upper_line: HH trend line (or None).
        lower_line: LL trend line (or None).
        closes: List of closing prices.

    Returns:
        Position relative to the channel.
    """
    if not closes:
        return "no_channel"

    current_price = closes[-1]
    current_index = len(closes) - 1

    # Get line values at current index
    upper_value = (
        get_line_value_at_index(upper_line, current_index)
        if upper_line and upper_line.is_valid
        else None
    )
    lower_value = (
        get_line_value_at_index(lower_line, current_index)
        if lower_line and lower_line.is_valid
        else None
    )

    # Determine position
    if upper_value is None and lower_value is None:
        return "no_channel"

    if upper_value is not None and current_price > upper_value:
        return "above_upper"

    if lower_value is not None and current_price < lower_value:
        return "below_lower"

    if upper_value is not None or lower_value is not None:
        return "in_channel"

    return "no_channel"
