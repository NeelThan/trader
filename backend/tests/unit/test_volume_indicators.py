"""Tests for volume indicators module."""

import pytest

from trader.volume_indicators import (
    VolumeAnalysis,
    analyze_volume,
    calculate_volume_ma,
    get_volume_trend,
)


class TestCalculateVolumeMA:
    """Tests for calculate_volume_ma function."""

    def test_returns_empty_list_for_empty_input(self) -> None:
        """Should return empty list for empty input."""
        result = calculate_volume_ma([])
        assert result == []

    def test_returns_empty_list_for_zero_period(self) -> None:
        """Should return empty list for zero period."""
        result = calculate_volume_ma([100, 200, 300], period=0)
        assert result == []

    def test_returns_none_for_insufficient_data(self) -> None:
        """Should return None values when insufficient data for MA."""
        volumes = [100, 200]
        result = calculate_volume_ma(volumes, period=3)
        assert result == [None, None]

    def test_calculates_simple_moving_average(self) -> None:
        """Should calculate correct SMA values."""
        volumes = [100, 200, 300, 400, 500]
        result = calculate_volume_ma(volumes, period=3)

        # First 2 values should be None (not enough data)
        assert result[0] is None
        assert result[1] is None

        # Third value: (100 + 200 + 300) / 3 = 200
        assert result[2] == 200.0

        # Fourth value: (200 + 300 + 400) / 3 = 300
        assert result[3] == 300.0

        # Fifth value: (300 + 400 + 500) / 3 = 400
        assert result[4] == 400.0

    def test_handles_single_period(self) -> None:
        """Should work with period=1 (no averaging)."""
        volumes = [100, 200, 300]
        result = calculate_volume_ma(volumes, period=1)
        assert result == [100.0, 200.0, 300.0]


class TestAnalyzeVolume:
    """Tests for analyze_volume function."""

    def test_returns_none_for_insufficient_data(self) -> None:
        """Should return None when not enough volume data."""
        volumes = [100] * 10  # Only 10 bars, need 20 for default
        result = analyze_volume(volumes)
        assert result is None

    def test_returns_none_for_empty_data(self) -> None:
        """Should return None for empty data."""
        result = analyze_volume([])
        assert result is None

    def test_filters_out_none_values(self) -> None:
        """Should handle None values in volume data."""
        # 25 values with some None (need 20+ valid)
        volumes: list[int | None] = [1000] * 15 + [None, None] + [1000] * 8
        result = analyze_volume(volumes, ma_period=20)
        assert result is not None  # Should work with 23 valid values

    def test_calculates_relative_volume(self) -> None:
        """Should calculate correct RVOL."""
        # Create stable average volume - MA includes current bar
        # [1000] * 21 gives MA of 1000 for last 20 bars
        volumes = [1000] * 21
        volumes[-1] = 2000  # Change last bar to 2000
        # MA = (19*1000 + 2000) / 20 = 1050
        result = analyze_volume(volumes, ma_period=20)

        assert result is not None
        assert result.volume_ma == 1050.0  # MA includes current bar
        assert result.current_volume == 2000
        # RVOL = 2000 / 1050 = 1.90 (rounded)
        assert result.relative_volume == 1.90

    def test_detects_high_volume(self) -> None:
        """Should flag high volume when RVOL >= 1.5."""
        # Need enough volume spike to hit 1.5x after MA calculation
        # With MA period 20, if base is 1000 and last is 2000:
        # MA = (19*1000 + 2000)/20 = 1050, RVOL = 2000/1050 = 1.9x
        volumes = [1000] * 21
        volumes[-1] = 2000  # High volume spike
        result = analyze_volume(volumes, ma_period=20)

        assert result is not None
        assert result.is_high_volume is True  # 1.9x > 1.5
        assert result.is_above_average is True

    def test_detects_above_average_volume(self) -> None:
        """Should flag above average when RVOL >= 1.0."""
        volumes = [1000] * 20 + [1000]  # Exactly average
        result = analyze_volume(volumes, ma_period=20)

        assert result is not None
        assert result.is_above_average is True
        assert result.is_high_volume is False

    def test_detects_below_average_volume(self) -> None:
        """Should not flag when RVOL < 1.0."""
        volumes = [1000] * 20 + [500]  # Half of average
        result = analyze_volume(volumes, ma_period=20)

        assert result is not None
        assert result.is_above_average is False
        assert result.is_high_volume is False

    def test_interpretation_very_high_volume(self) -> None:
        """Should give correct interpretation for very high volume."""
        volumes = [1000] * 20 + [2500]  # 2.5x
        result = analyze_volume(volumes, ma_period=20)

        assert result is not None
        assert "Very high volume" in result.interpretation
        assert "2x+" in result.interpretation

    def test_interpretation_high_volume(self) -> None:
        """Should give correct interpretation for high volume."""
        volumes = [1000] * 20 + [1600]  # 1.6x
        result = analyze_volume(volumes, ma_period=20)

        assert result is not None
        assert "High volume" in result.interpretation
        assert "1.5x+" in result.interpretation

    def test_interpretation_normal_volume(self) -> None:
        """Should give correct interpretation for normal volume."""
        volumes = [1000] * 20 + [1100]  # 1.1x
        result = analyze_volume(volumes, ma_period=20)

        assert result is not None
        assert "Normal volume" in result.interpretation

    def test_interpretation_below_average_volume(self) -> None:
        """Should give correct interpretation for below average."""
        volumes = [1000] * 20 + [800]  # 0.8x
        result = analyze_volume(volumes, ma_period=20)

        assert result is not None
        assert "Below average" in result.interpretation

    def test_interpretation_low_volume(self) -> None:
        """Should give correct interpretation for low volume."""
        volumes = [1000] * 20 + [500]  # 0.5x
        result = analyze_volume(volumes, ma_period=20)

        assert result is not None
        assert "Low volume" in result.interpretation


class TestGetVolumeTrend:
    """Tests for get_volume_trend function."""

    def test_returns_flat_for_insufficient_data(self) -> None:
        """Should return flat when not enough data."""
        result = get_volume_trend([100, 200], lookback=5)
        assert result == "flat"

    def test_returns_flat_for_empty_data(self) -> None:
        """Should return flat for empty data."""
        result = get_volume_trend([])
        assert result == "flat"

    def test_detects_increasing_trend(self) -> None:
        """Should detect increasing volume trend."""
        volumes = [100, 200, 300, 400, 500]  # Consistently increasing
        result = get_volume_trend(volumes, lookback=5)
        assert result == "increasing"

    def test_detects_decreasing_trend(self) -> None:
        """Should detect decreasing volume trend."""
        volumes = [500, 400, 300, 200, 100]  # Consistently decreasing
        result = get_volume_trend(volumes, lookback=5)
        assert result == "decreasing"

    def test_detects_flat_trend(self) -> None:
        """Should detect flat volume when mixed."""
        volumes = [100, 150, 100, 150, 100]  # Back and forth
        result = get_volume_trend(volumes, lookback=5)
        assert result == "flat"

    def test_handles_none_values(self) -> None:
        """Should filter out None values."""
        volumes: list[int | None] = [100, None, 200, None, 300, 400, 500]
        result = get_volume_trend(volumes, lookback=5)
        assert result == "increasing"


class TestVolumeAnalysisDataclass:
    """Tests for VolumeAnalysis dataclass."""

    def test_creates_immutable_instance(self) -> None:
        """Should create frozen dataclass."""
        analysis = VolumeAnalysis(
            volume_ma=1000.0,
            current_volume=1500,
            relative_volume=1.5,
            is_high_volume=True,
            is_above_average=True,
            interpretation="High volume",
        )

        # Verify it's frozen
        with pytest.raises(AttributeError):
            analysis.volume_ma = 2000.0  # type: ignore[misc]

    def test_stores_all_fields(self) -> None:
        """Should store all analysis fields correctly."""
        analysis = VolumeAnalysis(
            volume_ma=1000.0,
            current_volume=1500,
            relative_volume=1.5,
            is_high_volume=True,
            is_above_average=True,
            interpretation="Test interpretation",
        )

        assert analysis.volume_ma == 1000.0
        assert analysis.current_volume == 1500
        assert analysis.relative_volume == 1.5
        assert analysis.is_high_volume is True
        assert analysis.is_above_average is True
        assert analysis.interpretation == "Test interpretation"
