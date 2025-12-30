"""Tests for signal bar detection."""

from dataclasses import dataclass

import pytest

from trader.signals import (
    Bar,
    SignalType,
    detect_signal,
)


@dataclass(frozen=True)
class SignalCase:
    """Test case for signal detection.

    Attributes:
        bar: The OHLC bar to test
        level: Fibonacci level to test against
        expected_direction: Expected signal direction ("buy" or "sell")
    """

    bar: Bar
    level: float
    expected_direction: str


@dataclass(frozen=True)
class NoSignalCase:
    """Test case for scenarios that should not produce a signal.

    Attributes:
        bar: The OHLC bar to test
        level: Fibonacci level to test against
        description: Brief explanation of why no signal expected
    """

    bar: Bar
    level: float
    description: str


@dataclass(frozen=True)
class SignalTypeCase:
    """Test case for signal type classification.

    Attributes:
        bar: The OHLC bar to test
        level: Fibonacci level to test against
        expected_type: Expected signal type (TYPE_1 or TYPE_2)
        expected_direction: Expected signal direction
    """

    bar: Bar
    level: float
    expected_type: SignalType
    expected_direction: str


class TestSignalDetection:
    """Tests for signal bar detection at Fibonacci levels.

    BUY signal: Close > Open (bullish) AND Close > Fibonacci level
    SELL signal: Close < Open (bearish) AND Close < Fibonacci level
    """

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                SignalCase(
                    Bar(open=60.0, high=72.0, low=58.0, close=70.0),
                    65.0,
                    "buy",
                ),
                id="buy_bullish_bar_above_level",
            ),
            pytest.param(
                SignalCase(
                    Bar(open=70.0, high=72.0, low=58.0, close=60.0),
                    65.0,
                    "sell",
                ),
                id="sell_bearish_bar_below_level",
            ),
        ],
    )
    def test_signal_detected(self, case: SignalCase) -> None:
        """Verify signal is detected with correct direction."""
        signal = detect_signal(bar=case.bar, fibonacci_level=case.level)

        assert signal is not None
        assert signal.direction == case.expected_direction
        assert signal.bar == case.bar
        assert signal.level == case.level

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                NoSignalCase(
                    Bar(open=60.0, high=68.0, low=58.0, close=63.0),
                    65.0,
                    "bullish bar closes below level",
                ),
                id="bullish_bar_below_level",
            ),
            pytest.param(
                NoSignalCase(
                    Bar(open=70.0, high=72.0, low=66.0, close=67.0),
                    65.0,
                    "bearish bar closes above level",
                ),
                id="bearish_bar_above_level",
            ),
            pytest.param(
                NoSignalCase(
                    Bar(open=65.0, high=70.0, low=60.0, close=65.0),
                    65.0,
                    "doji bar (open == close)",
                ),
                id="doji_bar",
            ),
        ],
    )
    def test_no_signal(self, case: NoSignalCase) -> None:
        """Verify no signal when conditions are not met."""
        signal = detect_signal(bar=case.bar, fibonacci_level=case.level)

        assert signal is None


class TestSignalType:
    """Tests for signal type classification (Type 1 vs Type 2).

    Type 1 (stronger): Price penetrates level then reverses (tested & rejected)
    Type 2: Price closes beyond level without testing it
    """

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                SignalTypeCase(
                    Bar(open=66.0, high=72.0, low=63.0, close=70.0),
                    65.0,
                    SignalType.TYPE_1,
                    "buy",
                ),
                id="type1_buy_level_tested_and_rejected",
            ),
            pytest.param(
                SignalTypeCase(
                    Bar(open=64.0, high=67.0, low=58.0, close=60.0),
                    65.0,
                    SignalType.TYPE_1,
                    "sell",
                ),
                id="type1_sell_level_tested_and_rejected",
            ),
        ],
    )
    def test_type1_level_tested_and_rejected(self, case: SignalTypeCase) -> None:
        """Verify Type 1 signal when level is penetrated then rejected."""
        signal = detect_signal(bar=case.bar, fibonacci_level=case.level)

        assert signal is not None
        assert signal.signal_type == case.expected_type
        assert signal.direction == case.expected_direction

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                SignalTypeCase(
                    Bar(open=66.0, high=72.0, low=66.0, close=70.0),
                    65.0,
                    SignalType.TYPE_2,
                    "buy",
                ),
                id="type2_buy_no_level_test",
            ),
            pytest.param(
                SignalTypeCase(
                    Bar(open=64.0, high=64.0, low=58.0, close=60.0),
                    65.0,
                    SignalType.TYPE_2,
                    "sell",
                ),
                id="type2_sell_no_level_test",
            ),
        ],
    )
    def test_type2_no_level_test(self, case: SignalTypeCase) -> None:
        """Verify Type 2 signal when level is not tested."""
        signal = detect_signal(bar=case.bar, fibonacci_level=case.level)

        assert signal is not None
        assert signal.signal_type == case.expected_type
        assert signal.direction == case.expected_direction


class TestSignalStrength:
    """Tests for signal strength calculation."""

    def test_type1_has_higher_strength_than_type2(self) -> None:
        """Type 1 signals should have higher strength score."""
        type1_bar = Bar(open=66.0, high=72.0, low=63.0, close=70.0)
        type2_bar = Bar(open=66.0, high=72.0, low=66.0, close=70.0)
        fibonacci_level = 65.0

        signal1 = detect_signal(bar=type1_bar, fibonacci_level=fibonacci_level)
        signal2 = detect_signal(bar=type2_bar, fibonacci_level=fibonacci_level)

        assert signal1 is not None
        assert signal2 is not None
        assert signal1.strength > signal2.strength

    def test_strength_is_between_0_and_1(self) -> None:
        """Signal strength should be normalized between 0 and 1."""
        bar = Bar(open=66.0, high=72.0, low=63.0, close=70.0)
        fibonacci_level = 65.0

        signal = detect_signal(bar=bar, fibonacci_level=fibonacci_level)

        assert signal is not None
        assert 0.0 <= signal.strength <= 1.0

    def test_strength_with_zero_range_bar(self) -> None:
        """Signal strength handles zero-range bar (high == low)."""
        bar = Bar(open=65.0, high=70.0, low=70.0, close=70.0)
        fibonacci_level = 65.0

        signal = detect_signal(bar=bar, fibonacci_level=fibonacci_level)

        assert signal is not None
        assert signal.strength == 0.5  # Type 2 base score, no distance bonus
