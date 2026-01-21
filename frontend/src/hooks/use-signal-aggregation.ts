/**
 * Signal Aggregation Hook
 *
 * ADR Compliant: All business logic is handled server-side via /workflow/signal-aggregation.
 * This hook is a pure presentation layer that fetches and transforms data.
 *
 * Aggregates trading signals from multiple sources:
 * - Trend alignment (higher TF vs lower TF)
 * - Fibonacci level rejections
 * - Confluence zones
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Timeframe, MarketSymbol } from "@/lib/chart-constants";
import type { TradeDirection, FibStrategy } from "@/types/workflow-v2";

const API_BASE = "/api/trader";

/**
 * Signal source type
 */
export type SignalType = "trend_alignment" | "fib_rejection" | "confluence";

/**
 * An aggregated signal from any source
 */
export type AggregatedSignal = {
  /** Unique identifier */
  id: string;
  /** Timeframe where signal was detected */
  timeframe: Timeframe;
  /** Trade direction */
  direction: TradeDirection;
  /** Signal source type */
  type: SignalType;
  /** Confidence score 0-100 */
  confidence: number;
  /** Price level of the signal */
  price: number;
  /** Description of the signal */
  description: string;
  /** Whether this signal is currently actionable */
  isActive: boolean;
  /** When the signal was detected */
  timestamp: string;
  /** Fibonacci level ratio (for fib_rejection) */
  fibLevel?: number;
  /** Fibonacci strategy (for fib_rejection) */
  fibStrategy?: FibStrategy;
  /** Number of confluent levels (for confluence) */
  confluenceCount?: number;
};

/**
 * Filter options
 */
export type SignalFilters = {
  direction?: TradeDirection | null;
  timeframes?: Timeframe[];
  minConfidence?: number;
  activeOnly?: boolean;
  types?: SignalType[];
};

/**
 * Sort options
 */
export type SignalSortBy = "confidence" | "timeframe" | "timestamp" | "price";

/**
 * Signal counts
 */
export type SignalCounts = {
  long: number;
  short: number;
  total: number;
  byTimeframe: Record<Timeframe, number>;
  byType: Record<SignalType, number>;
};

export type UseSignalAggregationOptions = {
  symbol: MarketSymbol;
  enabled?: boolean;
  timeframes?: Timeframe[];
  filters?: SignalFilters;
  sortBy?: SignalSortBy;
};

export type UseSignalAggregationResult = {
  /** All aggregated signals */
  signals: AggregatedSignal[];
  /** Filtered signals */
  filteredSignals: AggregatedSignal[];
  /** Signal counts */
  counts: SignalCounts;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh signals */
  refresh: () => void;
  /** Update filters */
  setFilters: (filters: SignalFilters) => void;
  /** Update sort */
  setSortBy: (sortBy: SignalSortBy) => void;
};

const DEFAULT_TIMEFRAMES: Timeframe[] = ["1W", "1D", "4H", "1H"];

const TIMEFRAME_ORDER: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "5m", "3m", "1m"];

/**
 * Backend API response types
 */
interface BackendAggregatedSignal {
  id: string;
  timeframe: string;
  direction: "long" | "short";
  type: "trend_alignment" | "fib_rejection" | "confluence";
  confidence: number;
  price: number;
  description: string;
  is_active: boolean;
  timestamp: string;
  fib_level: number | null;
  fib_strategy: string | null;
  confluence_count: number | null;
}

interface BackendSignalCounts {
  long: number;
  short: number;
  total: number;
  by_timeframe: Record<string, number>;
  by_type: Record<string, number>;
}

interface BackendSignalAggregationResult {
  signals: BackendAggregatedSignal[];
  counts: BackendSignalCounts;
}

/**
 * Convert backend response to frontend format
 */
function convertBackendToFrontend(
  backend: BackendSignalAggregationResult
): { signals: AggregatedSignal[]; counts: SignalCounts } {
  const signals: AggregatedSignal[] = backend.signals.map((s) => ({
    id: s.id,
    timeframe: s.timeframe as Timeframe,
    direction: s.direction,
    type: s.type,
    confidence: s.confidence,
    price: s.price,
    description: s.description,
    isActive: s.is_active,
    timestamp: s.timestamp,
    fibLevel: s.fib_level ?? undefined,
    fibStrategy: (s.fib_strategy as FibStrategy) ?? undefined,
    confluenceCount: s.confluence_count ?? undefined,
  }));

  const counts: SignalCounts = {
    long: backend.counts.long,
    short: backend.counts.short,
    total: backend.counts.total,
    byTimeframe: backend.counts.by_timeframe as Record<Timeframe, number>,
    byType: backend.counts.by_type as Record<SignalType, number>,
  };

  return { signals, counts };
}

/**
 * Sort signals
 */
function sortSignals(signals: AggregatedSignal[], sortBy: SignalSortBy): AggregatedSignal[] {
  return [...signals].sort((a, b) => {
    switch (sortBy) {
      case "confidence":
        return b.confidence - a.confidence;
      case "timeframe":
        return TIMEFRAME_ORDER.indexOf(a.timeframe) - TIMEFRAME_ORDER.indexOf(b.timeframe);
      case "timestamp":
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case "price":
        return b.price - a.price;
      default:
        return 0;
    }
  });
}

/**
 * Filter signals
 */
function filterSignals(signals: AggregatedSignal[], filters: SignalFilters): AggregatedSignal[] {
  return signals.filter((signal) => {
    if (filters.direction && signal.direction !== filters.direction) return false;
    if (filters.timeframes?.length && !filters.timeframes.includes(signal.timeframe)) return false;
    if (filters.minConfidence && signal.confidence < filters.minConfidence) return false;
    if (filters.activeOnly && !signal.isActive) return false;
    if (filters.types?.length && !filters.types.includes(signal.type)) return false;
    return true;
  });
}

/**
 * Hook to aggregate signals across timeframes
 *
 * ADR Compliant: Calls backend /workflow/signal-aggregation endpoint.
 * All signal detection and aggregation logic is server-side.
 */
export function useSignalAggregation({
  symbol,
  enabled = true,
  timeframes = DEFAULT_TIMEFRAMES,
  filters: initialFilters = {},
  sortBy: initialSortBy = "confidence",
}: UseSignalAggregationOptions): UseSignalAggregationResult {
  const [signals, setSignals] = useState<AggregatedSignal[]>([]);
  const [counts, setCounts] = useState<SignalCounts>({
    long: 0,
    short: 0,
    total: 0,
    byTimeframe: {} as Record<Timeframe, number>,
    byType: {} as Record<SignalType, number>,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SignalFilters>(initialFilters);
  const [sortBy, setSortBy] = useState<SignalSortBy>(initialSortBy);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Fetch signals from backend API
  useEffect(() => {
    if (!enabled || timeframes.length === 0) {
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    async function fetchSignals() {
      try {
        const params = new URLSearchParams({
          symbol,
          timeframes: timeframes.join(","),
        });

        const response = await fetch(
          `${API_BASE}/workflow/signal-aggregation?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          const errorMessage = response.status === 503
            ? "Backend unavailable - start the backend server"
            : `API error: ${response.status}`;
          setError(errorMessage);
          setSignals([]);
          setCounts({
            long: 0,
            short: 0,
            total: 0,
            byTimeframe: {} as Record<Timeframe, number>,
            byType: {} as Record<SignalType, number>,
          });
          setIsLoading(false);
          return;
        }

        const data: BackendSignalAggregationResult = await response.json();
        const converted = convertBackendToFrontend(data);

        setSignals(converted.signals);
        setCounts(converted.counts);
        setError(null);
        setIsLoading(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }

        const errorMessage = (err as Error).message || "Failed to fetch signals";
        setError(errorMessage);
        setSignals([]);
        setCounts({
          long: 0,
          short: 0,
          total: 0,
          byTimeframe: {} as Record<Timeframe, number>,
          byType: {} as Record<SignalType, number>,
        });
        setIsLoading(false);
      }
    }

    fetchSignals();

    return () => {
      controller.abort();
    };
  }, [symbol, enabled, timeframes.join(","), refreshKey]);

  // Apply filters and sorting
  const filteredSignals = useMemo(() => {
    let result = filterSignals(signals, filters);
    result = sortSignals(result, sortBy);
    return result;
  }, [signals, filters, sortBy]);

  return {
    signals,
    filteredSignals,
    counts,
    isLoading,
    error,
    refresh,
    setFilters,
    setSortBy,
  };
}
