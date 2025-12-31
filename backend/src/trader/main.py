"""FastAPI application for Fibonacci Trading Analysis."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from trader.analysis import (
    AnalysisOrchestrator,
    FullAnalysisRequest,
    FullAnalysisResponse,
)
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
from trader.market_data import MarketDataService
from trader.pivots import (
    OHLCBar,
    PivotPoint,
    detect_pivots,
)
from trader.position_sizing import (
    calculate_position_size,
    calculate_risk_reward,
)
from trader.signals import Bar, detect_signal

# Initialize singleton services
_market_data_service = MarketDataService()
_analysis_orchestrator = AnalysisOrchestrator(_market_data_service)

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
