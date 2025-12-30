"use client";

/**
 * Hook for multi-timeframe trend analysis.
 *
 * Implements the SignalPro multi-timeframe trend alignment strategy:
 * - Higher TF UP + Lower TF DOWN = GO LONG (buy the dip)
 * - Higher TF DOWN + Lower TF UP = GO SHORT (sell the rally)
 * - Both same direction = STAND ASIDE (wait for pullback)
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { OHLCData } from "@/components/trading";
import {
  Timeframe,
  MarketSymbol,
  TimeframePair,
  TimeframeTrend,
  TrendAlignment,
  TrendDirection,
  TradeAction,
  TIMEFRAME_PAIR_PRESETS,
} from "@/lib/chart-constants";
import { detectPivotPoints } from "@/lib/market-utils";

export type UseTrendAnalysisOptions = {
  symbol: MarketSymbol;
  pairs?: TimeframePair[];
  lookback?: number; // Pivot detection lookback
  enabled?: boolean;
};

export type UseTrendAnalysisReturn = {
  alignments: TrendAlignment[];
  isLoading: boolean;
  error: string | null;
  selectedPair: TimeframePair | null;
  setSelectedPair: (pair: TimeframePair) => void;
  refresh: () => void;
};

/**
 * Detect trend direction from OHLC data using pivot analysis.
 * UP: Higher highs and higher lows
 * DOWN: Lower highs and lower lows
 * NEUTRAL: Mixed or insufficient data
 */
function detectTrendDirection(
  data: OHLCData[],
  timeframe: Timeframe,
  lookback: number = 5
): TimeframeTrend {
  if (data.length < lookback * 2 + 1) {
    return {
      timeframe,
      direction: "NEUTRAL",
      strength: 0,
      pivotHigh: null,
      pivotLow: null,
    };
  }

  const pivots = detectPivotPoints(data, lookback);
  const recentPivots = pivots.slice(-6); // Last 6 pivots for analysis

  const highs = recentPivots.filter((p) => p.type === "high").map((p) => p.price);
  const lows = recentPivots.filter((p) => p.type === "low").map((p) => p.price);

  // Need at least 2 of each type to determine trend
  if (highs.length < 2 || lows.length < 2) {
    return {
      timeframe,
      direction: "NEUTRAL",
      strength: 0.3,
      pivotHigh: highs[highs.length - 1] ?? null,
      pivotLow: lows[lows.length - 1] ?? null,
    };
  }

  // Check for higher highs (HH) and higher lows (HL)
  const lastTwoHighs = highs.slice(-2);
  const lastTwoLows = lows.slice(-2);

  const higherHighs = lastTwoHighs[1] > lastTwoHighs[0];
  const higherLows = lastTwoLows[1] > lastTwoLows[0];
  const lowerHighs = lastTwoHighs[1] < lastTwoHighs[0];
  const lowerLows = lastTwoLows[1] < lastTwoLows[0];

  let direction: TrendDirection = "NEUTRAL";
  let strength = 0.5;

  if (higherHighs && higherLows) {
    // Clear uptrend: HH + HL
    direction = "UP";
    strength = 0.9;
  } else if (lowerHighs && lowerLows) {
    // Clear downtrend: LH + LL
    direction = "DOWN";
    strength = 0.9;
  } else if (higherHighs || higherLows) {
    // Weak uptrend: Only one condition met
    direction = "UP";
    strength = 0.6;
  } else if (lowerHighs || lowerLows) {
    // Weak downtrend: Only one condition met
    direction = "DOWN";
    strength = 0.6;
  }

  // Also check recent price action relative to pivots
  const currentPrice = data[data.length - 1].close;
  const latestHigh = highs[highs.length - 1];
  const latestLow = lows[lows.length - 1];

  // If price is near new highs, bias toward uptrend
  if (latestHigh && currentPrice > latestHigh * 0.995) {
    if (direction === "NEUTRAL") direction = "UP";
    strength = Math.min(strength + 0.1, 1.0);
  }
  // If price is near new lows, bias toward downtrend
  if (latestLow && currentPrice < latestLow * 1.005) {
    if (direction === "NEUTRAL") direction = "DOWN";
    strength = Math.min(strength + 0.1, 1.0);
  }

  return {
    timeframe,
    direction,
    strength,
    pivotHigh: latestHigh ?? null,
    pivotLow: latestLow ?? null,
  };
}

/**
 * Determine trade action based on trend alignment.
 */
function determineTradeAction(
  higherTrend: TrendDirection,
  lowerTrend: TrendDirection
): TradeAction {
  // Higher TF UP + Lower TF DOWN = Buy the dip
  if (higherTrend === "UP" && lowerTrend === "DOWN") {
    return "GO_LONG";
  }

  // Higher TF DOWN + Lower TF UP = Sell the rally
  if (higherTrend === "DOWN" && lowerTrend === "UP") {
    return "GO_SHORT";
  }

  // Both same direction or neutral = Stand aside
  return "STAND_ASIDE";
}

/**
 * Calculate confidence level for the alignment signal.
 */
function calculateConfidence(
  higherTrend: TimeframeTrend,
  lowerTrend: TimeframeTrend,
  action: TradeAction
): number {
  if (action === "STAND_ASIDE") {
    return 0.3; // Low confidence - no trade signal
  }

  // Average of both trend strengths
  const strengthAvg = (higherTrend.strength + lowerTrend.strength) / 2;

  // Bonus for opposite directions (the ideal scenario)
  const oppositeBonus =
    (higherTrend.direction === "UP" && lowerTrend.direction === "DOWN") ||
    (higherTrend.direction === "DOWN" && lowerTrend.direction === "UP")
      ? 0.15
      : 0;

  return Math.min(strengthAvg + oppositeBonus, 1.0);
}

/**
 * Fetch data for a specific timeframe from the Next.js API.
 */
async function fetchTimeframeData(
  symbol: MarketSymbol,
  timeframe: Timeframe
): Promise<OHLCData[]> {
  const response = await fetch(
    `/api/market-data?symbol=${symbol}&timeframe=${timeframe}`
  );

  if (!response.ok) {
    // Don't throw for 404 - just return empty data (e.g., intraday when market closed)
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch ${timeframe} data for ${symbol}`);
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Hook for multi-timeframe trend analysis.
 */
export function useTrendAnalysis({
  symbol,
  pairs = TIMEFRAME_PAIR_PRESETS,
  lookback = 5,
  enabled = true,
}: UseTrendAnalysisOptions): UseTrendAnalysisReturn {
  const [dataCache, setDataCache] = useState<Map<Timeframe, OHLCData[]>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<TimeframePair | null>(
    pairs[0] || null
  );
  const [refreshKey, setRefreshKey] = useState(0);

  // Get unique timeframes needed for all pairs
  const uniqueTimeframes = useMemo(() => {
    const tfs = new Set<Timeframe>();
    pairs.forEach((pair) => {
      tfs.add(pair.higherTF);
      tfs.add(pair.lowerTF);
    });
    return Array.from(tfs);
  }, [pairs]);

  // Fetch data for all unique timeframes
  useEffect(() => {
    if (!enabled || uniqueTimeframes.length === 0) return;

    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- Loading states for async data fetch */
    setIsLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          uniqueTimeframes.map(async (tf) => {
            const data = await fetchTimeframeData(symbol, tf);
            return { tf, data };
          })
        );

        if (cancelled) return;

        const newCache = new Map<Timeframe, OHLCData[]>();
        results.forEach(({ tf, data }) => {
          newCache.set(tf, data);
        });
        setDataCache(newCache);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setIsLoading(false);
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [symbol, uniqueTimeframes, enabled, refreshKey]);

  // Calculate alignments for all pairs
  const alignments = useMemo(() => {
    if (dataCache.size === 0) return [];

    return pairs.map((pair) => {
      const higherData = dataCache.get(pair.higherTF) || [];
      const lowerData = dataCache.get(pair.lowerTF) || [];

      const higherTrend = detectTrendDirection(higherData, pair.higherTF, lookback);
      const lowerTrend = detectTrendDirection(lowerData, pair.lowerTF, lookback);
      const action = determineTradeAction(higherTrend.direction, lowerTrend.direction);
      const confidence = calculateConfidence(higherTrend, lowerTrend, action);

      return {
        pair,
        higherTrend,
        lowerTrend,
        action,
        confidence,
      };
    });
  }, [dataCache, pairs, lookback]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    alignments,
    isLoading,
    error,
    selectedPair,
    setSelectedPair,
    refresh,
  };
}
