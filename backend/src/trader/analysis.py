"""Unified analysis orchestration for chart data.

This module provides a single endpoint that combines:
- Market data fetching (with caching and provider fallback)
- Pivot detection (swing highs and lows)
- Fibonacci level calculation (retracement and extension)
- Signal detection at Fibonacci levels

The AnalysisOrchestrator coordinates all these operations in a single
request, reducing frontend complexity and network round-trips.
"""

from typing import Any, Literal

from pydantic import BaseModel, Field

from trader.fibonacci import (
    calculate_extension_levels,
    calculate_retracement_levels,
)
from trader.market_data import MarketDataService
from trader.market_data.models import OHLCBar as MarketOHLCBar
from trader.pivots import OHLCBar as PivotOHLCBar
from trader.pivots import PivotPoint, detect_pivots
from trader.signals import Bar, detect_signal

# --- Configuration Models ---


class AnalysisConfig(BaseModel):
    """Configuration for full analysis request.

    Attributes:
        pivot_lookback: Bars to check on each side for swing detection.
        pivot_count: Maximum number of recent pivots to return.
        fibonacci_direction: Direction for Fibonacci calculations.
        detect_signals: Whether to detect signals at Fibonacci levels.
    """

    pivot_lookback: int = Field(default=5, ge=1)
    pivot_count: int = Field(default=10, ge=1)
    fibonacci_direction: Literal["buy", "sell"] = "buy"
    detect_signals: bool = True


class FullAnalysisRequest(BaseModel):
    """Request for full chart analysis.

    Attributes:
        symbol: Market symbol (e.g., "DJI", "SPX").
        timeframe: Chart timeframe (e.g., "1D", "4H").
        periods: Number of periods to fetch.
        config: Analysis configuration options.
    """

    symbol: str
    timeframe: str
    periods: int = 100
    config: AnalysisConfig = Field(default_factory=AnalysisConfig)


# --- Response Section Models ---


class OHLCBarData(BaseModel):
    """OHLC bar data in response."""

    time: str | int
    open: float
    high: float
    low: float
    close: float


class MarketDataSection(BaseModel):
    """Market data section of analysis response."""

    data: list[OHLCBarData]
    provider: str
    cached: bool


class PivotPointData(BaseModel):
    """Pivot point data in response."""

    index: int
    price: float
    type: str
    time: str | int


class PivotSection(BaseModel):
    """Pivot detection section of analysis response."""

    all_pivots: list[PivotPointData]
    recent_pivots: list[PivotPointData]
    swing_high: PivotPointData | None
    swing_low: PivotPointData | None


class FibonacciSection(BaseModel):
    """Fibonacci levels section of analysis response."""

    retracement: dict[str, float]
    extension: dict[str, float]


class SignalData(BaseModel):
    """Signal data in response."""

    direction: str
    signal_type: str
    strength: float
    level: float


class FullAnalysisResponse(BaseModel):
    """Complete analysis response.

    Contains all analysis results from a single request:
    market data, pivots, Fibonacci levels, and signals.
    """

    success: bool
    market_data: MarketDataSection | None = None
    pivots: PivotSection | None = None
    fibonacci: FibonacciSection | None = None
    signals: list[SignalData] = Field(default_factory=list)
    error: str | None = None

    @classmethod
    def from_error(cls, error_message: str) -> "FullAnalysisResponse":
        """Create an error response."""
        return cls(
            success=False,
            market_data=None,
            pivots=PivotSection(
                all_pivots=[],
                recent_pivots=[],
                swing_high=None,
                swing_low=None,
            ),
            fibonacci=FibonacciSection(retracement={}, extension={}),
            signals=[],
            error=error_message,
        )


# --- Orchestrator ---


class AnalysisOrchestrator:
    """Orchestrates full chart analysis pipeline.

    Coordinates market data fetching, pivot detection, Fibonacci
    calculation, and signal detection in a single analysis flow.
    """

    def __init__(self, market_data_service: MarketDataService) -> None:
        """Initialize with market data service.

        Args:
            market_data_service: Service for fetching market data.
        """
        self.market_data = market_data_service

    async def analyze(self, request: FullAnalysisRequest) -> FullAnalysisResponse:
        """Perform full chart analysis.

        Pipeline:
        1. Fetch market data (uses caching and provider fallback)
        2. Detect pivots (swing highs and lows)
        3. Calculate Fibonacci levels from pivots
        4. Detect signals at Fibonacci levels (if enabled)

        Args:
            request: Analysis request with symbol, timeframe, and config.

        Returns:
            Complete analysis response with all results.
        """
        # 1. Fetch market data
        market_result = await self.market_data.get_ohlc(
            symbol=request.symbol,
            timeframe=request.timeframe,
            periods=request.periods,
        )

        if not market_result.success:
            return FullAnalysisResponse.from_error(
                market_result.error or "Failed to fetch market data"
            )

        # Convert to response format
        market_data_section = MarketDataSection(
            data=[
                OHLCBarData(
                    time=bar.time,
                    open=bar.open,
                    high=bar.high,
                    low=bar.low,
                    close=bar.close,
                )
                for bar in market_result.data
            ],
            provider=market_result.provider or "unknown",
            cached=market_result.cached,
        )

        # 2. Detect pivots
        pivot_bars = [
            PivotOHLCBar(
                time=bar.time,
                open=bar.open,
                high=bar.high,
                low=bar.low,
                close=bar.close,
            )
            for bar in market_result.data
        ]

        pivot_result = detect_pivots(
            data=pivot_bars,
            lookback=request.config.pivot_lookback,
            count=request.config.pivot_count,
        )

        pivot_section = self._create_pivot_section(pivot_result)

        # 3. Calculate Fibonacci levels
        fibonacci_section = self._calculate_fibonacci(
            pivot_section=pivot_section,
            direction=request.config.fibonacci_direction,
        )

        # 4. Detect signals (if enabled)
        signals: list[SignalData] = []
        if request.config.detect_signals and market_result.data:
            signals = self._detect_signals(
                market_data=market_result.data,
                fibonacci_levels=fibonacci_section.retracement,
            )

        return FullAnalysisResponse(
            success=True,
            market_data=market_data_section,
            pivots=pivot_section,
            fibonacci=fibonacci_section,
            signals=signals,
            error=None,
        )

    def _create_pivot_section(self, pivot_result: Any) -> PivotSection:
        """Convert pivot detection result to response section."""

        def pivot_to_data(pivot: PivotPoint) -> PivotPointData:
            return PivotPointData(
                index=pivot.index,
                price=pivot.price,
                type=pivot.type,
                time=pivot.time,
            )

        return PivotSection(
            all_pivots=[pivot_to_data(p) for p in pivot_result.pivots],
            recent_pivots=[pivot_to_data(p) for p in pivot_result.recent_pivots],
            swing_high=pivot_to_data(pivot_result.swing_high)
            if pivot_result.swing_high
            else None,
            swing_low=pivot_to_data(pivot_result.swing_low)
            if pivot_result.swing_low
            else None,
        )

    def _calculate_fibonacci(
        self,
        pivot_section: PivotSection,
        direction: Literal["buy", "sell"],
    ) -> FibonacciSection:
        """Calculate Fibonacci levels from pivot points."""
        # Need swing high and low for calculation
        if not pivot_section.swing_high or not pivot_section.swing_low:
            return FibonacciSection(retracement={}, extension={})

        high = pivot_section.swing_high.price
        low = pivot_section.swing_low.price

        # Calculate retracement levels
        retracement_levels = calculate_retracement_levels(
            high=high,
            low=low,
            direction=direction,
        )

        # Calculate extension levels
        extension_levels = calculate_extension_levels(
            high=high,
            low=low,
            direction=direction,
        )

        # Convert enum keys to string format (e.g., "382", "618")
        retracement = {
            str(int(level.value * 1000)): price
            for level, price in retracement_levels.items()
        }

        extension = {
            str(int(level.value * 1000)): price
            for level, price in extension_levels.items()
        }

        return FibonacciSection(retracement=retracement, extension=extension)

    def _detect_signals(
        self,
        market_data: list[MarketOHLCBar],
        fibonacci_levels: dict[str, float],
    ) -> list[SignalData]:
        """Detect signals at Fibonacci levels for the latest bar."""
        if not market_data or not fibonacci_levels:
            return []

        # Use the latest bar for signal detection
        latest_bar = market_data[-1]
        bar = Bar(
            open=latest_bar.open,
            high=latest_bar.high,
            low=latest_bar.low,
            close=latest_bar.close,
        )

        signals: list[SignalData] = []

        # Check for signals at each Fibonacci level
        for _level_key, level_price in fibonacci_levels.items():
            signal = detect_signal(bar=bar, fibonacci_level=level_price)
            if signal is not None:
                signals.append(
                    SignalData(
                        direction=signal.direction,
                        signal_type=signal.signal_type.value,
                        strength=signal.strength,
                        level=level_price,
                    )
                )

        return signals
