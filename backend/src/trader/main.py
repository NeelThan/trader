"""FastAPI application for Fibonacci Trading Analysis."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

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
from trader.signals import Bar, detect_signal

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
