"use client";

/**
 * Hook for generating trade signal suggestions based on trend alignment.
 *
 * ADR Compliant: All business logic is handled server-side via /workflow/signal-suggestions.
 * This hook is a pure presentation layer that fetches and transforms data.
 *
 * Logic (handled by backend):
 * - Higher TF Bullish + Lower TF Bearish = GO LONG (buy the dip)
 * - Higher TF Bearish + Lower TF Bullish = GO SHORT (sell the rally)
 * - Same direction = WAIT for pullback
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Timeframe, MarketSymbol } from "@/lib/chart-constants";

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
  symbol: MarketSymbol;
  filters: SignalFilters;
  enabled?: boolean;
};

export type UseSignalSuggestionsReturn = {
  signals: SignalSuggestion[];
  activeSignals: SignalSuggestion[];
  longCount: number;
  shortCount: number;
  waitCount: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

const API_BASE = "/api/trader";

/**
 * Backend API response types
 */
interface BackendSignalSuggestion {
  id: string;
  type: "LONG" | "SHORT" | "WAIT";
  higher_tf: string;
  lower_tf: string;
  pair_name: string;
  trading_style: string;
  description: string;
  reasoning: string;
  confidence: number;
  entry_zone: "support" | "resistance" | "range";
  is_active: boolean;
}

interface BackendSignalSuggestionsResult {
  signals: BackendSignalSuggestion[];
  long_count: number;
  short_count: number;
  wait_count: number;
}

/**
 * Convert backend response to frontend format
 */
function convertBackendToFrontend(
  backend: BackendSignalSuggestionsResult
): {
  signals: SignalSuggestion[];
  longCount: number;
  shortCount: number;
  waitCount: number;
} {
  const signals: SignalSuggestion[] = backend.signals.map((s) => ({
    id: s.id,
    type: s.type,
    higherTF: s.higher_tf as Timeframe,
    lowerTF: s.lower_tf as Timeframe,
    pairName: s.pair_name,
    tradingStyle: s.trading_style,
    description: s.description,
    reasoning: s.reasoning,
    confidence: s.confidence,
    entryZone: s.entry_zone,
    isActive: s.is_active,
  }));

  return {
    signals,
    longCount: backend.long_count,
    shortCount: backend.short_count,
    waitCount: backend.wait_count,
  };
}

/**
 * Hook for generating signal suggestions based on trend alignment.
 *
 * ADR Compliant: Calls backend /workflow/signal-suggestions endpoint.
 * All signal generation logic is server-side.
 */
export function useSignalSuggestions({
  symbol,
  filters,
  enabled = true,
}: UseSignalSuggestionsOptions): UseSignalSuggestionsReturn {
  const [signals, setSignals] = useState<SignalSuggestion[]>([]);
  const [longCount, setLongCount] = useState(0);
  const [shortCount, setShortCount] = useState(0);
  const [waitCount, setWaitCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Fetch signal suggestions from backend API
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    async function fetchSignalSuggestions() {
      try {
        const params = new URLSearchParams({ symbol });

        const response = await fetch(
          `${API_BASE}/workflow/signal-suggestions?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          const errorMessage = response.status === 503
            ? "Backend unavailable - start the backend server"
            : `API error: ${response.status}`;
          setError(errorMessage);
          setSignals([]);
          setLongCount(0);
          setShortCount(0);
          setWaitCount(0);
          setIsLoading(false);
          return;
        }

        const data: BackendSignalSuggestionsResult = await response.json();
        const converted = convertBackendToFrontend(data);

        setSignals(converted.signals);
        setLongCount(converted.longCount);
        setShortCount(converted.shortCount);
        setWaitCount(converted.waitCount);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }

        const errorMessage = (err as Error).message || "Failed to fetch signals";
        setError(errorMessage);
        setSignals([]);
        setLongCount(0);
        setShortCount(0);
        setWaitCount(0);
        setIsLoading(false);
      }
    }

    fetchSignalSuggestions();

    return () => {
      controller.abort();
    };
  }, [symbol, enabled, refreshKey]);

  // Filter signals based on user preferences
  const activeSignals = useMemo(() => {
    return signals.filter((signal) => {
      if (signal.type === "LONG" && !filters.showLong) return false;
      if (signal.type === "SHORT" && !filters.showShort) return false;
      if (signal.type === "WAIT" && !filters.showWait) return false;
      return true;
    });
  }, [signals, filters]);

  return {
    signals,
    activeSignals,
    longCount,
    shortCount,
    waitCount,
    isLoading,
    error,
    refresh,
  };
}
