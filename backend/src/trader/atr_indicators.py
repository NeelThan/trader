"""ATR (Average True Range) indicators for volatility analysis.

This module provides ATR-based indicators for:
- Volatility measurement and classification
- Stop loss placement suggestions
- Position sizing guidance based on market conditions

ATR is calculated as the moving average of True Range, where:
True Range = max(High - Low, |High - Previous Close|, |Low - Previous Close|)

Volatility Classifications (based on ATR% of price):
- Low: < 0.5% (quiet market, may lack movement)
- Normal: 0.5% - 1.5% (typical conditions)
- High: 1.5% - 3.0% (elevated volatility, use caution)
- Extreme: > 3.0% (very volatile, reduce size or avoid)
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ATRAnalysis:
    """Results from ATR analysis.

    Attributes:
        atr: Raw ATR value in price units.
        atr_percent: ATR as percentage of current price (normalized volatility).
        volatility_level: Classification (low/normal/high/extreme).
        current_price: Current price used for calculations.
        suggested_stop_1x: Stop distance at 1.0x ATR (tight).
        suggested_stop_1_5x: Stop distance at 1.5x ATR (standard).
        suggested_stop_2x: Stop distance at 2.0x ATR (conservative).
        interpretation: Human-readable interpretation.
    """

    atr: float
    atr_percent: float
    volatility_level: str
    current_price: float
    suggested_stop_1x: float
    suggested_stop_1_5x: float
    suggested_stop_2x: float
    interpretation: str


def calculate_true_range(
    high: float,
    low: float,
    previous_close: float | None,
) -> float:
    """Calculate True Range for a single bar.

    True Range is the greatest of:
    - Current High - Current Low
    - |Current High - Previous Close|
    - |Current Low - Previous Close|

    For the first bar (no previous close), TR = High - Low.

    Args:
        high: Current bar's high price.
        low: Current bar's low price.
        previous_close: Previous bar's close price (None for first bar).

    Returns:
        True Range value.
    """
    if previous_close is None:
        return high - low

    return max(
        high - low,
        abs(high - previous_close),
        abs(low - previous_close),
    )


def calculate_atr(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> list[float | None]:
    """Calculate Average True Range series.

    Uses Wilder's smoothing method (exponential moving average).

    Args:
        highs: List of high prices.
        lows: List of low prices.
        closes: List of close prices.
        period: ATR period (default 14).

    Returns:
        List of ATR values, with None for insufficient data.
    """
    if not highs or len(highs) != len(lows) or len(highs) != len(closes):
        return []

    if period <= 0 or len(highs) < period:
        return [None] * len(highs)

    # Calculate True Range for each bar
    true_ranges: list[float] = []
    for i in range(len(highs)):
        prev_close = closes[i - 1] if i > 0 else None
        tr = calculate_true_range(highs[i], lows[i], prev_close)
        true_ranges.append(tr)

    # Calculate ATR using Wilder's smoothing
    result: list[float | None] = []
    atr: float | None = None

    for i in range(len(true_ranges)):
        if i < period - 1:
            # Not enough data yet
            result.append(None)
        elif i == period - 1:
            # First ATR is simple average of first `period` TRs
            atr = sum(true_ranges[: period]) / period
            result.append(atr)
        else:
            # Subsequent ATRs use Wilder's smoothing
            # ATR = ((Previous ATR * (period - 1)) + Current TR) / period
            if atr is not None:
                atr = ((atr * (period - 1)) + true_ranges[i]) / period
                result.append(atr)
            else:
                result.append(None)

    return result


def classify_volatility(atr_percent: float) -> tuple[str, str]:
    """Classify volatility level based on ATR percentage.

    Args:
        atr_percent: ATR as percentage of price.

    Returns:
        Tuple of (level, interpretation).
    """
    if atr_percent < 0.5:
        return (
            "low",
            "Low volatility - market is quiet, may lack directional movement",
        )
    elif atr_percent < 1.5:
        return (
            "normal",
            "Normal volatility - typical trading conditions",
        )
    elif atr_percent < 3.0:
        return (
            "high",
            "High volatility - use caution, consider reducing position size",
        )
    else:
        return (
            "extreme",
            "Extreme volatility - very risky, consider avoiding or minimal size",
        )


def analyze_atr(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> ATRAnalysis | None:
    """Analyze ATR for trading decisions.

    Calculates ATR and provides:
    - Volatility classification
    - Suggested stop loss distances
    - Trading interpretation

    Args:
        highs: List of high prices.
        lows: List of low prices.
        closes: List of close prices.
        period: ATR period (default 14).

    Returns:
        ATRAnalysis with volatility info and stop suggestions,
        or None if insufficient data.
    """
    if len(highs) < period or len(closes) < period:
        return None

    # Calculate ATR series
    atr_values = calculate_atr(highs, lows, closes, period)

    # Get most recent ATR
    recent_atr = atr_values[-1]
    if recent_atr is None:
        return None

    # Get current price
    current_price = closes[-1]
    if current_price <= 0:
        return None

    # Calculate ATR as percentage of price
    atr_percent = (recent_atr / current_price) * 100

    # Classify volatility
    volatility_level, interpretation = classify_volatility(atr_percent)

    # Calculate suggested stop distances
    stop_1x = round(recent_atr, 2)
    stop_1_5x = round(recent_atr * 1.5, 2)
    stop_2x = round(recent_atr * 2.0, 2)

    return ATRAnalysis(
        atr=round(recent_atr, 2),
        atr_percent=round(atr_percent, 2),
        volatility_level=volatility_level,
        current_price=round(current_price, 2),
        suggested_stop_1x=stop_1x,
        suggested_stop_1_5x=stop_1_5x,
        suggested_stop_2x=stop_2x,
        interpretation=interpretation,
    )


def get_atr_series(
    highs: list[float],
    lows: list[float],
    closes: list[float],
    period: int = 14,
) -> list[float | None]:
    """Get full ATR series for charting.

    Args:
        highs: List of high prices.
        lows: List of low prices.
        closes: List of close prices.
        period: ATR period (default 14).

    Returns:
        List of ATR values aligned with input data.
    """
    return calculate_atr(highs, lows, closes, period)
