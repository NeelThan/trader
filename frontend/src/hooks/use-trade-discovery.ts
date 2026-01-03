/**
 * Trade Discovery Hook
 *
 * Fetches and aggregates trade opportunities across ALL timeframes.
 * Not locked to a trading style - shows everything available.
 */

import { useMemo } from "react";
import { useTrendAlignment, type TimeframeTrend } from "./use-trend-alignment";
import { useSignalSuggestions, type SignalSuggestion } from "./use-signal-suggestions";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";

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

  return {
    id: signal.id,
    symbol,
    higherTimeframe: signal.higherTF,
    lowerTimeframe: signal.lowerTF,
    direction: signal.type === "LONG" ? "long" : "short",
    confidence: signal.confidence,
    tradingStyle: signal.tradingStyle as "position" | "swing" | "intraday",
    description: signal.description,
    reasoning: signal.reasoning,
    isActive: signal.isActive,
    entryZone: signal.entryZone,
    signal,
    higherTrend,
    lowerTrend,
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
