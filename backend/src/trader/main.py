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
