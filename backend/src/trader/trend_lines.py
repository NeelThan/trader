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

PatternType = Literal[
    "rising_wedge",
    "falling_wedge",
    "expanding",
    "parallel_channel",
    "no_pattern",
]

ReversalBias = Literal["bullish", "bearish", "neutral"]

SignalType = Literal[
    "wedge_squeeze",
    "channel_break",
    "slope_divergence",
    "apex_reached",
    "failed_test",
]

SignalDirection = Literal["bullish", "bearish"]


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


@dataclass(frozen=True)
class ChannelPattern:
    """Pattern classification based on trend line shape.

    Detects wedges, channels, and expanding patterns based on
    the relationship between upper (HH) and lower (LL) trend lines.

    Attributes:
        pattern_type: Type of pattern detected.
        reversal_bias: Expected reversal direction based on pattern.
        confidence: Confidence score 0-100.
        bars_to_apex: Bars until lines intersect (for wedges).
        channel_width: Current width between lines.
        width_change_rate: Rate of width change per bar (+ expanding, - contracting).
        upper_slope: Slope of upper (HH) trend line.
        lower_slope: Slope of lower (LL) trend line.
    """

    pattern_type: PatternType
    reversal_bias: ReversalBias
    confidence: float
    bars_to_apex: int | None
    channel_width: float
    width_change_rate: float
    upper_slope: float | None
    lower_slope: float | None


@dataclass(frozen=True)
class ReversalSignal:
    """A detected reversal signal from pattern analysis.

    Attributes:
        signal_type: Type of reversal signal.
        direction: Expected reversal direction.
        strength: Signal strength 0-100.
        trigger_price: Price level that triggered the signal.
        bar_index: Bar index where signal occurred.
        explanation: Human-readable explanation of the signal.
    """

    signal_type: SignalType
    direction: SignalDirection
    strength: float
    trigger_price: float | None
    bar_index: int
    explanation: str


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


def classify_channel_pattern(
    upper_line: TrendLine | None,
    lower_line: TrendLine | None,
    current_index: int,
) -> ChannelPattern:
    """Classify the pattern formed by upper and lower trend lines.

    Detects:
    - Rising Wedge: Both lines going up, converging (bearish bias)
    - Falling Wedge: Both lines going down, converging (bullish bias)
    - Parallel Channel: Similar slopes (neutral)
    - Expanding: Lines diverging (neutral)

    Args:
        upper_line: HH trend line (or None).
        lower_line: LL trend line (or None).
        current_index: Current bar index for calculations.

    Returns:
        ChannelPattern with classification and metrics.
    """
    # No pattern if either line is missing or invalid
    if (
        upper_line is None
        or lower_line is None
        or not upper_line.is_valid
        or not lower_line.is_valid
    ):
        return ChannelPattern(
            pattern_type="no_pattern",
            reversal_bias="neutral",
            confidence=0.0,
            bars_to_apex=None,
            channel_width=0.0,
            width_change_rate=0.0,
            upper_slope=(
                upper_line.slope if upper_line and upper_line.is_valid else None
            ),
            lower_slope=(
                lower_line.slope if lower_line and lower_line.is_valid else None
            ),
        )

    upper_slope = upper_line.slope
    lower_slope = lower_line.slope

    # Calculate width change rate: upper_slope - lower_slope
    # Positive = expanding (upper rising faster or falling slower)
    # Negative = contracting (lower rising faster or falling slower)
    width_change_rate = upper_slope - lower_slope

    # Calculate current channel width
    upper_value = upper_line.intercept + upper_slope * current_index
    lower_value = lower_line.intercept + lower_slope * current_index
    channel_width = upper_value - lower_value

    # Calculate bars to apex (where lines intersect)
    # upper_line.intercept + upper_slope * x = lower_line.intercept + lower_slope * x
    # (upper_slope - lower_slope) * x = lower_line.intercept - upper_line.intercept
    # x = (lower_line.intercept - upper_line.intercept) / (upper_slope - lower_slope)
    bars_to_apex: int | None = None
    slope_diff = upper_slope - lower_slope

    if abs(slope_diff) > 1e-10:  # Not parallel
        apex_index = (lower_line.intercept - upper_line.intercept) / slope_diff
        bars_from_current = apex_index - current_index
        if bars_from_current > 0:  # Apex is in the future
            bars_to_apex = int(bars_from_current)

    # Determine if slopes are similar (parallel channel)
    # Use 10% tolerance relative to the larger slope magnitude
    # Use 0.01 minimum to avoid division by zero
    max_slope_mag = max(abs(upper_slope), abs(lower_slope), 0.01)
    slope_similarity = abs(width_change_rate) / max_slope_mag

    # Classification logic
    pattern_type: PatternType
    reversal_bias: ReversalBias
    confidence: float

    if slope_similarity < 0.1:  # Within 10% = parallel
        pattern_type = "parallel_channel"
        reversal_bias = "neutral"
        confidence = 60.0
    elif width_change_rate > 0:  # Expanding (diverging)
        pattern_type = "expanding"
        reversal_bias = "neutral"
        confidence = 50.0
    elif upper_slope > 0 and lower_slope > 0:  # Both positive, converging
        pattern_type = "rising_wedge"
        reversal_bias = "bearish"
        # Higher confidence when closer to apex
        confidence = min(85.0, 60.0 + (30.0 / max(bars_to_apex or 30, 1)))
    elif upper_slope < 0 and lower_slope < 0:  # Both negative, converging
        pattern_type = "falling_wedge"
        reversal_bias = "bullish"
        # Higher confidence when closer to apex
        confidence = min(85.0, 60.0 + (30.0 / max(bars_to_apex or 30, 1)))
    else:
        # Mixed slopes but converging - classify as expanding or no clear pattern
        pattern_type = "expanding"
        reversal_bias = "neutral"
        confidence = 40.0

    return ChannelPattern(
        pattern_type=pattern_type,
        reversal_bias=reversal_bias,
        confidence=confidence,
        bars_to_apex=bars_to_apex,
        channel_width=channel_width,
        width_change_rate=width_change_rate,
        upper_slope=upper_slope,
        lower_slope=lower_slope,
    )


def detect_reversal_signals(  # noqa: C901
    pattern: ChannelPattern,
    closes: list[float],
    highs: list[float],
    lows: list[float],
    upper_line: TrendLine | None,
    lower_line: TrendLine | None,
    current_index: int,
) -> list[ReversalSignal]:
    """Detect reversal signals based on pattern and price action.

    Detects:
    - Wedge Squeeze: Price approaching apex (<= 10 bars)
    - Apex Reached: Lines converged (<= 2 bars)
    - Channel Break: Price closes outside channel
    - Failed Test: Price touches line, reverses next bar

    Args:
        pattern: Classified channel pattern.
        closes: List of closing prices.
        highs: List of high prices.
        lows: List of low prices.
        upper_line: HH trend line (or None).
        lower_line: LL trend line (or None).
        current_index: Current bar index.

    Returns:
        List of detected ReversalSignal objects.
    """
    signals: list[ReversalSignal] = []

    # No signals for no_pattern
    if pattern.pattern_type == "no_pattern":
        return signals

    # Wedge signals based on bars_to_apex
    if pattern.bars_to_apex is not None:
        is_wedge = pattern.pattern_type in ("rising_wedge", "falling_wedge")
        direction: SignalDirection = (
            "bullish" if pattern.reversal_bias == "bullish" else "bearish"
        )

        # Apex reached (very imminent)
        if pattern.bars_to_apex <= 2:
            trigger = (
                closes[current_index] if current_index < len(closes) else None
            )
            signals.append(
                ReversalSignal(
                    signal_type="apex_reached",
                    direction=direction,
                    strength=90.0,
                    trigger_price=trigger,
                    bar_index=current_index,
                    explanation=f"Apex reached - {pattern.bars_to_apex} bars",
                )
            )
        # Wedge squeeze (approaching apex)
        elif is_wedge and pattern.bars_to_apex <= 10:
            trigger = (
                closes[current_index] if current_index < len(closes) else None
            )
            # Higher strength as apex nears
            strength = 70.0 + (10 - pattern.bars_to_apex) * 2
            signals.append(
                ReversalSignal(
                    signal_type="wedge_squeeze",
                    direction=direction,
                    strength=strength,
                    trigger_price=trigger,
                    bar_index=current_index,
                    explanation=f"Wedge squeeze - {pattern.bars_to_apex} bars to apex",
                )
            )

    # Channel break detection
    if current_index < len(closes):
        current_close = closes[current_index]

        if upper_line and upper_line.is_valid:
            upper_value = upper_line.intercept + upper_line.slope * current_index
            if current_close > upper_value:
                signals.append(
                    ReversalSignal(
                        signal_type="channel_break",
                        direction="bullish",
                        strength=75.0,
                        trigger_price=current_close,
                        bar_index=current_index,
                        explanation=f"Break above upper line at {upper_value:.2f}",
                    )
                )

        if lower_line and lower_line.is_valid:
            lower_value = lower_line.intercept + lower_line.slope * current_index
            if current_close < lower_value:
                signals.append(
                    ReversalSignal(
                        signal_type="channel_break",
                        direction="bearish",
                        strength=75.0,
                        trigger_price=current_close,
                        bar_index=current_index,
                        explanation=f"Break below lower line at {lower_value:.2f}",
                    )
                )

    # Failed test detection (requires at least 2 bars)
    if current_index >= 1 and current_index < len(closes):
        prev_index = current_index - 1

        if prev_index < len(highs) and prev_index < len(lows):
            prev_high = highs[prev_index]
            prev_low = lows[prev_index]
            prev_close = closes[prev_index]
            current_close = closes[current_index]

            # Check failed test at upper line
            if upper_line and upper_line.is_valid:
                upper_val = upper_line.intercept + upper_line.slope * prev_index
                touch_tolerance = abs(upper_val) * 0.002  # 0.2% tolerance

                # Prev bar high touched upper line
                if abs(prev_high - upper_val) <= touch_tolerance:
                    # Current close is lower than prev close (reversal down)
                    if current_close < prev_close:
                        signals.append(
                            ReversalSignal(
                                signal_type="failed_test",
                                direction="bearish",
                                strength=65.0,
                                trigger_price=prev_high,
                                bar_index=current_index,
                                explanation=f"Failed test at upper {upper_val:.2f}",
                            )
                        )

            # Check failed test at lower line
            if lower_line and lower_line.is_valid:
                lower_val = lower_line.intercept + lower_line.slope * prev_index
                touch_tolerance = abs(lower_val) * 0.002  # 0.2% tolerance

                # Prev bar low touched lower line
                if abs(prev_low - lower_val) <= touch_tolerance:
                    # Current close is higher than prev close (reversal up)
                    if current_close > prev_close:
                        signals.append(
                            ReversalSignal(
                                signal_type="failed_test",
                                direction="bullish",
                                strength=65.0,
                                trigger_price=prev_low,
                                bar_index=current_index,
                                explanation=f"Failed test at lower {lower_val:.2f}",
                            )
                        )

    return signals
