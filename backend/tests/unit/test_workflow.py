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
