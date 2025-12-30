"""Tests for signal bar detection."""

from dataclasses import dataclass

import pytest

from trader.signals import (
    Bar,
    Signal,
    SignalType,
    detect_signal,
)

# =============================================================================
# Test Constants
# =============================================================================

DEFAULT_LEVEL = 65.0
"""Default Fibonacci level used across all signal tests."""


# =============================================================================
# Test Case Definitions
# =============================================================================


@dataclass(frozen=True)
class SignalTestCase:
    """Unified test case for signal detection and classification.

    Attributes:
        bar: The OHLC bar to test
        direction: Expected signal direction ("buy" or "sell")
        signal_type: Expected signal type (TYPE_1 or TYPE_2)
    """

    bar: Bar
    direction: str
    signal_type: SignalType


# Valid signal test cases - each defines a bar and its expected signal properties
VALID_SIGNAL_CASES = [
    # Type 1 BUY: low penetrates level (58 < 65), close above (70 > 65)
    pytest.param(
        SignalTestCase(
            bar=Bar(open=60.0, high=72.0, low=58.0, close=70.0),
            direction="buy",
            signal_type=SignalType.TYPE_1,
        ),
        id="type1_buy_low_penetrates",
    ),
    # Type 1 SELL: high penetrates level (72 > 65), close below (60 < 65)
    pytest.param(
        SignalTestCase(
            bar=Bar(open=70.0, high=72.0, low=58.0, close=60.0),
            direction="sell",
            signal_type=SignalType.TYPE_1,
        ),
        id="type1_sell_high_penetrates",
    ),
    # Type 1 BUY: low penetrates level (63 < 65), close above (70 > 65)
    pytest.param(
        SignalTestCase(
            bar=Bar(open=66.0, high=72.0, low=63.0, close=70.0),
            direction="buy",
            signal_type=SignalType.TYPE_1,
        ),
        id="type1_buy_level_tested",
    ),
    # Type 1 SELL: high penetrates level (67 > 65), close below (60 < 65)
    pytest.param(
        SignalTestCase(
            bar=Bar(open=64.0, high=67.0, low=58.0, close=60.0),
            direction="sell",
            signal_type=SignalType.TYPE_1,
        ),
        id="type1_sell_level_tested",
    ),
    # Type 2 BUY: low stays above level (66 > 65), close above (70 > 65)
    pytest.param(
        SignalTestCase(
            bar=Bar(open=66.0, high=72.0, low=66.0, close=70.0),
            direction="buy",
            signal_type=SignalType.TYPE_2,
        ),
        id="type2_buy_no_level_test",
    ),
    # Type 2 SELL: high stays below level (64 < 65), close below (60 < 65)
    pytest.param(
        SignalTestCase(
            bar=Bar(open=64.0, high=64.0, low=58.0, close=60.0),
            direction="sell",
            signal_type=SignalType.TYPE_2,
        ),
        id="type2_sell_no_level_test",
    ),
]

# No-signal test cases - bars that should not produce a signal
NO_SIGNAL_CASES = [
    pytest.param(
        Bar(open=60.0, high=68.0, low=58.0, close=63.0),
        id="bullish_closes_below_level",
    ),
    pytest.param(
        Bar(open=70.0, high=72.0, low=66.0, close=67.0),
        id="bearish_closes_above_level",
    ),
    pytest.param(
        Bar(open=65.0, high=70.0, low=60.0, close=65.0),
        id="doji_no_direction",
    ),
]

# Bars for strength comparison tests
TYPE1_BAR = Bar(open=66.0, high=72.0, low=63.0, close=70.0)
TYPE2_BAR = Bar(open=66.0, high=72.0, low=66.0, close=70.0)
ZERO_RANGE_BAR = Bar(open=65.0, high=70.0, low=70.0, close=70.0)


# =============================================================================
# Helper Functions
# =============================================================================


def assert_valid_signal(
    signal: Signal | None,
    case: SignalTestCase,
    level: float = DEFAULT_LEVEL,
) -> None:
    """Assert that a signal matches expected properties.

    Args:
        signal: The signal returned from detect_signal
        case: The test case containing expected values
        level: The Fibonacci level used for detection
    """
    assert signal is not None, "Expected a signal to be detected"
    assert signal.direction == case.direction
    assert signal.signal_type == case.signal_type
    assert signal.bar == case.bar
    assert signal.level == level


# =============================================================================
# Test Classes
# =============================================================================


class TestSignalDetection:
    """Tests for signal detection, direction, and type classification.

    Signal Rules:
    - BUY: Close > Open (bullish) AND Close > Fibonacci level
    - SELL: Close < Open (bearish) AND Close < Fibonacci level

    Type Classification:
    - Type 1: Price penetrates level then reverses (stronger signal)
    - Type 2: Price closes beyond level without testing it
    """

    @pytest.mark.parametrize("case", VALID_SIGNAL_CASES)
    def test_valid_signal(self, case: SignalTestCase) -> None:
        """Verify signal detection with correct direction and type."""
        signal = detect_signal(bar=case.bar, fibonacci_level=DEFAULT_LEVEL)
        assert_valid_signal(signal, case)

    @pytest.mark.parametrize("bar", NO_SIGNAL_CASES)
    def test_no_signal(self, bar: Bar) -> None:
        """Verify no signal when conditions are not met."""
        signal = detect_signal(bar=bar, fibonacci_level=DEFAULT_LEVEL)
        assert signal is None


class TestSignalStrength:
    """Tests for signal strength calculation."""

    def test_type1_has_higher_strength_than_type2(self) -> None:
        """Type 1 signals should have higher strength score."""
        signal1 = detect_signal(bar=TYPE1_BAR, fibonacci_level=DEFAULT_LEVEL)
        signal2 = detect_signal(bar=TYPE2_BAR, fibonacci_level=DEFAULT_LEVEL)

        assert signal1 is not None
        assert signal2 is not None
        assert signal1.strength > signal2.strength

    def test_strength_is_between_0_and_1(self) -> None:
        """Signal strength should be normalized between 0 and 1."""
        signal = detect_signal(bar=TYPE1_BAR, fibonacci_level=DEFAULT_LEVEL)

        assert signal is not None
        assert 0.0 <= signal.strength <= 1.0

    def test_strength_with_zero_range_bar(self) -> None:
        """Signal strength handles zero-range bar (high == low)."""
        signal = detect_signal(bar=ZERO_RANGE_BAR, fibonacci_level=DEFAULT_LEVEL)

        assert signal is not None
        assert signal.strength == 0.5  # Type 2 base score, no distance bonus
