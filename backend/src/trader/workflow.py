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

from trader.atr_indicators import ATRAnalysis, analyze_atr
from trader.fibonacci import (
    ExtensionLevel,
    FibonacciLevel,
    calculate_extension_levels,
    calculate_retracement_levels,
)
from trader.indicators import calculate_macd, calculate_rsi
from trader.market_data import MarketDataService
from trader.market_data.models import OHLCBar as MarketOHLCBar
from trader.pivots import OHLCBar as PivotOHLCBar
from trader.pivots import PivotPoint, detect_pivots
from trader.signals import Bar as SignalBar
from trader.signals import detect_signal
from trader.volume_indicators import analyze_volume

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

# --- Cascade Effect Constants ---
TIMEFRAME_HIERARCHY = ["1M", "1W", "1D", "4H", "1H", "15m", "5m", "3m", "1m"]


class LevelWithStrategy(BaseModel):
    """A Fibonacci level with its strategy type for cross-tool confluence detection."""

    price: float
    strategy: FibStrategy


class TradeActionResult(BaseModel):
    """Result of multi-timeframe alignment analysis.

    Determines whether to trade and in which direction based on
    the SignalPro spec rules:
    - Higher TF UP + Lower TF DOWN = GO LONG (buy the dip) - PULLBACK
    - Higher TF DOWN + Lower TF UP = GO SHORT (sell the rally) - PULLBACK
    - Higher TF UP + Lower TF UP = GO LONG (with trend) - WITH_TREND
    - Higher TF DOWN + Lower TF DOWN = GO SHORT (with trend) - WITH_TREND
    - Neutral in either TF = STAND ASIDE

    With-trend opportunities require signal bar confirmation at Fib level.
    """

    should_trade: bool
    direction: Literal["long", "short"] | None
    reason: str
    is_pullback: bool = True  # True for pullback setups, False for with-trend


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


class ATRInfoData(BaseModel):
    """ATR analysis data for trade panel display.

    Attributes:
        atr: Current ATR value in price units.
        atr_percent: ATR as percentage of current price.
        volatility_level: Classification (low/normal/high/extreme).
        current_price: Current price used in calculations.
        suggested_stop_1x: Stop distance at 1x ATR.
        suggested_stop_1_5x: Stop distance at 1.5x ATR.
        suggested_stop_2x: Stop distance at 2x ATR.
        interpretation: Human-readable volatility interpretation.
    """

    atr: float
    atr_percent: float
    volatility_level: str
    current_price: float
    suggested_stop_1x: float
    suggested_stop_1_5x: float
    suggested_stop_2x: float
    interpretation: str


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


class SignalBarData(BaseModel):
    """Signal bar data for validation.

    Represents a single price bar for signal bar confirmation check.
    Per SignalPro spec: "No signal bar = No trade".

    Attributes:
        open: Bar open price.
        high: Bar high price.
        low: Bar low price.
        close: Bar close price.
    """

    open: float
    high: float
    low: float
    close: float


class ValidationResult(BaseModel):
    """Complete validation result for a trade.

    Contains all 8 validation checks and summary statistics.
    Trade is valid when pass_percentage >= 60%.

    Checks:
    1. Trend Alignment
    2. Entry Zone
    3. Target Zones
    4. RSI Confirmation
    5. MACD Confirmation
    6. Volume Confirmation
    7. Confluence Score
    8. Signal Bar Confirmation (gatekeeper)
    """

    checks: list[ValidationCheck]
    passed_count: int
    total_count: int
    is_valid: bool
    pass_percentage: float
    atr_info: ATRInfoData | None = None
    confluence_score: int | None = None
    confluence_breakdown: ConfluenceBreakdown | None = None
    trade_category: TradeCategory | None = None


# --- Response Models ---


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
        selected_strategy: Auto-selected Fibonacci strategy based on price position.
        abc_pivots: ABC pivot prices if pattern detected (a, b, c).
        strategy_reason: Explanation of why this strategy was selected.
    """

    entry_zones: list[LevelZone]
    target_zones: list[LevelZone]
    selected_strategy: FibStrategy | None = None
    abc_pivots: dict[str, float] | None = None
    strategy_reason: str | None = None


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
        is_confirmed: True when signal bar exists at Fib level.
        awaiting_confirmation: What confirmation is needed (None if confirmed).
        is_pullback: True for pullback setups, False for with-trend setups.
        entry_level: Fibonacci entry level price (if found).
        current_price: Current market price.
        confluence_score: Confluence score at entry level (1-10).
        signal_bar_detected: Whether a signal bar was detected at entry.
        distance_to_entry_pct: Percentage distance to entry level.
    """

    symbol: str
    higher_timeframe: str
    lower_timeframe: str
    direction: Literal["long", "short"]
    confidence: int = Field(ge=0, le=100)
    category: TradeCategory
    phase: TrendPhase
    description: str
    is_confirmed: bool = True  # True when setup is confirmed (pullback or signal bar)
    awaiting_confirmation: str | None = None  # What confirmation is needed
    is_pullback: bool = True  # True for pullback, False for with-trend
    # New fields for Fib/signal bar integration
    entry_level: float | None = None  # Fibonacci entry level price
    current_price: float | None = None  # Current market price
    confluence_score: int | None = None  # Confluence rating (1-10)
    signal_bar_detected: bool = False  # Whether signal bar found at entry
    distance_to_entry_pct: float | None = None  # % distance to entry level


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


# --- Cascade Effect Models ---


class TimeframeTrendState(BaseModel):
    """Trend state for a single timeframe with cascade context.

    Attributes:
        timeframe: Timeframe code (e.g., "1D", "4H").
        trend: Trend direction for this timeframe.
        is_aligned_with_dominant: True if aligned with dominant higher TF trend.
        is_diverging: True if this TF has diverged from dominant trend.
        swing_type: Latest swing type detected (HH/HL/LH/LL).
        confidence: Confidence level 0-100.
    """

    timeframe: str
    trend: TrendDirection
    is_aligned_with_dominant: bool
    is_diverging: bool
    swing_type: SwingType | None = None
    confidence: int = Field(ge=0, le=100)


class CascadeAnalysis(BaseModel):
    """Complete cascade effect analysis result.

    Cascade stages represent how a trend reversal "bubbles up":
    - Stage 1: All TFs aligned (no reversal)
    - Stage 2: 5m/15m diverged (minor pullback)
    - Stage 3: 1H joined reversal (momentum building)
    - Stage 4: 4H joined reversal (significant move)
    - Stage 5: Daily turning (major reversal signal)
    - Stage 6: Weekly/Monthly turned (reversal confirmed)

    Attributes:
        stage: Cascade stage 1-6.
        dominant_trend: Overall trend from highest TFs.
        reversal_trend: Opposite of dominant trend.
        diverging_timeframes: TFs that have diverged from dominant.
        aligned_timeframes: TFs still aligned with dominant.
        timeframe_states: Detailed state for each TF analyzed.
        progression: Human-readable cascade progression description.
        actionable_insight: Trading recommendation based on stage.
        reversal_probability: Estimated reversal probability 0-100.
    """

    stage: int = Field(ge=1, le=6)
    dominant_trend: TrendDirection
    reversal_trend: TrendDirection
    diverging_timeframes: list[str]
    aligned_timeframes: list[str]
    timeframe_states: list[TimeframeTrendState]
    progression: str
    actionable_insight: str
    reversal_probability: int = Field(ge=0, le=100)


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

    SignalPro Spec Rules (Extended):
    | Higher TF | Lower TF | Action         | Type        |
    |-----------|----------|----------------|-------------|
    | UP        | DOWN     | GO LONG        | Pullback    | (buy the dip)
    | DOWN      | UP       | GO SHORT       | Pullback    | (sell the rally)
    | UP        | UP       | GO LONG        | With-Trend  | (needs signal bar)
    | DOWN      | DOWN     | GO SHORT       | With-Trend  | (needs signal bar)
    | Neutral   | Any      | STAND ASIDE    | -           |
    | Any       | Neutral  | STAND ASIDE    | -           |

    Args:
        higher_tf_trend: Trend direction of higher timeframe.
        lower_tf_trend: Trend direction of lower timeframe.

    Returns:
        TradeActionResult with should_trade, direction, reason, and is_pullback flag.
    """
    # Neutral in either TF = no trade
    if higher_tf_trend == "neutral":
        return TradeActionResult(
            should_trade=False,
            direction=None,
            reason="Stand aside - no clear trend on higher timeframe",
            is_pullback=True,
        )

    if lower_tf_trend == "neutral":
        return TradeActionResult(
            should_trade=False,
            direction=None,
            reason="Stand aside - wait for pullback on lower timeframe",
            is_pullback=True,
        )

    # Same direction = with-trend opportunity (needs signal bar confirmation)
    if higher_tf_trend == lower_tf_trend:
        if higher_tf_trend == "bullish":
            return TradeActionResult(
                should_trade=True,
                direction="long",
                reason="With-trend LONG: Both TFs bullish, look for entry at support",
                is_pullback=False,
            )
        else:  # bearish
            return TradeActionResult(
                should_trade=True,
                direction="short",
                reason="With-trend SHORT: Both TFs bearish, look for resistance entry",
                is_pullback=False,
            )

    # UP + DOWN = GO LONG (buy the dip) - Pullback setup
    if higher_tf_trend == "bullish" and lower_tf_trend == "bearish":
        return TradeActionResult(
            should_trade=True,
            direction="long",
            reason="Buy the dip - higher TF bullish, lower TF pullback",
            is_pullback=True,
        )

    # DOWN + UP = GO SHORT (sell the rally) - Pullback setup
    if higher_tf_trend == "bearish" and lower_tf_trend == "bullish":
        return TradeActionResult(
            should_trade=True,
            direction="short",
            reason="Sell the rally - higher TF bearish, lower TF rally",
            is_pullback=True,
        )

    # Fallback (shouldn't reach here)
    return TradeActionResult(
        should_trade=False,
        direction=None,
        reason="Stand aside - unclear market conditions",
        is_pullback=True,
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
    """Detect swing type from recent pivots.

    Compares highs to previous highs and lows to previous lows:
    - HH (Higher High): Latest high > previous high
    - LH (Lower High): Latest high < previous high
    - HL (Higher Low): Latest low > previous low
    - LL (Lower Low): Latest low < previous low
    """
    if len(pivots) < 2:
        return "HL"

    latest = pivots[-1]

    # Find the previous pivot of the SAME TYPE (high vs high, low vs low)
    previous_same_type = None
    for pivot in reversed(pivots[:-1]):
        if pivot.type == latest.type:
            previous_same_type = pivot
            break

    if previous_same_type is None:
        # No previous pivot of same type found, default based on latest type
        return "HL" if latest.type == "low" else "HH"

    if latest.type == "high":
        return "HH" if latest.price > previous_same_type.price else "LH"
    return "HL" if latest.price > previous_same_type.price else "LL"


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


def extract_abc_pivots(
    pivots: list[PivotPoint],
    direction: Literal["long", "short"],
) -> tuple[float, float, float] | None:
    """Extract ABC pivot points for projection strategy.

    For long direction (bullish ABC):
      A = swing low (oldest)
      B = swing high after A
      C = higher low after B (retracement, must be > A)

    For short direction (bearish ABC):
      A = swing high (oldest)
      B = swing low after A
      C = lower high after B (retracement, must be < A)

    Args:
        pivots: List of detected pivot points in chronological order.
        direction: Trade direction ("long" or "short").

    Returns:
        Tuple of (A, B, C) prices or None if valid pattern not found.
    """
    if len(pivots) < 3:
        return None

    # Get the most recent 3 pivots for ABC pattern
    recent_pivots = pivots[-3:]

    if direction == "long":
        # Bullish ABC: A=low, B=high, C=low (higher than A)
        a_pivot = recent_pivots[0]
        b_pivot = recent_pivots[1]
        c_pivot = recent_pivots[2]

        # Validate pattern: A must be low, B must be high, C must be low
        if a_pivot.type != "low" or b_pivot.type != "high" or c_pivot.type != "low":
            return None

        # C must be higher than A (higher low)
        if c_pivot.price <= a_pivot.price:
            return None

        return (a_pivot.price, b_pivot.price, c_pivot.price)

    else:  # short
        # Bearish ABC: A=high, B=low, C=high (lower than A)
        a_pivot = recent_pivots[0]
        b_pivot = recent_pivots[1]
        c_pivot = recent_pivots[2]

        # Validate pattern: A must be high, B must be low, C must be high
        if a_pivot.type != "high" or b_pivot.type != "low" or c_pivot.type != "high":
            return None

        # C must be lower than A (lower high)
        if c_pivot.price >= a_pivot.price:
            return None

        return (a_pivot.price, b_pivot.price, c_pivot.price)


def select_fibonacci_strategy(
    pivot_a: float,
    pivot_b: float,
    pivot_c: float,
    current_price: float,
    direction: Literal["long", "short"],
) -> FibStrategy:
    """Select appropriate Fibonacci strategy based on pivot relationships.

    Strategy Selection Rules:
    1. RETRACEMENT: Price is pulling back toward A within the AB range
    2. EXTENSION: Price has moved beyond B (continuation)
    3. PROJECTION: Valid ABC pattern complete, project D target
    4. EXPANSION: Price between C and B without valid projection criteria

    Args:
        pivot_a: First pivot point price (A).
        pivot_b: Second pivot point price (B).
        pivot_c: Third pivot point price (C).
        current_price: Current market price.
        direction: Trade direction ("long" or "short").

    Returns:
        Selected FibStrategy based on price position and pattern.
    """
    ab_range = abs(pivot_b - pivot_a)
    bc_retracement = abs(pivot_c - pivot_b) / ab_range if ab_range > 0 else 0

    if direction == "long":
        # Price below C (pulling back) = retracement
        if current_price < pivot_c:
            return "retracement"
        # Price beyond B = extension
        if current_price > pivot_b:
            return "extension"
        # Valid ABC (C retraced 38.2-78.6% of AB) = projection
        if 0.382 <= bc_retracement <= 0.786:
            return "projection"
        # Otherwise = expansion
        return "expansion"

    else:  # short
        # Price above C (pulling back) = retracement
        if current_price > pivot_c:
            return "retracement"
        # Price below B = extension
        if current_price < pivot_b:
            return "extension"
        # Valid ABC (C retraced 38.2-78.6% of AB) = projection
        if 0.382 <= bc_retracement <= 0.786:
            return "projection"
        # Otherwise = expansion
        return "expansion"


async def identify_fibonacci_levels(
    symbol: str,
    timeframe: str,
    direction: Literal["buy", "sell"],
    market_service: MarketDataService,
    strategy: FibStrategy | None = None,
) -> LevelsResult:
    """Identify Fibonacci levels for entries and targets with auto-strategy selection.

    If strategy is None, automatically selects based on:
    1. Detect pivots
    2. Extract ABC pattern if available
    3. Determine price position relative to pivots
    4. Select appropriate strategy

    Args:
        symbol: Market symbol.
        timeframe: Chart timeframe.
        direction: Trade direction for level calculation.
        market_service: Service for fetching market data.
        strategy: Optional strategy override. If None, auto-selects.

    Returns:
        LevelsResult with entry and target zones plus strategy metadata.
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

    # Get current price from the most recent bar
    current_price = market_result.data[-1].close

    # Try to extract ABC pivots for strategy selection
    abc_direction: Literal["long", "short"] = "long" if direction == "buy" else "short"
    abc_result = extract_abc_pivots(pivot_result.pivots, abc_direction)

    # Auto-select strategy if not provided
    selected_strategy: FibStrategy
    abc_pivots: dict[str, float] | None = None
    strategy_reason: str

    if strategy is not None:
        selected_strategy = strategy
        strategy_reason = "Strategy manually specified"
        if abc_result:
            abc_pivots = {"a": abc_result[0], "b": abc_result[1], "c": abc_result[2]}
    elif abc_result:
        a, b, c = abc_result
        abc_pivots = {"a": a, "b": b, "c": c}
        selected_strategy = select_fibonacci_strategy(
            a, b, c, current_price, abc_direction
        )
        strategy_reason = _get_strategy_reason(
            selected_strategy, abc_direction, c, b, current_price
        )
    else:
        # No ABC pattern found, default to retracement
        selected_strategy = "retracement"
        strategy_reason = "No ABC pattern detected, using retracement"

    return _build_levels_result(
        high, low, direction, selected_strategy, abc_pivots, strategy_reason
    )


def _get_strategy_reason(
    strategy: FibStrategy,
    direction: Literal["long", "short"],
    pivot_c: float,
    pivot_b: float,
    current_price: float,
) -> str:
    """Generate human-readable reason for strategy selection."""
    price_str = f"{current_price:.2f}"
    c_str = f"{pivot_c:.2f}"
    b_str = f"{pivot_b:.2f}"

    if strategy == "retracement":
        if direction == "long":
            return f"Price ({price_str}) below C ({c_str}), pulling back"
        return f"Price ({price_str}) above C ({c_str}), pulling back"
    elif strategy == "extension":
        if direction == "long":
            return f"Price ({price_str}) beyond B ({b_str}), extending"
        return f"Price ({price_str}) below B ({b_str}), extending"
    elif strategy == "projection":
        return "Valid ABC pattern with proper retracement, projecting D"
    else:  # expansion
        return "Price between C and B without valid projection criteria"


def _build_levels_result(
    high: float,
    low: float,
    direction: Literal["buy", "sell"],
    selected_strategy: FibStrategy | None = None,
    abc_pivots: dict[str, float] | None = None,
    strategy_reason: str | None = None,
) -> LevelsResult:
    """Build LevelsResult from swing high/low prices.

    Args:
        high: Swing high price.
        low: Swing low price.
        direction: Trade direction.
        selected_strategy: Auto-selected or manual strategy.
        abc_pivots: ABC pivot prices if detected.
        strategy_reason: Explanation of strategy selection.

    Returns:
        LevelsResult with entry/target zones and strategy metadata.
    """
    retracement = calculate_retracement_levels(high, low, direction)
    extension = calculate_extension_levels(high, low, direction)

    price_range = high - low
    entry_zones = _create_entry_zones(retracement, high, price_range)
    target_zones = _create_target_zones(extension, low, price_range)

    return LevelsResult(
        entry_zones=entry_zones,
        target_zones=target_zones,
        selected_strategy=selected_strategy,
        abc_pivots=abc_pivots,
        strategy_reason=strategy_reason,
    )


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
    include_potential: bool = False,
) -> OpportunityScanResult:
    """Scan multiple symbols for trade opportunities.

    Analyzes each symbol across timeframe pairs to identify potential trades.
    Uses higher timeframe for trend context and lower timeframe for entry timing.

    Args:
        symbols: List of market symbols to scan (e.g., ["DJI", "SPX", "NDX"]).
        market_service: Service for fetching market data.
        timeframe_pairs: Optional list of (higher_tf, lower_tf) tuples.
                        Defaults to [("1D", "4H")].
        include_potential: If True, include unconfirmed with-trend opportunities
                          that are awaiting signal bar confirmation.

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
                symbol, higher_tf, lower_tf, market_service, include_potential
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
    include_potential: bool = False,
) -> TradeOpportunity | None:
    """Analyze a symbol for opportunities on a timeframe pair.

    Uses multi-timeframe alignment rules per SignalPro spec:
    - Higher TF UP + Lower TF DOWN = GO LONG (buy the dip) - CONFIRMED
    - Higher TF DOWN + Lower TF UP = GO SHORT (sell the rally) - CONFIRMED
    - Higher TF UP + Lower TF UP = GO LONG (with-trend) - POTENTIAL
    - Higher TF DOWN + Lower TF DOWN = GO SHORT (with-trend) - POTENTIAL

    Also checks:
    - Fibonacci entry levels for the trade
    - Signal bar confirmation at entry level
    - Distance to entry level

    Args:
        symbol: Market symbol to analyze.
        higher_tf: Higher timeframe for trend context.
        lower_tf: Lower timeframe for entry timing.
        market_service: Service for fetching market data.
        include_potential: If True, include unconfirmed with-trend opportunities.

    Returns:
        TradeOpportunity if found, None otherwise.
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
    is_pullback = trade_action.is_pullback

    # Calculate combined confidence
    combined = higher_assessment.confidence + lower_assessment.confidence
    confidence = min(100, combined // 2)

    # Get Fibonacci levels for entry zone
    fib_direction: Literal["buy", "sell"] = "buy" if direction == "long" else "sell"
    levels_result = await identify_fibonacci_levels(
        symbol=symbol,
        timeframe=lower_tf,
        direction=fib_direction,
        market_service=market_service,
    )

    # Get current price from market data
    market_data = await market_service.get_ohlc(symbol, lower_tf, periods=5)
    current_price: float | None = None
    if market_data.success and market_data.data:
        current_price = market_data.data[-1].close

    # Find entry level and calculate distance
    entry_level: float | None = None
    distance_to_entry_pct: float | None = None
    confluence_score_val: int | None = None

    if levels_result.entry_zones:
        # Find nearest retracement level (38.2%, 50%, 61.8%, 78.6%)
        for zone in levels_result.entry_zones:
            entry_level = zone.price
            if current_price:
                distance_to_entry_pct = (
                    abs(current_price - entry_level) / entry_level * 100
                )
            break  # Use first entry zone (best entry)

        # Calculate confluence score for the entry level
        if entry_level:
            confluence_result = calculate_confluence_score(
                level_price=entry_level,
                same_tf_levels=[z.price for z in levels_result.entry_zones[1:]],
                higher_tf_levels=[],  # Would need higher TF levels
                previous_pivots=[],
            )
            confluence_score_val = confluence_result.total

    # Check for signal bar at entry level
    signal_bar_detected = False
    if entry_level and market_data.success and market_data.data:
        recent_bar = market_data.data[-1]
        bar = SignalBar(
            open=recent_bar.open,
            high=recent_bar.high,
            low=recent_bar.low,
            close=recent_bar.close,
        )
        signal = detect_signal(bar, entry_level)
        if signal is not None:
            # Check if signal matches our direction
            if (fib_direction == "buy" and signal.direction == "buy") or (
                fib_direction == "sell" and signal.direction == "sell"
            ):
                signal_bar_detected = True

    # Update confirmation logic based on signal bar detection
    if is_pullback:
        # Pullback confirmed only if signal bar detected at entry
        if signal_bar_detected:
            is_confirmed = True
            awaiting_confirmation = None
        else:
            is_confirmed = False
            awaiting_confirmation = "Awaiting signal bar at entry level"
    else:
        # With-trend: always needs signal bar at Fib level for full confirmation
        if signal_bar_detected:
            is_confirmed = True
            awaiting_confirmation = None
        else:
            is_confirmed = False
            entry_type = "support" if direction == "long" else "resistance"
            awaiting_confirmation = (
                f"With-trend: awaiting signal bar at {entry_type}"
            )

        # If not including potential opportunities, skip unconfirmed setups
        if not include_potential and not is_confirmed:
            return None

        # Reduce confidence for unconfirmed setups
        if not is_confirmed:
            confidence = max(50, confidence - 10)

    # Determine trade category (use actual confluence score)
    category = categorize_trade(
        higher_tf_trend=higher_assessment.trend,
        lower_tf_trend=lower_assessment.trend,
        trade_direction=direction,
        confluence_score=confluence_score_val or 3,
    )

    # Build description
    direction_text = "Buy" if direction == "long" else "Sell"
    trend_text = higher_assessment.trend
    setup_type = "pullback" if is_pullback else "with-trend"
    description = f"{direction_text} {setup_type} in {higher_tf} {trend_text} trend"

    return TradeOpportunity(
        symbol=symbol,
        higher_timeframe=higher_tf,
        lower_timeframe=lower_tf,
        direction=direction,
        confidence=confidence,
        category=category,
        phase=lower_assessment.phase,
        description=description,
        is_confirmed=is_confirmed,
        awaiting_confirmation=awaiting_confirmation,
        is_pullback=is_pullback,
        entry_level=entry_level,
        current_price=current_price,
        confluence_score=confluence_score_val,
        signal_bar_detected=signal_bar_detected,
        distance_to_entry_pct=distance_to_entry_pct,
    )


async def validate_trade(
    symbol: str,
    higher_timeframe: str,
    lower_timeframe: str,
    direction: Literal["long", "short"],
    market_service: MarketDataService,
    atr_period: int = 14,
    signal_bar_data: SignalBarData | None = None,
    entry_level: float | None = None,
) -> ValidationResult:
    """Validate a trade opportunity with 8 checks.

    Performs the following validation checks:
    1. Trend Alignment - Higher/lower TF alignment per rules
    2. Entry Zone - Fibonacci entry levels found
    3. Target Zones - Extension targets found
    4. RSI Confirmation - Momentum confirmation
    5. MACD Confirmation - Trend momentum intact
    6. Volume Confirmation - RVOL >= 1.0 (above average volume)
    7. Confluence Score - Real confluence calculation (>=3 with-trend, >=5 counter)
    8. Signal Bar Confirmation - Gatekeeper check (No signal bar = No trade)

    Trade is valid when pass_percentage >= 60% (5+ checks).

    Args:
        symbol: Market symbol.
        higher_timeframe: Higher timeframe for trend context.
        lower_timeframe: Lower timeframe for entry timing.
        direction: Trade direction (long/short).
        market_service: Service for fetching market data.
        atr_period: Period for ATR calculation (default 14).
        signal_bar_data: Optional OHLC data for signal bar confirmation.
        entry_level: Optional entry level for signal bar check.

    Returns:
        ValidationResult with all 8 checks and summary statistics.
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

    # Also fetch higher TF levels for confluence calculation
    higher_levels_result = await identify_fibonacci_levels(
        symbol, higher_timeframe, fib_direction, market_service
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
        strategy_info = (
            f" (Strategy: {levels_result.selected_strategy})"
            if levels_result.selected_strategy
            else ""
        )
        entry_details = f"Best: {best.label} at {best.price:.2f}{strategy_info}"
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

    # 6. Volume Confirmation (on lower timeframe for entry timing)
    lower_data = await market_service.get_ohlc(symbol, lower_timeframe, periods=50)
    volumes: list[int | None] = [bar.volume for bar in lower_data.data]

    volume_passed = False
    volume_explanation = "Insufficient volume data"
    volume_details = None

    valid_volume_count = sum(1 for v in volumes if v is not None)
    if valid_volume_count >= 20:
        volume_analysis = analyze_volume(volumes, ma_period=20)
        if volume_analysis:
            volume_passed = volume_analysis.is_above_average
            volume_explanation = volume_analysis.interpretation
            volume_details = (
                f"RVOL: {volume_analysis.relative_volume:.2f}x "
                f"(Current: {volume_analysis.current_volume:,}, "
                f"Avg: {volume_analysis.volume_ma:,.0f})"
            )

    checks.append(
        ValidationCheck(
            name="Volume Confirmation",
            passed=volume_passed,
            explanation=volume_explanation,
            details=volume_details,
        )
    )

    # 7. Confluence Score Check (real confluence calculation)
    # Get pivot prices from lower TF data for confluence
    pivot_prices: list[float] = []
    if lower_data.data:
        pivot_bars = [
            PivotOHLCBar(
                time=bar.time,
                open=bar.open,
                high=bar.high,
                low=bar.low,
                close=bar.close,
            )
            for bar in lower_data.data
        ]
        pivot_result = detect_pivots(data=pivot_bars, lookback=5, count=10)
        pivot_prices = [p.price for p in pivot_result.pivots]

    # Calculate confluence for best entry level
    confluence: ConfluenceScore | None = None
    if levels_result.entry_zones:
        entry_level = levels_result.entry_zones[0].price
        # Same TF levels (exclude the best entry level itself)
        same_tf_prices = [z.price for z in levels_result.entry_zones[1:]]
        # Higher TF levels
        higher_tf_prices = [z.price for z in higher_levels_result.entry_zones]

        confluence = calculate_confluence_score(
            level_price=entry_level,
            same_tf_levels=same_tf_prices,
            higher_tf_levels=higher_tf_prices,
            previous_pivots=pivot_prices,
        )
    else:
        # No entry zones - minimal confluence
        confluence = ConfluenceScore(
            total=1,
            breakdown=ConfluenceBreakdown(),
            interpretation="standard",
        )

    # Determine trade category based on real confluence score
    trade_category = categorize_trade(
        higher_tf_trend=higher_assessment.trend,
        lower_tf_trend=lower_assessment.trend,
        trade_direction=direction,
        confluence_score=confluence.total,
    )

    # Counter-trend requires confluence >= 5, with-trend >= 3
    min_confluence = 5 if trade_category in ("counter_trend", "reversal_attempt") else 3
    confluence_passed = confluence.total >= min_confluence
    confluence_explanation = (
        f"Score {confluence.total} ({confluence.interpretation}) - "
        f"{'meets' if confluence_passed else 'below'} {trade_category} threshold"
    )
    confluence_details = (
        f"Min required: {min_confluence} for {trade_category}. "
        f"Breakdown: base={confluence.breakdown.base_fib_level}, "
        f"same_tf={confluence.breakdown.same_tf_confluence}, "
        f"higher_tf={confluence.breakdown.higher_tf_confluence}, "
        f"pivot={confluence.breakdown.previous_pivot}, "
        f"psych={confluence.breakdown.psychological_level}"
    )
    checks.append(
        ValidationCheck(
            name="Confluence Score",
            passed=confluence_passed,
            explanation=confluence_explanation,
            details=confluence_details,
        )
    )

    # 8. Signal Bar Confirmation Check
    # Determine entry level: use provided entry_level or derive from best entry zone
    effective_entry_level = entry_level
    if effective_entry_level is None and levels_result.entry_zones:
        effective_entry_level = levels_result.entry_zones[0].price

    signal_bar_check = _check_signal_bar_confirmation(
        signal_bar_data=signal_bar_data,
        direction=direction,
        entry_level=effective_entry_level,
    )
    checks.append(signal_bar_check)

    # Calculate ATR for volatility info (use lower timeframe for entry timing)
    atr_info: ATRInfoData | None = None
    if lower_data.data:
        highs = [bar.high for bar in lower_data.data]
        lows = [bar.low for bar in lower_data.data]
        closes = [bar.close for bar in lower_data.data]
        atr_analysis: ATRAnalysis | None = analyze_atr(
            highs, lows, closes, period=atr_period
        )
        if atr_analysis:
            atr_info = ATRInfoData(
                atr=atr_analysis.atr,
                atr_percent=atr_analysis.atr_percent,
                volatility_level=atr_analysis.volatility_level,
                current_price=atr_analysis.current_price,
                suggested_stop_1x=atr_analysis.suggested_stop_1x,
                suggested_stop_1_5x=atr_analysis.suggested_stop_1_5x,
                suggested_stop_2x=atr_analysis.suggested_stop_2x,
                interpretation=atr_analysis.interpretation,
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
        atr_info=atr_info,
        confluence_score=confluence.total if confluence else None,
        confluence_breakdown=confluence.breakdown if confluence else None,
        trade_category=trade_category,
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


def _check_signal_bar_confirmation(
    signal_bar_data: SignalBarData | None,
    direction: Literal["long", "short"],
    entry_level: float | None,
) -> ValidationCheck:
    """Check 8: Signal bar confirmation at entry level.

    Per SignalPro spec: "No signal bar = No trade".

    A signal bar confirms entry when:
    - LONG: Bullish bar (close > open) with close > entry level
    - SHORT: Bearish bar (close < open) with close < entry level

    Args:
        signal_bar_data: OHLC data for the most recent bar.
        direction: Trade direction (long/short).
        entry_level: Fibonacci entry level price.

    Returns:
        ValidationCheck with pass/fail status and explanation.
    """
    if signal_bar_data is None:
        return ValidationCheck(
            name="Signal Bar Confirmation",
            passed=False,
            explanation="No signal bar data provided",
            details="Signal bar is required before entry (SignalPro rule)",
        )

    if entry_level is None:
        return ValidationCheck(
            name="Signal Bar Confirmation",
            passed=False,
            explanation="No entry level available for signal bar check",
            details="Cannot validate signal bar without entry level",
        )

    bar = SignalBar(
        open=signal_bar_data.open,
        high=signal_bar_data.high,
        low=signal_bar_data.low,
        close=signal_bar_data.close,
    )

    # Use detect_signal to check if bar is a valid signal at entry level
    signal_direction: Literal["buy", "sell"] = "buy" if direction == "long" else "sell"
    signal = detect_signal(bar, entry_level)

    # Check if signal matches our direction
    if signal is not None:
        if (signal_direction == "buy" and signal.direction == "buy") or (
            signal_direction == "sell" and signal.direction == "sell"
        ):
            return ValidationCheck(
                name="Signal Bar Confirmation",
                passed=True,
                explanation=f"Signal bar confirmed ({signal.signal_type.value})",
                details=(
                    f"O={signal_bar_data.open:.2f} C={signal_bar_data.close:.2f} "
                    f"Level={entry_level:.2f} Strength={signal.strength:.2f}"
                ),
            )

    # No valid signal found - check why
    is_bullish = signal_bar_data.close > signal_bar_data.open
    is_bearish = signal_bar_data.close < signal_bar_data.open

    if direction == "long":
        if not is_bullish:
            explanation = "No signal: bar is not bullish (close <= open)"
        elif signal_bar_data.close <= entry_level:
            explanation = "No signal: close not above entry level"
        else:
            explanation = "No valid buy signal detected"
    else:  # short
        if not is_bearish:
            explanation = "No signal: bar is not bearish (close >= open)"
        elif signal_bar_data.close >= entry_level:
            explanation = "No signal: close not below entry level"
        else:
            explanation = "No valid sell signal detected"

    return ValidationCheck(
        name="Signal Bar Confirmation",
        passed=False,
        explanation=explanation,
        details=(
            f"O={signal_bar_data.open:.2f} C={signal_bar_data.close:.2f} "
            f"Level={entry_level:.2f}"
        ),
    )


# --- Cascade Effect Functions ---


def _get_opposite_trend(trend: TrendDirection) -> TrendDirection:
    """Get the opposite trend direction."""
    if trend == "bullish":
        return "bearish"
    if trend == "bearish":
        return "bullish"
    return "neutral"


def _determine_dominant_trend(
    trend_assessments: list[tuple[str, TrendDirection]],
) -> TrendDirection:
    """Determine dominant trend from highest timeframe assessments.

    The dominant trend is determined by the HIGHEST timeframes in the analysis.
    For cascade detection, we consider only the major timeframes (1M, 1W, 1D)
    if present, using majority vote among them. If none of these are present,
    we use the single highest timeframe's trend.

    This ensures the "established" trend from higher timeframes is captured,
    allowing cascade detection to identify when lower timeframes diverge.
    """
    if not trend_assessments:
        return "neutral"

    # Sort by TIMEFRAME_HIERARCHY order (highest first)
    def tf_order(item: tuple[str, TrendDirection]) -> int:
        tf = item[0]
        return TIMEFRAME_HIERARCHY.index(tf) if tf in TIMEFRAME_HIERARCHY else 999

    sorted_assessments = sorted(trend_assessments, key=tf_order)

    # Check for major timeframes (1M, 1W, 1D)
    major_tfs = ["1M", "1W", "1D"]
    major_assessments = [
        (tf, trend) for tf, trend in sorted_assessments if tf in major_tfs
    ]

    if major_assessments:
        # Use majority vote among major timeframes
        bullish_count = sum(1 for _, trend in major_assessments if trend == "bullish")
        bearish_count = sum(1 for _, trend in major_assessments if trend == "bearish")

        if bullish_count > bearish_count:
            return "bullish"
        if bearish_count > bullish_count:
            return "bearish"
        # Tie - use the highest major TF trend
        return major_assessments[0][1]

    # No major TFs - use the single highest TF's trend
    return sorted_assessments[0][1] if sorted_assessments else "neutral"


def _calculate_cascade_stage(
    diverging_tfs: list[str],
    all_tfs: list[str],
    dominant_trend: TrendDirection,
) -> int:
    """Calculate cascade stage based on diverging timeframes.

    Stage logic based on which timeframes have diverged:
    - Stage 1: No diverging TFs (all aligned)
    - Stage 2: Only smallest TFs diverged (1m/3m/5m/15m)
    - Stage 3: 1H joined the divergence
    - Stage 4: 4H joined the divergence
    - Stage 5: 1D joined the divergence
    - Stage 6: 1W/1M joined (full reversal)
    """
    if not diverging_tfs or dominant_trend == "neutral":
        return 1

    # Check which significant TFs have diverged
    has_1min = "1m" in diverging_tfs
    has_3m = "3m" in diverging_tfs
    has_5m = "5m" in diverging_tfs
    has_15m = "15m" in diverging_tfs
    has_1h = "1H" in diverging_tfs
    has_4h = "4H" in diverging_tfs
    has_1d = "1D" in diverging_tfs
    has_1w = "1W" in diverging_tfs
    has_1M = "1M" in diverging_tfs

    # Stage 6: Weekly or Monthly diverged
    if has_1w or has_1M:
        return 6

    # Stage 5: Daily diverged (and weekly/monthly not in analysis or still aligned)
    if has_1d:
        return 5

    # Stage 4: 4H diverged
    if has_4h:
        return 4

    # Stage 3: 1H diverged
    if has_1h:
        return 3

    # Stage 2: Only smallest TFs diverged (1m/3m/5m/15m)
    if has_1min or has_3m or has_5m or has_15m:
        return 2

    # Stage 1: All aligned
    return 1


def _get_cascade_progression(stage: int, dominant_trend: TrendDirection) -> str:
    """Get human-readable progression description for cascade stage."""
    reversal = _get_opposite_trend(dominant_trend)

    progressions = {
        1: f"All TFs aligned {dominant_trend}",
        2: f"Smallest TFs (1m-15m) turned {reversal}",
        3: f"1H joined reversal to {reversal}",
        4: f"4H joined reversal to {reversal}",
        5: f"Daily turning {reversal}",
        6: f"All TFs reversed to {reversal}",
    }

    return progressions.get(stage, f"Stage {stage}")


def _get_cascade_insight(stage: int, reversal_trend: TrendDirection) -> str:
    """Get actionable trading insight for cascade stage."""
    insights = {
        1: "Strong trend, trade with trend",
        2: "Minor pullback, watch for continuation",
        3: "Momentum building, reduce position size",
        4: "Significant move, prepare for trend change",
        5: "Major reversal signal, exit trend trades",
        6: f"New {reversal_trend} trend confirmed",
    }

    return insights.get(stage, "Monitor for confirmation")


def _get_reversal_probability(stage: int) -> int:
    """Get estimated reversal probability for cascade stage."""
    probabilities = {
        1: 5,
        2: 15,
        3: 30,
        4: 50,
        5: 75,
        6: 95,
    }

    return probabilities.get(stage, 50)


async def detect_cascade(
    symbol: str,
    timeframes: list[str],
    market_service: MarketDataService,
) -> CascadeAnalysis:
    """Detect cascade effect across multiple timeframes.

    A trend reversal propagates from smallest to largest timeframes:
    - Stage 1: All aligned (e.g., all bullish)
    - Stage 2: Smallest TFs turn (5m/15m diverge)
    - Stage 3: 1H joins the reversal
    - Stage 4: 4H joins
    - Stage 5: Daily joins
    - Stage 6: Weekly/Monthly turn (reversal confirmed)

    Trading Value: Bi-directional traders can catch reversals at Stage 2-3.

    Args:
        symbol: Market symbol to analyze.
        timeframes: List of timeframes to analyze (e.g., ["1D", "4H", "1H", "15m"]).
        market_service: Service for fetching market data.

    Returns:
        CascadeAnalysis with stage, dominant trend, and actionable insights.
    """
    # Assess trend for each timeframe
    trend_assessments: list[tuple[str, TrendDirection]] = []
    timeframe_states: list[TimeframeTrendState] = []

    for tf in timeframes:
        assessment = await assess_trend(symbol, tf, market_service)
        trend_assessments.append((tf, assessment.trend))

        # Create state (alignment/divergence determined after dominant is known)
        state = TimeframeTrendState(
            timeframe=tf,
            trend=assessment.trend,
            is_aligned_with_dominant=False,  # Updated below
            is_diverging=False,  # Updated below
            swing_type=assessment.swing_type,
            confidence=assessment.confidence,
        )
        timeframe_states.append(state)

    # Determine dominant trend from highest TFs
    dominant_trend = _determine_dominant_trend(trend_assessments)
    reversal_trend = _get_opposite_trend(dominant_trend)

    # Classify each TF as aligned or diverging
    diverging_timeframes: list[str] = []
    aligned_timeframes: list[str] = []

    for state in timeframe_states:
        if dominant_trend == "neutral":
            # When dominant is neutral, nothing is truly diverging
            state.is_aligned_with_dominant = True
            state.is_diverging = False
            aligned_timeframes.append(state.timeframe)
        elif state.trend == dominant_trend:
            state.is_aligned_with_dominant = True
            state.is_diverging = False
            aligned_timeframes.append(state.timeframe)
        elif state.trend == reversal_trend:
            state.is_aligned_with_dominant = False
            state.is_diverging = True
            diverging_timeframes.append(state.timeframe)
        else:
            # Neutral TF - treat as neither aligned nor diverging
            state.is_aligned_with_dominant = False
            state.is_diverging = False
            aligned_timeframes.append(state.timeframe)

    # Calculate cascade stage
    stage = _calculate_cascade_stage(diverging_timeframes, timeframes, dominant_trend)

    # Generate progression and insight
    progression = _get_cascade_progression(stage, dominant_trend)
    insight = _get_cascade_insight(stage, reversal_trend)
    probability = _get_reversal_probability(stage)

    return CascadeAnalysis(
        stage=stage,
        dominant_trend=dominant_trend,
        reversal_trend=reversal_trend,
        diverging_timeframes=diverging_timeframes,
        aligned_timeframes=aligned_timeframes,
        timeframe_states=timeframe_states,
        progression=progression,
        actionable_insight=insight,
        reversal_probability=probability,
    )


# --- Trend Alignment Models and Function ---


class IndicatorSignalDetail(BaseModel):
    """Individual indicator signal with value.

    Attributes:
        signal: Signal direction (bullish/bearish/neutral).
        value: Numeric value (e.g., RSI value, MACD histogram).
    """

    signal: Literal["bullish", "bearish", "neutral"]
    value: float | None = None


class PivotPointDetail(BaseModel):
    """Pivot point data for chart display.

    Attributes:
        index: Bar index of the pivot.
        price: Price level of the pivot.
        type: Whether this is a high or low pivot.
        time: Timestamp of the pivot bar.
    """

    index: int
    price: float
    type: Literal["high", "low"]
    time: str | int


class SwingMarkerDetail(BaseModel):
    """Swing marker data for chart display.

    Attributes:
        index: Bar index of the marker.
        price: Price level of the marker.
        time: Timestamp of the marker bar.
        swing_type: Type of swing (HH/HL/LH/LL).
    """

    index: int
    price: float
    time: str | int
    swing_type: SwingType


class TimeframeTrendDetail(BaseModel):
    """Full trend information for a single timeframe.

    Attributes:
        timeframe: The timeframe identifier.
        trend: Overall trend direction.
        confidence: Confidence score 0-100.
        swing: Swing pattern indicator signal.
        rsi: RSI indicator signal.
        macd: MACD indicator signal.
        current_price: Latest price for this timeframe.
        is_ranging: True if price is moving sideways.
        ranging_warning: Warning message if ranging.
        pivots: Pivot points for chart display.
        markers: Swing markers for chart display.
    """

    timeframe: str
    trend: TrendDirection
    confidence: int = Field(ge=0, le=100)
    swing: IndicatorSignalDetail
    rsi: IndicatorSignalDetail
    macd: IndicatorSignalDetail
    current_price: float | None = None
    is_ranging: bool = False
    ranging_warning: str | None = None
    pivots: list[PivotPointDetail] = []
    markers: list[SwingMarkerDetail] = []


class OverallAlignmentResult(BaseModel):
    """Overall alignment summary across all timeframes.

    Attributes:
        direction: Dominant trend direction.
        strength: Alignment strength.
        bullish_count: Number of bullish timeframes.
        bearish_count: Number of bearish timeframes.
        ranging_count: Number of ranging timeframes.
        description: Human-readable description.
    """

    direction: TrendDirection
    strength: StrengthLevel
    bullish_count: int
    bearish_count: int
    ranging_count: int
    description: str


class TrendAlignmentResult(BaseModel):
    """Complete trend alignment result across all timeframes.

    Attributes:
        trends: Trend data for each timeframe.
        overall: Overall alignment summary.
    """

    trends: list[TimeframeTrendDetail]
    overall: OverallAlignmentResult


async def analyze_trend_alignment(
    symbol: str,
    timeframes: list[str],
    market_service: MarketDataService,
    lookback: int = 5,
) -> TrendAlignmentResult:
    """Analyze trend alignment across multiple timeframes.

    This function provides a complete trend analysis for each timeframe,
    including swing patterns, RSI, MACD, and an overall alignment summary.

    Args:
        symbol: Market symbol (e.g., "DJI", "SPX").
        timeframes: List of timeframes to analyze.
        market_service: Service for fetching market data.
        lookback: Lookback period for pivot detection.

    Returns:
        TrendAlignmentResult with per-timeframe trends and overall alignment.
    """
    trend_details: list[TimeframeTrendDetail] = []

    for tf in timeframes:
        detail = await _analyze_single_timeframe(symbol, tf, market_service, lookback)
        trend_details.append(detail)

    overall = _calculate_overall_alignment_from_details(trend_details)

    return TrendAlignmentResult(trends=trend_details, overall=overall)


async def _analyze_single_timeframe(
    symbol: str,
    timeframe: str,
    market_service: MarketDataService,
    lookback: int,
) -> TimeframeTrendDetail:
    """Analyze a single timeframe for trend data."""
    # Get market data
    market_result = await market_service.get_ohlc(symbol, timeframe, periods=100)

    if (
        not market_result.success
        or not market_result.data
        or len(market_result.data) < 26
    ):
        return _create_empty_trend_detail(timeframe)

    bars = market_result.data
    closes = [bar.close for bar in bars]
    current_price = closes[-1] if closes else None

    # Convert to pivot bars for swing detection
    pivot_bars = [
        PivotOHLCBar(
            time=bar.time, open=bar.open, high=bar.high, low=bar.low, close=bar.close
        )
        for bar in bars
    ]

    # Detect pivots and swings
    pivot_result = detect_pivots(data=pivot_bars, lookback=lookback, count=20)

    # Build pivot and marker lists for frontend
    pivots: list[PivotPointDetail] = []
    markers: list[SwingMarkerDetail] = []

    for i, pivot in enumerate(pivot_result.pivots):
        pivots.append(
            PivotPointDetail(
                index=i,
                price=pivot.price,
                type=pivot.type,
                time=str(pivot.time) if pivot.time else "",
            )
        )

    # Generate swing markers from pivots
    markers = _generate_swing_markers(pivot_result.pivots)

    # Analyze swing pattern
    swing_signal = _analyze_swing_pattern(markers)

    # Calculate RSI
    rsi_result = calculate_rsi(closes, period=14)
    rsi_value = _get_latest_valid_value(rsi_result.rsi)
    rsi_signal = _interpret_rsi_signal(rsi_value)

    # Calculate MACD
    macd_result = calculate_macd(closes)
    macd_value = _get_latest_valid_value(macd_result.histogram)
    macd_signal = _interpret_macd_signal(macd_value)

    # Combine indicators for overall trend
    trend, confidence = _combine_indicator_signals(
        swing_signal, rsi_signal, macd_signal
    )

    # Check for ranging condition
    is_ranging, ranging_warning = _check_ranging_condition(pivot_result.pivots, closes)

    return TimeframeTrendDetail(
        timeframe=timeframe,
        trend=trend,
        confidence=confidence,
        swing=swing_signal,
        rsi=rsi_signal,
        macd=macd_signal,
        current_price=current_price,
        is_ranging=is_ranging,
        ranging_warning=ranging_warning,
        pivots=pivots,
        markers=markers,
    )


def _create_empty_trend_detail(timeframe: str) -> TimeframeTrendDetail:
    """Create an empty trend detail for when data is unavailable."""
    return TimeframeTrendDetail(
        timeframe=timeframe,
        trend="neutral",
        confidence=0,
        swing=IndicatorSignalDetail(signal="neutral"),
        rsi=IndicatorSignalDetail(signal="neutral"),
        macd=IndicatorSignalDetail(signal="neutral"),
    )


def _generate_swing_markers(pivots: list[PivotPoint]) -> list[SwingMarkerDetail]:
    """Generate swing markers (HH/HL/LH/LL) from pivot points."""
    markers: list[SwingMarkerDetail] = []
    last_high: PivotPoint | None = None
    last_low: PivotPoint | None = None

    for i, pivot in enumerate(pivots):
        if pivot.type == "high":
            if last_high is not None:
                swing_type: SwingType = "HH" if pivot.price > last_high.price else "LH"
                markers.append(
                    SwingMarkerDetail(
                        index=i,
                        price=pivot.price,
                        time=str(pivot.time) if pivot.time else "",
                        swing_type=swing_type,
                    )
                )
            last_high = pivot
        else:  # low
            if last_low is not None:
                swing_type = "HL" if pivot.price > last_low.price else "LL"
                markers.append(
                    SwingMarkerDetail(
                        index=i,
                        price=pivot.price,
                        time=str(pivot.time) if pivot.time else "",
                        swing_type=swing_type,
                    )
                )
            last_low = pivot

    return markers


def _analyze_swing_pattern(markers: list[SwingMarkerDetail]) -> IndicatorSignalDetail:
    """Analyze swing markers to determine swing-based trend signal."""
    if len(markers) < 2:
        return IndicatorSignalDetail(signal="neutral")

    bullish = 0
    bearish = 0

    for marker in markers:
        if marker.swing_type in ("HH", "HL"):
            bullish += 1
        elif marker.swing_type in ("LH", "LL"):
            bearish += 1

    total = bullish + bearish
    if total == 0:
        return IndicatorSignalDetail(signal="neutral", value=50)

    bullish_ratio = bullish / total
    if bullish_ratio >= 0.6:
        return IndicatorSignalDetail(
            signal="bullish", value=round(bullish_ratio * 100)
        )
    if bullish_ratio <= 0.4:
        bearish_value = round((1 - bullish_ratio) * 100)
        return IndicatorSignalDetail(signal="bearish", value=bearish_value)
    return IndicatorSignalDetail(signal="neutral", value=50)


def _get_latest_valid_value(values: list[float | None]) -> float | None:
    """Get the latest non-None value from a list."""
    for v in reversed(values):
        if v is not None:
            return v
    return None


def _interpret_rsi_signal(rsi: float | None) -> IndicatorSignalDetail:
    """Interpret RSI value as a trend signal."""
    if rsi is None:
        return IndicatorSignalDetail(signal="neutral")

    if rsi >= 60:
        return IndicatorSignalDetail(signal="bullish", value=rsi)
    if rsi <= 40:
        return IndicatorSignalDetail(signal="bearish", value=rsi)
    if rsi > 50:
        return IndicatorSignalDetail(signal="bullish", value=rsi)
    if rsi < 50:
        return IndicatorSignalDetail(signal="bearish", value=rsi)
    return IndicatorSignalDetail(signal="neutral", value=rsi)


def _interpret_macd_signal(histogram: float | None) -> IndicatorSignalDetail:
    """Interpret MACD histogram as a trend signal."""
    if histogram is None:
        return IndicatorSignalDetail(signal="neutral")

    if histogram > 0:
        return IndicatorSignalDetail(signal="bullish", value=histogram)
    if histogram < 0:
        return IndicatorSignalDetail(signal="bearish", value=histogram)
    return IndicatorSignalDetail(signal="neutral", value=0)


def _combine_indicator_signals(
    swing: IndicatorSignalDetail,
    rsi: IndicatorSignalDetail,
    macd: IndicatorSignalDetail,
) -> tuple[TrendDirection, int]:
    """Combine indicator signals into overall trend with confidence.

    Weights: Swing 40%, RSI 30%, MACD 30%
    """
    weights = {"swing": 0.4, "rsi": 0.3, "macd": 0.3}

    bullish_score = 0.0
    bearish_score = 0.0
    total_weight = 0.0

    for name, indicator in [("swing", swing), ("rsi", rsi), ("macd", macd)]:
        if indicator.signal != "neutral":
            if indicator.signal == "bullish":
                bullish_score += weights[name]
            else:
                bearish_score += weights[name]
            total_weight += weights[name]

    if total_weight == 0:
        return "neutral", 0

    norm_bullish = bullish_score / total_weight
    norm_bearish = bearish_score / total_weight

    if norm_bullish >= 0.65:
        return "bullish", round(norm_bullish * 100)
    if norm_bearish >= 0.65:
        return "bearish", round(norm_bearish * 100)
    if norm_bullish > norm_bearish and norm_bullish >= 0.5:
        return "bullish", round(norm_bullish * 100)
    if norm_bearish > norm_bullish and norm_bearish >= 0.5:
        return "bearish", round(norm_bearish * 100)

    return "neutral", 50


def _check_ranging_condition(
    pivots: list[PivotPoint], closes: list[float]
) -> tuple[bool, str | None]:
    """Check if price is in a ranging condition."""
    if len(pivots) < 4 or len(closes) < 10:
        return False, None

    # Get recent highs and lows
    recent_highs = [p.price for p in pivots if p.type == "high"][-3:]
    recent_lows = [p.price for p in pivots if p.type == "low"][-3:]

    if len(recent_highs) < 2 or len(recent_lows) < 2:
        return False, None

    # Check if highs and lows are converging (range tightening)
    high_range = max(recent_highs) - min(recent_highs)
    low_range = max(recent_lows) - min(recent_lows)
    price_range = max(closes[-10:]) - min(closes[-10:])

    if price_range == 0:
        return False, None

    # If recent pivots are within 2% of each other, market is ranging
    high_variation = high_range / max(recent_highs) if max(recent_highs) > 0 else 0
    low_variation = low_range / max(recent_lows) if max(recent_lows) > 0 else 0

    if high_variation < 0.02 and low_variation < 0.02:
        return True, "Market is ranging - Fibonacci levels may be less reliable"

    return False, None


def _calculate_overall_alignment_from_details(
    trends: list[TimeframeTrendDetail],
) -> OverallAlignmentResult:
    """Calculate overall alignment from individual timeframe trends."""
    if not trends:
        return OverallAlignmentResult(
            direction="neutral",
            strength="weak",
            bullish_count=0,
            bearish_count=0,
            ranging_count=0,
            description="No data",
        )

    bullish_count = sum(1 for t in trends if t.trend == "bullish")
    bearish_count = sum(1 for t in trends if t.trend == "bearish")
    ranging_count = sum(1 for t in trends if t.trend == "neutral")
    total = len(trends)

    bullish_ratio = bullish_count / total
    bearish_ratio = bearish_count / total

    if bullish_ratio >= 0.7:
        direction: TrendDirection = "bullish"
        strength: StrengthLevel = "strong"
        description = f"Strong bullish alignment ({bullish_count}/{total} timeframes)"
    elif bullish_ratio >= 0.5:
        direction = "bullish"
        strength = "moderate"
        description = f"Moderate bullish bias ({bullish_count}/{total} timeframes)"
    elif bearish_ratio >= 0.7:
        direction = "bearish"
        strength = "strong"
        description = f"Strong bearish alignment ({bearish_count}/{total} timeframes)"
    elif bearish_ratio >= 0.5:
        direction = "bearish"
        strength = "moderate"
        description = f"Moderate bearish bias ({bearish_count}/{total} timeframes)"
    else:
        direction = "neutral"
        strength = "moderate" if ranging_count >= total / 2 else "weak"
        description = (
            f"Mixed signals ({bullish_count} bullish, "
            f"{bearish_count} bearish, {ranging_count} ranging)"
        )

    return OverallAlignmentResult(
        direction=direction,
        strength=strength,
        bullish_count=bullish_count,
        bearish_count=bearish_count,
        ranging_count=ranging_count,
        description=description,
    )


# --- Signal Suggestions Models and Function ---


SuggestionSignalType = Literal["LONG", "SHORT", "WAIT"]


class SignalSuggestion(BaseModel):
    """A trade signal suggestion based on trend alignment.

    Attributes:
        id: Unique identifier for the signal.
        type: Signal type (LONG/SHORT/WAIT).
        higher_tf: Higher timeframe for trend context.
        lower_tf: Lower timeframe for entry timing.
        pair_name: Human-readable name of the timeframe pair.
        trading_style: Trading style (position/swing/intraday).
        description: Brief description of the signal.
        reasoning: Detailed reasoning for the signal.
        confidence: Confidence score 0-100.
        entry_zone: Type of entry zone (support/resistance/range).
        is_active: Whether the signal is currently actionable.
    """

    id: str
    type: SuggestionSignalType
    higher_tf: str
    lower_tf: str
    pair_name: str
    trading_style: str
    description: str
    reasoning: str
    confidence: int = Field(ge=0, le=100)
    entry_zone: Literal["support", "resistance", "range"]
    is_active: bool


class SignalSuggestionsResult(BaseModel):
    """Result of signal suggestion generation.

    Attributes:
        signals: List of all generated signals.
        long_count: Number of LONG signals.
        short_count: Number of SHORT signals.
        wait_count: Number of WAIT signals.
    """

    signals: list[SignalSuggestion]
    long_count: int
    short_count: int
    wait_count: int


# Standard timeframe pairs for signal analysis
TIMEFRAME_PAIRS = [
    {
        "id": "monthly-weekly",
        "name": "Monthly/Weekly",
        "higher_tf": "1M",
        "lower_tf": "1W",
        "trading_style": "position",
    },
    {
        "id": "weekly-daily",
        "name": "Weekly/Daily",
        "higher_tf": "1W",
        "lower_tf": "1D",
        "trading_style": "position",
    },
    {
        "id": "daily-4h",
        "name": "Daily/4H",
        "higher_tf": "1D",
        "lower_tf": "4H",
        "trading_style": "swing",
    },
    {
        "id": "4h-1h",
        "name": "4H/1H",
        "higher_tf": "4H",
        "lower_tf": "1H",
        "trading_style": "swing",
    },
    {
        "id": "1h-15m",
        "name": "1H/15m",
        "higher_tf": "1H",
        "lower_tf": "15m",
        "trading_style": "intraday",
    },
    {
        "id": "15m-5m",
        "name": "15m/5m",
        "higher_tf": "15m",
        "lower_tf": "5m",
        "trading_style": "intraday",
    },
    {
        "id": "5m-3m",
        "name": "5m/3m",
        "higher_tf": "5m",
        "lower_tf": "3m",
        "trading_style": "intraday",
    },
    {
        "id": "3m-1m",
        "name": "3m/1m",
        "higher_tf": "3m",
        "lower_tf": "1m",
        "trading_style": "intraday",
    },
]


async def generate_signal_suggestions(
    symbol: str,
    market_service: MarketDataService,
    lookback: int = 5,
) -> SignalSuggestionsResult:
    """Generate signal suggestions based on trend alignment.

    Analyzes trend alignment across timeframe pairs and generates
    trading signals based on the SignalPro methodology:
    - Higher TF UP + Lower TF DOWN = GO LONG (buy the dip)
    - Higher TF DOWN + Lower TF UP = GO SHORT (sell the rally)
    - Same direction = WAIT for pullback

    Args:
        symbol: Market symbol (e.g., "DJI", "SPX").
        market_service: Service for fetching market data.
        lookback: Lookback period for pivot detection.

    Returns:
        SignalSuggestionsResult with generated signals.
    """
    # Get all unique timeframes from pairs
    all_timeframes = set()
    for pair in TIMEFRAME_PAIRS:
        all_timeframes.add(pair["higher_tf"])
        all_timeframes.add(pair["lower_tf"])

    # Fetch trend alignment for all timeframes
    alignment = await analyze_trend_alignment(
        symbol=symbol,
        timeframes=list(all_timeframes),
        market_service=market_service,
        lookback=lookback,
    )

    # Build trend lookup by timeframe
    trend_by_tf = {t.timeframe: t for t in alignment.trends}

    signals: list[SignalSuggestion] = []

    for pair in TIMEFRAME_PAIRS:
        higher_trend = trend_by_tf.get(pair["higher_tf"])
        lower_trend = trend_by_tf.get(pair["lower_tf"])

        if not higher_trend or not lower_trend:
            continue

        signal = _generate_signal_for_pair(
            pair=pair,
            higher_trend=higher_trend,
            lower_trend=lower_trend,
        )
        signals.append(signal)

    # Count by type
    long_count = sum(1 for s in signals if s.type == "LONG")
    short_count = sum(1 for s in signals if s.type == "SHORT")
    wait_count = sum(1 for s in signals if s.type == "WAIT")

    return SignalSuggestionsResult(
        signals=signals,
        long_count=long_count,
        short_count=short_count,
        wait_count=wait_count,
    )


def _generate_signal_for_pair(
    pair: dict[str, str],
    higher_trend: TimeframeTrendDetail,
    lower_trend: TimeframeTrendDetail,
) -> SignalSuggestion:
    """Generate a signal for a single timeframe pair."""
    higher_direction = higher_trend.trend
    lower_direction = lower_trend.trend

    # Determine signal type based on alignment
    signal_type: SuggestionSignalType
    entry_zone: Literal["support", "resistance", "range"]
    is_active = False

    if higher_direction == "bullish" and lower_direction == "bearish":
        signal_type = "LONG"
        entry_zone = "support"
        is_active = True
    elif higher_direction == "bearish" and lower_direction == "bullish":
        signal_type = "SHORT"
        entry_zone = "resistance"
        is_active = True
    elif higher_direction == "bullish" and lower_direction == "bullish":
        signal_type = "WAIT"
        entry_zone = "support"
    elif higher_direction == "bearish" and lower_direction == "bearish":
        signal_type = "WAIT"
        entry_zone = "resistance"
    else:
        signal_type = "WAIT"
        entry_zone = "range"

    # Generate description
    description, reasoning = _generate_signal_description(
        signal_type=signal_type,
        higher_tf=pair["higher_tf"],
        lower_tf=pair["lower_tf"],
        higher_direction=higher_direction,
        lower_direction=lower_direction,
    )

    # Calculate confidence (weighted average: 60% higher TF, 40% lower TF)
    confidence = round(higher_trend.confidence * 0.6 + lower_trend.confidence * 0.4)

    return SignalSuggestion(
        id=pair["id"],
        type=signal_type,
        higher_tf=pair["higher_tf"],
        lower_tf=pair["lower_tf"],
        pair_name=pair["name"],
        trading_style=pair["trading_style"],
        description=description,
        reasoning=reasoning,
        confidence=confidence,
        entry_zone=entry_zone,
        is_active=is_active,
    )


def _generate_signal_description(
    signal_type: SuggestionSignalType,
    higher_tf: str,
    lower_tf: str,
    higher_direction: TrendDirection,
    lower_direction: TrendDirection,
) -> tuple[str, str]:
    """Generate signal description and reasoning."""
    if signal_type == "LONG":
        return (
            f"Buy pullback on {lower_tf}",
            f"{higher_tf} is {higher_direction}, {lower_tf} showing "
            f"{lower_direction} pullback. Look for support levels.",
        )
    elif signal_type == "SHORT":
        return (
            f"Sell rally on {lower_tf}",
            f"{higher_tf} is {higher_direction}, {lower_tf} showing "
            f"{lower_direction} rally. Look for resistance levels.",
        )
    else:  # WAIT
        return (
            f"Wait for pullback on {lower_tf}",
            f"Both {higher_tf} and {lower_tf} are {higher_direction}. "
            "Wait for counter-trend move.",
        )


# --- Signal Aggregation Models and Function ---


AggregatedSignalType = Literal["trend_alignment", "fib_rejection", "confluence"]


class AggregatedSignal(BaseModel):
    """An aggregated signal from any source.

    Attributes:
        id: Unique identifier.
        timeframe: Timeframe where signal was detected.
        direction: Trade direction (long/short).
        type: Signal source type.
        confidence: Confidence score 0-100.
        price: Price level of the signal.
        description: Description of the signal.
        is_active: Whether this signal is currently actionable.
        timestamp: When the signal was detected.
        fib_level: Fibonacci level ratio (for fib_rejection).
        fib_strategy: Fibonacci strategy (for fib_rejection).
        confluence_count: Number of confluent levels (for confluence).
    """

    id: str
    timeframe: str
    direction: Literal["long", "short"]
    type: AggregatedSignalType
    confidence: int = Field(ge=0, le=100)
    price: float
    description: str
    is_active: bool
    timestamp: str
    fib_level: float | None = None
    fib_strategy: str | None = None
    confluence_count: int | None = None


class SignalCounts(BaseModel):
    """Signal counts by type and direction.

    Attributes:
        long: Number of long signals.
        short: Number of short signals.
        total: Total number of signals.
        by_timeframe: Count per timeframe.
        by_type: Count per signal type.
    """

    long: int
    short: int
    total: int
    by_timeframe: dict[str, int]
    by_type: dict[str, int]


class SignalAggregationResult(BaseModel):
    """Result of signal aggregation across timeframes.

    Attributes:
        signals: All aggregated signals.
        counts: Signal counts.
    """

    signals: list[AggregatedSignal]
    counts: SignalCounts


# Fibonacci retracement levels for signal detection
RETRACEMENT_LEVELS: list[dict[str, float | str]] = [
    {"ratio": 0.382, "label": "38.2%"},
    {"ratio": 0.5, "label": "50%"},
    {"ratio": 0.618, "label": "61.8%"},
    {"ratio": 0.786, "label": "78.6%"},
]


async def aggregate_signals(
    symbol: str,
    timeframes: list[str],
    market_service: MarketDataService,
) -> SignalAggregationResult:
    """Aggregate trading signals from multiple timeframes.

    Detects signals from:
    - Trend alignment (higher TF vs lower TF)
    - Fibonacci level rejections
    - Confluence zones

    Args:
        symbol: Market symbol (e.g., "DJI", "SPX").
        timeframes: List of timeframes to analyze.
        market_service: Service for fetching market data.

    Returns:
        SignalAggregationResult with aggregated signals and counts.
    """
    from datetime import datetime

    now = datetime.now().isoformat()
    all_signals: list[AggregatedSignal] = []

    for tf in timeframes:
        tf_signals = await _detect_timeframe_signals(symbol, tf, market_service, now)
        all_signals.extend(tf_signals)

    # Detect confluence zones
    confluence_signals = _detect_confluence_zones(all_signals, now)
    all_signals.extend(confluence_signals)

    # Calculate counts
    counts = _calculate_signal_counts(all_signals)

    return SignalAggregationResult(signals=all_signals, counts=counts)


async def _detect_timeframe_signals(
    symbol: str,
    timeframe: str,
    market_service: MarketDataService,
    now: str,
) -> list[AggregatedSignal]:
    """Detect signals for a single timeframe."""
    signals: list[AggregatedSignal] = []

    # Get market data
    market_result = await market_service.get_ohlc(symbol, timeframe, periods=50)
    if (
        not market_result.success
        or not market_result.data
        or len(market_result.data) < 10
    ):
        return signals

    bars = market_result.data
    closes = [bar.close for bar in bars]

    # Get trend assessment
    assessment = await assess_trend(symbol, timeframe, market_service)

    # Calculate swing points
    pivot_bars = [
        PivotOHLCBar(
            time=bar.time,
            open=bar.open,
            high=bar.high,
            low=bar.low,
            close=bar.close,
        )
        for bar in bars
    ]
    pivot_result = detect_pivots(data=pivot_bars, lookback=5, count=10)

    default_high = max(bar.high for bar in bars[-20:])
    default_low = min(bar.low for bar in bars[-20:])
    swing_high = (
        pivot_result.swing_high.price if pivot_result.swing_high else default_high
    )
    swing_low = (
        pivot_result.swing_low.price if pivot_result.swing_low else default_low
    )
    range_val = swing_high - swing_low

    if range_val <= 0:
        return signals

    # Determine direction
    direction: Literal["long", "short"] = (
        "long" if assessment.trend == "bullish" else "short"
    )

    # Check recent bars for Fibonacci rejections
    recent_bars = bars[-5:]
    for level in RETRACEMENT_LEVELS:
        ratio = float(level["ratio"])
        label = str(level["label"])
        fib_price = swing_high - range_val * ratio

        for bar in recent_bars:
            if _detect_fib_rejection(bar, fib_price, direction):
                conf_adj = 1 - abs(ratio - 0.618) * 0.5
                confidence = round(assessment.confidence * conf_adj)
                action = "Bounce" if direction == "long" else "Rejection"
                desc = f"{action} at {label} retracement"
                signals.append(
                    AggregatedSignal(
                        id=f"{timeframe}-fib-{ratio}-{now}",
                        timeframe=timeframe,
                        direction=direction,
                        type="fib_rejection",
                        confidence=min(100, max(0, confidence)),
                        price=fib_price,
                        description=desc,
                        is_active=True,
                        timestamp=now,
                        fib_level=ratio,
                        fib_strategy="retracement",
                    )
                )
                break  # Only one signal per level

    # Add trend alignment signal if trend is clear
    if assessment.confidence >= 60:
        trend_desc = (
            f"{timeframe} trend is {assessment.trend} "
            f"with {assessment.confidence}% confidence"
        )
        signals.append(
            AggregatedSignal(
                id=f"{timeframe}-trend-{now}",
                timeframe=timeframe,
                direction=direction,
                type="trend_alignment",
                confidence=assessment.confidence,
                price=closes[-1],
                description=trend_desc,
                is_active=assessment.confidence >= 70,
                timestamp=now,
            )
        )

    return signals


def _detect_fib_rejection(
    bar: MarketOHLCBar,
    level: float,
    direction: Literal["long", "short"],
) -> bool:
    """Detect if a bar shows rejection at a Fibonacci level."""
    tolerance = level * 0.005  # 0.5% tolerance

    if direction == "long":
        tested_level = bar.low <= level + tolerance
        closed_above = bar.close > level
        is_bullish = bar.close > bar.open
        return tested_level and closed_above and is_bullish
    else:
        tested_level = bar.high >= level - tolerance
        closed_below = bar.close < level
        is_bearish = bar.close < bar.open
        return tested_level and closed_below and is_bearish


def _detect_confluence_zones(
    signals: list[AggregatedSignal],
    now: str,
) -> list[AggregatedSignal]:
    """Detect confluence zones from signals at similar prices."""
    confluence_signals: list[AggregatedSignal] = []
    tolerance = 0.005  # 0.5%

    # Group signals by similar price
    price_groups: dict[float, list[AggregatedSignal]] = {}

    for signal in signals:
        found_group = False
        for group_price in price_groups:
            if abs(signal.price - group_price) / group_price < tolerance:
                price_groups[group_price].append(signal)
                found_group = True
                break
        if not found_group:
            price_groups[signal.price] = [signal]

    # Create confluence signals for groups with 2+ signals
    for price, group in price_groups.items():
        if len(group) >= 2:
            avg_confidence = sum(s.confidence for s in group) // len(group)
            long_count = sum(1 for s in group if s.direction == "long")
            is_bullish = long_count >= len(group) / 2
            dominant_direction: Literal["long", "short"] = (
                "long" if is_bullish else "short"
            )

            confluence_signals.append(
                AggregatedSignal(
                    id=f"confluence-{price}-{now}",
                    timeframe=group[0].timeframe,
                    direction=dominant_direction,
                    type="confluence",
                    confidence=min(95, avg_confidence + len(group) * 5),
                    price=price,
                    description=f"{len(group)} levels converge near {price:.0f}",
                    is_active=True,
                    timestamp=now,
                    confluence_count=len(group),
                )
            )

    return confluence_signals


def _calculate_signal_counts(signals: list[AggregatedSignal]) -> SignalCounts:
    """Calculate signal counts by direction, timeframe, and type."""
    by_timeframe: dict[str, int] = {}
    by_type: dict[str, int] = {}
    long_count = 0
    short_count = 0

    for signal in signals:
        if signal.direction == "long":
            long_count += 1
        else:
            short_count += 1

        by_timeframe[signal.timeframe] = by_timeframe.get(signal.timeframe, 0) + 1
        by_type[signal.type] = by_type.get(signal.type, 0) + 1

    return SignalCounts(
        long=long_count,
        short=short_count,
        total=len(signals),
        by_timeframe=by_timeframe,
        by_type=by_type,
    )
