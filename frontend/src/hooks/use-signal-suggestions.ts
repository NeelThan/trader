"use client";

/**
 * Hook for generating trade signal suggestions based on trend alignment.
 *
 * Logic:
 * - Higher TF Bullish + Lower TF Bearish = GO LONG (buy the dip)
 * - Higher TF Bearish + Lower TF Bullish = GO SHORT (sell the rally)
 * - Same direction = WAIT for pullback
 *
 * Uses timeframe pairs from chart-constants for analysis.
 */

import { useMemo } from "react";
import type { Timeframe } from "@/lib/chart-constants";
import { TIMEFRAME_PAIR_PRESETS } from "@/lib/chart-constants";
import type { TimeframeTrend, TrendDirection, OverallAlignment } from "./use-trend-alignment";

export type SignalType = "LONG" | "SHORT" | "WAIT";

export type SignalSuggestion = {
  id: string;
  type: SignalType;
  higherTF: Timeframe;
  lowerTF: Timeframe;
  pairName: string;
  tradingStyle: string;
  description: string;
  reasoning: string;
  confidence: number; // 0-100
  entryZone: "support" | "resistance" | "range";
  isActive: boolean; // Based on current market conditions
};

export type SignalFilters = {
  showLong: boolean;
  showShort: boolean;
  showWait: boolean;
};

export type UseSignalSuggestionsOptions = {
  trends: TimeframeTrend[];
  overall: OverallAlignment;
  filters: SignalFilters;
};

export type UseSignalSuggestionsReturn = {
  signals: SignalSuggestion[];
  activeSignals: SignalSuggestion[];
  longCount: number;
  shortCount: number;
  waitCount: number;
};

/**
 * Get trend direction from TimeframeTrend
 */
function getTrendDirection(trends: TimeframeTrend[], tf: Timeframe): TrendDirection | null {
  const trend = trends.find((t) => t.timeframe === tf);
  if (!trend || trend.isLoading || trend.error) return null;
  return trend.trend;
}

/**
 * Calculate confidence based on both timeframe trends
 */
function calculateConfidence(
  higherTrend: TimeframeTrend | undefined,
  lowerTrend: TimeframeTrend | undefined
): number {
  if (!higherTrend || !lowerTrend) return 0;

  // Average of both confidences, weighted toward higher TF
  const higherWeight = 0.6;
  const lowerWeight = 0.4;

  return Math.round(
    higherTrend.confidence * higherWeight +
    lowerTrend.confidence * lowerWeight
  );
}

/**
 * Generate signal description based on type and timeframes
 */
function generateDescription(
  type: SignalType,
  higherTF: Timeframe,
  lowerTF: Timeframe,
  higherTrend: TrendDirection,
  lowerTrend: TrendDirection
): { description: string; reasoning: string } {
  switch (type) {
    case "LONG":
      return {
        description: `Buy pullback on ${lowerTF}`,
        reasoning: `${higherTF} is ${higherTrend}, ${lowerTF} showing ${lowerTrend} pullback. Look for support levels.`,
      };
    case "SHORT":
      return {
        description: `Sell rally on ${lowerTF}`,
        reasoning: `${higherTF} is ${higherTrend}, ${lowerTF} showing ${lowerTrend} rally. Look for resistance levels.`,
      };
    case "WAIT":
      return {
        description: `Wait for pullback on ${lowerTF}`,
        reasoning: `Both ${higherTF} and ${lowerTF} are ${higherTrend}. Wait for counter-trend move.`,
      };
  }
}

/**
 * Hook for generating signal suggestions based on trend alignment.
 */
export function useSignalSuggestions({
  trends,
  overall,
  filters,
}: UseSignalSuggestionsOptions): UseSignalSuggestionsReturn {
  const signals = useMemo<SignalSuggestion[]>(() => {
    if (trends.length === 0) return [];

    const result: SignalSuggestion[] = [];

    // Analyze each timeframe pair
    for (const pair of TIMEFRAME_PAIR_PRESETS) {
      const higherTrend = getTrendDirection(trends, pair.higherTF);
      const lowerTrend = getTrendDirection(trends, pair.lowerTF);

      // Skip if we don't have data for both timeframes
      if (!higherTrend || !lowerTrend) continue;

      const higherTrendData = trends.find((t) => t.timeframe === pair.higherTF);
      const lowerTrendData = trends.find((t) => t.timeframe === pair.lowerTF);

      let signalType: SignalType;
      let entryZone: "support" | "resistance" | "range";
      let isActive = false;

      // Determine signal based on trend alignment
      if (higherTrend === "bullish" && lowerTrend === "bearish") {
        // Higher TF up, lower TF pulling back = BUY opportunity
        signalType = "LONG";
        entryZone = "support";
        isActive = true;
      } else if (higherTrend === "bearish" && lowerTrend === "bullish") {
        // Higher TF down, lower TF rallying = SELL opportunity
        signalType = "SHORT";
        entryZone = "resistance";
        isActive = true;
      } else if (higherTrend === "bullish" && lowerTrend === "bullish") {
        // Both up = wait for pullback to go long
        signalType = "WAIT";
        entryZone = "support";
        isActive = false;
      } else if (higherTrend === "bearish" && lowerTrend === "bearish") {
        // Both down = wait for rally to go short
        signalType = "WAIT";
        entryZone = "resistance";
        isActive = false;
      } else {
        // Ranging scenarios
        signalType = "WAIT";
        entryZone = "range";
        isActive = false;
      }

      const { description, reasoning } = generateDescription(
        signalType,
        pair.higherTF,
        pair.lowerTF,
        higherTrend,
        lowerTrend
      );

      result.push({
        id: pair.id,
        type: signalType,
        higherTF: pair.higherTF,
        lowerTF: pair.lowerTF,
        pairName: pair.name,
        tradingStyle: pair.tradingStyle,
        description,
        reasoning,
        confidence: calculateConfidence(higherTrendData, lowerTrendData),
        entryZone,
        isActive,
      });
    }

    return result;
  }, [trends]);

  // Filter signals based on user preferences
  const activeSignals = useMemo(() => {
    return signals.filter((signal) => {
      if (signal.type === "LONG" && !filters.showLong) return false;
      if (signal.type === "SHORT" && !filters.showShort) return false;
      if (signal.type === "WAIT" && !filters.showWait) return false;
      return true;
    });
  }, [signals, filters]);

  // Count by type
  const longCount = signals.filter((s) => s.type === "LONG").length;
  const shortCount = signals.filter((s) => s.type === "SHORT").length;
  const waitCount = signals.filter((s) => s.type === "WAIT").length;

  return {
    signals,
    activeSignals,
    longCount,
    shortCount,
    waitCount,
  };
}
