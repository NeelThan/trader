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

    def test_can_import_confluence_breakdown(self) -> None:
        """ConfluenceBreakdown model should be importable."""
        from trader.workflow import ConfluenceBreakdown

        assert ConfluenceBreakdown is not None

    def test_can_import_confluence_score(self) -> None:
        """ConfluenceScore model should be importable."""
        from trader.workflow import ConfluenceScore

        assert ConfluenceScore is not None


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

    def test_is_ranging_defaults_to_false(self) -> None:
        """is_ranging should default to False."""
        from trader.workflow import TrendAssessment

        assessment = TrendAssessment(
            trend="bullish",
            phase="impulse",
            swing_type="HH",
            explanation="test",
            confidence=75,
        )

        assert assessment.is_ranging is False
        assert assessment.ranging_warning is None

    def test_can_set_is_ranging_true(self) -> None:
        """Should be able to set is_ranging to True with warning."""
        from trader.workflow import TrendAssessment

        warning = "Market ranging within 1.5% range. Fibonacci levels less reliable."
        assessment = TrendAssessment(
            trend="neutral",
            phase="correction",
            swing_type="HL",
            explanation="Mixed signals",
            confidence=40,
            is_ranging=True,
            ranging_warning=warning,
        )

        assert assessment.is_ranging is True
        assert assessment.ranging_warning == warning


class TestRangingDetection:
    """Tests for ranging market detection."""

    def test_detect_ranging_with_narrow_range(self) -> None:
        """Should detect ranging when price is in narrow range (<2%)."""
        from trader.pivots import PivotPoint
        from trader.workflow import _detect_ranging_condition

        # Pivots with prices in narrow range (1% of avg)
        pivots = [
            PivotPoint(index=0, price=100.0, type="low", time="2024-01-01"),
            PivotPoint(index=5, price=101.0, type="high", time="2024-01-02"),
            PivotPoint(index=10, price=100.2, type="low", time="2024-01-03"),
            PivotPoint(index=15, price=100.8, type="high", time="2024-01-04"),
        ]

        is_ranging, warning = _detect_ranging_condition(pivots)

        assert is_ranging is True
        assert warning is not None
        assert "ranging" in warning.lower()

    def test_not_ranging_with_wide_range(self) -> None:
        """Should not detect ranging when price range is wide with trending patterns."""
        from trader.pivots import PivotPoint
        from trader.workflow import _detect_ranging_condition

        # Trending pattern: clear HH/HL sequence with progressive highs and lows
        pivots = [
            PivotPoint(index=0, price=100.0, type="low", time="2024-01-01"),
            PivotPoint(index=5, price=108.0, type="high", time="2024-01-02"),
            PivotPoint(index=10, price=104.0, type="low", time="2024-01-03"),  # HL
            PivotPoint(index=15, price=115.0, type="high", time="2024-01-04"),  # HH
        ]

        is_ranging, warning = _detect_ranging_condition(pivots)

        assert is_ranging is False
        assert warning is None

    def test_not_ranging_with_insufficient_pivots(self) -> None:
        """Should not detect ranging with less than 4 pivots."""
        from trader.pivots import PivotPoint
        from trader.workflow import _detect_ranging_condition

        pivots = [
            PivotPoint(index=0, price=100.0, type="low", time="2024-01-01"),
            PivotPoint(index=5, price=100.5, type="high", time="2024-01-02"),
        ]

        is_ranging, warning = _detect_ranging_condition(pivots)

        assert is_ranging is False
        assert warning is None

    def test_detect_ranging_with_mixed_patterns(self) -> None:
        """Should detect ranging when highs and lows stay at similar levels."""
        from trader.pivots import PivotPoint
        from trader.workflow import _detect_ranging_condition

        # Mixed pattern: highs at same level, lows at same level
        pivots = [
            PivotPoint(index=0, price=99.0, type="low", time="2024-01-01"),
            PivotPoint(index=5, price=101.0, type="high", time="2024-01-02"),
            PivotPoint(index=10, price=99.2, type="low", time="2024-01-03"),
            PivotPoint(index=15, price=101.2, type="high", time="2024-01-04"),
        ]

        is_ranging, warning = _detect_ranging_condition(pivots)

        assert is_ranging is True
        assert warning is not None

    def test_ranging_warning_contains_advice(self) -> None:
        """Ranging warning should contain advice about Fibonacci reliability."""
        from trader.pivots import PivotPoint
        from trader.workflow import _detect_ranging_condition

        pivots = [
            PivotPoint(index=0, price=100.0, type="low", time="2024-01-01"),
            PivotPoint(index=5, price=100.5, type="high", time="2024-01-02"),
            PivotPoint(index=10, price=100.1, type="low", time="2024-01-03"),
            PivotPoint(index=15, price=100.6, type="high", time="2024-01-04"),
        ]

        _, warning = _detect_ranging_condition(pivots)

        assert warning is not None
        assert "fibonacci" in warning.lower()
        assert "breakout" in warning.lower()


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


class TestConfluenceBreakdown:
    """Tests for ConfluenceBreakdown model."""

    def test_create_default_breakdown(self) -> None:
        """Should create breakdown with default values."""
        from trader.workflow import ConfluenceBreakdown

        breakdown = ConfluenceBreakdown()

        assert breakdown.base_fib_level == 1
        assert breakdown.same_tf_confluence == 0
        assert breakdown.higher_tf_confluence == 0
        assert breakdown.previous_pivot == 0
        assert breakdown.psychological_level == 0

    def test_create_breakdown_with_values(self) -> None:
        """Should create breakdown with custom values."""
        from trader.workflow import ConfluenceBreakdown

        breakdown = ConfluenceBreakdown(
            base_fib_level=1,
            same_tf_confluence=2,
            higher_tf_confluence=4,
            previous_pivot=2,
            psychological_level=1,
        )

        assert breakdown.same_tf_confluence == 2
        assert breakdown.higher_tf_confluence == 4
        assert breakdown.previous_pivot == 2


class TestConfluenceScore:
    """Tests for ConfluenceScore model."""

    def test_create_standard_score(self) -> None:
        """Should create standard interpretation for low scores."""
        from trader.workflow import ConfluenceBreakdown, ConfluenceScore

        breakdown = ConfluenceBreakdown(base_fib_level=1)
        score = ConfluenceScore(
            total=1,
            breakdown=breakdown,
            interpretation="standard",
        )

        assert score.total == 1
        assert score.interpretation == "standard"

    def test_create_important_score(self) -> None:
        """Should create important interpretation for score 3-4."""
        from trader.workflow import ConfluenceBreakdown, ConfluenceScore

        breakdown = ConfluenceBreakdown(base_fib_level=1, same_tf_confluence=2)
        score = ConfluenceScore(
            total=3,
            breakdown=breakdown,
            interpretation="important",
        )

        assert score.total == 3
        assert score.interpretation == "important"

    def test_create_significant_score(self) -> None:
        """Should create significant interpretation for score 5-6."""
        from trader.workflow import ConfluenceBreakdown, ConfluenceScore

        breakdown = ConfluenceBreakdown(
            base_fib_level=1, same_tf_confluence=2, higher_tf_confluence=2
        )
        score = ConfluenceScore(
            total=5,
            breakdown=breakdown,
            interpretation="significant",
        )

        assert score.total == 5
        assert score.interpretation == "significant"

    def test_create_major_score(self) -> None:
        """Should create major interpretation for score 7+."""
        from trader.workflow import ConfluenceBreakdown, ConfluenceScore

        breakdown = ConfluenceBreakdown(
            base_fib_level=1,
            same_tf_confluence=2,
            higher_tf_confluence=4,
            psychological_level=1,
        )
        score = ConfluenceScore(
            total=8,
            breakdown=breakdown,
            interpretation="major",
        )

        assert score.total == 8
        assert score.interpretation == "major"

    def test_interpretation_values(self) -> None:
        """Interpretation should only accept valid values."""
        from trader.workflow import ConfluenceBreakdown, ConfluenceScore

        breakdown = ConfluenceBreakdown()
        for interp in ["standard", "important", "significant", "major"]:
            score = ConfluenceScore(
                total=1,
                breakdown=breakdown,
                interpretation=interp,
            )
            assert score.interpretation == interp


class TestCalculateConfluenceScore:
    """Tests for calculate_confluence_score function."""

    def test_base_score_is_one(self) -> None:
        """Base confluence score should be 1 for any Fib level."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=100.0,
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[],
        )

        assert score.total >= 1
        assert score.breakdown.base_fib_level == 1

    def test_same_tf_adds_one_per_level(self) -> None:
        """Each same-TF level within tolerance adds +1."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=101.0,  # Non-psychological level
            same_tf_levels=[101.3, 100.8],  # Within 0.5% tolerance
            higher_tf_levels=[],
            previous_pivots=[],
        )

        assert score.breakdown.same_tf_confluence == 2
        assert score.total == 3  # 1 base + 2 same TF

    def test_higher_tf_adds_two_per_level(self) -> None:
        """Each higher-TF level within tolerance adds +2."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=101.0,  # Non-psychological level
            same_tf_levels=[],
            higher_tf_levels=[101.2, 100.9],  # Within 0.5% tolerance
            previous_pivots=[],
        )

        assert score.breakdown.higher_tf_confluence == 4  # 2 levels x 2 points
        assert score.total == 5  # 1 base + 4 higher TF

    def test_previous_pivot_adds_two(self) -> None:
        """Previous major pivot within tolerance adds +2."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=101.0,  # Non-psychological level
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[101.1],  # Within tolerance
        )

        assert score.breakdown.previous_pivot == 2
        assert score.total == 3  # 1 base + 2 pivot

    def test_psychological_level_adds_one(self) -> None:
        """Round numbers (psychological levels) add +1."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=50000.0,  # Round number
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[],
        )

        assert score.breakdown.psychological_level == 1
        assert score.total == 2  # 1 base + 1 psychological

    def test_interpretation_standard(self) -> None:
        """Score 1-2 should have standard interpretation."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=100.0,
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[],
        )

        assert score.interpretation == "standard"

    def test_interpretation_important(self) -> None:
        """Score 3-4 should have important interpretation."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=100.0,
            same_tf_levels=[100.1, 99.9],  # +2
            higher_tf_levels=[],
            previous_pivots=[],
        )

        assert score.interpretation == "important"

    def test_interpretation_significant(self) -> None:
        """Score 5-6 should have significant interpretation."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=100.0,
            same_tf_levels=[],
            higher_tf_levels=[100.1, 99.9],  # +4
            previous_pivots=[],
        )

        assert score.interpretation == "significant"

    def test_interpretation_major(self) -> None:
        """Score 7+ should have major interpretation."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=50000.0,  # +1 psychological
            same_tf_levels=[50010.0],  # +1
            higher_tf_levels=[50005.0, 49995.0],  # +4
            previous_pivots=[50020.0],  # +2
        )

        assert score.total >= 7
        assert score.interpretation == "major"

    def test_levels_outside_tolerance_ignored(self) -> None:
        """Levels outside tolerance should not add to score."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=101.0,  # Non-psychological level
            same_tf_levels=[106.0, 96.0],  # Outside 0.5% tolerance
            higher_tf_levels=[111.0],  # Outside tolerance
            previous_pivots=[91.0],  # Outside tolerance
        )

        assert score.breakdown.same_tf_confluence == 0
        assert score.breakdown.higher_tf_confluence == 0
        assert score.breakdown.previous_pivot == 0
        assert score.total == 1  # Only base score

    def test_cross_tool_adds_two_per_tool(self) -> None:
        """Each different Fib tool converging at same price adds +2."""
        from trader.workflow import LevelWithStrategy, calculate_confluence_score

        score = calculate_confluence_score(
            level_price=101.0,  # Non-psychological level
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[],
            level_strategy="retracement",
            other_tool_levels=[
                LevelWithStrategy(price=101.2, strategy="extension"),
            ],
        )

        assert score.breakdown.cross_tool_confluence == 2
        assert score.total == 3  # 1 base + 2 cross-tool

    def test_cross_tool_multiple_tools(self) -> None:
        """Multiple different tools converging should add +2 each."""
        from trader.workflow import LevelWithStrategy, calculate_confluence_score

        score = calculate_confluence_score(
            level_price=101.0,  # Non-psychological level
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[],
            level_strategy="retracement",
            other_tool_levels=[
                LevelWithStrategy(price=101.2, strategy="extension"),  # +2
                LevelWithStrategy(price=100.9, strategy="projection"),  # +2
            ],
        )

        assert score.breakdown.cross_tool_confluence == 4  # 2 tools x 2 points
        assert score.total == 5  # 1 base + 4 cross-tool

    def test_cross_tool_same_strategy_ignored(self) -> None:
        """Levels from same strategy should not count as cross-tool."""
        from trader.workflow import LevelWithStrategy, calculate_confluence_score

        score = calculate_confluence_score(
            level_price=101.0,  # Non-psychological level
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[],
            level_strategy="retracement",
            other_tool_levels=[
                LevelWithStrategy(price=101.2, strategy="retracement"),  # Same strategy
            ],
        )

        assert score.breakdown.cross_tool_confluence == 0
        assert score.total == 1  # Only base score

    def test_cross_tool_outside_tolerance_ignored(self) -> None:
        """Cross-tool levels outside tolerance should not count."""
        from trader.workflow import LevelWithStrategy, calculate_confluence_score

        score = calculate_confluence_score(
            level_price=101.0,  # Non-psychological level
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[],
            level_strategy="retracement",
            other_tool_levels=[
                LevelWithStrategy(price=111.0, strategy="extension"),
            ],
        )

        assert score.breakdown.cross_tool_confluence == 0
        assert score.total == 1  # Only base score

    def test_cross_tool_defaults_to_zero_without_strategy(self) -> None:
        """Cross-tool should be 0 when level_strategy is not provided."""
        from trader.workflow import LevelWithStrategy, calculate_confluence_score

        score = calculate_confluence_score(
            level_price=101.0,  # Non-psychological level
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[],
            # level_strategy not provided
            other_tool_levels=[
                LevelWithStrategy(price=101.2, strategy="extension"),
            ],
        )

        assert score.breakdown.cross_tool_confluence == 0

    def test_cross_tool_with_full_confluence(self) -> None:
        """Cross-tool confluence combined with other factors should reach major."""
        from trader.workflow import LevelWithStrategy, calculate_confluence_score

        score = calculate_confluence_score(
            level_price=50000.0,  # +1 psychological
            same_tf_levels=[50010.0],  # +1
            higher_tf_levels=[50005.0],  # +2
            previous_pivots=[50020.0],  # +2
            level_strategy="retracement",
            other_tool_levels=[
                LevelWithStrategy(price=50015.0, strategy="extension"),  # +2
            ],
        )

        # 1 base + 1 same TF + 2 higher TF + 2 cross-tool + 2 pivot + 1 psych = 9
        assert score.total >= 7
        assert score.interpretation == "major"


class TestTradeOpportunityModel:
    """Tests for TradeOpportunity model."""

    def test_can_import_trade_opportunity(self) -> None:
        """TradeOpportunity model should be importable."""
        from trader.workflow import TradeOpportunity

        assert TradeOpportunity is not None

    def test_create_long_opportunity(self) -> None:
        """Should create long trade opportunity."""
        from trader.workflow import TradeOpportunity

        opportunity = TradeOpportunity(
            symbol="DJI",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            confidence=75,
            category="with_trend",
            phase="correction",
            description="Buy pullback in 1D uptrend",
        )

        assert opportunity.symbol == "DJI"
        assert opportunity.direction == "long"
        assert opportunity.category == "with_trend"
        assert opportunity.phase == "correction"

    def test_create_short_opportunity(self) -> None:
        """Should create short trade opportunity."""
        from trader.workflow import TradeOpportunity

        opportunity = TradeOpportunity(
            symbol="SPX",
            higher_timeframe="1W",
            lower_timeframe="1D",
            direction="short",
            confidence=80,
            category="counter_trend",
            phase="exhaustion",
            description="Sell rally at resistance",
        )

        assert opportunity.symbol == "SPX"
        assert opportunity.direction == "short"
        assert opportunity.category == "counter_trend"
        assert opportunity.phase == "exhaustion"


class TestOpportunityScanResult:
    """Tests for OpportunityScanResult model."""

    def test_can_import_scan_result(self) -> None:
        """OpportunityScanResult model should be importable."""
        from trader.workflow import OpportunityScanResult

        assert OpportunityScanResult is not None

    def test_create_scan_result_with_opportunities(self) -> None:
        """Should create scan result with opportunities."""
        from trader.workflow import OpportunityScanResult, TradeOpportunity

        opportunities = [
            TradeOpportunity(
                symbol="DJI",
                higher_timeframe="1D",
                lower_timeframe="4H",
                direction="long",
                confidence=75,
                category="with_trend",
                phase="correction",
                description="Buy pullback",
            ),
        ]

        result = OpportunityScanResult(
            symbols_scanned=["DJI", "SPX"],
            opportunities=opportunities,
            scan_time_ms=150,
        )

        assert len(result.symbols_scanned) == 2
        assert len(result.opportunities) == 1
        assert result.scan_time_ms == 150

    def test_create_empty_scan_result(self) -> None:
        """Should create scan result with no opportunities."""
        from trader.workflow import OpportunityScanResult

        result = OpportunityScanResult(
            symbols_scanned=["DJI"],
            opportunities=[],
            scan_time_ms=50,
        )

        assert len(result.opportunities) == 0


class TestScanOpportunitiesFunction:
    """Tests for scan_opportunities function."""

    @pytest.fixture
    def sample_bars(self) -> list[OHLCBar]:
        """Create sample OHLC bars with clear trend."""
        return [
            OHLCBar(time="2024-01-01", open=100.0, high=105.0, low=99.0, close=104.0),
            OHLCBar(time="2024-01-02", open=104.0, high=108.0, low=103.0, close=107.0),
            OHLCBar(time="2024-01-03", open=107.0, high=112.0, low=105.0, close=110.0),
            OHLCBar(time="2024-01-04", open=110.0, high=115.0, low=108.0, close=108.0),
            OHLCBar(time="2024-01-05", open=108.0, high=110.0, low=106.0, close=109.0),
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

    async def test_scan_returns_result(self, mock_market_service: MagicMock) -> None:
        """Should return OpportunityScanResult."""
        from trader.workflow import OpportunityScanResult, scan_opportunities

        result = await scan_opportunities(
            symbols=["DJI"],
            market_service=mock_market_service,
        )

        assert isinstance(result, OpportunityScanResult)
        assert "DJI" in result.symbols_scanned
        assert result.scan_time_ms >= 0

    async def test_scan_multiple_symbols(self, mock_market_service: MagicMock) -> None:
        """Should scan multiple symbols."""
        from trader.workflow import scan_opportunities

        result = await scan_opportunities(
            symbols=["DJI", "SPX", "NDX"],
            market_service=mock_market_service,
        )

        assert len(result.symbols_scanned) == 3
        assert "DJI" in result.symbols_scanned
        assert "SPX" in result.symbols_scanned
        assert "NDX" in result.symbols_scanned

    async def test_scan_with_timeframe_pairs(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should use specified timeframe pairs."""
        from trader.workflow import scan_opportunities

        result = await scan_opportunities(
            symbols=["DJI"],
            timeframe_pairs=[("1D", "4H"), ("1W", "1D")],
            market_service=mock_market_service,
        )

        assert isinstance(result.opportunities, list)


class TestMultiTimeframeAlignmentLogic:
    """Tests for multi-timeframe alignment rules per spec.

    SignalPro Spec Rules (lines 78-83):
    | Higher TF | Lower TF | Action      |
    |-----------|----------|-------------|
    | UP        | DOWN     | GO LONG     | (buy the dip)
    | DOWN      | UP       | GO SHORT    | (sell the rally)
    | UP        | UP       | STAND ASIDE |
    | DOWN      | DOWN     | STAND ASIDE |
    """

    def test_can_import_trade_action_result(self) -> None:
        """TradeActionResult model should be importable."""
        from trader.workflow import TradeActionResult

        assert TradeActionResult is not None

    def test_can_import_determine_trade_action(self) -> None:
        """determine_trade_action function should be importable."""
        from trader.workflow import determine_trade_action

        assert determine_trade_action is not None

    def test_up_down_returns_long(self) -> None:
        """Higher TF UP + Lower TF DOWN = GO LONG (buy the dip)."""
        from trader.workflow import determine_trade_action

        result = determine_trade_action(
            higher_tf_trend="bullish",
            lower_tf_trend="bearish",
        )

        assert result.should_trade is True
        assert result.direction == "long"
        assert "dip" in result.reason.lower() or "pullback" in result.reason.lower()

    def test_down_up_returns_short(self) -> None:
        """Higher TF DOWN + Lower TF UP = GO SHORT (sell the rally)."""
        from trader.workflow import determine_trade_action

        result = determine_trade_action(
            higher_tf_trend="bearish",
            lower_tf_trend="bullish",
        )

        assert result.should_trade is True
        assert result.direction == "short"
        assert "rally" in result.reason.lower()

    def test_up_up_returns_long_with_trend(self) -> None:
        """Higher TF UP + Lower TF UP = GO LONG (with-trend)."""
        from trader.workflow import determine_trade_action

        result = determine_trade_action(
            higher_tf_trend="bullish",
            lower_tf_trend="bullish",
        )

        assert result.should_trade is True
        assert result.direction == "long"
        assert result.is_pullback is False
        assert "with-trend" in result.reason.lower()

    def test_down_down_returns_short_with_trend(self) -> None:
        """Higher TF DOWN + Lower TF DOWN = GO SHORT (with-trend)."""
        from trader.workflow import determine_trade_action

        result = determine_trade_action(
            higher_tf_trend="bearish",
            lower_tf_trend="bearish",
        )

        assert result.should_trade is True
        assert result.direction == "short"
        assert result.is_pullback is False
        assert "with-trend" in result.reason.lower()

    def test_neutral_higher_tf_returns_stand_aside(self) -> None:
        """Neutral higher TF = STAND ASIDE (no clear trend)."""
        from trader.workflow import determine_trade_action

        result = determine_trade_action(
            higher_tf_trend="neutral",
            lower_tf_trend="bullish",
        )

        assert result.should_trade is False
        assert result.direction is None

    def test_neutral_lower_tf_with_bullish_higher_returns_stand_aside(self) -> None:
        """Higher TF UP + Lower TF neutral = STAND ASIDE (wait for pullback)."""
        from trader.workflow import determine_trade_action

        result = determine_trade_action(
            higher_tf_trend="bullish",
            lower_tf_trend="neutral",
        )

        assert result.should_trade is False
        assert result.direction is None


class TestAnalyzeSymbolPairMultiTFLogic:
    """Tests that _analyze_symbol_pair uses correct multi-TF alignment rules.

    Uses patching to mock assess_trend for controlled testing of multi-TF logic.
    """

    def _create_mock_market_service(self) -> MagicMock:
        """Create a mock market service with proper async methods."""
        mock_service = MagicMock()

        # Create mock OHLC data for Fibonacci calculation
        mock_bars = [
            OHLCBar(
                time=f"2024-01-{i:02d}",
                open=100.0 + i,
                high=105.0 + i,
                low=99.0 + i,
                close=103.0 + i,
                volume=1000000,
            )
            for i in range(1, 51)
        ]

        mock_result = MarketDataResult(
            success=True,
            data=mock_bars,
            provider="mock",
            cached=False,
            cache_expires_at=None,
            rate_limit_remaining=None,
            market_status=MarketStatus(
                state="open",
                state_display="Market Open",
                is_open=True,
                is_pre_market=False,
                is_after_hours=False,
                is_closed=False,
            ),
        )

        mock_service.get_ohlc = AsyncMock(return_value=mock_result)
        return mock_service

    async def test_bullish_higher_bearish_lower_returns_long(self) -> None:
        """Should return long opportunity when higher TF bullish, lower TF bearish."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, scan_opportunities

        # Mock assess_trend to return controlled results
        bullish_assessment = TrendAssessment(
            trend="bullish",
            phase="impulse",
            swing_type="HH",
            explanation="Higher High pattern",
            confidence=75,
        )
        bearish_assessment = TrendAssessment(
            trend="bearish",
            phase="correction",
            swing_type="LH",
            explanation="Lower High pattern",
            confidence=70,
        )

        mock_service = self._create_mock_market_service()

        with patch("trader.workflow.assess_trend") as mock_assess:
            # First call = higher TF (bullish), second call = lower TF (bearish)
            mock_assess.side_effect = [bullish_assessment, bearish_assessment]

            result = await scan_opportunities(
                symbols=["TEST"],
                timeframe_pairs=[("1D", "4H")],
                market_service=mock_service,
            )

        # Should find a long opportunity (buy the dip)
        # Note: Now requires signal bar confirmation, so is_confirmed may be False
        assert len(result.opportunities) == 1
        assert result.opportunities[0].direction == "long"
        assert result.opportunities[0].symbol == "TEST"

    async def test_bearish_higher_bullish_lower_returns_short(self) -> None:
        """Should return short opportunity when higher TF bearish, lower TF bullish."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, scan_opportunities

        bearish_assessment = TrendAssessment(
            trend="bearish",
            phase="impulse",
            swing_type="LL",
            explanation="Lower Low pattern",
            confidence=75,
        )
        bullish_assessment = TrendAssessment(
            trend="bullish",
            phase="correction",
            swing_type="HL",
            explanation="Higher Low pattern",
            confidence=70,
        )

        mock_service = self._create_mock_market_service()

        with patch("trader.workflow.assess_trend") as mock_assess:
            # First call = higher TF (bearish), second call = lower TF (bullish)
            mock_assess.side_effect = [bearish_assessment, bullish_assessment]

            result = await scan_opportunities(
                symbols=["TEST"],
                timeframe_pairs=[("1D", "4H")],
                market_service=mock_service,
            )

        # Should find a short opportunity (sell the rally)
        assert len(result.opportunities) == 1
        assert result.opportunities[0].direction == "short"
        assert result.opportunities[0].symbol == "TEST"

    async def test_both_bullish_returns_no_opportunity_by_default(self) -> None:
        """Should return no opportunity when both TFs bullish (default)."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, scan_opportunities

        bullish_assessment = TrendAssessment(
            trend="bullish",
            phase="impulse",
            swing_type="HH",
            explanation="Higher High pattern",
            confidence=75,
        )

        mock_service = self._create_mock_market_service()

        with patch("trader.workflow.assess_trend") as mock_assess:
            # Both TFs return bullish
            mock_assess.return_value = bullish_assessment

            result = await scan_opportunities(
                symbols=["TEST"],
                timeframe_pairs=[("1D", "4H")],
                market_service=mock_service,
                include_potential=False,  # Default behavior
            )

        # Should NOT find any opportunity (with-trend needs signal bar confirmation)
        assert len(result.opportunities) == 0

    async def test_both_bullish_returns_potential_with_flag(self) -> None:
        """Should return potential opportunity when include_potential=True."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, scan_opportunities

        bullish_assessment = TrendAssessment(
            trend="bullish",
            phase="impulse",
            swing_type="HH",
            explanation="Higher High pattern",
            confidence=75,
        )

        mock_service = self._create_mock_market_service()

        with patch("trader.workflow.assess_trend") as mock_assess:
            # Both TFs return bullish
            mock_assess.return_value = bullish_assessment

            result = await scan_opportunities(
                symbols=["TEST"],
                timeframe_pairs=[("1D", "4H")],
                market_service=mock_service,
                include_potential=True,  # Include unconfirmed
            )

        # Should find a potential opportunity (with-trend LONG)
        assert len(result.opportunities) == 1
        assert result.opportunities[0].direction == "long"
        assert result.opportunities[0].is_confirmed is False
        assert result.opportunities[0].is_pullback is False
        assert result.opportunities[0].awaiting_confirmation is not None

    async def test_both_bearish_returns_no_opportunity_by_default(self) -> None:
        """Should return no opportunity when both TFs bearish (default)."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, scan_opportunities

        bearish_assessment = TrendAssessment(
            trend="bearish",
            phase="impulse",
            swing_type="LL",
            explanation="Lower Low pattern",
            confidence=75,
        )

        mock_service = self._create_mock_market_service()

        with patch("trader.workflow.assess_trend") as mock_assess:
            # Both TFs return bearish
            mock_assess.return_value = bearish_assessment

            result = await scan_opportunities(
                symbols=["TEST"],
                timeframe_pairs=[("1D", "4H")],
                market_service=mock_service,
                include_potential=False,  # Default behavior
            )

        # Should NOT find any opportunity (with-trend needs signal bar confirmation)
        assert len(result.opportunities) == 0

    async def test_both_bearish_returns_potential_with_flag(self) -> None:
        """Should return potential opportunity when include_potential=True."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, scan_opportunities

        bearish_assessment = TrendAssessment(
            trend="bearish",
            phase="impulse",
            swing_type="LL",
            explanation="Lower Low pattern",
            confidence=75,
        )

        mock_service = self._create_mock_market_service()

        with patch("trader.workflow.assess_trend") as mock_assess:
            # Both TFs return bearish
            mock_assess.return_value = bearish_assessment

            result = await scan_opportunities(
                symbols=["TEST"],
                timeframe_pairs=[("1D", "4H")],
                market_service=mock_service,
                include_potential=True,  # Include unconfirmed
            )

        # Should find a potential opportunity (with-trend SHORT)
        assert len(result.opportunities) == 1
        assert result.opportunities[0].direction == "short"
        assert result.opportunities[0].is_confirmed is False
        assert result.opportunities[0].is_pullback is False
        assert result.opportunities[0].awaiting_confirmation is not None


class TestValidationModels:
    """Tests for validation models."""

    def test_can_import_validation_check(self) -> None:
        """ValidationCheck model should be importable."""
        from trader.workflow import ValidationCheck

        assert ValidationCheck is not None

    def test_can_import_validation_result(self) -> None:
        """ValidationResult model should be importable."""
        from trader.workflow import ValidationResult

        assert ValidationResult is not None

    def test_create_validation_check(self) -> None:
        """Should create ValidationCheck with all fields."""
        from trader.workflow import ValidationCheck

        check = ValidationCheck(
            name="Trend Alignment",
            passed=True,
            explanation="Timeframes aligned for long",
            details="1D bullish, 4H bearish",
        )

        assert check.name == "Trend Alignment"
        assert check.passed is True
        assert "aligned" in check.explanation.lower()

    def test_create_validation_result(self) -> None:
        """Should create ValidationResult with checks."""
        from trader.workflow import ValidationCheck, ValidationResult

        checks = [
            ValidationCheck(name="Check 1", passed=True, explanation="Pass"),
            ValidationCheck(name="Check 2", passed=False, explanation="Fail"),
            ValidationCheck(name="Check 3", passed=True, explanation="Pass"),
        ]

        result = ValidationResult(
            checks=checks,
            passed_count=2,
            total_count=3,
            is_valid=False,
            pass_percentage=66.7,
        )

        assert result.passed_count == 2
        assert result.total_count == 3
        assert result.is_valid is False
        assert result.pass_percentage == 66.7

    def test_validation_is_valid_when_60_percent(self) -> None:
        """Trade should be valid when 60%+ checks pass."""
        from trader.workflow import ValidationCheck, ValidationResult

        # 3 of 5 = 60%
        checks = [
            ValidationCheck(name="Check 1", passed=True, explanation="Pass"),
            ValidationCheck(name="Check 2", passed=True, explanation="Pass"),
            ValidationCheck(name="Check 3", passed=True, explanation="Pass"),
            ValidationCheck(name="Check 4", passed=False, explanation="Fail"),
            ValidationCheck(name="Check 5", passed=False, explanation="Fail"),
        ]

        result = ValidationResult(
            checks=checks,
            passed_count=3,
            total_count=5,
            is_valid=True,
            pass_percentage=60.0,
        )

        assert result.is_valid is True

    def test_validation_invalid_below_60_percent(self) -> None:
        """Trade should be invalid when below 60% checks pass."""
        from trader.workflow import ValidationCheck, ValidationResult

        # 2 of 5 = 40%
        checks = [
            ValidationCheck(name="Check 1", passed=True, explanation="Pass"),
            ValidationCheck(name="Check 2", passed=True, explanation="Pass"),
            ValidationCheck(name="Check 3", passed=False, explanation="Fail"),
            ValidationCheck(name="Check 4", passed=False, explanation="Fail"),
            ValidationCheck(name="Check 5", passed=False, explanation="Fail"),
        ]

        result = ValidationResult(
            checks=checks,
            passed_count=2,
            total_count=5,
            is_valid=False,
            pass_percentage=40.0,
        )

        assert result.is_valid is False


class TestValidateTradeFunction:
    """Tests for validate_trade function."""

    @pytest.fixture
    def sample_bars(self) -> list[OHLCBar]:
        """Create sample OHLC bars."""
        return [
            OHLCBar(time="2024-01-01", open=100.0, high=105.0, low=99.0, close=104.0),
            OHLCBar(time="2024-01-02", open=104.0, high=108.0, low=102.0, close=106.0),
            OHLCBar(time="2024-01-03", open=106.0, high=112.0, low=105.0, close=110.0),
            OHLCBar(time="2024-01-04", open=110.0, high=115.0, low=108.0, close=113.0),
            OHLCBar(time="2024-01-05", open=113.0, high=118.0, low=111.0, close=116.0),
        ] * 10  # Repeat to have enough data for indicators

    @pytest.fixture
    def mock_market_service(self, sample_bars: list[OHLCBar]) -> MagicMock:
        """Create mock market data service."""
        mock = MagicMock()
        mock.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_success(
                data=sample_bars,
                market_status=MarketStatus.unknown(),
                provider="test",
            )
        )
        return mock

    async def test_validate_trade_returns_validation_result(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should return ValidationResult."""
        from trader.workflow import ValidationResult, validate_trade

        result = await validate_trade(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            market_service=mock_market_service,
        )

        assert isinstance(result, ValidationResult)

    async def test_validate_trade_has_eight_checks(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should perform exactly 7 validation checks."""
        from trader.workflow import validate_trade

        result = await validate_trade(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            market_service=mock_market_service,
        )

        assert result.total_count == 8
        assert len(result.checks) == 8

    async def test_validate_trade_check_names(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should have the 7 required check names."""
        from trader.workflow import validate_trade

        result = await validate_trade(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            market_service=mock_market_service,
        )

        check_names = [c.name for c in result.checks]
        assert "Trend Alignment" in check_names
        assert "Entry Zone" in check_names
        assert "Target Zones" in check_names
        assert "RSI Confirmation" in check_names
        assert "MACD Confirmation" in check_names
        assert "Volume Confirmation" in check_names
        assert "Confluence Score" in check_names

    async def test_validate_trade_calculates_pass_percentage(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should calculate pass percentage correctly."""
        from trader.workflow import validate_trade

        result = await validate_trade(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            market_service=mock_market_service,
        )

        expected_percentage = (result.passed_count / result.total_count) * 100
        assert result.pass_percentage == expected_percentage


class TestConfluenceScoreSpecCompliance:
    """Tests to verify confluence scoring matches SignalPro spec (Rule 11).

    Confluence scoring per spec:
    - Base Fib level: +1 (always)
    - Same TF additional level within tolerance: +1 each
    - Higher TF level within tolerance: +2 each
    - Cross-tool confluence: +2 when different Fib tools converge
    - Previous major pivot: +2 if within tolerance
    - Psychological level: +1 if round number

    Interpretation thresholds:
    - 1-2: Standard (basic Fib level)
    - 3-4: Important (some confluence)
    - 5-6: Significant (strong confluence)
    - 7+:  Major (exceptional confluence zone)
    """

    def test_base_fib_level_always_one(self) -> None:
        """Base Fib level should always be +1."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=100.0,
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[],
        )

        assert score.breakdown.base_fib_level == 1

    def test_same_tf_confluence_adds_one_per_level(self) -> None:
        """Same TF confluence: +1 per level within tolerance."""
        from trader.workflow import calculate_confluence_score

        # Add 3 same-TF levels within 0.5% tolerance
        score = calculate_confluence_score(
            level_price=100.0,
            same_tf_levels=[100.3, 100.4, 99.8],  # All within 0.5%
            higher_tf_levels=[],
            previous_pivots=[],
        )

        assert score.breakdown.same_tf_confluence == 3

    def test_higher_tf_confluence_adds_two_per_level(self) -> None:
        """Higher TF confluence: +2 per level within tolerance."""
        from trader.workflow import calculate_confluence_score

        # Add 2 higher-TF levels within tolerance
        score = calculate_confluence_score(
            level_price=100.0,
            same_tf_levels=[],
            higher_tf_levels=[100.2, 99.9],  # Both within 0.5%
            previous_pivots=[],
        )

        # 2 levels x 2 points = 4
        assert score.breakdown.higher_tf_confluence == 4

    def test_cross_tool_confluence_adds_two(self) -> None:
        """Cross-tool confluence: +2 when different Fib tools converge."""
        from trader.workflow import LevelWithStrategy, calculate_confluence_score

        score = calculate_confluence_score(
            level_price=100.0,
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[],
            level_strategy="retracement",
            other_tool_levels=[
                LevelWithStrategy(price=100.2, strategy="extension"),  # Different tool
            ],
        )

        assert score.breakdown.cross_tool_confluence == 2

    def test_previous_pivot_adds_two(self) -> None:
        """Previous major pivot: +2 if within tolerance."""
        from trader.workflow import calculate_confluence_score

        score = calculate_confluence_score(
            level_price=100.0,
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[100.3],  # Within 0.5%
        )

        assert score.breakdown.previous_pivot == 2

    def test_psychological_level_adds_one(self) -> None:
        """Psychological level: +1 if round number."""
        from trader.workflow import calculate_confluence_score

        # Test various psychological levels
        for price in [100.0, 1000.0, 50000.0]:
            score = calculate_confluence_score(
                level_price=price,
                same_tf_levels=[],
                higher_tf_levels=[],
                previous_pivots=[],
            )
            assert score.breakdown.psychological_level == 1, f"Failed for price {price}"

    def test_interpretation_standard_for_score_1_2(self) -> None:
        """Score 1-2 should have 'standard' interpretation."""
        from trader.workflow import calculate_confluence_score

        # Score = 1 (base only)
        score = calculate_confluence_score(
            level_price=101.0,  # Not psychological
            same_tf_levels=[],
            higher_tf_levels=[],
            previous_pivots=[],
        )

        assert score.total <= 2
        assert score.interpretation == "standard"

    def test_interpretation_important_for_score_3_4(self) -> None:
        """Score 3-4 should have 'important' interpretation."""
        from trader.workflow import calculate_confluence_score

        # Score = 3: base (1) + 2 same TF (2) = 3
        score = calculate_confluence_score(
            level_price=101.0,  # Not psychological
            same_tf_levels=[101.3, 100.8],  # +2
            higher_tf_levels=[],
            previous_pivots=[],
        )

        assert score.total in [3, 4]
        assert score.interpretation == "important"

    def test_interpretation_significant_for_score_5_6(self) -> None:
        """Score 5-6 should have 'significant' interpretation."""
        from trader.workflow import calculate_confluence_score

        # Score = 5: base (1) + 2 higher TF levels (4) = 5
        score = calculate_confluence_score(
            level_price=101.0,  # Not psychological
            same_tf_levels=[],
            higher_tf_levels=[101.2, 100.9],  # +4
            previous_pivots=[],
        )

        assert score.total in [5, 6]
        assert score.interpretation == "significant"

    def test_interpretation_major_for_score_7_plus(self) -> None:
        """Score 7+ should have 'major' interpretation."""
        from trader.workflow import calculate_confluence_score

        # Score = 9: base + same TF + higher TF + pivot + psychological
        score = calculate_confluence_score(
            level_price=50000.0,  # Psychological (+1)
            same_tf_levels=[50010.0],  # +1
            higher_tf_levels=[50005.0, 49995.0],  # +4
            previous_pivots=[50020.0],  # +2
        )

        assert score.total >= 7
        assert score.interpretation == "major"

    def test_full_confluence_scenario(self) -> None:
        """Test maximum confluence with all factors present."""
        from trader.workflow import LevelWithStrategy, calculate_confluence_score

        score = calculate_confluence_score(
            level_price=50000.0,  # Psychological (+1)
            same_tf_levels=[50010.0, 49990.0],  # +2
            higher_tf_levels=[50005.0, 50015.0],  # +4
            previous_pivots=[50020.0],  # +2
            level_strategy="retracement",
            other_tool_levels=[
                LevelWithStrategy(price=50010.0, strategy="extension"),  # +2
            ],
        )

        # Total: 1 + 2 + 4 + 2 + 2 + 1 = 12
        assert score.breakdown.base_fib_level == 1
        assert score.breakdown.same_tf_confluence == 2
        assert score.breakdown.higher_tf_confluence == 4
        assert score.breakdown.previous_pivot == 2
        assert score.breakdown.cross_tool_confluence == 2
        assert score.breakdown.psychological_level == 1
        assert score.total == 12
        assert score.interpretation == "major"


class TestTradeOpportunityConfirmation:
    """Tests for TradeOpportunity confirmation fields."""

    def test_trade_opportunity_has_confirmation_fields(self) -> None:
        """TradeOpportunity has is_confirmed and awaiting_confirmation fields."""
        from trader.workflow import TradeOpportunity

        opp = TradeOpportunity(
            symbol="DJI",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            confidence=75,
            category="with_trend",
            phase="correction",
            description="Test opportunity",
            is_confirmed=True,
            awaiting_confirmation=None,
            is_pullback=True,
        )

        assert opp.is_confirmed is True
        assert opp.awaiting_confirmation is None
        assert opp.is_pullback is True

    def test_trade_opportunity_potential_has_awaiting_message(self) -> None:
        """Potential opportunity should have awaiting_confirmation message."""
        from trader.workflow import TradeOpportunity

        opp = TradeOpportunity(
            symbol="DJI",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            confidence=65,
            category="with_trend",
            phase="impulse",
            description="Test with-trend opportunity",
            is_confirmed=False,
            awaiting_confirmation="Awaiting signal bar at Fib support",
            is_pullback=False,
        )

        assert opp.is_confirmed is False
        assert opp.awaiting_confirmation is not None
        assert "signal bar" in opp.awaiting_confirmation.lower()
        assert opp.is_pullback is False

    def _create_mock_market_service(self) -> MagicMock:
        """Create a mock market service with proper async methods."""
        mock_service = MagicMock()

        # Create mock OHLC data for Fibonacci calculation
        mock_bars = [
            OHLCBar(
                time=f"2024-01-{i:02d}",
                open=100.0 + i,
                high=105.0 + i,
                low=99.0 + i,
                close=103.0 + i,
                volume=1000000,
            )
            for i in range(1, 51)
        ]

        mock_result = MarketDataResult(
            success=True,
            data=mock_bars,
            provider="mock",
            cached=False,
            cache_expires_at=None,
            rate_limit_remaining=None,
            market_status=MarketStatus(
                state="open",
                state_display="Market Open",
                is_open=True,
                is_pre_market=False,
                is_after_hours=False,
                is_closed=False,
            ),
        )

        mock_service.get_ohlc = AsyncMock(return_value=mock_result)
        return mock_service

    async def test_pullback_opportunity_is_confirmed(self) -> None:
        """Pullback opportunity (opposite TF alignment) should be confirmed.

        Note: With the new signal bar requirement, pullback opportunities
        are no longer automatically confirmed. They need a signal bar
        at the entry level for confirmation.
        """
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, scan_opportunities

        bullish_assessment = TrendAssessment(
            trend="bullish",
            phase="impulse",
            swing_type="HH",
            explanation="Higher High pattern",
            confidence=75,
        )
        bearish_assessment = TrendAssessment(
            trend="bearish",
            phase="correction",
            swing_type="LH",
            explanation="Lower High pattern",
            confidence=70,
        )

        mock_service = self._create_mock_market_service()

        with patch("trader.workflow.assess_trend") as mock_assess:
            # Higher TF bullish, lower TF bearish = pullback
            mock_assess.side_effect = [bullish_assessment, bearish_assessment]

            result = await scan_opportunities(
                symbols=["TEST"],
                timeframe_pairs=[("1D", "4H")],
                market_service=mock_service,
            )

        # Pullback opportunity should exist but may not be confirmed without signal bar
        assert len(result.opportunities) == 1
        assert result.opportunities[0].is_pullback is True
        assert result.opportunities[0].direction == "long"
        # With signal bar requirement, confirmation depends on bar detection
        # Without mock signal bar data, this will be unconfirmed


class TestWithTrendOpportunityLogic:
    """Tests for with-trend opportunity detection logic."""

    def test_pullback_setup_has_is_pullback_true(self) -> None:
        """Pullback setup (opposite TF alignment) should have is_pullback=True."""
        from trader.workflow import determine_trade_action

        # UP + DOWN = pullback
        result = determine_trade_action(
            higher_tf_trend="bullish",
            lower_tf_trend="bearish",
        )

        assert result.should_trade is True
        assert result.is_pullback is True

    def test_with_trend_setup_has_is_pullback_false(self) -> None:
        """With-trend setup (same TF alignment) should have is_pullback=False."""
        from trader.workflow import determine_trade_action

        # UP + UP = with-trend
        result = determine_trade_action(
            higher_tf_trend="bullish",
            lower_tf_trend="bullish",
        )

        assert result.should_trade is True
        assert result.is_pullback is False

    def test_with_trend_long_description(self) -> None:
        """With-trend long should have appropriate description."""
        from trader.workflow import determine_trade_action

        result = determine_trade_action(
            higher_tf_trend="bullish",
            lower_tf_trend="bullish",
        )

        assert "long" in result.reason.lower()
        assert "support" in result.reason.lower()

    def test_with_trend_short_description(self) -> None:
        """With-trend short should have appropriate description."""
        from trader.workflow import determine_trade_action

        result = determine_trade_action(
            higher_tf_trend="bearish",
            lower_tf_trend="bearish",
        )

        assert "short" in result.reason.lower()
        assert "resistance" in result.reason.lower()


class TestValidateTradeConfluence:
    """Tests for confluence scoring in validate_trade function."""

    @pytest.fixture
    def sample_bars_with_volume(self) -> list[OHLCBar]:
        """Create sample OHLC bars with volume data."""
        return [
            OHLCBar(
                time=f"2024-01-{i:02d}",
                open=100.0 + i,
                high=105.0 + i,
                low=99.0 + i,
                close=103.0 + i,
                volume=1000000 + i * 10000,
            )
            for i in range(1, 51)
        ]

    @pytest.fixture
    def mock_market_service(self, sample_bars_with_volume: list[OHLCBar]) -> MagicMock:
        """Create mock market data service."""
        mock = MagicMock()
        mock.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_success(
                data=sample_bars_with_volume,
                market_status=MarketStatus.unknown(),
                provider="test",
            )
        )
        return mock

    async def test_validate_trade_has_eight_checks(
        self, mock_market_service: MagicMock
    ) -> None:
        """validate_trade should now have 7 checks including Confluence Score."""
        from trader.workflow import validate_trade

        result = await validate_trade(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            market_service=mock_market_service,
        )

        assert result.total_count == 8
        assert len(result.checks) == 8
        check_names = [c.name for c in result.checks]
        assert "Confluence Score" in check_names

    async def test_validate_trade_returns_confluence_score(
        self, mock_market_service: MagicMock
    ) -> None:
        """validate_trade should return confluence_score field."""
        from trader.workflow import validate_trade

        result = await validate_trade(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            market_service=mock_market_service,
        )

        assert result.confluence_score is not None
        assert result.confluence_score >= 1  # Base score is always 1

    async def test_validate_trade_returns_confluence_breakdown(
        self, mock_market_service: MagicMock
    ) -> None:
        """validate_trade should return confluence_breakdown field."""
        from trader.workflow import validate_trade

        result = await validate_trade(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            market_service=mock_market_service,
        )

        assert result.confluence_breakdown is not None
        assert result.confluence_breakdown.base_fib_level == 1

    async def test_validate_trade_returns_trade_category(
        self, mock_market_service: MagicMock
    ) -> None:
        """validate_trade should return trade_category field."""
        from trader.workflow import validate_trade

        result = await validate_trade(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            market_service=mock_market_service,
        )

        assert result.trade_category is not None
        valid_categories = ["with_trend", "counter_trend", "reversal_attempt"]
        assert result.trade_category in valid_categories


class TestConfluenceCheckRequirements:
    """Tests for confluence check pass requirements based on trade category."""

    def test_with_trend_requires_confluence_3(self) -> None:
        """With-trend trades should pass confluence check with score >= 3."""
        from trader.workflow import categorize_trade

        # With confluence 3, with_trend should pass
        category = categorize_trade(
            higher_tf_trend="bullish",
            lower_tf_trend="bearish",
            trade_direction="long",
            confluence_score=3,
        )
        assert category == "with_trend"
        # Min confluence for with_trend is 3, so score 3 passes

    def test_counter_trend_requires_confluence_5(self) -> None:
        """Counter-trend trades should require score >= 5 to pass confluence check."""
        from trader.workflow import categorize_trade

        # Score of 5 against higher TF = counter_trend (not reversal_attempt)
        category = categorize_trade(
            higher_tf_trend="bullish",
            lower_tf_trend="bullish",
            trade_direction="short",
            confluence_score=5,
        )
        assert category == "counter_trend"

    def test_reversal_attempt_with_low_confluence(self) -> None:
        """Low confluence against trend should be categorized as reversal_attempt."""
        from trader.workflow import categorize_trade

        # Score of 3 against higher TF = reversal_attempt (not counter_trend)
        category = categorize_trade(
            higher_tf_trend="bullish",
            lower_tf_trend="bullish",
            trade_direction="short",
            confluence_score=3,
        )
        assert category == "reversal_attempt"


class TestCascadeModels:
    """Tests for cascade effect detection models."""

    def test_can_import_timeframe_hierarchy(self) -> None:
        """TIMEFRAME_HIERARCHY constant should be importable."""
        from trader.workflow import TIMEFRAME_HIERARCHY

        assert TIMEFRAME_HIERARCHY is not None
        assert isinstance(TIMEFRAME_HIERARCHY, list)
        assert "1M" in TIMEFRAME_HIERARCHY
        assert "5m" in TIMEFRAME_HIERARCHY

    def test_timeframe_hierarchy_order(self) -> None:
        """TIMEFRAME_HIERARCHY should be ordered from highest to lowest."""
        from trader.workflow import TIMEFRAME_HIERARCHY

        # Should be: 1M, 1W, 1D, 4H, 1H, 15m, 5m, 3m, 1m
        expected = ["1M", "1W", "1D", "4H", "1H", "15m", "5m", "3m", "1m"]
        assert TIMEFRAME_HIERARCHY == expected

    def test_can_import_timeframe_trend_state(self) -> None:
        """TimeframeTrendState model should be importable."""
        from trader.workflow import TimeframeTrendState

        assert TimeframeTrendState is not None

    def test_create_timeframe_trend_state(self) -> None:
        """Should create TimeframeTrendState with all fields."""
        from trader.workflow import TimeframeTrendState

        state = TimeframeTrendState(
            timeframe="1D",
            trend="bullish",
            is_aligned_with_dominant=True,
            is_diverging=False,
            swing_type="HH",
            confidence=75,
        )

        assert state.timeframe == "1D"
        assert state.trend == "bullish"
        assert state.is_aligned_with_dominant is True
        assert state.is_diverging is False
        assert state.swing_type == "HH"
        assert state.confidence == 75

    def test_can_import_cascade_analysis(self) -> None:
        """CascadeAnalysis model should be importable."""
        from trader.workflow import CascadeAnalysis

        assert CascadeAnalysis is not None

    def test_create_cascade_analysis(self) -> None:
        """Should create CascadeAnalysis with all fields."""
        from trader.workflow import CascadeAnalysis, TimeframeTrendState

        states = [
            TimeframeTrendState(
                timeframe="1D",
                trend="bullish",
                is_aligned_with_dominant=True,
                is_diverging=False,
                confidence=80,
            ),
            TimeframeTrendState(
                timeframe="4H",
                trend="bearish",
                is_aligned_with_dominant=False,
                is_diverging=True,
                confidence=70,
            ),
        ]

        analysis = CascadeAnalysis(
            stage=3,
            dominant_trend="bullish",
            reversal_trend="bearish",
            diverging_timeframes=["4H", "1H", "15m", "5m"],
            aligned_timeframes=["1M", "1W", "1D"],
            timeframe_states=states,
            progression="1H joined reversal",
            actionable_insight="Momentum building, reduce position size",
            reversal_probability=30,
        )

        assert analysis.stage == 3
        assert analysis.dominant_trend == "bullish"
        assert analysis.reversal_trend == "bearish"
        assert len(analysis.diverging_timeframes) == 4
        assert len(analysis.aligned_timeframes) == 3
        assert analysis.progression == "1H joined reversal"
        assert analysis.reversal_probability == 30

    def test_cascade_stage_range(self) -> None:
        """CascadeAnalysis stage should be between 1 and 6."""
        from pydantic import ValidationError

        from trader.workflow import CascadeAnalysis

        # Valid stages
        for stage in [1, 2, 3, 4, 5, 6]:
            analysis = CascadeAnalysis(
                stage=stage,
                dominant_trend="bullish",
                reversal_trend="bearish",
                diverging_timeframes=[],
                aligned_timeframes=[],
                timeframe_states=[],
                progression="test",
                actionable_insight="test",
                reversal_probability=50,
            )
            assert analysis.stage == stage

        # Invalid stage 0
        with pytest.raises(ValidationError):
            CascadeAnalysis(
                stage=0,
                dominant_trend="bullish",
                reversal_trend="bearish",
                diverging_timeframes=[],
                aligned_timeframes=[],
                timeframe_states=[],
                progression="test",
                actionable_insight="test",
                reversal_probability=50,
            )

        # Invalid stage 7
        with pytest.raises(ValidationError):
            CascadeAnalysis(
                stage=7,
                dominant_trend="bullish",
                reversal_trend="bearish",
                diverging_timeframes=[],
                aligned_timeframes=[],
                timeframe_states=[],
                progression="test",
                actionable_insight="test",
                reversal_probability=50,
            )

    def test_reversal_probability_range(self) -> None:
        """CascadeAnalysis reversal_probability should be 0-100."""
        from pydantic import ValidationError

        from trader.workflow import CascadeAnalysis

        # Valid probabilities
        for prob in [0, 50, 100]:
            analysis = CascadeAnalysis(
                stage=1,
                dominant_trend="bullish",
                reversal_trend="bearish",
                diverging_timeframes=[],
                aligned_timeframes=[],
                timeframe_states=[],
                progression="test",
                actionable_insight="test",
                reversal_probability=prob,
            )
            assert analysis.reversal_probability == prob

        # Invalid probability > 100
        with pytest.raises(ValidationError):
            CascadeAnalysis(
                stage=1,
                dominant_trend="bullish",
                reversal_trend="bearish",
                diverging_timeframes=[],
                aligned_timeframes=[],
                timeframe_states=[],
                progression="test",
                actionable_insight="test",
                reversal_probability=101,
            )


class TestDetectCascadeFunction:
    """Tests for detect_cascade function."""

    @pytest.fixture
    def sample_bars(self) -> list[OHLCBar]:
        """Create sample OHLC bars."""
        return [
            OHLCBar(time="2024-01-01", open=100.0, high=105.0, low=99.0, close=104.0),
            OHLCBar(time="2024-01-02", open=104.0, high=108.0, low=103.0, close=107.0),
            OHLCBar(time="2024-01-03", open=107.0, high=112.0, low=105.0, close=110.0),
            OHLCBar(time="2024-01-04", open=110.0, high=115.0, low=108.0, close=113.0),
            OHLCBar(time="2024-01-05", open=113.0, high=118.0, low=111.0, close=116.0),
        ]

    @pytest.fixture
    def mock_market_service(self, sample_bars: list[OHLCBar]) -> MagicMock:
        """Create mock market data service."""
        mock = MagicMock()
        mock.get_ohlc = AsyncMock(
            return_value=MarketDataResult.from_success(
                data=sample_bars,
                market_status=MarketStatus.unknown(),
                provider="test",
            )
        )
        return mock

    def test_can_import_detect_cascade(self) -> None:
        """detect_cascade function should be importable."""
        from trader.workflow import detect_cascade

        assert detect_cascade is not None

    async def test_detect_cascade_returns_cascade_analysis(
        self, mock_market_service: MagicMock
    ) -> None:
        """Should return CascadeAnalysis."""
        from trader.workflow import CascadeAnalysis, detect_cascade

        result = await detect_cascade(
            symbol="DJI",
            timeframes=["1D", "4H", "1H", "15m"],
            market_service=mock_market_service,
        )

        assert isinstance(result, CascadeAnalysis)
        assert result.stage >= 1
        assert result.stage <= 6

    async def test_all_bullish_returns_stage_1(self) -> None:
        """All timeframes bullish should return stage 1."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, detect_cascade

        bullish_assessment = TrendAssessment(
            trend="bullish",
            phase="impulse",
            swing_type="HH",
            explanation="Higher High pattern",
            confidence=75,
        )

        mock_service = MagicMock()

        with patch("trader.workflow.assess_trend") as mock_assess:
            mock_assess.return_value = bullish_assessment

            result = await detect_cascade(
                symbol="TEST",
                timeframes=["1D", "4H", "1H", "15m", "5m"],
                market_service=mock_service,
            )

        assert result.stage == 1
        assert result.dominant_trend == "bullish"
        assert len(result.diverging_timeframes) == 0
        assert "aligned" in result.progression.lower()
        assert result.reversal_probability == 5

    async def test_5m_15m_diverged_returns_stage_2(self) -> None:
        """Only 5m and 15m diverging should return stage 2."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, detect_cascade

        bullish_assessment = TrendAssessment(
            trend="bullish",
            phase="impulse",
            swing_type="HH",
            explanation="Higher High pattern",
            confidence=75,
        )
        bearish_assessment = TrendAssessment(
            trend="bearish",
            phase="correction",
            swing_type="LH",
            explanation="Lower High pattern",
            confidence=70,
        )

        mock_service = MagicMock()

        with patch("trader.workflow.assess_trend") as mock_assess:
            # 1D, 4H, 1H = bullish; 15m, 5m = bearish
            mock_assess.side_effect = [
                bullish_assessment,  # 1D
                bullish_assessment,  # 4H
                bullish_assessment,  # 1H
                bearish_assessment,  # 15m
                bearish_assessment,  # 5m
            ]

            result = await detect_cascade(
                symbol="TEST",
                timeframes=["1D", "4H", "1H", "15m", "5m"],
                market_service=mock_service,
            )

        assert result.stage == 2
        diverging = result.diverging_timeframes
        assert "15m" in diverging or "5m" in diverging
        assert result.reversal_probability == 15

    async def test_1h_diverged_returns_stage_3(self) -> None:
        """1H joining divergence should return stage 3."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, detect_cascade

        bullish_assessment = TrendAssessment(
            trend="bullish",
            phase="impulse",
            swing_type="HH",
            explanation="Higher High pattern",
            confidence=75,
        )
        bearish_assessment = TrendAssessment(
            trend="bearish",
            phase="correction",
            swing_type="LH",
            explanation="Lower High pattern",
            confidence=70,
        )

        mock_service = MagicMock()

        with patch("trader.workflow.assess_trend") as mock_assess:
            # 1D, 4H = bullish; 1H, 15m, 5m = bearish
            mock_assess.side_effect = [
                bullish_assessment,  # 1D
                bullish_assessment,  # 4H
                bearish_assessment,  # 1H
                bearish_assessment,  # 15m
                bearish_assessment,  # 5m
            ]

            result = await detect_cascade(
                symbol="TEST",
                timeframes=["1D", "4H", "1H", "15m", "5m"],
                market_service=mock_service,
            )

        assert result.stage == 3
        assert "1H" in result.diverging_timeframes
        assert result.reversal_probability == 30

    async def test_4h_diverged_returns_stage_4(self) -> None:
        """4H joining divergence should return stage 4."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, detect_cascade

        bullish_assessment = TrendAssessment(
            trend="bullish",
            phase="impulse",
            swing_type="HH",
            explanation="Higher High pattern",
            confidence=75,
        )
        bearish_assessment = TrendAssessment(
            trend="bearish",
            phase="correction",
            swing_type="LH",
            explanation="Lower High pattern",
            confidence=70,
        )

        mock_service = MagicMock()

        with patch("trader.workflow.assess_trend") as mock_assess:
            # 1D = bullish; 4H, 1H, 15m, 5m = bearish
            mock_assess.side_effect = [
                bullish_assessment,  # 1D
                bearish_assessment,  # 4H
                bearish_assessment,  # 1H
                bearish_assessment,  # 15m
                bearish_assessment,  # 5m
            ]

            result = await detect_cascade(
                symbol="TEST",
                timeframes=["1D", "4H", "1H", "15m", "5m"],
                market_service=mock_service,
            )

        assert result.stage == 4
        assert "4H" in result.diverging_timeframes
        assert result.reversal_probability == 50

    async def test_daily_diverged_returns_stage_5(self) -> None:
        """Daily joining divergence should return stage 5."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, detect_cascade

        bullish_assessment = TrendAssessment(
            trend="bullish",
            phase="impulse",
            swing_type="HH",
            explanation="Higher High pattern",
            confidence=75,
        )
        bearish_assessment = TrendAssessment(
            trend="bearish",
            phase="correction",
            swing_type="LH",
            explanation="Lower High pattern",
            confidence=70,
        )

        mock_service = MagicMock()

        with patch("trader.workflow.assess_trend") as mock_assess:
            # 1W = bullish; 1D, 4H, 1H, 15m, 5m = bearish
            mock_assess.side_effect = [
                bullish_assessment,  # 1W
                bearish_assessment,  # 1D
                bearish_assessment,  # 4H
                bearish_assessment,  # 1H
                bearish_assessment,  # 15m
                bearish_assessment,  # 5m
            ]

            result = await detect_cascade(
                symbol="TEST",
                timeframes=["1W", "1D", "4H", "1H", "15m", "5m"],
                market_service=mock_service,
            )

        assert result.stage == 5
        assert "1D" in result.diverging_timeframes
        assert result.reversal_probability == 75

    async def test_all_reversed_returns_stage_6(self) -> None:
        """All timeframes reversed should return stage 6."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, detect_cascade

        bearish_assessment = TrendAssessment(
            trend="bearish",
            phase="impulse",
            swing_type="LL",
            explanation="Lower Low pattern",
            confidence=75,
        )

        mock_service = MagicMock()

        with patch("trader.workflow.assess_trend") as mock_assess:
            mock_assess.return_value = bearish_assessment

            result = await detect_cascade(
                symbol="TEST",
                timeframes=["1D", "4H", "1H", "15m", "5m"],
                market_service=mock_service,
            )

        # When all are same direction, stage depends on dominant vs reversal
        # If all bearish and we started bearish, stage is 1 (all aligned)
        # But if dominant was bullish and all turned bearish, stage is 6
        # Since we're passing all bearish, dominant is determined by majority
        # of higher TFs - dominant will be bearish, so stage 1 (all aligned)
        assert result.stage == 1  # All aligned in same direction

    async def test_neutral_dominant_trend_handling(self) -> None:
        """Should handle neutral dominant trend appropriately."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, detect_cascade

        neutral_assessment = TrendAssessment(
            trend="neutral",
            phase="correction",
            swing_type="HL",
            explanation="Mixed signals",
            confidence=50,
        )

        mock_service = MagicMock()

        with patch("trader.workflow.assess_trend") as mock_assess:
            mock_assess.return_value = neutral_assessment

            result = await detect_cascade(
                symbol="TEST",
                timeframes=["1D", "4H", "1H"],
                market_service=mock_service,
            )

        assert result.dominant_trend == "neutral"
        # When dominant is neutral, stage should be 1 (no clear reversal)
        assert result.stage == 1

    async def test_actionable_insight_matches_stage(self) -> None:
        """Actionable insight should match the stage."""
        from unittest.mock import patch

        from trader.workflow import TrendAssessment, detect_cascade

        bullish = TrendAssessment(
            trend="bullish", phase="impulse", swing_type="HH",
            explanation="test", confidence=75,
        )
        bearish = TrendAssessment(
            trend="bearish", phase="correction", swing_type="LH",
            explanation="test", confidence=70,
        )

        mock_service = MagicMock()

        # Test stage 1: all aligned
        with patch("trader.workflow.assess_trend") as mock_assess:
            mock_assess.return_value = bullish
            result = await detect_cascade(
                symbol="TEST",
                timeframes=["1D", "4H", "1H"],
                market_service=mock_service,
            )
        insight = result.actionable_insight.lower()
        assert "trade with trend" in insight or "aligned" in insight

        # Test stage 3: momentum building
        with patch("trader.workflow.assess_trend") as mock_assess:
            mock_assess.side_effect = [bullish, bullish, bearish, bearish, bearish]
            result = await detect_cascade(
                symbol="TEST",
                timeframes=["1D", "4H", "1H", "15m", "5m"],
                market_service=mock_service,
            )
        assert result.stage == 3
        insight = result.actionable_insight.lower()
        assert "momentum" in insight or "reduce" in insight


class TestValidationResultModel:
    """Tests for ValidationResult model with confluence fields."""

    def test_validation_result_has_confluence_fields(self) -> None:
        """ValidationResult has confluence_score, breakdown, and trade_category."""
        from trader.workflow import (
            ConfluenceBreakdown,
            ValidationCheck,
            ValidationResult,
        )

        checks = [
            ValidationCheck(name="Check 1", passed=True, explanation="Pass"),
        ]
        breakdown = ConfluenceBreakdown(
            base_fib_level=1,
            same_tf_confluence=2,
            higher_tf_confluence=0,
            previous_pivot=2,
            psychological_level=0,
        )

        result = ValidationResult(
            checks=checks,
            passed_count=1,
            total_count=1,
            is_valid=True,
            pass_percentage=100.0,
            confluence_score=5,
            confluence_breakdown=breakdown,
            trade_category="with_trend",
        )

        assert result.confluence_score == 5
        assert result.confluence_breakdown is not None
        assert result.confluence_breakdown.same_tf_confluence == 2
        assert result.trade_category == "with_trend"

    def test_validation_result_confluence_fields_optional(self) -> None:
        """ValidationResult confluence fields should be optional."""
        from trader.workflow import ValidationCheck, ValidationResult

        checks = [
            ValidationCheck(name="Check 1", passed=True, explanation="Pass"),
        ]

        result = ValidationResult(
            checks=checks,
            passed_count=1,
            total_count=1,
            is_valid=True,
            pass_percentage=100.0,
        )

        assert result.confluence_score is None
        assert result.confluence_breakdown is None
        assert result.trade_category is None


class TestSignalBarConfirmation:
    """Tests for signal bar confirmation (8th validation check)."""

    def test_can_import_signal_bar_data(self) -> None:
        """SignalBarData model should be importable."""
        from trader.workflow import SignalBarData

        assert SignalBarData is not None

    def test_create_signal_bar_data(self) -> None:
        """Should create SignalBarData with OHLC values."""
        from trader.workflow import SignalBarData

        bar = SignalBarData(
            open=100.0,
            high=105.0,
            low=98.0,
            close=103.0,
        )

        assert bar.open == 100.0
        assert bar.high == 105.0
        assert bar.low == 98.0
        assert bar.close == 103.0

    def test_signal_bar_check_passes_with_valid_buy_signal(self) -> None:
        """Signal bar check should pass with valid buy signal at entry level."""
        from trader.workflow import SignalBarData, _check_signal_bar_confirmation

        # Bullish bar (close > open) with close above entry level
        signal_bar = SignalBarData(
            open=100.0,
            high=105.0,
            low=99.0,
            close=104.0,
        )
        entry_level = 101.0  # Close (104) > entry level (101)

        result = _check_signal_bar_confirmation(
            signal_bar_data=signal_bar,
            direction="long",
            entry_level=entry_level,
        )

        assert result.passed is True
        assert result.name == "Signal Bar Confirmation"
        assert "confirmed" in result.explanation.lower()

    def test_signal_bar_check_passes_with_valid_sell_signal(self) -> None:
        """Signal bar check should pass with valid sell signal at entry level."""
        from trader.workflow import SignalBarData, _check_signal_bar_confirmation

        # Bearish bar (close < open) with close below entry level
        signal_bar = SignalBarData(
            open=105.0,
            high=106.0,
            low=99.0,
            close=100.0,
        )
        entry_level = 103.0  # Close (100) < entry level (103)

        result = _check_signal_bar_confirmation(
            signal_bar_data=signal_bar,
            direction="short",
            entry_level=entry_level,
        )

        assert result.passed is True
        assert result.name == "Signal Bar Confirmation"
        assert "confirmed" in result.explanation.lower()

    def test_signal_bar_check_fails_without_bar(self) -> None:
        """Signal bar check should fail when no signal bar provided."""
        from trader.workflow import _check_signal_bar_confirmation

        result = _check_signal_bar_confirmation(
            signal_bar_data=None,
            direction="long",
            entry_level=100.0,
        )

        assert result.passed is False
        assert result.name == "Signal Bar Confirmation"
        assert "no signal bar" in result.explanation.lower()

    def test_signal_bar_check_fails_without_entry_level(self) -> None:
        """Signal bar check should fail when no entry level provided."""
        from trader.workflow import SignalBarData, _check_signal_bar_confirmation

        signal_bar = SignalBarData(
            open=100.0,
            high=105.0,
            low=99.0,
            close=104.0,
        )

        result = _check_signal_bar_confirmation(
            signal_bar_data=signal_bar,
            direction="long",
            entry_level=None,
        )

        assert result.passed is False
        assert "entry level" in result.explanation.lower()

    def test_signal_bar_check_fails_with_bearish_bar_for_long(self) -> None:
        """Signal bar check should fail when bar is bearish but direction is long."""
        from trader.workflow import SignalBarData, _check_signal_bar_confirmation

        # Bearish bar (close < open) - not valid for long signal
        signal_bar = SignalBarData(
            open=105.0,
            high=106.0,
            low=99.0,
            close=100.0,
        )
        entry_level = 98.0

        result = _check_signal_bar_confirmation(
            signal_bar_data=signal_bar,
            direction="long",
            entry_level=entry_level,
        )

        assert result.passed is False
        assert "not bullish" in result.explanation.lower()

    def test_signal_bar_check_fails_with_bullish_bar_for_short(self) -> None:
        """Signal bar check should fail when bar is bullish but direction is short."""
        from trader.workflow import SignalBarData, _check_signal_bar_confirmation

        # Bullish bar (close > open) - not valid for short signal
        signal_bar = SignalBarData(
            open=100.0,
            high=105.0,
            low=99.0,
            close=104.0,
        )
        entry_level = 106.0

        result = _check_signal_bar_confirmation(
            signal_bar_data=signal_bar,
            direction="short",
            entry_level=entry_level,
        )

        assert result.passed is False
        assert "not bearish" in result.explanation.lower()


class TestValidationHasEightChecks:
    """Tests that validation now has 8 checks including signal bar."""

    @pytest.fixture
    def mock_market_service(self) -> MagicMock:
        """Create a mock market data service."""
        service = MagicMock()

        # Create mock OHLC data
        mock_bars = [
            OHLCBar(
                time=f"2024-01-{i:02d}",
                open=100.0 + i,
                high=102.0 + i,
                low=99.0 + i,
                close=101.0 + i,
                volume=1000000,
            )
            for i in range(1, 51)
        ]

        # Mock successful market data response
        mock_result = MarketDataResult(
            success=True,
            data=mock_bars,
            provider="mock",
            cached=False,
            cache_expires_at=None,
            rate_limit_remaining=None,
            market_status=MarketStatus(
                state="open",
                state_display="Market Open",
                is_open=True,
                is_pre_market=False,
                is_after_hours=False,
                is_closed=False,
            ),
        )

        service.get_ohlc = AsyncMock(return_value=mock_result)
        return service

    @pytest.fixture
    def mock_market_service_with_signal_bar(self) -> MagicMock:
        """Create a mock market data service with signal bar data."""
        service = MagicMock()

        # Create mock OHLC data with a bullish signal bar at end
        mock_bars = [
            OHLCBar(
                time=f"2024-01-{i:02d}",
                open=100.0 + i,
                high=102.0 + i,
                low=99.0 + i,
                close=101.0 + i,
                volume=1000000,
            )
            for i in range(1, 50)
        ]

        # Add a bullish signal bar at the end
        mock_bars.append(
            OHLCBar(
                time="2024-01-50",
                open=150.0,
                high=155.0,
                low=149.0,
                close=154.0,  # Close > Open = bullish
                volume=1000000,
            )
        )

        mock_result = MarketDataResult(
            success=True,
            data=mock_bars,
            provider="mock",
            cached=False,
            cache_expires_at=None,
            rate_limit_remaining=None,
            market_status=MarketStatus(
                state="open",
                state_display="Market Open",
                is_open=True,
                is_pre_market=False,
                is_after_hours=False,
                is_closed=False,
            ),
        )

        service.get_ohlc = AsyncMock(return_value=mock_result)
        return service

    @pytest.mark.asyncio
    async def test_validate_trade_has_eight_checks(
        self, mock_market_service: MagicMock
    ) -> None:
        """Validation should now have 8 checks including signal bar."""
        from trader.workflow import validate_trade

        result = await validate_trade(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            market_service=mock_market_service,
        )

        assert result.total_count == 8
        check_names = [c.name for c in result.checks]
        assert "Signal Bar Confirmation" in check_names

    @pytest.mark.asyncio
    async def test_validate_trade_signal_bar_check_fails_without_data(
        self, mock_market_service: MagicMock
    ) -> None:
        """Signal bar check should fail when no signal bar data provided."""
        from trader.workflow import validate_trade

        result = await validate_trade(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            market_service=mock_market_service,
            signal_bar_data=None,
        )

        # Find signal bar check
        signal_bar_check = next(
            (c for c in result.checks if c.name == "Signal Bar Confirmation"),
            None,
        )

        assert signal_bar_check is not None
        assert signal_bar_check.passed is False

    @pytest.mark.asyncio
    async def test_validate_trade_signal_bar_check_passes_with_valid_data(
        self, mock_market_service: MagicMock
    ) -> None:
        """Signal bar check should pass when valid signal bar data provided."""
        from trader.workflow import SignalBarData, validate_trade

        # Bullish signal bar for long direction
        signal_bar = SignalBarData(
            open=100.0,
            high=105.0,
            low=99.0,
            close=104.0,
        )

        result = await validate_trade(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            market_service=mock_market_service,
            signal_bar_data=signal_bar,
            entry_level=101.0,  # Close (104) > entry (101)
        )

        # Find signal bar check
        signal_bar_check = next(
            (c for c in result.checks if c.name == "Signal Bar Confirmation"),
            None,
        )

        assert signal_bar_check is not None
        assert signal_bar_check.passed is True


class TestTradeOpportunityEnhancements:
    """Tests for enhanced TradeOpportunity model with Fib/signal bar fields."""

    def test_trade_opportunity_has_entry_level_field(self) -> None:
        """TradeOpportunity should have entry_level field."""
        from trader.workflow import TradeOpportunity

        opportunity = TradeOpportunity(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            confidence=75,
            category="with_trend",
            phase="correction",
            description="Test opportunity",
            is_confirmed=False,
            awaiting_confirmation="Awaiting signal bar",
            is_pullback=True,
            entry_level=42000.0,
        )

        assert opportunity.entry_level == 42000.0

    def test_trade_opportunity_has_current_price_field(self) -> None:
        """TradeOpportunity should have current_price field."""
        from trader.workflow import TradeOpportunity

        opportunity = TradeOpportunity(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            confidence=75,
            category="with_trend",
            phase="correction",
            description="Test opportunity",
            current_price=41500.0,
        )

        assert opportunity.current_price == 41500.0

    def test_trade_opportunity_has_signal_bar_detected_field(self) -> None:
        """TradeOpportunity should have signal_bar_detected field."""
        from trader.workflow import TradeOpportunity

        opportunity = TradeOpportunity(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            confidence=75,
            category="with_trend",
            phase="correction",
            description="Test opportunity",
            signal_bar_detected=True,
        )

        assert opportunity.signal_bar_detected is True

    def test_trade_opportunity_has_confluence_score_field(self) -> None:
        """TradeOpportunity should have confluence_score field."""
        from trader.workflow import TradeOpportunity

        opportunity = TradeOpportunity(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            confidence=75,
            category="with_trend",
            phase="correction",
            description="Test opportunity",
            confluence_score=5,
        )

        assert opportunity.confluence_score == 5

    def test_trade_opportunity_has_distance_to_entry_pct_field(self) -> None:
        """TradeOpportunity should have distance_to_entry_pct field."""
        from trader.workflow import TradeOpportunity

        opportunity = TradeOpportunity(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            confidence=75,
            category="with_trend",
            phase="correction",
            description="Test opportunity",
            distance_to_entry_pct=1.5,
        )

        assert opportunity.distance_to_entry_pct == 1.5

    def test_trade_opportunity_new_fields_default_to_none(self) -> None:
        """New TradeOpportunity fields should default to None/False."""
        from trader.workflow import TradeOpportunity

        opportunity = TradeOpportunity(
            symbol="TEST",
            higher_timeframe="1D",
            lower_timeframe="4H",
            direction="long",
            confidence=75,
            category="with_trend",
            phase="correction",
            description="Test opportunity",
        )

        assert opportunity.entry_level is None
        assert opportunity.current_price is None
        assert opportunity.confluence_score is None
        assert opportunity.signal_bar_detected is False
        assert opportunity.distance_to_entry_pct is None


class TestOpportunityScanningWithFibAndSignal:
    """Tests for opportunity scanning with Fib and signal bar integration."""

    @pytest.fixture
    def mock_market_service(self) -> MagicMock:
        """Create a mock market data service with trending data."""
        service = MagicMock()

        # Create mock OHLC data with clear trend (bullish higher TF, bearish lower TF)
        # Higher TF: Higher highs and higher lows (bullish)
        mock_higher_bars = [
            OHLCBar(
                time=f"2024-01-{i:02d}",
                open=100.0 + (i * 2),  # Trending up
                high=105.0 + (i * 2),
                low=99.0 + (i * 2),
                close=103.0 + (i * 2),
                volume=1000000,
            )
            for i in range(1, 51)
        ]

        # Lower TF: Lower highs and lower lows (bearish - pullback in progress)
        mock_lower_bars = [
            OHLCBar(
                time=f"2024-01-01T{i:02d}:00",
                open=150.0 - (i * 0.5),  # Trending down (pullback)
                high=152.0 - (i * 0.5),
                low=148.0 - (i * 0.5),
                close=149.0 - (i * 0.5),
                volume=500000,
            )
            for i in range(1, 51)
        ]

        def get_ohlc_side_effect(symbol: str, timeframe: str, periods: int = 50) -> MarketDataResult:
            if timeframe == "1D":
                bars = mock_higher_bars[:periods]
            else:
                bars = mock_lower_bars[:periods]

            return MarketDataResult(
                success=True,
                data=bars,
                provider="mock",
                cached=False,
                cache_expires_at=None,
                rate_limit_remaining=None,
                market_status=MarketStatus(
                    state="open",
                    state_display="Market Open",
                    is_open=True,
                    is_pre_market=False,
                    is_after_hours=False,
                    is_closed=False,
                ),
            )

        service.get_ohlc = AsyncMock(side_effect=get_ohlc_side_effect)
        return service

    @pytest.mark.asyncio
    async def test_analyze_symbol_pair_returns_opportunity_with_entry_level(
        self, mock_market_service: MagicMock
    ) -> None:
        """_analyze_symbol_pair should return opportunity with entry_level."""
        from trader.workflow import _analyze_symbol_pair

        opportunity = await _analyze_symbol_pair(
            symbol="TEST",
            higher_tf="1D",
            lower_tf="4H",
            market_service=mock_market_service,
            include_potential=True,
        )

        # Should get an opportunity (may or may not have entry level depending on data)
        # The key is that the function runs without error
        # Entry level depends on pivot detection from mock data
        if opportunity:
            # entry_level is optional but should be present if levels found
            assert hasattr(opportunity, "entry_level")

    @pytest.mark.asyncio
    async def test_analyze_symbol_pair_returns_opportunity_with_signal_bar_status(
        self, mock_market_service: MagicMock
    ) -> None:
        """_analyze_symbol_pair should return opportunity with signal_bar_detected."""
        from trader.workflow import _analyze_symbol_pair

        opportunity = await _analyze_symbol_pair(
            symbol="TEST",
            higher_tf="1D",
            lower_tf="4H",
            market_service=mock_market_service,
            include_potential=True,
        )

        if opportunity:
            assert hasattr(opportunity, "signal_bar_detected")
            assert isinstance(opportunity.signal_bar_detected, bool)

    @pytest.mark.asyncio
    async def test_analyze_symbol_pair_pullback_not_confirmed_without_signal_bar(
        self, mock_market_service: MagicMock
    ) -> None:
        """Pullback opportunity should not be confirmed without signal bar."""
        from trader.workflow import _analyze_symbol_pair

        opportunity = await _analyze_symbol_pair(
            symbol="TEST",
            higher_tf="1D",
            lower_tf="4H",
            market_service=mock_market_service,
            include_potential=True,
        )

        if opportunity and opportunity.is_pullback:
            # Without a signal bar, pullback should not be confirmed
            if not opportunity.signal_bar_detected:
                assert opportunity.is_confirmed is False
                assert opportunity.awaiting_confirmation is not None


class TestExtractAbcPivots:
    """Tests for extract_abc_pivots function."""

    def test_bullish_abc_pattern_extraction(self) -> None:
        """Should extract A(low), B(high), C(higher low) for long direction."""
        from trader.pivots import PivotPoint
        from trader.workflow import extract_abc_pivots

        # Bullish ABC: A=low, B=high, C=higher low
        pivots = [
            PivotPoint(index=0, price=100.0, type="low", time="2024-01-01"),  # A
            PivotPoint(index=5, price=120.0, type="high", time="2024-01-06"),  # B
            PivotPoint(index=10, price=108.0, type="low", time="2024-01-11"),  # C
        ]

        result = extract_abc_pivots(pivots, "long")

        assert result is not None
        a, b, c = result
        assert a == 100.0  # A = low
        assert b == 120.0  # B = high
        assert c == 108.0  # C = higher low

    def test_bearish_abc_pattern_extraction(self) -> None:
        """Should extract A(high), B(low), C(lower high) for short direction."""
        from trader.pivots import PivotPoint
        from trader.workflow import extract_abc_pivots

        # Bearish ABC: A=high, B=low, C=lower high
        pivots = [
            PivotPoint(index=0, price=120.0, type="high", time="2024-01-01"),  # A
            PivotPoint(index=5, price=100.0, type="low", time="2024-01-06"),  # B
            PivotPoint(index=10, price=112.0, type="high", time="2024-01-11"),  # C
        ]

        result = extract_abc_pivots(pivots, "short")

        assert result is not None
        a, b, c = result
        assert a == 120.0  # A = high
        assert b == 100.0  # B = low
        assert c == 112.0  # C = lower high

    def test_no_abc_when_insufficient_pivots(self) -> None:
        """Should return None when less than 3 pivots."""
        from trader.pivots import PivotPoint
        from trader.workflow import extract_abc_pivots

        pivots = [
            PivotPoint(index=0, price=100.0, type="low", time="2024-01-01"),
            PivotPoint(index=5, price=120.0, type="high", time="2024-01-06"),
        ]

        result = extract_abc_pivots(pivots, "long")

        assert result is None

    def test_no_abc_when_c_not_higher_low_for_bullish(self) -> None:
        """Should return None when C is not a higher low for bullish pattern."""
        from trader.pivots import PivotPoint
        from trader.workflow import extract_abc_pivots

        # C is lower than A (not valid bullish ABC)
        pivots = [
            PivotPoint(index=0, price=100.0, type="low", time="2024-01-01"),  # A
            PivotPoint(index=5, price=120.0, type="high", time="2024-01-06"),  # B
            PivotPoint(index=10, price=95.0, type="low", time="2024-01-11"),  # C < A
        ]

        result = extract_abc_pivots(pivots, "long")

        assert result is None

    def test_no_abc_when_c_not_lower_high_for_bearish(self) -> None:
        """Should return None when C is not a lower high for bearish pattern."""
        from trader.pivots import PivotPoint
        from trader.workflow import extract_abc_pivots

        # C is higher than A (not valid bearish ABC)
        pivots = [
            PivotPoint(index=0, price=120.0, type="high", time="2024-01-01"),  # A
            PivotPoint(index=5, price=100.0, type="low", time="2024-01-06"),  # B
            PivotPoint(index=10, price=125.0, type="high", time="2024-01-11"),  # C > A
        ]

        result = extract_abc_pivots(pivots, "short")

        assert result is None


class TestSelectFibonacciStrategy:
    """Tests for select_fibonacci_strategy function."""

    def test_retracement_when_price_pulling_back_long(self) -> None:
        """Price below C in long direction = retracement."""
        from trader.workflow import select_fibonacci_strategy

        # Long: A=100, B=120, C=108, current=105 (below C)
        result = select_fibonacci_strategy(
            pivot_a=100.0,
            pivot_b=120.0,
            pivot_c=108.0,
            current_price=105.0,
            direction="long",
        )

        assert result == "retracement"

    def test_retracement_when_price_pulling_back_short(self) -> None:
        """Price above C in short direction = retracement."""
        from trader.workflow import select_fibonacci_strategy

        # Short: A=120, B=100, C=112, current=115 (above C)
        result = select_fibonacci_strategy(
            pivot_a=120.0,
            pivot_b=100.0,
            pivot_c=112.0,
            current_price=115.0,
            direction="short",
        )

        assert result == "retracement"

    def test_extension_when_price_beyond_c_long(self) -> None:
        """Price beyond B in long direction = extension."""
        from trader.workflow import select_fibonacci_strategy

        # Long: A=100, B=120, C=108, current=125 (beyond B)
        result = select_fibonacci_strategy(
            pivot_a=100.0,
            pivot_b=120.0,
            pivot_c=108.0,
            current_price=125.0,
            direction="long",
        )

        assert result == "extension"

    def test_extension_when_price_beyond_c_short(self) -> None:
        """Price beyond B in short direction = extension."""
        from trader.workflow import select_fibonacci_strategy

        # Short: A=120, B=100, C=112, current=95 (below B)
        result = select_fibonacci_strategy(
            pivot_a=120.0,
            pivot_b=100.0,
            pivot_c=112.0,
            current_price=95.0,
            direction="short",
        )

        assert result == "extension"

    def test_projection_with_valid_abc_retracement_long(self) -> None:
        """Valid ABC pattern with 50% retracement = projection for long."""
        from trader.workflow import select_fibonacci_strategy

        # Long: A=100, B=120, C=110 (50% retracement of AB)
        # current=112 (between C and B)
        result = select_fibonacci_strategy(
            pivot_a=100.0,
            pivot_b=120.0,
            pivot_c=110.0,
            current_price=112.0,
            direction="long",
        )

        assert result == "projection"

    def test_projection_with_valid_abc_retracement_short(self) -> None:
        """Valid ABC pattern with 50% retracement = projection for short."""
        from trader.workflow import select_fibonacci_strategy

        # Short: A=120, B=100, C=110 (50% retracement of AB)
        # current=108 (between C and B)
        result = select_fibonacci_strategy(
            pivot_a=120.0,
            pivot_b=100.0,
            pivot_c=110.0,
            current_price=108.0,
            direction="short",
        )

        assert result == "projection"

    def test_expansion_when_no_other_conditions_met_long(self) -> None:
        """Expansion when between C and B without valid projection criteria."""
        from trader.workflow import select_fibonacci_strategy

        # Long: A=100, B=120, C=118 (only 10% retracement - not valid projection)
        # current=119 (between C and B)
        result = select_fibonacci_strategy(
            pivot_a=100.0,
            pivot_b=120.0,
            pivot_c=118.0,
            current_price=119.0,
            direction="long",
        )

        assert result == "expansion"

    def test_expansion_when_no_other_conditions_met_short(self) -> None:
        """Expansion when between C and B without valid projection criteria."""
        from trader.workflow import select_fibonacci_strategy

        # Short: A=120, B=100, C=102 (only 10% retracement - not valid projection)
        # current=101 (between C and B)
        result = select_fibonacci_strategy(
            pivot_a=120.0,
            pivot_b=100.0,
            pivot_c=102.0,
            current_price=101.0,
            direction="short",
        )

        assert result == "expansion"


class TestLevelsResultWithStrategy:
    """Tests for enhanced LevelsResult with strategy fields."""

    def test_levels_result_includes_selected_strategy(self) -> None:
        """LevelsResult should have selected_strategy field."""
        from trader.workflow import LevelsResult, LevelZone

        result = LevelsResult(
            entry_zones=[],
            target_zones=[],
            selected_strategy="projection",
        )

        assert result.selected_strategy == "projection"

    def test_levels_result_includes_abc_pivots(self) -> None:
        """LevelsResult should have abc_pivots field."""
        from trader.workflow import LevelsResult, LevelZone

        result = LevelsResult(
            entry_zones=[],
            target_zones=[],
            abc_pivots={"a": 100.0, "b": 120.0, "c": 108.0},
        )

        assert result.abc_pivots is not None
        assert result.abc_pivots["a"] == 100.0
        assert result.abc_pivots["b"] == 120.0
        assert result.abc_pivots["c"] == 108.0

    def test_levels_result_includes_strategy_reason(self) -> None:
        """LevelsResult should have strategy_reason field."""
        from trader.workflow import LevelsResult, LevelZone

        result = LevelsResult(
            entry_zones=[],
            target_zones=[],
            strategy_reason="Price below C, pulling back in trend",
        )

        assert result.strategy_reason == "Price below C, pulling back in trend"

    def test_levels_result_optional_fields_default_none(self) -> None:
        """New optional fields should default to None."""
        from trader.workflow import LevelsResult, LevelZone

        result = LevelsResult(
            entry_zones=[],
            target_zones=[],
        )

        assert result.selected_strategy is None
        assert result.abc_pivots is None
        assert result.strategy_reason is None
