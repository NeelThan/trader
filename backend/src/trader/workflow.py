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
ConfluenceInterpretation = Literal["standard", "important", "significant", "major"]
FibStrategy = Literal["retracement", "extension", "projection", "expansion"]


class LevelWithStrategy(BaseModel):
    """A Fibonacci level with its strategy type for cross-tool confluence detection."""

    price: float
    strategy: FibStrategy


class TradeActionResult(BaseModel):
    """Result of multi-timeframe alignment analysis.

    Determines whether to trade and in which direction based on
    the SignalPro spec rules:
    - Higher TF UP + Lower TF DOWN = GO LONG (buy the dip)
    - Higher TF DOWN + Lower TF UP = GO SHORT (sell the rally)
    - Same direction = STAND ASIDE (wait for pullback)
    - Neutral in either TF = STAND ASIDE
    """

    should_trade: bool
    direction: Literal["long", "short"] | None
    reason: str


class ValidationCheck(BaseModel):
    """Single validation check result.

    Attributes:
        name: Check name (e.g., "Trend Alignment", "RSI Confirmation").
        passed: Whether the check passed.
        explanation: Human-readable explanation of result.
        details: Additional details (optional).
    """

    name: str
    passed: bool
    explanation: str
    details: str | None = None


class ValidationResult(BaseModel):
    """Complete validation result for a trade.

    Contains all 5 validation checks and summary statistics.
    Trade is valid when pass_percentage >= 60%.
    """

    checks: list[ValidationCheck]
    passed_count: int
    total_count: int
    is_valid: bool
    pass_percentage: float


# --- Response Models ---


class ConfluenceBreakdown(BaseModel):
    """Breakdown of confluence score components.

    Each component contributes to the total confluence score:
    - base_fib_level: Always 1 (every Fib level starts with this)
    - same_tf_confluence: +1 per same-timeframe level within tolerance
    - higher_tf_confluence: +2 per higher-timeframe level within tolerance
    - cross_tool_confluence: +2 when different Fib tools converge
    - previous_pivot: +2 if near a previous major pivot
    - psychological_level: +1 if at a round number
    """

    base_fib_level: int = 1
    same_tf_confluence: int = 0
    higher_tf_confluence: int = 0
    cross_tool_confluence: int = 0
    previous_pivot: int = 0
    psychological_level: int = 0


class ConfluenceScore(BaseModel):
    """Weighted confluence score for a price level.

    Score interpretations:
    - 1-2: Standard (basic Fib level)
    - 3-4: Important (some confluence)
    - 5-6: Significant (strong confluence)
    - 7+:  Major (exceptional confluence zone)
    """

    total: int = Field(ge=0)
    breakdown: ConfluenceBreakdown
    interpretation: ConfluenceInterpretation


class TrendAssessment(BaseModel):
    """Result of trend assessment from swing pattern analysis.

    Attributes:
        trend: Overall trend direction (bullish/bearish/neutral).
        phase: Current trend phase (impulse/correction/continuation/exhaustion).
        swing_type: Last detected swing type (HH/HL/LH/LL).
        explanation: Human-readable explanation of the assessment.
        confidence: Confidence level 0-100.
        is_ranging: True if price is moving sideways within a range.
        ranging_warning: Warning message when ranging detected.
    """

    trend: TrendDirection
    phase: TrendPhase
    swing_type: SwingType
    explanation: str
    confidence: int = Field(ge=0, le=100)
    is_ranging: bool = False
    ranging_warning: str | None = None


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


class TradeOpportunity(BaseModel):
    """A trade opportunity identified through multi-timeframe analysis.

    Attributes:
        symbol: Market symbol (e.g., "DJI", "SPX").
        higher_timeframe: Higher timeframe for trend context (e.g., "1D", "1W").
        lower_timeframe: Lower timeframe for entry timing (e.g., "4H", "1H").
        direction: Trade direction (long/short).
        confidence: Confidence score 0-100.
        category: Trade category for position sizing.
        phase: Current trend phase.
        description: Human-readable description of the opportunity.
    """

    symbol: str
    higher_timeframe: str
    lower_timeframe: str
    direction: Literal["long", "short"]
    confidence: int = Field(ge=0, le=100)
    category: TradeCategory
    phase: TrendPhase
    description: str


class OpportunityScanResult(BaseModel):
    """Result of scanning multiple symbols for trade opportunities.

    Attributes:
        symbols_scanned: List of symbols that were scanned.
        opportunities: List of identified trade opportunities.
        scan_time_ms: Time taken to complete the scan in milliseconds.
    """

    symbols_scanned: list[str]
    opportunities: list[TradeOpportunity]
    scan_time_ms: int = Field(ge=0)


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


def _detect_ranging_condition(
    pivots: list[PivotPoint],
    range_threshold_percent: float = 2.0,
) -> tuple[bool, str | None]:
    """Detect if price is moving sideways (ranging market).

    Ranging conditions:
    - Price oscillating within a narrow range (<threshold% of avg price)
    - No clear progression of highs or lows
    - Mixed swing patterns (HH followed by LL, or vice versa)

    Args:
        pivots: Recent pivot points.
        range_threshold_percent: Max range as % of price for ranging (default 2%).

    Returns:
        Tuple of (is_ranging, warning_message).
    """
    if len(pivots) < 4:
        return False, None

    # Get all pivot prices
    prices = [p.price for p in pivots]
    avg_price = sum(prices) / len(prices)
    price_range = max(prices) - min(prices)
    range_percent = (price_range / avg_price) * 100

    # Check 1: Price contained in narrow range
    is_narrow_range = range_percent < range_threshold_percent

    # Check 2: Analyze swing pattern sequence for mixed signals
    highs = [p for p in pivots if p.type == "high"]
    lows = [p for p in pivots if p.type == "low"]

    has_mixed_pattern = False
    if len(highs) >= 2 and len(lows) >= 2:
        # Check if highs are roughly at same level
        high_prices = [h.price for h in highs[-2:]]
        high_diff_pct = abs(high_prices[0] - high_prices[1]) / avg_price * 100

        # Check if lows are roughly at same level
        low_prices = [low.price for low in lows[-2:]]
        low_diff_pct = abs(low_prices[0] - low_prices[1]) / avg_price * 100

        # Mixed pattern: both highs and lows staying at similar levels
        has_mixed_pattern = high_diff_pct < 1.0 and low_diff_pct < 1.0

    is_ranging = is_narrow_range or has_mixed_pattern

    if is_ranging:
        warning = (
            f"Market ranging within {range_percent:.1f}% range. "
            "Fibonacci levels less reliable - consider waiting for breakout."
        )
        return True, warning

    return False, None


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


def determine_trade_action(
    higher_tf_trend: TrendDirection,
    lower_tf_trend: TrendDirection,
) -> TradeActionResult:
    """Determine trade action based on multi-timeframe alignment.

    SignalPro Spec Rules (lines 78-83):
    | Higher TF | Lower TF | Action      |
    |-----------|----------|-------------|
    | UP        | DOWN     | GO LONG     | (buy the dip)
    | DOWN      | UP       | GO SHORT    | (sell the rally)
    | UP        | UP       | STAND ASIDE |
    | DOWN      | DOWN     | STAND ASIDE |

    Args:
        higher_tf_trend: Trend direction of higher timeframe.
        lower_tf_trend: Trend direction of lower timeframe.

    Returns:
        TradeActionResult with should_trade, direction, and reason.
    """
    # Neutral in either TF = no trade
    if higher_tf_trend == "neutral":
        return TradeActionResult(
            should_trade=False,
            direction=None,
            reason="Stand aside - no clear trend on higher timeframe",
        )

    if lower_tf_trend == "neutral":
        return TradeActionResult(
            should_trade=False,
            direction=None,
            reason="Stand aside - wait for pullback on lower timeframe",
        )

    # Same direction = stand aside (no pullback opportunity)
    if higher_tf_trend == lower_tf_trend:
        return TradeActionResult(
            should_trade=False,
            direction=None,
            reason="Stand aside - both timeframes aligned, wait for pullback",
        )

    # UP + DOWN = GO LONG (buy the dip)
    if higher_tf_trend == "bullish" and lower_tf_trend == "bearish":
        return TradeActionResult(
            should_trade=True,
            direction="long",
            reason="Buy the dip - higher TF bullish, lower TF pullback",
        )

    # DOWN + UP = GO SHORT (sell the rally)
    if higher_tf_trend == "bearish" and lower_tf_trend == "bullish":
        return TradeActionResult(
            should_trade=True,
            direction="short",
            reason="Sell the rally - higher TF bearish, lower TF rally",
        )

    # Fallback (shouldn't reach here)
    return TradeActionResult(
        should_trade=False,
        direction=None,
        reason="Stand aside - unclear market conditions",
    )


def calculate_confluence_score(
    level_price: float,
    same_tf_levels: list[float],
    higher_tf_levels: list[float],
    previous_pivots: list[float],
    tolerance_percent: float = 0.5,
    level_strategy: FibStrategy | None = None,
    other_tool_levels: list[LevelWithStrategy] | None = None,
) -> ConfluenceScore:
    """Calculate weighted confluence score for a price level.

    Scoring System:
    - Base Fib level: +1 (always)
    - Same TF confluence: +1 per level within tolerance
    - Higher TF confluence: +2 per level within tolerance
    - Cross-tool confluence: +2 when different Fib tools converge
    - Previous major pivot: +2 if any pivot within tolerance
    - Psychological level: +1 if round number

    Args:
        level_price: The Fibonacci level price to score.
        same_tf_levels: Other Fib levels from the same timeframe.
        higher_tf_levels: Fib levels from higher timeframes.
        previous_pivots: Previous major pivot prices.
        tolerance_percent: Percentage tolerance for confluence (default 0.5%).
        level_strategy: The Fib strategy of this level (for cross-tool detection).
        other_tool_levels: Levels from other Fib tools with their strategy types.

    Returns:
        ConfluenceScore with total, breakdown, and interpretation.
    """
    breakdown = _calculate_breakdown(
        level_price,
        same_tf_levels,
        higher_tf_levels,
        previous_pivots,
        tolerance_percent,
        level_strategy,
        other_tool_levels,
    )
    total = _sum_breakdown(breakdown)
    interpretation = _get_interpretation(total)

    return ConfluenceScore(
        total=total, breakdown=breakdown, interpretation=interpretation
    )


def _calculate_breakdown(
    level_price: float,
    same_tf_levels: list[float],
    higher_tf_levels: list[float],
    previous_pivots: list[float],
    tolerance_percent: float,
    level_strategy: FibStrategy | None = None,
    other_tool_levels: list[LevelWithStrategy] | None = None,
) -> ConfluenceBreakdown:
    """Calculate confluence breakdown from inputs."""
    tolerance = level_price * (tolerance_percent / 100)

    same_tf = _count_levels_in_tolerance(level_price, same_tf_levels, tolerance)
    higher_tf = _count_levels_in_tolerance(level_price, higher_tf_levels, tolerance) * 2
    cross_tool = _calculate_cross_tool_confluence(
        level_price, tolerance, level_strategy, other_tool_levels
    )
    pivot = 2 if _any_level_in_tolerance(level_price, previous_pivots, tolerance) else 0
    psychological = 1 if _is_psychological_level(level_price) else 0

    return ConfluenceBreakdown(
        base_fib_level=1,
        same_tf_confluence=same_tf,
        higher_tf_confluence=higher_tf,
        cross_tool_confluence=cross_tool,
        previous_pivot=pivot,
        psychological_level=psychological,
    )


def _calculate_cross_tool_confluence(
    level_price: float,
    tolerance: float,
    level_strategy: FibStrategy | None,
    other_tool_levels: list[LevelWithStrategy] | None,
) -> int:
    """Calculate cross-tool confluence score.

    Returns +2 for each different Fib tool that has a level within tolerance.
    Only counts tools that are different from the level's own strategy.
    """
    if level_strategy is None or other_tool_levels is None:
        return 0

    # Find unique strategies with levels within tolerance (excluding our own)
    converging_strategies: set[FibStrategy] = set()

    for other_level in other_tool_levels:
        if other_level.strategy == level_strategy:
            continue  # Skip same strategy

        if abs(other_level.price - level_price) <= tolerance:
            converging_strategies.add(other_level.strategy)

    # +2 per different tool that converges
    return len(converging_strategies) * 2


def _count_levels_in_tolerance(
    target: float, levels: list[float], tolerance: float
) -> int:
    """Count how many levels are within tolerance of target."""
    return sum(1 for level in levels if abs(level - target) <= tolerance)


def _any_level_in_tolerance(
    target: float, levels: list[float], tolerance: float
) -> bool:
    """Check if any level is within tolerance of target."""
    return any(abs(level - target) <= tolerance for level in levels)


def _is_psychological_level(price: float) -> bool:
    """Check if price is a psychological level (round number)."""
    if price < 100:
        return price % 10 == 0
    if price < 1000:
        return price % 100 == 0
    if price < 10000:
        return price % 500 == 0
    return price % 1000 == 0


def _sum_breakdown(breakdown: ConfluenceBreakdown) -> int:
    """Sum all components of confluence breakdown."""
    return (
        breakdown.base_fib_level
        + breakdown.same_tf_confluence
        + breakdown.higher_tf_confluence
        + breakdown.cross_tool_confluence
        + breakdown.previous_pivot
        + breakdown.psychological_level
    )


def _get_interpretation(total: int) -> ConfluenceInterpretation:
    """Get interpretation label from total score."""
    if total >= 7:
        return "major"
    if total >= 5:
        return "significant"
    if total >= 3:
        return "important"
    return "standard"


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
            is_ranging=False,
            ranging_warning=None,
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
            is_ranging=False,
            ranging_warning=None,
        )

    swing_type = _detect_latest_swing_type(pivot_result.recent_pivots)
    trend = _determine_trend_from_swing(swing_type)
    explanation = _get_swing_explanation(swing_type)
    current_price = market_result.data[-1].close
    phase = _detect_trend_phase(pivot_result.recent_pivots, current_price, trend)

    # Check for ranging condition
    is_ranging, ranging_warning = _detect_ranging_condition(pivot_result.recent_pivots)

    # Reduce confidence when ranging
    base_confidence = 75 if trend != "neutral" else 50
    confidence = base_confidence - 20 if is_ranging else base_confidence

    return TrendAssessment(
        trend=trend,
        phase=phase,
        swing_type=swing_type,
        explanation=explanation,
        confidence=confidence,
        is_ranging=is_ranging,
        ranging_warning=ranging_warning,
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


async def scan_opportunities(
    symbols: list[str],
    market_service: MarketDataService,
    timeframe_pairs: list[tuple[str, str]] | None = None,
) -> OpportunityScanResult:
    """Scan multiple symbols for trade opportunities.

    Analyzes each symbol across timeframe pairs to identify potential trades.
    Uses higher timeframe for trend context and lower timeframe for entry timing.

    Args:
        symbols: List of market symbols to scan (e.g., ["DJI", "SPX", "NDX"]).
        market_service: Service for fetching market data.
        timeframe_pairs: Optional list of (higher_tf, lower_tf) tuples.
                        Defaults to [("1D", "4H")].

    Returns:
        OpportunityScanResult with all identified opportunities.
    """
    import time

    start_time = time.monotonic()

    if timeframe_pairs is None:
        timeframe_pairs = [("1D", "4H")]

    opportunities: list[TradeOpportunity] = []

    for symbol in symbols:
        for higher_tf, lower_tf in timeframe_pairs:
            opportunity = await _analyze_symbol_pair(
                symbol, higher_tf, lower_tf, market_service
            )
            if opportunity:
                opportunities.append(opportunity)

    elapsed_ms = int((time.monotonic() - start_time) * 1000)

    return OpportunityScanResult(
        symbols_scanned=list(symbols),
        opportunities=opportunities,
        scan_time_ms=elapsed_ms,
    )


async def _analyze_symbol_pair(
    symbol: str,
    higher_tf: str,
    lower_tf: str,
    market_service: MarketDataService,
) -> TradeOpportunity | None:
    """Analyze a symbol for opportunities on a timeframe pair.

    Uses multi-timeframe alignment rules per SignalPro spec:
    - Higher TF UP + Lower TF DOWN = GO LONG (buy the dip)
    - Higher TF DOWN + Lower TF UP = GO SHORT (sell the rally)
    - Same direction or neutral = STAND ASIDE
    """
    higher_assessment = await assess_trend(symbol, higher_tf, market_service)
    lower_assessment = await assess_trend(symbol, lower_tf, market_service)

    # Skip if confidence is too low
    if higher_assessment.confidence < 60:
        return None

    # Use multi-timeframe alignment rules to determine trade action
    trade_action = determine_trade_action(
        higher_tf_trend=higher_assessment.trend,
        lower_tf_trend=lower_assessment.trend,
    )

    # No trade if rules say stand aside
    if not trade_action.should_trade or trade_action.direction is None:
        return None

    direction = trade_action.direction

    # Calculate combined confidence
    combined = higher_assessment.confidence + lower_assessment.confidence
    confidence = min(100, combined // 2)

    # Determine trade category
    category = categorize_trade(
        higher_tf_trend=higher_assessment.trend,
        lower_tf_trend=lower_assessment.trend,
        trade_direction=direction,
        confluence_score=3,  # Default moderate confluence
    )

    # Build description
    direction_text = "Buy" if direction == "long" else "Sell"
    phase_text = lower_assessment.phase
    trend_text = higher_assessment.trend
    description = f"{direction_text} {phase_text} in {higher_tf} {trend_text} trend"

    return TradeOpportunity(
        symbol=symbol,
        higher_timeframe=higher_tf,
        lower_timeframe=lower_tf,
        direction=direction,
        confidence=confidence,
        category=category,
        phase=lower_assessment.phase,
        description=description,
    )


async def validate_trade(
    symbol: str,
    higher_timeframe: str,
    lower_timeframe: str,
    direction: Literal["long", "short"],
    market_service: MarketDataService,
) -> ValidationResult:
    """Validate a trade opportunity with 5 checks.

    Performs the following validation checks:
    1. Trend Alignment - Higher/lower TF alignment per rules
    2. Entry Zone - Fibonacci entry levels found
    3. Target Zones - Extension targets found
    4. RSI Confirmation - Momentum confirmation
    5. MACD Confirmation - Trend momentum intact

    Trade is valid when pass_percentage >= 60% (3+ checks).

    Args:
        symbol: Market symbol.
        higher_timeframe: Higher timeframe for trend context.
        lower_timeframe: Lower timeframe for entry timing.
        direction: Trade direction (long/short).
        market_service: Service for fetching market data.

    Returns:
        ValidationResult with all 5 checks and summary statistics.
    """
    checks: list[ValidationCheck] = []

    # Fetch trend assessments
    higher_assessment = await assess_trend(symbol, higher_timeframe, market_service)
    lower_assessment = await assess_trend(symbol, lower_timeframe, market_service)

    # 1. Trend Alignment Check
    trade_action = determine_trade_action(
        higher_tf_trend=higher_assessment.trend,
        lower_tf_trend=lower_assessment.trend,
    )
    alignment_passed = (
        trade_action.should_trade
        and trade_action.direction == direction
        and higher_assessment.confidence >= 60
    )
    alignment_explanation = (
        trade_action.reason
        if alignment_passed
        else "Timeframes not aligned for this trade direction"
    )
    alignment_details = (
        f"Higher TF: {higher_assessment.trend}, "
        f"Lower TF: {lower_assessment.trend}, "
        f"Confidence: {higher_assessment.confidence}%"
    )
    checks.append(
        ValidationCheck(
            name="Trend Alignment",
            passed=alignment_passed,
            explanation=alignment_explanation,
            details=alignment_details,
        )
    )

    # 2. Entry Zone Check (Fibonacci retracement levels)
    fib_direction: Literal["buy", "sell"] = "buy" if direction == "long" else "sell"
    levels_result = await identify_fibonacci_levels(
        symbol, lower_timeframe, fib_direction, market_service
    )
    entry_zone_passed = len(levels_result.entry_zones) > 0
    entry_count = len(levels_result.entry_zones)
    entry_explanation = (
        f"Found {entry_count} Fibonacci entry levels"
        if entry_zone_passed
        else "No Fibonacci entry zones found"
    )
    entry_details = None
    if entry_zone_passed:
        best = levels_result.entry_zones[0]
        entry_details = f"Best: {best.label} at {best.price:.2f}"
    checks.append(
        ValidationCheck(
            name="Entry Zone",
            passed=entry_zone_passed,
            explanation=entry_explanation,
            details=entry_details,
        )
    )

    # 3. Target Zone Check (Fibonacci extension levels)
    target_zones_passed = len(levels_result.target_zones) > 0
    target_count = len(levels_result.target_zones)
    target_explanation = (
        f"Found {target_count} extension targets"
        if target_zones_passed
        else "No extension targets found"
    )
    target_details = None
    if target_zones_passed:
        first = levels_result.target_zones[0]
        target_details = f"First: {first.label} at {first.price:.2f}"
    checks.append(
        ValidationCheck(
            name="Target Zones",
            passed=target_zones_passed,
            explanation=target_explanation,
            details=target_details,
        )
    )

    # 4. RSI Confirmation
    confirmation = await confirm_with_indicators(
        symbol, lower_timeframe, market_service
    )
    rsi_passed = _check_rsi_confirmation(
        direction,
        confirmation.rsi.signal,
        higher_assessment.trend,
        lower_assessment.trend,
    )
    rsi_explanation = _get_rsi_explanation(
        direction,
        confirmation.rsi.signal,
        confirmation.rsi.value,
        higher_assessment.trend,
        lower_assessment.trend,
    )
    rsi_details = None
    if confirmation.rsi.value:
        rsi_details = f"RSI: {confirmation.rsi.value:.1f}"
    checks.append(
        ValidationCheck(
            name="RSI Confirmation",
            passed=rsi_passed,
            explanation=rsi_explanation,
            details=rsi_details,
        )
    )

    # 5. MACD Confirmation
    higher_confirmation = await confirm_with_indicators(
        symbol, higher_timeframe, market_service
    )
    macd_passed = _check_macd_confirmation(
        direction,
        higher_confirmation.macd.signal,
        higher_assessment.trend,
        lower_assessment.trend,
    )
    macd_explanation = _get_macd_explanation(
        direction,
        higher_confirmation.macd.signal,
        higher_timeframe,
        higher_assessment.trend,
        lower_assessment.trend,
    )
    checks.append(
        ValidationCheck(
            name="MACD Confirmation",
            passed=macd_passed,
            explanation=macd_explanation,
            details=f"Higher TF MACD: {higher_confirmation.macd.signal}",
        )
    )

    # Calculate summary
    passed_count = sum(1 for c in checks if c.passed)
    total_count = len(checks)
    pass_percentage = (passed_count / total_count) * 100
    is_valid = pass_percentage >= 60

    return ValidationResult(
        checks=checks,
        passed_count=passed_count,
        total_count=total_count,
        is_valid=is_valid,
        pass_percentage=pass_percentage,
    )


def _check_rsi_confirmation(
    direction: Literal["long", "short"],
    rsi_signal: SignalType,
    higher_trend: TrendDirection,
    lower_trend: TrendDirection,
) -> bool:
    """Check RSI confirmation based on pullback logic.

    For pullback setups (higher TF trending, lower TF counter-trend):
    - LONG: RSI bearish/oversold = GOOD (pullback entry opportunity)
    - SHORT: RSI bullish/overbought = GOOD (rally entry opportunity)
    """
    is_long_pullback = (
        direction == "long"
        and higher_trend == "bullish"
        and lower_trend == "bearish"
    )
    is_short_pullback = (
        direction == "short"
        and higher_trend == "bearish"
        and lower_trend == "bullish"
    )
    is_pullback = is_long_pullback or is_short_pullback

    if is_pullback:
        if direction == "long":
            return rsi_signal in ("bearish", "oversold")
        return rsi_signal in ("bullish", "overbought")

    # Non-pullback: check trend alignment
    if direction == "long":
        return rsi_signal in ("bullish", "oversold", "neutral")
    return rsi_signal in ("bearish", "overbought", "neutral")


def _get_rsi_explanation(
    direction: Literal["long", "short"],
    rsi_signal: SignalType,
    rsi_value: float | None,
    higher_trend: TrendDirection,
    lower_trend: TrendDirection,
) -> str:
    """Get RSI explanation based on direction and signal."""
    is_long_pullback = (
        direction == "long"
        and higher_trend == "bullish"
        and lower_trend == "bearish"
    )
    is_short_pullback = (
        direction == "short"
        and higher_trend == "bearish"
        and lower_trend == "bullish"
    )
    is_pullback = is_long_pullback or is_short_pullback

    rsi_str = f"{rsi_value:.1f}" if rsi_value else "N/A"

    if is_pullback:
        if direction == "long":
            if rsi_signal in ("bearish", "oversold"):
                return f"RSI {rsi_str} - pullback entry opportunity"
            return f"RSI {rsi_str} - wait for deeper pullback"
        if rsi_signal in ("bullish", "overbought"):
            return f"RSI {rsi_str} - rally entry opportunity"
        return f"RSI {rsi_str} - wait for stronger rally"

    return f"RSI {rsi_signal} ({rsi_str})"


def _check_macd_confirmation(
    direction: Literal["long", "short"],
    macd_signal: SignalType,
    higher_trend: TrendDirection,
    lower_trend: TrendDirection,
) -> bool:
    """Check MACD confirmation.

    For pullbacks, we check the higher TF MACD for trend confirmation.
    """
    is_long_pullback = (
        direction == "long"
        and higher_trend == "bullish"
        and lower_trend == "bearish"
    )
    is_short_pullback = (
        direction == "short"
        and higher_trend == "bearish"
        and lower_trend == "bullish"
    )
    is_pullback = is_long_pullback or is_short_pullback

    if is_pullback:
        # Check that higher TF MACD confirms trend direction
        if direction == "long":
            return macd_signal == "bullish"
        return macd_signal == "bearish"

    # Non-pullback: direct momentum check
    if direction == "long":
        return macd_signal == "bullish"
    return macd_signal == "bearish"


def _get_macd_explanation(
    direction: Literal["long", "short"],
    macd_signal: SignalType,
    higher_timeframe: str,
    higher_trend: TrendDirection,
    lower_trend: TrendDirection,
) -> str:
    """Get MACD explanation based on direction and signal."""
    is_long_pullback = (
        direction == "long"
        and higher_trend == "bullish"
        and lower_trend == "bearish"
    )
    is_short_pullback = (
        direction == "short"
        and higher_trend == "bearish"
        and lower_trend == "bullish"
    )
    is_pullback = is_long_pullback or is_short_pullback

    if is_pullback:
        expected = "bullish" if direction == "long" else "bearish"
        if macd_signal == expected:
            return f"{higher_timeframe} MACD {macd_signal} - trend momentum intact"
        return f"{higher_timeframe} MACD {macd_signal} - trend momentum weakening"

    if direction == "long":
        if macd_signal == "bullish":
            return f"MACD bullish confirms {direction} momentum"
        return f"MACD {macd_signal} - momentum not confirmed"

    if macd_signal == "bearish":
        return f"MACD bearish confirms {direction} momentum"
    return f"MACD {macd_signal} - momentum not confirmed"
