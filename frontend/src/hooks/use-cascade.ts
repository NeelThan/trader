"use client";

/**
 * Hook for fetching cascade effect analysis.
 *
 * Detects when trend reversals are "bubbling up" from lower to higher timeframes,
 * enabling bi-directional traders to catch reversals early (Stage 2-3) rather
 * than waiting for full confirmation (Stage 6).
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { MarketSymbol } from "@/lib/chart-constants";
import type { CascadeAnalysis } from "@/types/workflow-v2";

const API_BASE = "/api/trader";

export type UseCascadeOptions = {
  /** Market symbol to analyze */
  symbol: MarketSymbol;
  /** Timeframes to analyze (comma-separated or array) */
  timeframes?: string | string[];
  /** Enable/disable the hook */
  enabled?: boolean;
};

export type UseCascadeReturn = {
  /** Cascade analysis result */
  cascade: CascadeAnalysis | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh the cascade data */
  refresh: () => void;
};

const DEFAULT_TIMEFRAMES_STRING = "1M,1W,1D,4H,1H,15m,5m,3m,1m";

/**
 * Hook for fetching cascade effect analysis from the backend.
 */
export function useCascade({
  symbol,
  timeframes,
  enabled = true,
}: UseCascadeOptions): UseCascadeReturn {
  const [cascade, setCascade] = useState<CascadeAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Stabilize timeframes to a string to avoid infinite re-renders
  const timeframesString = useMemo(() => {
    if (!timeframes) return DEFAULT_TIMEFRAMES_STRING;
    if (Array.isArray(timeframes)) return timeframes.join(",");
    return timeframes;
  }, [timeframes]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setCascade(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    async function fetchCascade() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          symbol,
          timeframes: timeframesString,
        });

        const response = await fetch(
          `${API_BASE}/workflow/cascade?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          if (response.status === 503) {
            throw new Error("Backend unavailable - start the backend server");
          }
          throw new Error(`Failed to fetch cascade: ${response.status}`);
        }

        const data = await response.json();
        setCascade(data);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }

        const message =
          err instanceof TypeError && err.message.includes("fetch")
            ? "Backend unavailable - start the backend server"
            : (err as Error).message;

        setError(message);
        setCascade(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCascade();

    return () => {
      controller.abort();
    };
  }, [symbol, timeframesString, enabled, refreshKey]);

  return {
    cascade,
    isLoading,
    error,
    refresh,
  };
}
