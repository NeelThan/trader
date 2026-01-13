"""Trading Workflow module for 8-step guided trading process.

This module provides workflow-specific analysis for the trading process:
1. SELECT - Symbol/timeframe selection (frontend only)
2. ASSESS - Trend assessment from swing patterns
3. ALIGN - Multi-timeframe alignment check
4. LEVELS - Fibonacci level identification
5. CONFIRM - Indicator confirmation (RSI/MACD)
6. SIZE - Position sizing (reuses position_sizing module)
7. PLAN - Trade plan generation (reuses risk/reward calculation)
8. MANAGE - Trade tracking (reuses journal module)

Each function is designed to be under 20 lines following clean code principles.
"""

from typing import Literal

from pydantic import BaseModel, Field

from trader.fibonacci import (
    ExtensionLevel,
    FibonacciLevel,
    calculate_extension_levels,
    calculate_retracement_levels,
)
from trader.indicators import calculate_macd, calculate_rsi
from trader.market_data import MarketDataService
from trader.pivots import OHLCBar as PivotOHLCBar
from trader.pivots import PivotPoint, detect_pivots

# --- Type Aliases ---
TrendDirection = Literal["bullish", "bearish", "neutral"]
SwingType = Literal["HH", "HL", "LH", "LL"]
StrengthLevel = Literal["strong", "moderate", "weak"]
SignalType = Literal["bullish", "bearish", "neutral", "oversold", "overbought"]
OverallConfirmation = Literal["strong", "partial", "wait"]

# --- Extended Framework Type Aliases ---
TrendPhase = Literal["impulse", "correction", "continuation", "exhaustion"]
TradeCategory = Literal["with_trend", "counter_trend", "reversal_attempt"]


# --- Response Models ---


class TrendAssessment(BaseModel):
    """Result of trend assessment from swing pattern analysis.

    Attributes:
        trend: Overall trend direction (bullish/bearish/neutral).
        phase: Current trend phase (impulse/correction/continuation/exhaustion).
        swing_type: Last detected swing type (HH/HL/LH/LL).
        explanation: Human-readable explanation of the assessment.
        confidence: Confidence level 0-100.
    """

    trend: TrendDirection
    phase: TrendPhase
    swing_type: SwingType
    explanation: str
    confidence: int = Field(ge=0, le=100)


class TimeframeTrend(BaseModel):
    """Trend analysis for a single timeframe.

    Attributes:
        timeframe: Timeframe code (e.g., "1M", "1W", "1D").
        trend: Trend direction for this timeframe.
        swing_type: Latest swing type detected.
    """

    timeframe: str
    trend: TrendDirection
    swing_type: SwingType | None = None


class AlignmentResult(BaseModel):
    """Result of multi-timeframe alignment check.

    Attributes:
        aligned_count: Number of timeframes aligned with dominant trend.
        total_count: Total number of timeframes checked.
        strength: Overall alignment strength.
        timeframes: Individual timeframe results.
    """

    aligned_count: int
    total_count: int
    strength: StrengthLevel
    timeframes: list[TimeframeTrend]


class LevelZone(BaseModel):
    """A single price level zone.

    Attributes:
        label: Level identifier (e.g., "R61.8%", "E127.2%").
        price: Price value.
        heat: Confluence score 0-100.
        formula: Calculation formula for education.
    """

    label: str
    price: float
    heat: int = Field(ge=0, le=100)
    formula: str


class LevelsResult(BaseModel):
    """Result of Fibonacci level identification.

    Attributes:
        entry_zones: Retracement levels for potential entries.
        target_zones: Extension levels for potential targets.
    """

    entry_zones: list[LevelZone]
    target_zones: list[LevelZone]


class IndicatorSignal(BaseModel):
    """Signal from a single indicator.

    Attributes:
        value: Numeric value (RSI value, None for MACD).
        signal: Signal interpretation.
        explanation: Human-readable explanation.
    """

    value: float | None
    signal: SignalType
    explanation: str


class IndicatorConfirmation(BaseModel):
    """Result of indicator confirmation check.

    Attributes:
        rsi: RSI indicator signal.
        macd: MACD indicator signal.
        overall: Combined confirmation status.
    """

    rsi: IndicatorSignal
    macd: IndicatorSignal
    overall: OverallConfirmation


# --- Helper Functions (Private) ---


def _determine_trend_from_swing(swing_type: SwingType) -> TrendDirection:
    """Determine trend direction from swing type."""
    if swing_type in ("HH", "HL"):
        return "bullish"
    if swing_type in ("LH", "LL"):
        return "bearish"
    return "neutral"


def _get_swing_explanation(swing_type: SwingType) -> str:
    """Get human-readable explanation for swing type."""
    explanations = {
        "HH": "Higher High pattern = strong bullish momentum",
        "HL": "Higher Low pattern = buyers stepping in higher",
        "LH": "Lower High pattern = sellers stepping in lower",
        "LL": "Lower Low pattern = strong bearish momentum",
    }
    return explanations.get(swing_type, "No clear pattern detected")


def _calculate_alignment_strength(aligned: int, total: int) -> StrengthLevel:
    """Calculate alignment strength from counts."""
    if total == 0:
        return "weak"
    ratio = aligned / total
    if ratio >= 0.7:
        return "strong"
    if ratio >= 0.4:
        return "moderate"
    return "weak"


def _interpret_rsi(value: float) -> tuple[SignalType, str]:
    """Interpret RSI value into signal and explanation."""
    if value < 30:
        return "oversold", "RSI below 30 = potential buy opportunity"
    if value > 70:
        return "overbought", "RSI above 70 = potential sell signal"
    if value < 50:
        return "neutral", f"RSI at {value:.1f} = slightly bearish bias"
    return "neutral", f"RSI at {value:.1f} = slightly bullish bias"


def _interpret_macd(histogram_value: float) -> tuple[SignalType, str]:
    """Interpret MACD histogram into signal and explanation."""
    if histogram_value > 0:
        return "bullish", "MACD histogram positive = bullish momentum"
    if histogram_value < 0:
        return "bearish", "MACD histogram negative = bearish momentum"
    return "neutral", "MACD histogram at zero = no clear momentum"


def _combine_confirmations(
    rsi_signal: SignalType, macd_signal: SignalType
) -> OverallConfirmation:
    """Combine RSI and MACD signals into overall confirmation."""
    bullish_signals = {"bullish", "oversold"}
    bearish_signals = {"bearish", "overbought"}

    rsi_bullish = rsi_signal in bullish_signals
    macd_bullish = macd_signal in bullish_signals
    rsi_bearish = rsi_signal in bearish_signals
    macd_bearish = macd_signal in bearish_signals

    if rsi_bullish and macd_bullish:
        return "strong"
    if rsi_bearish and macd_bearish:
        return "strong"
    if rsi_bullish or macd_bullish or rsi_bearish or macd_bearish:
        return "partial"
    return "wait"


def _detect_trend_phase(
    pivots: list[PivotPoint],
    current_price: float,
    trend: TrendDirection,
) -> TrendPhase:
    """Detect current trend phase from pivot structure and price position.

    Phase Logic:
    - IMPULSE: Price moving away from last pivot in trend direction
    - CORRECTION: Price pulling back against trend direction
    - CONTINUATION: Price resumed trend after correction
    - EXHAUSTION: Multiple failed attempts or neutral trend
    """
    if trend == "neutral" or len(pivots) < 2:
        return "correction"

    last_pivot = pivots[-1]

    if trend == "bullish":
        if current_price > last_pivot.price:
            return "impulse" if last_pivot.type == "low" else "continuation"
        return "correction"

    # trend == "bearish"
    if current_price < last_pivot.price:
        return "impulse" if last_pivot.type == "high" else "continuation"
    return "correction"


def categorize_trade(
    higher_tf_trend: TrendDirection,
    lower_tf_trend: TrendDirection,
    trade_direction: Literal["long", "short"],
    confluence_score: int,
) -> TradeCategory:
    """Categorize trade for position sizing based on trend alignment.

    Trade Categories:
    - WITH_TREND: Trading in direction of higher TF trend (highest probability)
    - COUNTER_TREND: Against higher TF at major levels (confluence >= 5)
    - REVERSAL_ATTEMPT: Against higher TF with low confluence (speculative)

    Args:
        higher_tf_trend: Trend direction of higher timeframe.
        lower_tf_trend: Trend direction of lower timeframe.
        trade_direction: Intended trade direction (long/short).
        confluence_score: Confluence score at the level (1-10).

    Returns:
        TradeCategory for position sizing decisions.
    """
    is_with_trend = _is_aligned_with_higher_tf(higher_tf_trend, trade_direction)

    if is_with_trend:
        return "with_trend"

    # Trading against higher TF - check confluence
    if confluence_score >= 5:
        return "counter_trend"

    return "reversal_attempt"


def _is_aligned_with_higher_tf(
    higher_tf_trend: TrendDirection,
    trade_direction: Literal["long", "short"],
) -> bool:
    """Check if trade direction aligns with higher timeframe trend."""
    if higher_tf_trend == "bullish" and trade_direction == "long":
        return True
    if higher_tf_trend == "bearish" and trade_direction == "short":
        return True
    return False


# --- Main Functions ---


async def assess_trend(
    symbol: str,
    timeframe: str,
    market_service: MarketDataService,
) -> TrendAssessment:
    """Assess trend direction from swing pattern analysis.

    Args:
        symbol: Market symbol (e.g., "DJI").
        timeframe: Chart timeframe (e.g., "1D").
        market_service: Service for fetching market data.

    Returns:
        TrendAssessment with trend direction and explanation.
    """
    market_result = await market_service.get_ohlc(symbol, timeframe, periods=50)

    if not market_result.success or not market_result.data:
        return TrendAssessment(
            trend="neutral",
            phase="correction",
            swing_type="HL",
            explanation="Unable to fetch market data",
            confidence=0,
        )

    pivot_bars = [
        PivotOHLCBar(
            time=bar.time, open=bar.open, high=bar.high, low=bar.low, close=bar.close
        )
        for bar in market_result.data
    ]

    pivot_result = detect_pivots(data=pivot_bars, lookback=5, count=4)

    if not pivot_result.recent_pivots:
        return TrendAssessment(
            trend="neutral",
            phase="correction",
            swing_type="HL",
            explanation="Insufficient pivot data",
            confidence=30,
        )

    swing_type = _detect_latest_swing_type(pivot_result.recent_pivots)
    trend = _determine_trend_from_swing(swing_type)
    explanation = _get_swing_explanation(swing_type)
    current_price = market_result.data[-1].close
    phase = _detect_trend_phase(pivot_result.recent_pivots, current_price, trend)

    return TrendAssessment(
        trend=trend,
        phase=phase,
        swing_type=swing_type,
        explanation=explanation,
        confidence=75 if trend != "neutral" else 50,
    )


def _detect_latest_swing_type(pivots: list[PivotPoint]) -> SwingType:
    """Detect swing type from recent pivots."""
    if len(pivots) < 2:
        return "HL"

    latest = pivots[-1]
    previous = pivots[-2]

    if latest.type == "high":
        return "HH" if latest.price > previous.price else "LH"
    return "HL" if latest.price > previous.price else "LL"


async def check_timeframe_alignment(
    symbol: str,
    timeframes: list[str],
    market_service: MarketDataService,
) -> AlignmentResult:
    """Check trend alignment across multiple timeframes.

    Args:
        symbol: Market symbol.
        timeframes: List of timeframes to check.
        market_service: Service for fetching market data.

    Returns:
        AlignmentResult with alignment count and per-TF details.
    """
    results: list[TimeframeTrend] = []
    bullish_count = 0
    bearish_count = 0

    for tf in timeframes:
        assessment = await assess_trend(symbol, tf, market_service)
        results.append(
            TimeframeTrend(
                timeframe=tf,
                trend=assessment.trend,
                swing_type=assessment.swing_type,
            )
        )
        if assessment.trend == "bullish":
            bullish_count += 1
        elif assessment.trend == "bearish":
            bearish_count += 1

    aligned_count = max(bullish_count, bearish_count)
    strength = _calculate_alignment_strength(aligned_count, len(timeframes))

    return AlignmentResult(
        aligned_count=aligned_count,
        total_count=len(timeframes),
        strength=strength,
        timeframes=results,
    )


async def identify_fibonacci_levels(
    symbol: str,
    timeframe: str,
    direction: Literal["buy", "sell"],
    market_service: MarketDataService,
) -> LevelsResult:
    """Identify Fibonacci levels for entries and targets.

    Args:
        symbol: Market symbol.
        timeframe: Chart timeframe.
        direction: Trade direction for level calculation.
        market_service: Service for fetching market data.

    Returns:
        LevelsResult with entry and target zones.
    """
    market_result = await market_service.get_ohlc(symbol, timeframe, periods=50)

    if not market_result.success or not market_result.data:
        return LevelsResult(entry_zones=[], target_zones=[])

    pivot_bars = [
        PivotOHLCBar(
            time=bar.time, open=bar.open, high=bar.high, low=bar.low, close=bar.close
        )
        for bar in market_result.data
    ]

    pivot_result = detect_pivots(data=pivot_bars, lookback=5, count=4)

    if not pivot_result.swing_high or not pivot_result.swing_low:
        return LevelsResult(entry_zones=[], target_zones=[])

    high = pivot_result.swing_high.price
    low = pivot_result.swing_low.price

    return _build_levels_result(high, low, direction)


def _build_levels_result(
    high: float, low: float, direction: Literal["buy", "sell"]
) -> LevelsResult:
    """Build LevelsResult from swing high/low prices."""
    retracement = calculate_retracement_levels(high, low, direction)
    extension = calculate_extension_levels(high, low, direction)

    price_range = high - low
    entry_zones = _create_entry_zones(retracement, high, price_range)
    target_zones = _create_target_zones(extension, low, price_range)

    return LevelsResult(entry_zones=entry_zones, target_zones=target_zones)


def _create_entry_zones(
    levels: dict[FibonacciLevel, float], high: float, price_range: float
) -> list[LevelZone]:
    """Create entry zone objects from retracement levels."""
    zones = []
    for ratio, price in levels.items():
        ratio_pct = int(ratio.value * 100)
        formula = f"{high} - ({price_range:.0f} x {ratio.value})"
        zones.append(
            LevelZone(label=f"R{ratio_pct}%", price=price, heat=50, formula=formula)
        )
    return zones


def _create_target_zones(
    levels: dict[ExtensionLevel, float], low: float, price_range: float
) -> list[LevelZone]:
    """Create target zone objects from extension levels."""
    zones = []
    for ratio, price in levels.items():
        ratio_pct = int(ratio.value * 100)
        formula = f"{low} + ({price_range:.0f} x {ratio.value})"
        zones.append(
            LevelZone(label=f"E{ratio_pct}%", price=price, heat=50, formula=formula)
        )
    return zones


async def confirm_with_indicators(
    symbol: str,
    timeframe: str,
    market_service: MarketDataService,
) -> IndicatorConfirmation:
    """Confirm trade setup with RSI and MACD indicators.

    Args:
        symbol: Market symbol.
        timeframe: Chart timeframe.
        market_service: Service for fetching market data.

    Returns:
        IndicatorConfirmation with RSI, MACD signals and overall status.
    """
    market_result = await market_service.get_ohlc(symbol, timeframe, periods=50)

    if not market_result.success or not market_result.data:
        return _create_neutral_confirmation()

    closes = [bar.close for bar in market_result.data]

    # RSI needs at least 15 bars, MACD needs at least 26
    if len(closes) < 15:
        return _create_neutral_confirmation()

    rsi_result = calculate_rsi(closes, period=14)
    rsi_value = _get_latest_rsi_value(rsi_result.rsi)
    rsi_signal, rsi_explanation = _interpret_rsi(rsi_value)

    # MACD needs 26 bars minimum
    macd_signal: SignalType
    if len(closes) < 26:
        macd_signal = "neutral"
        macd_explanation = "Insufficient data for MACD"
    else:
        macd_result = calculate_macd(closes)
        macd_value = _get_latest_macd_histogram(macd_result.histogram)
        macd_signal, macd_explanation = _interpret_macd(macd_value)

    overall = _combine_confirmations(rsi_signal, macd_signal)

    return IndicatorConfirmation(
        rsi=IndicatorSignal(
            value=rsi_value, signal=rsi_signal, explanation=rsi_explanation
        ),
        macd=IndicatorSignal(
            value=None, signal=macd_signal, explanation=macd_explanation
        ),
        overall=overall,
    )


def _get_latest_rsi_value(rsi_values: list[float | None]) -> float:
    """Get latest non-None RSI value."""
    for value in reversed(rsi_values):
        if value is not None:
            return value
    return 50.0


def _get_latest_macd_histogram(histogram: list[float | None]) -> float:
    """Get latest non-None MACD histogram value."""
    for value in reversed(histogram):
        if value is not None:
            return value
    return 0.0


def _create_neutral_confirmation() -> IndicatorConfirmation:
    """Create neutral confirmation when data unavailable."""
    return IndicatorConfirmation(
        rsi=IndicatorSignal(value=50.0, signal="neutral", explanation="No data"),
        macd=IndicatorSignal(value=None, signal="neutral", explanation="No data"),
        overall="wait",
    )
