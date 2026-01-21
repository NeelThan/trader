/**
 * Trade Discovery Hook
 *
 * Fetches and aggregates trade opportunities across ALL timeframes.
 * Not locked to a trading style - shows everything available.
 *
 * ADR Compliant: Trade categorization is done server-side via /workflow/categorize.
 * Phase detection will be server-side once trend-alignment endpoint is added.
 */

import { useMemo, useState, useEffect } from "react";
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
 * Fetch trade category from backend API
 * ADR Compliant: Categorization logic is server-side
 */
async function fetchTradeCategory(
  higherTfTrend: TrendDirection,
  lowerTfTrend: TrendDirection,
  direction: "long" | "short",
  confidence: number
): Promise<TradeCategory> {
  try {
    const params = new URLSearchParams({
      higher_tf_trend: higherTfTrend,
      lower_tf_trend: lowerTfTrend,
      trade_direction: direction,
      confluence_score: String(confidence),
    });

    const response = await fetch(`/api/trader/workflow/categorize?${params}`);

    if (!response.ok) {
      console.warn("Category API unavailable, using default");
      return "with_trend";
    }

    const data = await response.json();
    return data.category;
  } catch (error) {
    console.warn("Category API error:", error);
    return "with_trend";
  }
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
 * Category is fetched from backend; phase detection will be moved to backend in Phase 2.1
 */
async function signalToOpportunityAsync(
  signal: SignalSuggestion,
  symbol: MarketSymbol,
  trends: TimeframeTrend[]
): Promise<TradeOpportunity | null> {
  // Skip wait signals - they're not opportunities
  if (signal.type === "WAIT") return null;

  const higherTrend = trends.find((t) => t.timeframe === signal.higherTF);
  const lowerTrend = trends.find((t) => t.timeframe === signal.lowerTF);

  const direction = signal.type === "LONG" ? "long" : "short";

  // Fetch category from backend API (ADR compliant)
  const category = await fetchTradeCategory(
    higherTrend?.trend ?? "ranging",
    lowerTrend?.trend ?? "ranging",
    direction,
    signal.confidence
  );

  // Detect trend phase from the lower TF (entry timeframe)
  // TODO: Move to backend in Phase 2.1 (trend-alignment endpoint)
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

  // State for async-fetched opportunities
  const [opportunities, setOpportunities] = useState<TradeOpportunity[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // Fetch categories from backend and build opportunities
  useEffect(() => {
    if (signals.length === 0 || trends.length === 0) {
      setOpportunities([]);
      return;
    }

    let cancelled = false;
    setIsLoadingCategories(true);

    // Convert all signals to opportunities (fetches categories from backend)
    Promise.all(
      signals.map((signal) => signalToOpportunityAsync(signal, symbol, trends))
    )
      .then((results) => {
        if (cancelled) return;

        const validOpportunities = results
          .filter((opp): opp is TradeOpportunity => opp !== null)
          .sort((a, b) => {
            // Active first, then by confidence
            if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
            return b.confidence - a.confidence;
          });

        setOpportunities(validOpportunities);
        setIsLoadingCategories(false);
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn("Error fetching categories:", error);
          setIsLoadingCategories(false);
        }
      });

    return () => {
      cancelled = true;
    };
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
    isLoading: isLoadingTrends || isLoadingCategories,
    hasError,
    errors,
    trends,
    refresh,
  };
}
