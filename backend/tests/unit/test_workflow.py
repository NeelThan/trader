"""Unit tests for Trading Workflow module (TDD - RED phase).

This module provides workflow-specific analysis for the 8-step trading process:
1. SELECT - Symbol/timeframe selection (no backend)
2. ASSESS - Trend assessment from swing patterns
3. ALIGN - Multi-timeframe alignment check
4. LEVELS - Fibonacci level identification
5. CONFIRM - Indicator confirmation (RSI/MACD)
6. SIZE - Position sizing (reuses existing module)
7. PLAN - Trade plan generation (reuses risk/reward)
8. MANAGE - Trade tracking (reuses journal)
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from trader.market_data.models import MarketDataResult, MarketStatus, OHLCBar


class TestWorkflowModelsImports:
    """Tests that workflow models can be imported."""

    def test_can_import_trend_assessment(self) -> None:
        """TrendAssessment model should be importable."""
        from trader.workflow import TrendAssessment

        assert TrendAssessment is not None

    def test_can_import_alignment_result(self) -> None:
        """AlignmentResult model should be importable."""
        from trader.workflow import AlignmentResult

        assert AlignmentResult is not None

    def test_can_import_levels_result(self) -> None:
        """LevelsResult model should be importable."""
        from trader.workflow import LevelsResult

        assert LevelsResult is not None

    def test_can_import_indicator_confirmation(self) -> None:
        """IndicatorConfirmation model should be importable."""
        from trader.workflow import IndicatorConfirmation

        assert IndicatorConfirmation is not None

    def test_can_import_trend_phase_type(self) -> None:
        """TrendPhase type alias should be importable."""
        from trader.workflow import TrendPhase

        assert TrendPhase is not None

    def test_can_import_trade_category_type(self) -> None:
        """TradeCategory type alias should be importable."""
        from trader.workflow import TradeCategory

        assert TradeCategory is not None


class TestTrendAssessment:
    """Tests for TrendAssessment model."""

    def test_create_bullish_assessment(self) -> None:
        """Should create bullish trend assessment."""
        from trader.workflow import TrendAssessment

        assessment = TrendAssessment(
            trend="bullish",
            phase="correction",
            swing_type="HL",
            explanation="Higher Low pattern = buyers stepping in higher",
            confidence=87,
        )

        assert assessment.trend == "bullish"
        assert assessment.phase == "correction"
        assert assessment.swing_type == "HL"
        assert assessment.confidence == 87

    def test_create_bearish_assessment(self) -> None:
        """Should create bearish trend assessment."""
        from trader.workflow import TrendAssessment

        assessment = TrendAssessment(
            trend="bearish",
            phase="impulse",
            swing_type="LH",
            explanation="Lower High pattern = sellers stepping in lower",
            confidence=75,
        )

        assert assessment.trend == "bearish"
        assert assessment.phase == "impulse"
        assert assessment.swing_type == "LH"

    def test_trend_must_be_valid(self) -> None:
        """Trend should only accept bullish, bearish, or neutral."""
        from pydantic import ValidationError

        from trader.workflow import TrendAssessment

        with pytest.raises(ValidationError):
            TrendAssessment(
                trend="invalid",
                phase="correction",
                swing_type="HH",
                explanation="test",
                confidence=50,
            )

    def test_phase_accepts_valid_values(self) -> None:
        """Phase should accept impulse, correction, continuation, exhaustion."""
        from trader.workflow import TrendAssessment

        for phase in ["impulse", "correction", "continuation", "exhaustion"]:
            assessment = TrendAssessment(
                trend="bullish",
                phase=phase,
                swing_type="HH",
                explanation="test",
                confidence=50,
            )
            assert assessment.phase == phase

    def test_phase_rejects_invalid_value(self) -> None:
        """Phase should reject invalid values."""
        from pydantic import ValidationError

        from trader.workflow import TrendAssessment

        with pytest.raises(ValidationError):
            TrendAssessment(
                trend="bullish",
                phase="invalid_phase",
                swing_type="HH",
                explanation="test",
                confidence=50,
            )


class TestAlignmentResult:
    """Tests for AlignmentResult model."""

    def test_create_alignment_result(self) -> None:
        """Should create alignment result with timeframes."""
        from trader.workflow import AlignmentResult, TimeframeTrend

        timeframes = [
            TimeframeTrend(timeframe="1M", trend="bullish", swing_type="HH"),
            TimeframeTrend(timeframe="1W", trend="bullish", swing_type="HL"),
            TimeframeTrend(timeframe="1D", trend="bearish", swing_type="LH"),
        ]

        result = AlignmentResult(
            aligned_count=2,
            total_count=3,
            strength="moderate",
            timeframes=timeframes,
        )

        assert result.aligned_count == 2
        assert result.total_count == 3
        assert result.strength == "moderate"
        assert len(result.timeframes) == 3

    def test_strength_values(self) -> None:
        """Strength should be strong, moderate, or weak."""
        from trader.workflow import AlignmentResult

        for strength in ["strong", "moderate", "weak"]:
            result = AlignmentResult(
                aligned_count=5,
                total_count=7,
                strength=strength,
                timeframes=[],
            )
            assert result.strength == strength


class TestLevelsResult:
    """Tests for LevelsResult model."""

    def test_create_levels_result(self) -> None:
        """Should create levels result with entry and target zones."""
        from trader.workflow import LevelsResult, LevelZone

        entry_zones = [
            LevelZone(
                label="R61.8%",
                price=42150.0,
                heat=72,
                formula="43200 - (1700 x 0.618)",
            ),
        ]
        target_zones = [
            LevelZone(
                label="E127.2%",
                price=43665.0,
                heat=50,
                formula="41500 + (1700 x 1.272)",
            ),
        ]

        result = LevelsResult(
            entry_zones=entry_zones,
            target_zones=target_zones,
        )

        assert len(result.entry_zones) == 1
        assert len(result.target_zones) == 1
        assert result.entry_zones[0].price == 42150.0


class TestIndicatorConfirmation:
    """Tests for IndicatorConfirmation model."""

    def test_create_confirmation(self) -> None:
        """Should create indicator confirmation."""
        from trader.workflow import IndicatorConfirmation, IndicatorSignal

        rsi = IndicatorSignal(
            value=42.0,
            signal="neutral",
            explanation="Not oversold yet",
        )
        macd = IndicatorSignal(
            value=None,
            signal="bullish",
            explanation="Histogram positive",
        )

        confirmation = IndicatorConfirmation(
            rsi=rsi,
            macd=macd,
            overall="partial",
        )

        assert confirmation.rsi.signal == "neutral"
        assert confirmation.macd.signal == "bullish"
        assert confirmation.overall == "partial"

    def test_overall_values(self) -> None:
        """Overall should be strong, partial, or wait."""
        from trader.workflow import IndicatorConfirmation, IndicatorSignal

        rsi = IndicatorSignal(value=30.0, signal="oversold", explanation="test")
        macd = IndicatorSignal(value=None, signal="bullish", explanation="test")

        for overall in ["strong", "partial", "wait"]:
            confirmation = IndicatorConfirmation(
                rsi=rsi,
                macd=macd,
                overall=overall,
            )
            assert confirmation.overall == overall


class TestAssessTrendFunction:
    """Tests for assess_trend function."""

    @pytest.fixture
    def sample_bars(self) -> list[OHLCBar]:
        """Create sample OHLC bars with clear swing pattern."""
        return [
            OHLCBar(time="2024-01-01", open=100.0, high=102.0, low=98.0, close=101.0),
            OHLCBar(time="2024-01-02", open=101.0, high=103.0, low=99.0, close=100.0),
            OHLCBar(time="2024-01-03", open=100.0, high=101.0, low=95.0, close=96.0),
            OHLCBar(time="2024-01-04", open=96.0, high=98.0, low=94.0, close=97.0),
            OHLCBar(time="2024-01-05", open=97.0, high=99.0, low=96.0, close=98.0),
            OHLCBar(time="2024-01-06", open=98.0, high=105.0, low=97.0, close=104.0),
            OHLCBar(time="2024-01-07", open=104.0, high=110.0, low=103.0, close=109.0),
            OHLCBar(time="2024-01-08", open=109.0, high=108.0, low=102.0, close=103.0),
            OHLCBar(time="2024-01-09", open=103.0, high=105.0, low=100.0, close=102.0),
            OHLCBar(time="2024-01-10", open=102.0, high=104.0, low=99.0, close=101.0),
            OHLCBar(time="2024-01-11", open=101.0, high=108.0, low=100.0, close=107.0),
            OHLCBar(time="2024-01-12", open=107.0, high=115.0, low=106.0, close=114.0),
            OHLCBar(time="2024-01-13", open=114.0, high=113.0, low=108.0, close=110.0),
            OHLCBar(time="2024-01-14", open=110.0, high=112.0, low=107.0, close=109.0),
            OHLCBar(time="2024-01-15", open=109.0, high=111.0, low=105.0, close=108.0),
        ]

    @pytest.fixture
    def mock_market_service(self, sample_bars: list[OHLCBar]) -> MagicMock:
        """Create mock market data service."""
        mock = MagicMock()
        mock.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_success(
                data=sample_bars,
                market_status=MarketStatus.unknown(),
                provider="yahoo",
            )
        )
        return mock

    async def test_assess_trend_returns_assessment(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should return TrendAssessment."""
        from trader.workflow import TrendAssessment, assess_trend

        result = await assess_trend(
            symbol="DJI",
            timeframe="1D",
            market_service=mock_market_service,
        )

        assert isinstance(result, TrendAssessment)
        assert result.trend in ["bullish", "bearish", "neutral"]

    async def test_assess_trend_detects_trend(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should detect trend from swing patterns."""
        from trader.workflow import assess_trend

        result = await assess_trend(
            symbol="DJI",
            timeframe="1D",
            market_service=mock_market_service,
        )

        # With swing patterns, trend should be detected (not necessarily bullish)
        assert result.trend in ["bullish", "bearish", "neutral"]
        assert result.swing_type in ["HH", "HL", "LH", "LL"]
        assert result.confidence >= 0


class TestCheckTimeframeAlignmentFunction:
    """Tests for check_timeframe_alignment function."""

    @pytest.fixture
    def sample_bars(self) -> list[OHLCBar]:
        """Create sample OHLC bars."""
        return [
            OHLCBar(time="2024-01-01", open=100.0, high=105.0, low=98.0, close=103.0),
            OHLCBar(time="2024-01-02", open=103.0, high=110.0, low=101.0, close=108.0),
            OHLCBar(time="2024-01-03", open=108.0, high=112.0, low=106.0, close=110.0),
        ]

    @pytest.fixture
    def mock_market_service(self, sample_bars: list[OHLCBar]) -> MagicMock:
        """Create mock market data service."""
        mock = MagicMock()
        mock.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_success(
                data=sample_bars,
                market_status=MarketStatus.unknown(),
                provider="yahoo",
            )
        )
        return mock

    async def test_check_alignment_returns_result(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should return AlignmentResult."""
        from trader.workflow import AlignmentResult, check_timeframe_alignment

        result = await check_timeframe_alignment(
            symbol="DJI",
            timeframes=["1M", "1W", "1D"],
            market_service=mock_market_service,
        )

        assert isinstance(result, AlignmentResult)
        assert result.total_count == 3
        assert result.aligned_count <= result.total_count


class TestIdentifyFibonacciLevelsFunction:
    """Tests for identify_fibonacci_levels function."""

    @pytest.fixture
    def sample_bars(self) -> list[OHLCBar]:
        """Create sample OHLC bars with clear swing high/low."""
        return [
            OHLCBar(time="2024-01-01", open=100.0, high=102.0, low=99.0, close=101.0),
            OHLCBar(time="2024-01-02", open=101.0, high=103.0, low=95.0, close=96.0),
            OHLCBar(time="2024-01-03", open=96.0, high=99.0, low=97.0, close=98.0),
            OHLCBar(time="2024-01-04", open=98.0, high=115.0, low=97.0, close=114.0),
            OHLCBar(time="2024-01-05", open=114.0, high=112.0, low=108.0, close=110.0),
        ]

    @pytest.fixture
    def mock_market_service(self, sample_bars: list[OHLCBar]) -> MagicMock:
        """Create mock market data service."""
        mock = MagicMock()
        mock.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_success(
                data=sample_bars,
                market_status=MarketStatus.unknown(),
                provider="yahoo",
            )
        )
        return mock

    async def test_identify_levels_returns_result(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should return LevelsResult."""
        from trader.workflow import LevelsResult, identify_fibonacci_levels

        result = await identify_fibonacci_levels(
            symbol="DJI",
            timeframe="1D",
            direction="buy",
            market_service=mock_market_service,
        )

        assert isinstance(result, LevelsResult)
        assert isinstance(result.entry_zones, list)
        assert isinstance(result.target_zones, list)


class TestConfirmWithIndicatorsFunction:
    """Tests for confirm_with_indicators function."""

    @pytest.fixture
    def sample_bars(self) -> list[OHLCBar]:
        """Create sample OHLC bars for indicator calculation."""
        return [
            OHLCBar(
                time=f"2024-01-{i:02d}",
                open=100.0,
                high=105.0,
                low=95.0,
                close=102.0,
            )
            for i in range(1, 21)
        ]

    @pytest.fixture
    def mock_market_service(self, sample_bars: list[OHLCBar]) -> MagicMock:
        """Create mock market data service."""
        mock = MagicMock()
        mock.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_success(
                data=sample_bars,
                market_status=MarketStatus.unknown(),
                provider="yahoo",
            )
        )
        return mock

    async def test_confirm_returns_result(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should return IndicatorConfirmation."""
        from trader.workflow import IndicatorConfirmation, confirm_with_indicators

        result = await confirm_with_indicators(
            symbol="DJI",
            timeframe="1D",
            market_service=mock_market_service,
        )

        assert isinstance(result, IndicatorConfirmation)
        assert result.overall in ["strong", "partial", "wait"]


class TestCategorizeTradeFunction:
    """Tests for categorize_trade function."""

    def test_with_trend_long_when_bullish_higher_tf(self) -> None:
        """Should return with_trend when going long in bullish higher TF."""
        from trader.workflow import categorize_trade

        result = categorize_trade(
            higher_tf_trend="bullish",
            lower_tf_trend="bearish",
            trade_direction="long",
            confluence_score=3,
        )

        assert result == "with_trend"

    def test_with_trend_short_when_bearish_higher_tf(self) -> None:
        """Should return with_trend when going short in bearish higher TF."""
        from trader.workflow import categorize_trade

        result = categorize_trade(
            higher_tf_trend="bearish",
            lower_tf_trend="bullish",
            trade_direction="short",
            confluence_score=3,
        )

        assert result == "with_trend"

    def test_counter_trend_with_high_confluence(self) -> None:
        """Should return counter_trend when against higher TF with high confluence."""
        from trader.workflow import categorize_trade

        result = categorize_trade(
            higher_tf_trend="bullish",
            lower_tf_trend="bullish",
            trade_direction="short",
            confluence_score=5,
        )

        assert result == "counter_trend"

    def test_reversal_attempt_with_low_confluence(self) -> None:
        """Should return reversal_attempt when against higher TF with low confluence."""
        from trader.workflow import categorize_trade

        result = categorize_trade(
            higher_tf_trend="bullish",
            lower_tf_trend="bullish",
            trade_direction="short",
            confluence_score=2,
        )

        assert result == "reversal_attempt"

    def test_neutral_higher_tf_defaults_to_counter_trend(self) -> None:
        """Should handle neutral higher TF appropriately."""
        from trader.workflow import categorize_trade

        result = categorize_trade(
            higher_tf_trend="neutral",
            lower_tf_trend="bullish",
            trade_direction="long",
            confluence_score=4,
        )

        # Neutral higher TF with reasonable confluence = counter_trend
        assert result in ["counter_trend", "reversal_attempt"]

    def test_returns_valid_category_type(self) -> None:
        """Should always return valid TradeCategory."""
        from trader.workflow import categorize_trade

        result = categorize_trade(
            higher_tf_trend="bullish",
            lower_tf_trend="bearish",
            trade_direction="long",
            confluence_score=1,
        )

        assert result in ["with_trend", "counter_trend", "reversal_attempt"]
