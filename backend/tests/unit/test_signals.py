"""Tests for signal bar detection."""

from trader.signals import (
    Bar,
    SignalType,
    detect_signal,
)


class TestSignalDetection:
    """Tests for signal bar detection at Fibonacci levels."""

    def test_buy_signal_bullish_bar_above_level(self) -> None:
        """
        BUY signal when:
        - Close > Open (bullish)
        - Close > Fibonacci level
        """
        bar = Bar(open=60.0, high=72.0, low=58.0, close=70.0)
        fibonacci_level = 65.0

        signal = detect_signal(bar=bar, fibonacci_level=fibonacci_level)

        assert signal is not None
        assert signal.direction == "buy"
        assert signal.bar == bar
        assert signal.level == fibonacci_level

    def test_sell_signal_bearish_bar_below_level(self) -> None:
        """
        SELL signal when:
        - Close < Open (bearish)
        - Close < Fibonacci level
        """
        bar = Bar(open=70.0, high=72.0, low=58.0, close=60.0)
        fibonacci_level = 65.0

        signal = detect_signal(bar=bar, fibonacci_level=fibonacci_level)

        assert signal is not None
        assert signal.direction == "sell"

    def test_no_signal_bullish_bar_below_level(self) -> None:
        """No BUY signal if bullish bar closes below Fib level."""
        bar = Bar(open=60.0, high=68.0, low=58.0, close=63.0)
        fibonacci_level = 65.0  # Close (63) is below level (65)

        signal = detect_signal(bar=bar, fibonacci_level=fibonacci_level)

        assert signal is None

    def test_no_signal_bearish_bar_above_level(self) -> None:
        """No SELL signal if bearish bar closes above Fib level."""
        bar = Bar(open=70.0, high=72.0, low=66.0, close=67.0)
        fibonacci_level = 65.0  # Close (67) is above level (65)

        signal = detect_signal(bar=bar, fibonacci_level=fibonacci_level)

        assert signal is None

    def test_no_signal_doji_bar(self) -> None:
        """No signal on doji (open == close)."""
        bar = Bar(open=65.0, high=70.0, low=60.0, close=65.0)
        fibonacci_level = 65.0

        signal = detect_signal(bar=bar, fibonacci_level=fibonacci_level)

        assert signal is None


class TestSignalType:
    """Tests for signal type classification (Type 1 vs Type 2)."""

    def test_type1_buy_level_tested_and_rejected(self) -> None:
        """
        Type 1 BUY (stronger): Low penetrates level, close above.
        Level was tested and rejected.
        """
        bar = Bar(open=66.0, high=72.0, low=63.0, close=70.0)
        fibonacci_level = 65.0  # Low (63) went below level, close (70) above

        signal = detect_signal(bar=bar, fibonacci_level=fibonacci_level)

        assert signal is not None
        assert signal.signal_type == SignalType.TYPE_1

    def test_type2_buy_no_level_test(self) -> None:
        """
        Type 2 BUY: Close above level but low didn't test it.
        """
        bar = Bar(open=66.0, high=72.0, low=66.0, close=70.0)
        fibonacci_level = 65.0  # Low (66) stayed above level

        signal = detect_signal(bar=bar, fibonacci_level=fibonacci_level)

        assert signal is not None
        assert signal.signal_type == SignalType.TYPE_2

    def test_type1_sell_level_tested_and_rejected(self) -> None:
        """
        Type 1 SELL (stronger): High penetrates level, close below.
        Level was tested and rejected.
        """
        bar = Bar(open=64.0, high=67.0, low=58.0, close=60.0)
        fibonacci_level = 65.0  # High (67) went above level, close (60) below

        signal = detect_signal(bar=bar, fibonacci_level=fibonacci_level)

        assert signal is not None
        assert signal.signal_type == SignalType.TYPE_1

    def test_type2_sell_no_level_test(self) -> None:
        """
        Type 2 SELL: Close below level but high didn't test it.
        """
        bar = Bar(open=64.0, high=64.0, low=58.0, close=60.0)
        fibonacci_level = 65.0  # High (64) stayed below level

        signal = detect_signal(bar=bar, fibonacci_level=fibonacci_level)

        assert signal is not None
        assert signal.signal_type == SignalType.TYPE_2


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
