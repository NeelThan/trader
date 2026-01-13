/**
 * Trade Discovery Hook
 *
 * Fetches and aggregates trade opportunities across ALL timeframes.
 * Not locked to a trading style - shows everything available.
 */

import { useMemo } from "react";
import { useTrendAlignment, type TimeframeTrend, type TrendDirection } from "./use-trend-alignment";
import { useSignalSuggestions, type SignalSuggestion } from "./use-signal-suggestions";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";
import type { TradeCategory, TrendPhase } from "@/types/workflow-v2";

/**
 * A discovered trade opportunity
 */
export type TradeOpportunity = {
  /** Unique identifier */
  id: string;
  /** Symbol being traded */
  symbol: MarketSymbol;
  /** Higher timeframe for trend */
  higherTimeframe: Timeframe;
  /** Lower timeframe for entry */
  lowerTimeframe: Timeframe;
  /** Trade direction */
  direction: "long" | "short";
  /** Confidence score 0-100 */
  confidence: number;
  /** Trading style category */
  tradingStyle: "position" | "swing" | "intraday";
  /** Brief description */
  description: string;
  /** Why this opportunity exists */
  reasoning: string;
  /** Whether setup is currently active */
  isActive: boolean;
  /** Entry zone type */
  entryZone: "support" | "resistance" | "range";
  /** Raw signal data */
  signal: SignalSuggestion;
  /** Trend data for higher TF */
  higherTrend: TimeframeTrend | undefined;
  /** Trend data for lower TF */
  lowerTrend: TimeframeTrend | undefined;
  /** Trade category for position sizing risk */
  category: TradeCategory;
  /** Current trend phase */
  trendPhase: TrendPhase;
};

export type UseTradeDiscoveryOptions = {
  symbol: MarketSymbol;
};

export type UseTradeDiscoveryResult = {
  /** All discovered opportunities */
  opportunities: TradeOpportunity[];
  /** Active opportunities (ready to trade) */
  activeOpportunities: TradeOpportunity[];
  /** Is loading data */
  isLoading: boolean;
  /** Has any errors */
  hasError: boolean;
  /** Error messages by timeframe */
  errors: { timeframe: Timeframe; error: string }[];
  /** Trend data by timeframe */
  trends: TimeframeTrend[];
  /** Refresh data */
  refresh: () => void;
};

/**
 * Categorize a trade based on trend alignment.
 *
 * - WITH_TREND: Trading with the higher TF trend
 * - COUNTER_TREND: Trading against higher TF at major confluence (high confidence)
 * - REVERSAL_ATTEMPT: Trading against higher TF with low confluence/confidence
 */
export function categorizeTradeFromTrends(
  higherTfTrend: TrendDirection,
  lowerTfTrend: TrendDirection,
  direction: "long" | "short",
  confidence: number
): TradeCategory {
  // Determine if trade aligns with higher TF trend
  const isWithTrend =
    (higherTfTrend === "bullish" && direction === "long") ||
    (higherTfTrend === "bearish" && direction === "short") ||
    higherTfTrend === "ranging"; // Ranging higher TF = no strong bias

  if (isWithTrend) {
    return "with_trend";
  }

  // Trading against the higher TF trend
  // High confidence (>= 70) suggests strong confluence = counter_trend
  // Low confidence (< 70) = reversal_attempt
  if (confidence >= 70) {
    return "counter_trend";
  }

  return "reversal_attempt";
}

/**
 * Detect the current trend phase from indicator data.
 *
 * - IMPULSE: Strong trend with aligned momentum indicators
 * - CORRECTION: Swing trend intact but momentum diverging
 * - EXHAUSTION: Low confidence, momentum against swing
 * - CONTINUATION: Default/neutral state
 */
export function detectTrendPhaseFromTrend(trend: TimeframeTrend): TrendPhase {
  const { confidence, swing, rsi, macd, trend: direction } = trend;

  // Count aligned momentum indicators
  const swingDirection = swing.signal;
  const rsiDirection = rsi.signal;
  const macdDirection = macd.signal;

  // For bullish trend
  if (direction === "bullish") {
    const momentumAligned =
      rsiDirection === "bullish" && macdDirection === "bullish";
    const momentumDiverging =
      rsiDirection === "bearish" || macdDirection === "bearish";

    // High confidence + aligned momentum = impulse
    if (confidence >= 70 && momentumAligned && swingDirection === "bullish") {
      return "impulse";
    }

    // Swing bullish but momentum diverging = correction
    if (swingDirection === "bullish" && momentumDiverging) {
      return "correction";
    }

    // Low confidence with diverging momentum = exhaustion
    if (confidence < 40 && momentumDiverging) {
      return "exhaustion";
    }
  }

  // For bearish trend
  if (direction === "bearish") {
    const momentumAligned =
      rsiDirection === "bearish" && macdDirection === "bearish";
    const momentumDiverging =
      rsiDirection === "bullish" || macdDirection === "bullish";

    // High confidence + aligned momentum = impulse
    if (confidence >= 70 && momentumAligned && swingDirection === "bearish") {
      return "impulse";
    }

    // Swing bearish but momentum diverging = correction
    if (swingDirection === "bearish" && momentumDiverging) {
      return "correction";
    }

    // Low confidence with diverging momentum = exhaustion
    if (confidence < 40 && momentumDiverging) {
      return "exhaustion";
    }
  }

  // Default to continuation
  return "continuation";
}

/**
 * Convert signal suggestion to trade opportunity
 */
function signalToOpportunity(
  signal: SignalSuggestion,
  symbol: MarketSymbol,
  trends: TimeframeTrend[]
): TradeOpportunity | null {
  // Skip wait signals - they're not opportunities
  if (signal.type === "WAIT") return null;

  const higherTrend = trends.find((t) => t.timeframe === signal.higherTF);
  const lowerTrend = trends.find((t) => t.timeframe === signal.lowerTF);

  const direction = signal.type === "LONG" ? "long" : "short";

  // Calculate category from trends
  const category = categorizeTradeFromTrends(
    higherTrend?.trend ?? "ranging",
    lowerTrend?.trend ?? "ranging",
    direction,
    signal.confidence
  );

  // Detect trend phase from the lower TF (entry timeframe)
  const trendPhase = lowerTrend
    ? detectTrendPhaseFromTrend(lowerTrend)
    : "continuation";

  return {
    id: signal.id,
    symbol,
    higherTimeframe: signal.higherTF,
    lowerTimeframe: signal.lowerTF,
    direction,
    confidence: signal.confidence,
    tradingStyle: signal.tradingStyle as "position" | "swing" | "intraday",
    description: signal.description,
    reasoning: signal.reasoning,
    isActive: signal.isActive,
    entryZone: signal.entryZone,
    signal,
    higherTrend,
    lowerTrend,
    category,
    trendPhase,
  };
}

/**
 * Hook to discover trade opportunities across all timeframes
 */
export function useTradeDiscovery({
  symbol,
}: UseTradeDiscoveryOptions): UseTradeDiscoveryResult {
  // Get trend alignment across all timeframes
  const {
    trends,
    overall,
    isLoading: isLoadingTrends,
    refresh,
  } = useTrendAlignment({ symbol, enabled: true });

  // Get signal suggestions based on trends
  const { signals } = useSignalSuggestions({
    trends,
    overall,
    filters: { showLong: true, showShort: true, showWait: false },
  });

  // Convert signals to opportunities
  const opportunities = useMemo(() => {
    return signals
      .map((signal) => signalToOpportunity(signal, symbol, trends))
      .filter((opp): opp is TradeOpportunity => opp !== null)
      .sort((a, b) => {
        // Active first, then by confidence
        if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
        return b.confidence - a.confidence;
      });
  }, [signals, symbol, trends]);

  // Filter to active opportunities only
  const activeOpportunities = useMemo(() => {
    return opportunities.filter((opp) => opp.isActive);
  }, [opportunities]);

  // Collect errors from trends
  const errors = useMemo(() => {
    return trends
      .filter((t) => t.error !== null)
      .map((t) => ({ timeframe: t.timeframe, error: t.error! }));
  }, [trends]);

  const hasError = errors.length > 0;

  return {
    opportunities,
    activeOpportunities,
    isLoading: isLoadingTrends,
    hasError,
    errors,
    trends,
    refresh,
  };
}
