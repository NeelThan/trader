"""Tests for technical indicator calculations."""

from dataclasses import dataclass

import pytest

from trader.indicators import (
    MACDResult,
    calculate_ema,
    calculate_macd,
)


@dataclass(frozen=True)
class EMACase:
    """Test case for EMA calculation."""

    prices: tuple[float, ...]
    period: int
    expected_last: float  # Expected last value (rounded to 2 decimals)


@dataclass(frozen=True)
class MACDCase:
    """Test case for MACD calculation."""

    description: str
    prices: tuple[float, ...]
    fast_period: int
    slow_period: int
    signal_period: int
    expected_macd_last: float
    expected_signal_last: float
    expected_histogram_last: float


class TestEMA:
    """Tests for Exponential Moving Average calculation.

    EMA = (Price × Multiplier) + (Previous EMA × (1 - Multiplier))
    Multiplier = 2 / (Period + 1)
    """

    @pytest.mark.parametrize(
        "case",
        [
            EMACase(
                # Period 3: mult=0.5, SMA(10,11,12)=11, EMA13=12, EMA14=13
                prices=(10.0, 11.0, 12.0, 13.0, 14.0),
                period=3,
                expected_last=13.0,
            ),
            EMACase(
                # Period 5: mult=0.333, SMA(100,102,101,103,105)=102.2
                # EMA104=102.8, EMA106=103.87
                prices=(100.0, 102.0, 101.0, 103.0, 105.0, 104.0, 106.0),
                period=5,
                expected_last=103.87,
            ),
        ],
        ids=["simple_5_prices_period_3", "7_prices_period_5"],
    )
    def test_ema_calculation(self, case: EMACase) -> None:
        """Test EMA produces correct values."""
        result = calculate_ema(list(case.prices), case.period)

        assert len(result) == len(case.prices)
        assert round(result[-1], 2) == case.expected_last

    def test_ema_requires_minimum_data(self) -> None:
        """EMA needs at least period number of data points."""
        with pytest.raises(ValueError, match="at least"):
            calculate_ema([1.0, 2.0], period=5)

    def test_ema_period_must_be_positive(self) -> None:
        """EMA period must be positive."""
        with pytest.raises(ValueError, match="positive"):
            calculate_ema([1.0, 2.0, 3.0], period=0)


class TestMACD:
    """Tests for MACD (Moving Average Convergence Divergence) calculation.

    MACD Line = Fast EMA - Slow EMA
    Signal Line = EMA of MACD Line
    Histogram = MACD Line - Signal Line
    """

    @pytest.fixture
    def sample_prices(self) -> list[float]:
        """Sample price data for MACD testing.

        This represents 30 daily closing prices with a clear trend.
        """
        return [
            44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
            45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64,
            46.21, 46.25, 45.71, 46.45, 45.78, 46.08, 46.14, 46.20, 46.15, 46.10,
        ]

    def test_macd_returns_correct_structure(self, sample_prices: list[float]) -> None:
        """MACD should return macd, signal, and histogram arrays."""
        result = calculate_macd(sample_prices)

        assert isinstance(result, MACDResult)
        assert hasattr(result, "macd")
        assert hasattr(result, "signal")
        assert hasattr(result, "histogram")

    def test_macd_array_lengths(self, sample_prices: list[float]) -> None:
        """All returned arrays should have same length as input."""
        result = calculate_macd(sample_prices)

        assert len(result.macd) == len(sample_prices)
        assert len(result.signal) == len(sample_prices)
        assert len(result.histogram) == len(sample_prices)

    def test_macd_histogram_equals_macd_minus_signal(
        self, sample_prices: list[float]
    ) -> None:
        """Histogram should equal MACD - Signal at each point."""
        result = calculate_macd(sample_prices)

        for i in range(len(sample_prices)):
            if result.macd[i] is not None and result.signal[i] is not None:
                expected = result.macd[i] - result.signal[i]
                assert abs(result.histogram[i] - expected) < 0.0001

    def test_macd_default_parameters(self, sample_prices: list[float]) -> None:
        """Default MACD uses 12, 26, 9 periods."""
        result = calculate_macd(sample_prices)

        # With 30 data points, we should have valid values after warmup
        # MACD needs 26 periods (slow), Signal needs 9 more = 35 ideal
        # With 30 points, we'll have some valid values
        valid_macd = [v for v in result.macd if v is not None]
        assert len(valid_macd) > 0

    def test_macd_custom_parameters(self, sample_prices: list[float]) -> None:
        """MACD should accept custom periods."""
        result = calculate_macd(
            sample_prices,
            fast_period=8,
            slow_period=17,
            signal_period=9,
        )

        assert isinstance(result, MACDResult)
        # With shorter periods, should have more valid values
        valid_macd = [v for v in result.macd if v is not None]
        assert len(valid_macd) > 0

    def test_macd_requires_minimum_data(self) -> None:
        """MACD needs at least slow_period data points."""
        short_data = [1.0] * 10

        with pytest.raises(ValueError, match="at least"):
            calculate_macd(short_data, fast_period=12, slow_period=26, signal_period=9)

    def test_macd_periods_validation(self) -> None:
        """Fast period must be less than slow period."""
        data = [1.0] * 30

        with pytest.raises(ValueError, match="fast.*slow"):
            calculate_macd(data, fast_period=26, slow_period=12, signal_period=9)

    def test_macd_positive_values_in_uptrend(self) -> None:
        """MACD should be positive in an uptrend."""
        # Create a clear uptrend
        uptrend = [float(i) for i in range(100, 150)]

        result = calculate_macd(uptrend, fast_period=5, slow_period=10, signal_period=3)

        # Last values should be positive
        valid_macd = [v for v in result.macd[-10:] if v is not None]
        assert all(v > 0 for v in valid_macd)

    def test_macd_negative_values_in_downtrend(self) -> None:
        """MACD should be negative in a downtrend."""
        # Create a clear downtrend
        downtrend = [float(i) for i in range(150, 100, -1)]

        result = calculate_macd(
            downtrend, fast_period=5, slow_period=10, signal_period=3
        )

        # Last values should be negative
        valid_macd = [v for v in result.macd[-10:] if v is not None]
        assert all(v < 0 for v in valid_macd)

    def test_macd_crossover_detection(self) -> None:
        """MACD crossing signal line indicates momentum shift."""
        # Create data with momentum change (up then down)
        prices = [float(i) for i in range(100, 130)]  # Up
        prices.extend([float(i) for i in range(129, 115, -1)])  # Down

        result = calculate_macd(prices, fast_period=5, slow_period=10, signal_period=3)

        # Should see histogram go from positive to negative (crossover)
        valid_histogram = [v for v in result.histogram if v is not None]
        has_positive = any(v > 0 for v in valid_histogram)
        has_negative = any(v < 0 for v in valid_histogram)
        assert has_positive and has_negative
