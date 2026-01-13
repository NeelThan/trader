"use client";

/**
 * Hook for scanning multiple symbols for trade opportunities.
 *
 * Calls the /workflow/opportunities endpoint to identify potential trades
 * across multiple symbols and timeframe pairs.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";
import type { TradeOpportunity } from "@/types/workflow-v2";

const API_BASE = "/api/trader";

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
}: UseOpportunitiesOptions): UseOpportunitiesReturn {
  const [opportunities, setOpportunities] = useState<TradeOpportunity[]>([]);
  const [symbolsScanned, setSymbolsScanned] = useState<string[]>([]);
  const [scanTimeMs, setScanTimeMs] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
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
        setError((err as Error).message);
        setOpportunities([]);
        setSymbolsScanned([]);
        setScanTimeMs(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOpportunities();

    return () => {
      controller.abort();
    };
  }, [symbolsKey, pairsKey, enabled, refreshKey, symbols.length]);

  return {
    opportunities,
    symbolsScanned,
    scanTimeMs,
    isLoading,
    error,
    refresh,
  };
}
