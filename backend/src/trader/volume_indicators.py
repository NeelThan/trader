"""Volume analysis indicators for trade confirmation.

This module provides volume-based indicators to confirm trade setups:
- Volume Moving Average (VMA): Smoothed volume baseline
- Relative Volume (RVOL): Current volume vs. average
- High Volume Detection: Flags significant volume spikes

Volume confirmation helps filter out low-conviction trades:
- RVOL >= 1.5: Strong volume confirmation (high conviction)
- RVOL >= 1.0: Normal volume (acceptable)
- RVOL < 1.0: Below average volume (low conviction warning)
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class VolumeAnalysis:
    """Results from volume analysis.

    Attributes:
        volume_ma: Volume moving average (smoothed baseline).
        current_volume: Most recent volume reading.
        relative_volume: RVOL = current_volume / volume_ma.
        is_high_volume: True when RVOL >= 1.5 (strong confirmation).
        is_above_average: True when RVOL >= 1.0 (acceptable).
        interpretation: Human-readable interpretation.
    """

    volume_ma: float
    current_volume: int
    relative_volume: float
    is_high_volume: bool
    is_above_average: bool
    interpretation: str


def calculate_volume_ma(volumes: list[int], period: int = 20) -> list[float | None]:
    """Calculate Simple Moving Average of volume.

    Args:
        volumes: List of volume values.
        period: MA period (default 20).

    Returns:
        List of MA values, with None for insufficient data points.
    """
    if not volumes or period <= 0:
        return []

    result: list[float | None] = []

    for i in range(len(volumes)):
        if i < period - 1:
            result.append(None)
        else:
            window = volumes[i - period + 1 : i + 1]
            result.append(sum(window) / period)

    return result


def analyze_volume(
    volumes: list[int | None],
    ma_period: int = 20,
) -> VolumeAnalysis | None:
    """Analyze volume for trade confirmation.

    Calculates relative volume (RVOL) and determines if volume
    confirms the trade setup.

    Args:
        volumes: List of volume values (may contain None).
        ma_period: Period for volume MA calculation (default 20).

    Returns:
        VolumeAnalysis with RVOL and interpretation, or None if
        insufficient data.
    """
    # Filter out None values
    valid_volumes = [v for v in volumes if v is not None]

    if len(valid_volumes) < ma_period:
        return None

    # Calculate volume MA
    volume_ma_values = calculate_volume_ma(valid_volumes, ma_period)

    # Get the most recent MA value
    recent_ma = volume_ma_values[-1]
    if recent_ma is None or recent_ma <= 0:
        return None

    # Get current (most recent) volume
    current_volume = valid_volumes[-1]

    # Calculate Relative Volume (RVOL)
    relative_volume = current_volume / recent_ma

    # Determine flags
    is_high_volume = relative_volume >= 1.5
    is_above_average = relative_volume >= 1.0

    # Generate interpretation
    if relative_volume >= 2.0:
        interpretation = "Very high volume (2x+ average) - strong conviction"
    elif relative_volume >= 1.5:
        interpretation = "High volume (1.5x+ average) - good confirmation"
    elif relative_volume >= 1.0:
        interpretation = "Normal volume - acceptable"
    elif relative_volume >= 0.7:
        interpretation = "Below average volume - moderate caution"
    else:
        interpretation = "Low volume (<70% average) - weak conviction"

    return VolumeAnalysis(
        volume_ma=round(recent_ma, 0),
        current_volume=current_volume,
        relative_volume=round(relative_volume, 2),
        is_high_volume=is_high_volume,
        is_above_average=is_above_average,
        interpretation=interpretation,
    )


def get_volume_trend(
    volumes: list[int | None],
    lookback: int = 5,
) -> str:
    """Determine if volume is trending up, down, or flat.

    Args:
        volumes: List of volume values.
        lookback: Number of bars to analyze (default 5).

    Returns:
        "increasing", "decreasing", or "flat"
    """
    valid_volumes = [v for v in volumes if v is not None]

    if len(valid_volumes) < lookback:
        return "flat"

    recent = valid_volumes[-lookback:]

    # Simple linear regression slope approximation
    increases = sum(1 for i in range(1, len(recent)) if recent[i] > recent[i - 1])
    decreases = sum(1 for i in range(1, len(recent)) if recent[i] < recent[i - 1])

    if increases > decreases + 1:
        return "increasing"
    elif decreases > increases + 1:
        return "decreasing"
    else:
        return "flat"
