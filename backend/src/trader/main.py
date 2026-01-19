"""FastAPI application for Fibonacci Trading Analysis."""

from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from trader.analysis import (
    AnalysisOrchestrator,
    FullAnalysisRequest,
    FullAnalysisResponse,
)
from trader.atr_indicators import analyze_atr, get_atr_series
from trader.fibonacci import (
    calculate_expansion_levels,
    calculate_extension_levels,
    calculate_projection_levels,
    calculate_retracement_levels,
)
from trader.harmonics import (
    PatternPoints,
    PatternType,
    calculate_reversal_zone,
    validate_pattern,
)
from trader.indicators import calculate_macd, calculate_rsi
from trader.journal import (
    JournalEntry,
    calculate_analytics,
    create_journal_entry,
    update_journal_entry,
)
from trader.market_data import MarketDataService
from trader.pivots import (
    OHLCBar,
    PivotPoint,
    classify_swings,
    detect_pivots,
)
from trader.position_sizing import (
    calculate_position_size,
    calculate_risk_reward,
)
from trader.signals import Bar, detect_signal
from trader.volume_indicators import analyze_volume
from trader.workflow import (
    AlignmentResult,
    IndicatorConfirmation,
    LevelsResult,
    OpportunityScanResult,
    TradeCategory,
    TrendAssessment,
    assess_trend,
    categorize_trade,
    check_timeframe_alignment,
    confirm_with_indicators,
    identify_fibonacci_levels,
    scan_opportunities,
    validate_trade,
)

# Initialize singleton services
_market_data_service = MarketDataService()
_analysis_orchestrator = AnalysisOrchestrator(_market_data_service)

# In-memory journal storage (will be replaced with database later)
_journal_entries: list[JournalEntry] = []

app = FastAPI(
    title="Trader API",
    description="Fibonacci Trading Analysis API",
    version="0.1.0",
)


# --- Request/Response Models ---


class RetracementRequest(BaseModel):
    """Request model for retracement calculation."""

    high: float
    low: float
    direction: Literal["buy", "sell"]


class ExtensionRequest(BaseModel):
    """Request model for extension calculation."""

    high: float
    low: float
    direction: Literal["buy", "sell"]


class ProjectionRequest(BaseModel):
    """Request model for projection calculation."""

    point_a: float
    point_b: float
    point_c: float
    direction: Literal["buy", "sell"]


class ExpansionRequest(BaseModel):
    """Request model for expansion calculation."""

    point_a: float
    point_b: float
    direction: Literal["buy", "sell"]


class FibonacciResponse(BaseModel):
    """Response model for Fibonacci calculations."""

    levels: dict[str, float]


class SignalRequest(BaseModel):
    """Request model for signal detection."""

    open: float
    high: float
    low: float
    close: float
    fibonacci_level: float


class SignalData(BaseModel):
    """Signal data in response."""

    direction: str
    signal_type: str
    strength: float
    level: float


class SignalResponse(BaseModel):
    """Response model for signal detection."""

    signal: SignalData | None


class HarmonicValidateRequest(BaseModel):
    """Request model for harmonic pattern validation."""

    x: float
    a: float
    b: float
    c: float
    d: float


class HarmonicPatternData(BaseModel):
    """Harmonic pattern data in response."""

    pattern_type: str
    direction: str
    x: float
    a: float
    b: float
    c: float
    d: float


class HarmonicValidateResponse(BaseModel):
    """Response model for harmonic pattern validation."""

    pattern: HarmonicPatternData | None


class ReversalZoneRequest(BaseModel):
    """Request model for reversal zone calculation."""

    x: float
    a: float
    b: float
    c: float
    pattern_type: Literal["gartley", "butterfly", "bat", "crab"]


class ReversalZoneData(BaseModel):
    """Reversal zone data in response."""

    d_level: float
    direction: str
    pattern_type: str


class ReversalZoneResponse(BaseModel):
    """Response model for reversal zone calculation."""

    reversal_zone: ReversalZoneData | None


class PositionSizeRequest(BaseModel):
    """Request model for position size calculation."""

    entry_price: float
    stop_loss: float
    risk_capital: float
    account_balance: float = 0.0


class PositionSizeData(BaseModel):
    """Position size data in response."""

    position_size: float
    distance_to_stop: float
    risk_amount: float
    account_risk_percentage: float
    is_valid: bool


class PositionSizeResponse(BaseModel):
    """Response model for position size calculation."""

    result: PositionSizeData


class RiskRewardRequest(BaseModel):
    """Request model for risk/reward calculation."""

    entry_price: float
    stop_loss: float
    targets: list[float]
    position_size: float = 0.0


class RiskRewardData(BaseModel):
    """Risk/reward data in response."""

    risk_reward_ratio: float
    target_ratios: list[float]
    potential_profit: float
    potential_loss: float
    recommendation: str
    is_valid: bool


class RiskRewardResponse(BaseModel):
    """Response model for risk/reward calculation."""

    result: RiskRewardData


class OHLCBarModel(BaseModel):
    """OHLC bar data for pivot detection."""

    time: str | int
    open: float
    high: float
    low: float
    close: float
    volume: int | None = None


class PivotDetectRequest(BaseModel):
    """Request model for pivot detection."""

    data: list[OHLCBarModel]
    lookback: int = 5
    count: int = 10


class PivotPointData(BaseModel):
    """Pivot point data in response."""

    index: int
    price: float
    type: str
    time: str | int


class PivotDetectResponse(BaseModel):
    """Response model for pivot detection."""

    pivots: list[PivotPointData]
    recent_pivots: list[PivotPointData]
    pivot_high: float
    pivot_low: float
    swing_high: PivotPointData | None
    swing_low: PivotPointData | None


class SwingMarkerData(BaseModel):
    """Swing marker data in response."""

    index: int
    price: float
    time: str | int
    swing_type: str  # "HH", "HL", "LH", "LL"


class SwingDetectRequest(BaseModel):
    """Request model for swing pattern detection."""

    data: list[OHLCBarModel]
    lookback: int = 5


class SwingDetectResponse(BaseModel):
    """Response model for swing pattern detection."""

    pivots: list[PivotPointData]
    markers: list[SwingMarkerData]


class MarketDataRequest(BaseModel):
    """Request model for market data fetching."""

    symbol: str
    timeframe: str = "1D"
    periods: int = 100
    force_refresh: bool = False


class MarketDataBarModel(BaseModel):
    """OHLC bar in market data response."""

    time: str | int
    open: float
    high: float
    low: float
    close: float
    volume: int | None = None


class MarketStatusModel(BaseModel):
    """Market status in response."""

    state: str
    state_display: str
    is_open: bool


class MarketDataResponse(BaseModel):
    """Response model for market data."""

    success: bool
    data: list[MarketDataBarModel]
    provider: str | None
    cached: bool
    cache_expires_at: str | None
    rate_limit_remaining: int | None
    market_status: MarketStatusModel | None
    error: str | None = None


class ProviderStatusModel(BaseModel):
    """Provider status information."""

    name: str
    priority: int
    rate_limit: float | None  # None means unlimited
    requests_made: int
    remaining: float | None  # None means unlimited
    is_rate_limited: bool


class ProviderStatusResponse(BaseModel):
    """Response model for provider status."""

    providers: list[ProviderStatusModel]


class JournalEntryRequest(BaseModel):
    """Request model for creating a journal entry."""

    symbol: str
    direction: Literal["long", "short"]
    entry_price: float
    exit_price: float
    stop_loss: float
    position_size: float
    entry_time: str
    exit_time: str
    timeframe: str | None = None
    targets: list[float] | None = None
    exit_reason: str | None = None
    notes: str | None = None
    workflow_id: str | None = None


class JournalEntryData(BaseModel):
    """Journal entry data in response."""

    id: str
    symbol: str
    direction: str
    entry_price: float
    exit_price: float
    stop_loss: float
    position_size: float
    entry_time: str
    exit_time: str
    pnl: float
    r_multiple: float
    outcome: str
    timeframe: str | None = None
    targets: list[float] = []
    exit_reason: str | None = None
    notes: str | None = None
    workflow_id: str | None = None


class JournalEntryResponse(BaseModel):
    """Response model for single journal entry."""

    entry: JournalEntryData


class JournalEntriesResponse(BaseModel):
    """Response model for list of journal entries."""

    entries: list[JournalEntryData]


class JournalAnalyticsData(BaseModel):
    """Analytics data in response."""

    total_trades: int
    wins: int
    losses: int
    breakevens: int
    win_rate: float
    total_pnl: float
    average_r: float
    largest_win: float
    largest_loss: float
    profit_factor: float


class JournalAnalyticsResponse(BaseModel):
    """Response model for journal analytics."""

    analytics: JournalAnalyticsData


class JournalEntryUpdateRequest(BaseModel):
    """Request model for updating a journal entry.

    All fields are optional - only provided fields will be updated.
    P&L and R-multiple are recalculated when price fields change.
    """

    exit_price: float | None = None
    exit_time: str | None = None
    exit_reason: str | None = None
    stop_loss: float | None = None
    notes: str | None = None


class MACDRequest(BaseModel):
    """Request model for MACD calculation."""

    data: list[OHLCBarModel]
    fast_period: int = 12
    slow_period: int = 26
    signal_period: int = 9


class MACDResponse(BaseModel):
    """Response model for MACD calculation."""

    macd: list[float | None]
    signal: list[float | None]
    histogram: list[float | None]


class RSIRequest(BaseModel):
    """Request model for RSI calculation."""

    data: list[OHLCBarModel]
    period: int = 14


class RSIResponse(BaseModel):
    """Response model for RSI calculation."""

    rsi: list[float | None]


class VolumeAnalysisRequest(BaseModel):
    """Request model for volume analysis."""

    data: list[OHLCBarModel]
    ma_period: int = 20


class VolumeAnalysisData(BaseModel):
    """Volume analysis data in response."""

    volume_ma: float
    current_volume: int
    relative_volume: float
    is_high_volume: bool
    is_above_average: bool
    interpretation: str


class VolumeAnalysisResponse(BaseModel):
    """Response model for volume analysis."""

    analysis: VolumeAnalysisData | None
    error: str | None = None


class ATRRequest(BaseModel):
    """Request model for ATR calculation."""

    data: list[OHLCBarModel]
    period: int = 14


class ATRAnalysisData(BaseModel):
    """ATR analysis data in response."""

    atr: float
    atr_percent: float
    volatility_level: str
    current_price: float
    suggested_stop_1x: float
    suggested_stop_1_5x: float
    suggested_stop_2x: float
    interpretation: str


class ATRSeriesResponse(BaseModel):
    """Response model for ATR series (for charting)."""

    atr_values: list[float | None]
    analysis: ATRAnalysisData | None
    error: str | None = None


# --- Endpoints ---


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/fibonacci/retracement", response_model=FibonacciResponse)
async def retracement(request: RetracementRequest) -> FibonacciResponse:
    """Calculate Fibonacci retracement levels."""
    levels = calculate_retracement_levels(
        high=request.high,
        low=request.low,
        direction=request.direction,
    )
    # Convert enum keys to string for JSON serialization
    return FibonacciResponse(
        levels={str(int(k.value * 1000)): v for k, v in levels.items()}
    )


@app.post("/fibonacci/extension", response_model=FibonacciResponse)
async def extension(request: ExtensionRequest) -> FibonacciResponse:
    """Calculate Fibonacci extension levels."""
    levels = calculate_extension_levels(
        high=request.high,
        low=request.low,
        direction=request.direction,
    )
    return FibonacciResponse(
        levels={str(int(k.value * 1000)): v for k, v in levels.items()}
    )


@app.post("/fibonacci/projection", response_model=FibonacciResponse)
async def projection(request: ProjectionRequest) -> FibonacciResponse:
    """Calculate Fibonacci projection levels."""
    levels = calculate_projection_levels(
        point_a=request.point_a,
        point_b=request.point_b,
        point_c=request.point_c,
        direction=request.direction,
    )
    return FibonacciResponse(
        levels={str(int(k.value * 1000)): v for k, v in levels.items()}
    )


@app.post("/fibonacci/expansion", response_model=FibonacciResponse)
async def expansion(request: ExpansionRequest) -> FibonacciResponse:
    """Calculate Fibonacci expansion levels."""
    levels = calculate_expansion_levels(
        point_a=request.point_a,
        point_b=request.point_b,
        direction=request.direction,
    )
    return FibonacciResponse(
        levels={str(int(k.value * 1000)): v for k, v in levels.items()}
    )


@app.post("/signal/detect", response_model=SignalResponse)
async def detect(request: SignalRequest) -> SignalResponse:
    """Detect trading signal at a Fibonacci level."""
    bar = Bar(
        open=request.open,
        high=request.high,
        low=request.low,
        close=request.close,
    )
    signal = detect_signal(bar=bar, fibonacci_level=request.fibonacci_level)

    if signal is None:
        return SignalResponse(signal=None)

    return SignalResponse(
        signal=SignalData(
            direction=signal.direction,
            signal_type=signal.signal_type.value,
            strength=signal.strength,
            level=signal.level,
        )
    )


@app.post("/harmonic/validate", response_model=HarmonicValidateResponse)
async def harmonic_validate(
    request: HarmonicValidateRequest,
) -> HarmonicValidateResponse:
    """Validate if points form a harmonic pattern."""
    points = PatternPoints(
        x=request.x, a=request.a, b=request.b, c=request.c, d=request.d
    )
    pattern = validate_pattern(points)

    if pattern is None:
        return HarmonicValidateResponse(pattern=None)

    return HarmonicValidateResponse(
        pattern=HarmonicPatternData(
            pattern_type=pattern.pattern_type.value,
            direction=pattern.direction,
            x=pattern.points.x,
            a=pattern.points.a,
            b=pattern.points.b,
            c=pattern.points.c,
            d=pattern.points.d,
        )
    )


@app.post("/harmonic/reversal-zone", response_model=ReversalZoneResponse)
async def harmonic_reversal_zone(request: ReversalZoneRequest) -> ReversalZoneResponse:
    """Calculate potential reversal zone (D point) for a harmonic pattern."""
    pattern_type_map = {
        "gartley": PatternType.GARTLEY,
        "butterfly": PatternType.BUTTERFLY,
        "bat": PatternType.BAT,
        "crab": PatternType.CRAB,
    }

    reversal_zone = calculate_reversal_zone(
        x=request.x,
        a=request.a,
        pattern_type=pattern_type_map[request.pattern_type],
    )

    if reversal_zone is None:
        return ReversalZoneResponse(reversal_zone=None)

    return ReversalZoneResponse(
        reversal_zone=ReversalZoneData(
            d_level=reversal_zone.d_level,
            direction=reversal_zone.direction,
            pattern_type=reversal_zone.pattern_type.value,
        )
    )


@app.post("/position/size", response_model=PositionSizeResponse)
async def position_size(request: PositionSizeRequest) -> PositionSizeResponse:
    """Calculate position size based on risk parameters."""
    result = calculate_position_size(
        entry_price=request.entry_price,
        stop_loss=request.stop_loss,
        risk_capital=request.risk_capital,
        account_balance=request.account_balance,
    )
    return PositionSizeResponse(
        result=PositionSizeData(
            position_size=result.position_size,
            distance_to_stop=result.distance_to_stop,
            risk_amount=result.risk_amount,
            account_risk_percentage=result.account_risk_percentage,
            is_valid=result.is_valid,
        )
    )


@app.post("/position/risk-reward", response_model=RiskRewardResponse)
async def risk_reward(request: RiskRewardRequest) -> RiskRewardResponse:
    """Calculate risk/reward ratio based on entry, stop, and targets."""
    result = calculate_risk_reward(
        entry_price=request.entry_price,
        stop_loss=request.stop_loss,
        targets=request.targets,
        position_size=request.position_size,
    )
    return RiskRewardResponse(
        result=RiskRewardData(
            risk_reward_ratio=result.risk_reward_ratio,
            target_ratios=result.target_ratios,
            potential_profit=result.potential_profit,
            potential_loss=result.potential_loss,
            recommendation=result.recommendation.value,
            is_valid=result.is_valid,
        )
    )


@app.post("/pivot/detect", response_model=PivotDetectResponse)
async def pivot_detect(request: PivotDetectRequest) -> PivotDetectResponse:
    """Detect swing highs and lows in OHLC data."""
    # Convert Pydantic models to dataclasses
    ohlc_data = [
        OHLCBar(
            time=bar.time,
            open=bar.open,
            high=bar.high,
            low=bar.low,
            close=bar.close,
        )
        for bar in request.data
    ]

    result = detect_pivots(
        data=ohlc_data,
        lookback=request.lookback,
        count=request.count,
    )

    # Convert dataclasses to Pydantic models
    def pivot_to_data(pivot: PivotPoint) -> PivotPointData:
        return PivotPointData(
            index=pivot.index,
            price=pivot.price,
            type=pivot.type,
            time=pivot.time,
        )

    return PivotDetectResponse(
        pivots=[pivot_to_data(p) for p in result.pivots],
        recent_pivots=[pivot_to_data(p) for p in result.recent_pivots],
        pivot_high=result.pivot_high,
        pivot_low=result.pivot_low,
        swing_high=pivot_to_data(result.swing_high) if result.swing_high else None,
        swing_low=pivot_to_data(result.swing_low) if result.swing_low else None,
    )


@app.post("/pivot/swings", response_model=SwingDetectResponse)
async def pivot_swings(request: SwingDetectRequest) -> SwingDetectResponse:
    """Detect and classify swing patterns (HH/HL/LH/LL) in OHLC data.

    First detects swing highs and lows, then classifies each pivot
    by comparing to the previous pivot of the same type:
    - HH (Higher High): current high > previous high
    - HL (Higher Low): current low > previous low
    - LH (Lower High): current high < previous high
    - LL (Lower Low): current low < previous low
    """
    # Convert Pydantic models to dataclasses
    ohlc_data = [
        OHLCBar(
            time=bar.time,
            open=bar.open,
            high=bar.high,
            low=bar.low,
            close=bar.close,
        )
        for bar in request.data
    ]

    # Detect pivots
    pivot_result = detect_pivots(data=ohlc_data, lookback=request.lookback)

    # Classify swings
    swing_markers = classify_swings(pivot_result.pivots)

    # Convert to response format
    pivots = [
        PivotPointData(
            index=p.index,
            price=p.price,
            type=p.type,
            time=p.time,
        )
        for p in pivot_result.pivots
    ]

    markers = [
        SwingMarkerData(
            index=m.index,
            price=m.price,
            time=m.time,
            swing_type=m.swing_type,
        )
        for m in swing_markers
    ]

    return SwingDetectResponse(pivots=pivots, markers=markers)


@app.get("/market-data", response_model=MarketDataResponse)
async def get_market_data(
    symbol: str,
    timeframe: str = "1D",
    periods: int = 100,
    force_refresh: bool = False,
) -> MarketDataResponse:
    """Fetch market data from the best available provider.

    Uses caching and provider fallback for reliability.
    """
    result = await _market_data_service.get_ohlc(
        symbol=symbol,
        timeframe=timeframe,
        periods=periods,
        force_refresh=force_refresh,
    )

    # Convert to response model
    data = [
        MarketDataBarModel(
            time=bar.time,
            open=bar.open,
            high=bar.high,
            low=bar.low,
            close=bar.close,
            volume=bar.volume,
        )
        for bar in result.data
    ]

    market_status = None
    if result.market_status:
        market_status = MarketStatusModel(
            state=result.market_status.state,
            state_display=result.market_status.state_display,
            is_open=result.market_status.is_open,
        )

    return MarketDataResponse(
        success=result.success,
        data=data,
        provider=result.provider,
        cached=result.cached,
        cache_expires_at=result.cache_expires_at,
        rate_limit_remaining=result.rate_limit_remaining,
        market_status=market_status,
        error=result.error,
    )


def _to_json_safe(value: float) -> float | None:
    """Convert infinity to None for JSON serialization."""
    return None if value == float("inf") else value


@app.get("/market-data/providers", response_model=ProviderStatusResponse)
async def get_provider_status() -> ProviderStatusResponse:
    """Get status of all market data providers."""
    status = _market_data_service.get_provider_status()

    providers = [
        ProviderStatusModel(
            name=p["name"],
            priority=p["priority"],
            rate_limit=_to_json_safe(p["rate_limit"]),
            requests_made=p["requests_made"],
            remaining=_to_json_safe(p["remaining"]),
            is_rate_limited=p["is_rate_limited"],
        )
        for p in status
    ]

    return ProviderStatusResponse(providers=providers)


@app.post("/analyze", response_model=FullAnalysisResponse)
async def analyze(request: FullAnalysisRequest) -> FullAnalysisResponse:
    """Perform full chart analysis in a single request.

    Combines market data fetching, pivot detection, Fibonacci calculations,
    and signal detection into a single unified analysis endpoint.

    This reduces frontend complexity and network round-trips by providing
    all analysis data in one response.
    """
    return await _analysis_orchestrator.analyze(request)


def _entry_to_data(entry: JournalEntry) -> JournalEntryData:
    """Convert JournalEntry to JournalEntryData for API response."""
    return JournalEntryData(
        id=entry.id,
        symbol=entry.symbol,
        direction=entry.direction,
        entry_price=entry.entry_price,
        exit_price=entry.exit_price,
        stop_loss=entry.stop_loss,
        position_size=entry.position_size,
        entry_time=entry.entry_time,
        exit_time=entry.exit_time,
        pnl=entry.pnl,
        r_multiple=entry.r_multiple,
        outcome=entry.outcome.value,
        timeframe=entry.timeframe,
        targets=entry.targets,
        exit_reason=entry.exit_reason,
        notes=entry.notes,
        workflow_id=entry.workflow_id,
    )


@app.post("/journal/entry", response_model=JournalEntryResponse, status_code=201)
async def create_entry(request: JournalEntryRequest) -> JournalEntryResponse:
    """Create a new journal entry for a completed trade."""
    entry = create_journal_entry(
        symbol=request.symbol,
        direction=request.direction,
        entry_price=request.entry_price,
        exit_price=request.exit_price,
        stop_loss=request.stop_loss,
        position_size=request.position_size,
        entry_time=request.entry_time,
        exit_time=request.exit_time,
        timeframe=request.timeframe,
        targets=request.targets,
        exit_reason=request.exit_reason,
        notes=request.notes,
        workflow_id=request.workflow_id,
    )
    _journal_entries.append(entry)
    return JournalEntryResponse(entry=_entry_to_data(entry))


@app.put("/journal/entry/{entry_id}", response_model=JournalEntryResponse)
async def update_entry(
    entry_id: str, request: JournalEntryUpdateRequest
) -> JournalEntryResponse:
    """Update an existing journal entry.

    Updates the specified fields and recalculates P&L and R-multiple
    when price fields change.
    """
    global _journal_entries

    # Find the entry
    entry_index = next(
        (i for i, e in enumerate(_journal_entries) if e.id == entry_id), None
    )
    if entry_index is None:
        raise HTTPException(status_code=404, detail="Entry not found")

    # Update the entry
    updated_entry = update_journal_entry(
        _journal_entries[entry_index],
        exit_price=request.exit_price,
        exit_time=request.exit_time,
        exit_reason=request.exit_reason,
        stop_loss=request.stop_loss,
        notes=request.notes,
    )

    # Replace in list
    _journal_entries[entry_index] = updated_entry
    return JournalEntryResponse(entry=_entry_to_data(updated_entry))


@app.get("/journal/entry/{entry_id}", response_model=JournalEntryResponse)
async def get_entry(entry_id: str) -> JournalEntryResponse:
    """Get a single journal entry by ID."""
    entry = next((e for e in _journal_entries if e.id == entry_id), None)
    if entry is None:
        raise HTTPException(status_code=404, detail="Entry not found")
    return JournalEntryResponse(entry=_entry_to_data(entry))


@app.get("/journal/entries", response_model=JournalEntriesResponse)
async def list_entries(symbol: str | None = None) -> JournalEntriesResponse:
    """List all journal entries, optionally filtered by symbol."""
    entries = _journal_entries
    if symbol:
        entries = [e for e in entries if e.symbol == symbol]
    return JournalEntriesResponse(entries=[_entry_to_data(e) for e in entries])


@app.get("/journal/analytics", response_model=JournalAnalyticsResponse)
async def get_analytics() -> JournalAnalyticsResponse:
    """Get aggregated analytics from all journal entries."""
    analytics = calculate_analytics(_journal_entries)

    # Handle infinity for JSON serialization
    profit_factor = analytics.profit_factor
    if profit_factor == float("inf"):
        profit_factor = 999999.0

    return JournalAnalyticsResponse(
        analytics=JournalAnalyticsData(
            total_trades=analytics.total_trades,
            wins=analytics.wins,
            losses=analytics.losses,
            breakevens=analytics.breakevens,
            win_rate=analytics.win_rate,
            total_pnl=analytics.total_pnl,
            average_r=analytics.average_r,
            largest_win=analytics.largest_win,
            largest_loss=analytics.largest_loss,
            profit_factor=profit_factor,
        )
    )


@app.delete("/journal/entry/{entry_id}")
async def delete_entry(entry_id: str) -> dict[str, str]:
    """Delete a journal entry by ID."""
    global _journal_entries
    original_count = len(_journal_entries)
    _journal_entries = [e for e in _journal_entries if e.id != entry_id]

    if len(_journal_entries) == original_count:
        raise HTTPException(status_code=404, detail="Entry not found")

    return {"status": "deleted", "id": entry_id}


@app.delete("/journal/entries")
async def clear_entries() -> dict[str, str]:
    """Clear all journal entries. Useful for testing."""
    global _journal_entries
    count = len(_journal_entries)
    _journal_entries = []
    return {"status": "cleared", "count": str(count)}


@app.post("/indicators/macd", response_model=MACDResponse)
async def macd_indicator(request: MACDRequest) -> MACDResponse:
    """Calculate MACD indicator from OHLC data.

    MACD (Moving Average Convergence Divergence) is a trend-following
    momentum indicator that shows the relationship between two EMAs.

    - MACD Line = Fast EMA - Slow EMA
    - Signal Line = EMA of MACD Line
    - Histogram = MACD - Signal
    """
    if not request.data:
        raise HTTPException(status_code=400, detail="No data provided")

    # Extract closing prices from OHLC data
    prices = [bar.close for bar in request.data]

    try:
        result = calculate_macd(
            prices=prices,
            fast_period=request.fast_period,
            slow_period=request.slow_period,
            signal_period=request.signal_period,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return MACDResponse(
        macd=result.macd,
        signal=result.signal,
        histogram=result.histogram,
    )


@app.post("/indicators/rsi", response_model=RSIResponse)
async def rsi_indicator(request: RSIRequest) -> RSIResponse:
    """Calculate RSI indicator from OHLC data.

    RSI (Relative Strength Index) is a momentum oscillator that measures
    the speed and magnitude of price movements on a scale of 0 to 100.

    - RSI > 70 = Overbought condition
    - RSI < 30 = Oversold condition
    """
    if not request.data:
        raise HTTPException(status_code=400, detail="No data provided")

    # Extract closing prices from OHLC data
    prices = [bar.close for bar in request.data]

    try:
        result = calculate_rsi(prices=prices, period=request.period)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    return RSIResponse(rsi=result.rsi)


@app.post("/indicators/volume-analysis", response_model=VolumeAnalysisResponse)
async def volume_analysis_indicator(
    request: VolumeAnalysisRequest,
) -> VolumeAnalysisResponse:
    """Calculate volume analysis from OHLC data.

    Analyzes volume to determine trade conviction:
    - RVOL >= 2.0: Very high volume (strong conviction)
    - RVOL >= 1.5: High volume (good confirmation)
    - RVOL >= 1.0: Normal volume (acceptable)
    - RVOL < 1.0: Below average (low conviction warning)
    """
    if not request.data:
        return VolumeAnalysisResponse(
            analysis=None, error="No data provided"
        )

    # Extract volumes from OHLC data
    volumes: list[int | None] = [bar.volume for bar in request.data]
    valid_volumes = [v for v in volumes if v is not None]

    if len(valid_volumes) < request.ma_period:
        return VolumeAnalysisResponse(
            analysis=None,
            error=f"Need at least {request.ma_period} bars with volume data",
        )

    result = analyze_volume(volumes, ma_period=request.ma_period)

    if result is None:
        return VolumeAnalysisResponse(
            analysis=None, error="Unable to calculate volume analysis"
        )

    return VolumeAnalysisResponse(
        analysis=VolumeAnalysisData(
            volume_ma=result.volume_ma,
            current_volume=result.current_volume,
            relative_volume=result.relative_volume,
            is_high_volume=result.is_high_volume,
            is_above_average=result.is_above_average,
            interpretation=result.interpretation,
        )
    )


@app.post("/indicators/atr", response_model=ATRSeriesResponse)
async def atr_indicator(request: ATRRequest) -> ATRSeriesResponse:
    """Calculate ATR indicator from OHLC data.

    ATR (Average True Range) measures volatility:
    - Low (<0.5%): Quiet market, may lack movement
    - Normal (0.5-1.5%): Typical conditions
    - High (1.5-3%): Elevated volatility, use caution
    - Extreme (>3%): Very volatile, reduce size or avoid

    Returns ATR series for charting and analysis with stop suggestions.
    """
    if not request.data:
        return ATRSeriesResponse(
            atr_values=[], analysis=None, error="No data provided"
        )

    if len(request.data) < request.period:
        return ATRSeriesResponse(
            atr_values=[],
            analysis=None,
            error=f"Need at least {request.period} bars for ATR calculation",
        )

    # Extract OHLC data
    highs = [bar.high for bar in request.data]
    lows = [bar.low for bar in request.data]
    closes = [bar.close for bar in request.data]

    # Get ATR series for charting
    atr_values = get_atr_series(highs, lows, closes, request.period)

    # Get analysis for current bar
    analysis_result = analyze_atr(highs, lows, closes, request.period)

    analysis_data = None
    if analysis_result:
        analysis_data = ATRAnalysisData(
            atr=analysis_result.atr,
            atr_percent=analysis_result.atr_percent,
            volatility_level=analysis_result.volatility_level,
            current_price=analysis_result.current_price,
            suggested_stop_1x=analysis_result.suggested_stop_1x,
            suggested_stop_1_5x=analysis_result.suggested_stop_1_5x,
            suggested_stop_2x=analysis_result.suggested_stop_2x,
            interpretation=analysis_result.interpretation,
        )

    return ATRSeriesResponse(
        atr_values=atr_values,
        analysis=analysis_data,
    )


# --- Workflow Endpoints ---


@app.get("/workflow/assess", response_model=TrendAssessment)
async def workflow_assess(
    symbol: str,
    timeframe: str = "1D",
) -> TrendAssessment:
    """Assess trend direction from swing pattern analysis.

    Analyzes market data to determine trend direction based on
    swing highs and lows (HH/HL/LH/LL patterns).
    """
    return await assess_trend(
        symbol=symbol,
        timeframe=timeframe,
        market_service=_market_data_service,
    )


@app.get("/workflow/align", response_model=AlignmentResult)
async def workflow_align(
    symbol: str,
    timeframes: str = "1M,1W,1D",
) -> AlignmentResult:
    """Check trend alignment across multiple timeframes.

    Args:
        symbol: Market symbol to analyze.
        timeframes: Comma-separated list of timeframes (e.g., "1M,1W,1D").

    Returns:
        AlignmentResult with count and strength of aligned timeframes.
    """
    timeframe_list = [tf.strip() for tf in timeframes.split(",")]
    return await check_timeframe_alignment(
        symbol=symbol,
        timeframes=timeframe_list,
        market_service=_market_data_service,
    )


@app.get("/workflow/levels", response_model=LevelsResult)
async def workflow_levels(
    symbol: str,
    direction: Literal["buy", "sell"],
    timeframe: str = "1D",
) -> LevelsResult:
    """Identify Fibonacci levels for entries and targets.

    Calculates retracement levels for potential entry zones
    and extension levels for potential target zones.
    """
    return await identify_fibonacci_levels(
        symbol=symbol,
        timeframe=timeframe,
        direction=direction,
        market_service=_market_data_service,
    )


@app.get("/workflow/confirm", response_model=IndicatorConfirmation)
async def workflow_confirm(
    symbol: str,
    timeframe: str = "1D",
) -> IndicatorConfirmation:
    """Confirm trade setup with RSI and MACD indicators.

    Analyzes RSI and MACD to provide confirmation signals
    and an overall recommendation (strong/partial/wait).
    """
    return await confirm_with_indicators(
        symbol=symbol,
        timeframe=timeframe,
        market_service=_market_data_service,
    )


@app.get("/workflow/categorize")
def workflow_categorize(
    higher_tf_trend: str,
    lower_tf_trend: str,
    trade_direction: str,
    confluence_score: int = 1,
) -> dict[str, TradeCategory]:
    """Categorize trade for position sizing based on trend alignment.

    Returns trade category (with_trend, counter_trend, reversal_attempt)
    which determines the recommended risk percentage for the trade.

    - with_trend: Trading with higher TF trend (1-2% risk)
    - counter_trend: Against higher TF at major levels (0.5-1% risk)
    - reversal_attempt: Speculative against trend (0.25-0.5% risk)
    """
    category = categorize_trade(
        higher_tf_trend=higher_tf_trend,  # type: ignore[arg-type]
        lower_tf_trend=lower_tf_trend,  # type: ignore[arg-type]
        trade_direction=trade_direction,  # type: ignore[arg-type]
        confluence_score=confluence_score,
    )
    return {"category": category}


@app.get("/workflow/opportunities", response_model=OpportunityScanResult)
async def workflow_opportunities(
    symbols: str = "DJI,SPX,NDX",
    timeframe_pairs: str = "1D:4H",
) -> OpportunityScanResult:
    """Scan multiple symbols for trade opportunities.

    Analyzes each symbol across timeframe pairs to identify potential trades.
    Uses higher timeframe for trend context and lower timeframe for entry.

    Args:
        symbols: Comma-separated list of symbols (e.g., "DJI,SPX,NDX").
        timeframe_pairs: Colon-separated higher:lower pairs, comma-separated
                        for multiple pairs (e.g., "1D:4H" or "1D:4H,1W:1D").

    Returns:
        OpportunityScanResult with identified opportunities and scan metadata.
    """
    symbol_list = [s.strip() for s in symbols.split(",")]

    # Parse timeframe pairs (e.g., "1D:4H,1W:1D" -> [("1D", "4H"), ("1W", "1D")])
    pairs: list[tuple[str, str]] = []
    for pair_str in timeframe_pairs.split(","):
        parts = pair_str.strip().split(":")
        if len(parts) == 2:
            pairs.append((parts[0].strip(), parts[1].strip()))

    if not pairs:
        pairs = [("1D", "4H")]  # Default pair

    return await scan_opportunities(
        symbols=symbol_list,
        timeframe_pairs=pairs,
        market_service=_market_data_service,
    )


class ValidateTradeRequest(BaseModel):
    """Request model for trade validation."""

    symbol: str
    higher_timeframe: str
    lower_timeframe: str
    direction: Literal["long", "short"]


class ValidationCheckData(BaseModel):
    """Validation check data in response."""

    name: str
    passed: bool
    explanation: str
    details: str | None = None


class ValidationResultData(BaseModel):
    """Validation result data in response."""

    checks: list[ValidationCheckData]
    passed_count: int
    total_count: int
    is_valid: bool
    pass_percentage: float


@app.post("/workflow/validate", response_model=ValidationResultData)
async def workflow_validate(request: ValidateTradeRequest) -> ValidationResultData:
    """Validate a trade opportunity with 5 checks.

    Performs the following validation checks:
    1. Trend Alignment - Higher/lower TF alignment per spec rules
    2. Entry Zone - Fibonacci entry levels found
    3. Target Zones - Extension targets found
    4. RSI Confirmation - Momentum confirmation
    5. MACD Confirmation - Trend momentum intact

    Trade is valid when pass_percentage >= 60% (3+ checks pass).

    Returns:
        ValidationResultData with all 5 checks and summary statistics.
    """
    result = await validate_trade(
        symbol=request.symbol,
        higher_timeframe=request.higher_timeframe,
        lower_timeframe=request.lower_timeframe,
        direction=request.direction,
        market_service=_market_data_service,
    )

    return ValidationResultData(
        checks=[
            ValidationCheckData(
                name=c.name,
                passed=c.passed,
                explanation=c.explanation,
                details=c.details,
            )
            for c in result.checks
        ],
        passed_count=result.passed_count,
        total_count=result.total_count,
        is_valid=result.is_valid,
        pass_percentage=result.pass_percentage,
    )
