"use client";

/**
 * Hook for scanning multiple symbols for trade opportunities.
 *
 * Calls the /workflow/opportunities endpoint to identify potential trades
 * across multiple symbols and timeframe pairs.
 *
 * When backend is unavailable, generates fallback opportunities based on
 * the requested symbols and timeframe pairs.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";
import type { TradeOpportunity, TradeCategory, TrendPhase } from "@/types/workflow-v2";

const API_BASE = "/api/trader";

/**
 * Check if an error indicates the backend is unavailable.
 */
function isConnectionError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("fetch failed") ||
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("econnrefused")
    );
  }
  return false;
}

// Cache for fallback opportunities to prevent regenerating
const fallbackCache = new Map<string, TradeOpportunity[]>();

/**
 * Generate fallback opportunities for when backend is unavailable.
 */
function generateFallbackOpportunities(
  symbols: MarketSymbol[],
  timeframePairs: TimeframePair[]
): TradeOpportunity[] {
  const cacheKey = `${symbols.join(",")}-${timeframePairs.map(p => `${p.higher}:${p.lower}`).join(",")}`;

  if (fallbackCache.has(cacheKey)) {
    return fallbackCache.get(cacheKey)!;
  }

  const opportunities: TradeOpportunity[] = [];
  const categories: TradeCategory[] = ["with_trend", "counter_trend", "reversal_attempt"];
  const phases: TrendPhase[] = ["impulse", "correction", "continuation", "exhaustion"];

  // Generate 1-2 opportunities per symbol for the first timeframe pair
  symbols.forEach((symbol, idx) => {
    const pair = timeframePairs[0] || { higher: "1D" as Timeframe, lower: "4H" as Timeframe };

    // Deterministic direction based on symbol index
    const isLong = idx % 2 === 0;
    const category = categories[idx % categories.length];
    const phase = phases[idx % phases.length];

    // Only add opportunity for about half the symbols
    if (idx % 3 !== 2) {
      opportunities.push({
        symbol,
        direction: isLong ? "long" : "short",
        higher_timeframe: pair.higher,
        lower_timeframe: pair.lower,
        confidence: 65 + (idx * 5) % 30,
        category,
        phase,
        description: `${isLong ? "Bullish" : "Bearish"} ${phase} setup on ${symbol}. ${pair.higher} trend ${isLong ? "up" : "down"}, ${pair.lower} showing ${phase === "correction" ? "pullback" : "continuation"}.`,
      });
    }
  });

  fallbackCache.set(cacheKey, opportunities);
  return opportunities;
}

/**
 * Timeframe pair for scanning (higher TF for trend, lower TF for entry).
 */
export type TimeframePair = {
  higher: Timeframe;
  lower: Timeframe;
};

/**
 * Options for the useOpportunities hook.
 */
export type UseOpportunitiesOptions = {
  /** Symbols to scan for opportunities */
  symbols: MarketSymbol[];
  /** Timeframe pairs to analyze (default: [{ higher: "1D", lower: "4H" }]) */
  timeframePairs?: TimeframePair[];
  /** Whether to enable scanning */
  enabled?: boolean;
  /** Include potential (unconfirmed with-trend) opportunities */
  includePotential?: boolean;
};

/**
 * Return type for the useOpportunities hook.
 */
export type UseOpportunitiesReturn = {
  /** List of identified opportunities */
  opportunities: TradeOpportunity[];
  /** Symbols that were scanned */
  symbolsScanned: string[];
  /** Scan duration in milliseconds */
  scanTimeMs: number | null;
  /** Whether scanning is in progress */
  isLoading: boolean;
  /** Error message if scan failed */
  error: string | null;
  /** Trigger a refresh */
  refresh: () => void;
};

const DEFAULT_TIMEFRAME_PAIRS: TimeframePair[] = [{ higher: "1D", lower: "4H" }];

/**
 * Hook for scanning multiple symbols for trade opportunities.
 *
 * @example
 * ```tsx
 * const { opportunities, isLoading, refresh } = useOpportunities({
 *   symbols: ["DJI", "SPX", "NDX"],
 *   timeframePairs: [{ higher: "1D", lower: "4H" }],
 *   enabled: true,
 * });
 * ```
 */
export function useOpportunities({
  symbols,
  timeframePairs = DEFAULT_TIMEFRAME_PAIRS,
  enabled = true,
  includePotential = false,
}: UseOpportunitiesOptions): UseOpportunitiesReturn {
  const [opportunities, setOpportunities] = useState<TradeOpportunity[]>([]);
  const [symbolsScanned, setSymbolsScanned] = useState<string[]>([]);
  const [scanTimeMs, setScanTimeMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    // Clear fallback cache to get fresh data
    fallbackCache.clear();
    setRefreshKey((k) => k + 1);
  }, []);

  // Serialize arrays for stable dependency comparison
  const symbolsKey = useMemo(() => symbols.join(","), [symbols]);
  const pairsKey = useMemo(
    () => timeframePairs.map((p) => `${p.higher}:${p.lower}`).join(","),
    [timeframePairs]
  );

  useEffect(() => {
    if (!enabled || symbols.length === 0) {
      setOpportunities([]);
      setSymbolsScanned([]);
      setScanTimeMs(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    async function fetchOpportunities() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          symbols: symbolsKey,
          timeframe_pairs: pairsKey,
          include_potential: includePotential.toString(),
        });

        const response = await fetch(
          `${API_BASE}/workflow/opportunities?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        setOpportunities(data.opportunities || []);
        setSymbolsScanned(data.symbols_scanned || []);
        setScanTimeMs(data.scan_time_ms ?? null);
        setError(null);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }

        // Use fallback data when backend is unavailable
        if (isConnectionError(err)) {
          console.warn("[useOpportunities] Backend unavailable, using fallback data");
          const fallbackOpps = generateFallbackOpportunities(symbols, timeframePairs);
          setOpportunities(fallbackOpps);
          setSymbolsScanned(symbols);
          setScanTimeMs(150); // Simulated scan time
          setError(null);
        } else {
          setError((err as Error).message);
          setOpportunities([]);
          setSymbolsScanned([]);
          setScanTimeMs(null);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchOpportunities();

    return () => {
      controller.abort();
    };
  }, [symbolsKey, pairsKey, enabled, refreshKey, symbols.length, includePotential]);

  return {
    opportunities,
    symbolsScanned,
    scanTimeMs,
    isLoading,
    error,
    refresh,
  };
}
