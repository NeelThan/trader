"""Technical indicator calculations.

This module provides technical indicator calculations for trading analysis.
All calculations are performed server-side per the thin client architecture.

Indicators implemented:
- EMA (Exponential Moving Average)
- MACD (Moving Average Convergence Divergence)
- RSI (Relative Strength Index)

Future indicators (per ADR-20260101):
- SMA (Simple Moving Average)
- ADX (Average Directional Index)
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class RSIResult:
    """Result of RSI calculation.

    Attributes:
        rsi: RSI values (0-100 scale).
             None for periods before warmup is complete.
    """

    rsi: list[float | None]


@dataclass(frozen=True)
class MACDResult:
    """Result of MACD calculation.

    Attributes:
        macd: MACD line values (Fast EMA - Slow EMA).
              None for periods before slow EMA warmup.
        signal: Signal line values (EMA of MACD line).
                None for periods before signal warmup.
        histogram: Histogram values (MACD - Signal).
                   None when either MACD or Signal is None.
    """

    macd: list[float | None]
    signal: list[float | None]
    histogram: list[float | None]


def calculate_ema(prices: list[float], period: int) -> list[float]:
    """Calculate Exponential Moving Average.

    EMA = (Price x Multiplier) + (Previous EMA x (1 - Multiplier))
    Multiplier = 2 / (Period + 1)

    Args:
        prices: List of price values.
        period: EMA period (lookback window).

    Returns:
        List of EMA values, same length as input.
        First (period-1) values use expanding window.

    Raises:
        ValueError: If prices has fewer elements than period.
        ValueError: If period is not positive.
    """
    if period <= 0:
        raise ValueError("Period must be positive")

    if len(prices) < period:
        raise ValueError(f"Need at least {period} prices, got {len(prices)}")

    multiplier = 2 / (period + 1)
    ema: list[float] = []

    # First EMA value is SMA of first 'period' prices
    first_sma = sum(prices[:period]) / period
    ema.append(first_sma)

    # Calculate remaining EMAs
    for price in prices[period:]:
        prev_ema = ema[-1]
        new_ema = (price * multiplier) + (prev_ema * (1 - multiplier))
        ema.append(new_ema)

    # Pad beginning with expanding window EMAs
    result = []
    for i in range(period - 1):
        # Use expanding SMA as approximation for warmup period
        expanding_avg = sum(prices[: i + 1]) / (i + 1)
        result.append(expanding_avg)

    result.extend(ema)
    return result


def _validate_macd_params(
    prices: list[float], fast_period: int, slow_period: int
) -> None:
    """Validate MACD parameters."""
    if fast_period >= slow_period:
        msg = (
            f"fast_period ({fast_period}) must be less than "
            f"slow_period ({slow_period})"
        )
        raise ValueError(msg)

    if len(prices) < slow_period:
        raise ValueError(f"Need at least {slow_period} prices, got {len(prices)}")


def _calculate_macd_line(
    fast_ema: list[float], slow_ema: list[float], slow_period: int
) -> list[float | None]:
    """Calculate MACD line from fast and slow EMAs."""
    macd_line: list[float | None] = []
    for i in range(len(fast_ema)):
        if i >= slow_period - 1:
            macd_line.append(fast_ema[i] - slow_ema[i])
        else:
            macd_line.append(None)
    return macd_line


def _calculate_signal_line(
    macd_line: list[float | None], signal_period: int
) -> list[float | None]:
    """Calculate Signal line (EMA of MACD values)."""
    valid_macd = [v for v in macd_line if v is not None]

    if len(valid_macd) < signal_period:
        return [None] * len(macd_line)

    signal_ema = calculate_ema(valid_macd, signal_period)

    signal_line: list[float | None] = []
    signal_idx = 0
    for macd_val in macd_line:
        if macd_val is None:
            signal_line.append(None)
        elif signal_idx < len(signal_ema):
            signal_line.append(signal_ema[signal_idx])
            signal_idx += 1
        else:
            signal_line.append(None)

    return signal_line


def _calculate_histogram(
    macd_line: list[float | None], signal_line: list[float | None]
) -> list[float | None]:
    """Calculate histogram (MACD - Signal)."""
    histogram: list[float | None] = []
    for macd_val, signal_val in zip(macd_line, signal_line, strict=True):
        if macd_val is not None and signal_val is not None:
            histogram.append(macd_val - signal_val)
        else:
            histogram.append(None)
    return histogram


def calculate_macd(
    prices: list[float],
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9,
) -> MACDResult:
    """Calculate MACD (Moving Average Convergence Divergence).

    MACD Line = Fast EMA - Slow EMA
    Signal Line = EMA of MACD Line
    Histogram = MACD Line - Signal Line

    Args:
        prices: List of price values (typically closing prices).
        fast_period: Fast EMA period (default: 12).
        slow_period: Slow EMA period (default: 26).
        signal_period: Signal EMA period (default: 9).

    Returns:
        MACDResult with macd, signal, and histogram arrays.
        Values are None during warmup periods.

    Raises:
        ValueError: If prices has fewer elements than slow_period.
        ValueError: If fast_period >= slow_period.
    """
    _validate_macd_params(prices, fast_period, slow_period)

    fast_ema = calculate_ema(prices, fast_period)
    slow_ema = calculate_ema(prices, slow_period)

    macd_line = _calculate_macd_line(fast_ema, slow_ema, slow_period)
    signal_line = _calculate_signal_line(macd_line, signal_period)
    histogram = _calculate_histogram(macd_line, signal_line)

    return MACDResult(macd=macd_line, signal=signal_line, histogram=histogram)


def calculate_rsi(prices: list[float], period: int = 14) -> RSIResult:
    """Calculate RSI (Relative Strength Index).

    RSI = 100 - (100 / (1 + RS))
    RS = Average Gain / Average Loss

    Uses Wilder's smoothing method for the averages.

    Args:
        prices: List of price values (typically closing prices).
        period: RSI period (default: 14, standard Wilder's period).

    Returns:
        RSIResult with rsi array.
        First 'period' values are None (warmup period).

    Raises:
        ValueError: If prices has fewer elements than period + 1.
        ValueError: If period is not positive.
    """
    if period <= 0:
        raise ValueError("Period must be positive")

    if len(prices) < period + 1:
        raise ValueError(f"Need at least {period + 1} prices, got {len(prices)}")

    # Calculate price changes
    changes = [prices[i] - prices[i - 1] for i in range(1, len(prices))]

    # Separate gains and losses
    gains = [max(change, 0) for change in changes]
    losses = [abs(min(change, 0)) for change in changes]

    # Initialize RSI result with None for warmup period
    rsi: list[float | None] = [None] * period

    # Calculate first average gain/loss using SMA
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    # Calculate first RSI value
    rsi.append(_calculate_rsi_value(avg_gain, avg_loss))

    # Calculate subsequent RSI values using Wilder's smoothing
    for i in range(period, len(changes)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        rsi.append(_calculate_rsi_value(avg_gain, avg_loss))

    return RSIResult(rsi=rsi)


def _calculate_rsi_value(avg_gain: float, avg_loss: float) -> float:
    """Calculate RSI from average gain and loss."""
    if avg_loss == 0:
        return 100.0 if avg_gain > 0 else 50.0

    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))
