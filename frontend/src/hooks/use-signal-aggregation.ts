/**
 * Signal Aggregation Hook
 *
 * Aggregates trading signals from multiple sources:
 * - Trend alignment (higher TF vs lower TF)
 * - Fibonacci level rejections
 * - Confluence zones
 *
 * Provides filtering, sorting, and counting for the Signals Panel.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Timeframe, MarketSymbol } from "@/lib/chart-constants";
import { TIMEFRAME_CONFIG } from "@/lib/chart-constants";
import type { OHLCData } from "@/components/trading";
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

const RETRACEMENT_LEVELS = [
  { ratio: 0.382, label: "38.2%" },
  { ratio: 0.5, label: "50%" },
  { ratio: 0.618, label: "61.8%" },
  { ratio: 0.786, label: "78.6%" },
];

/**
 * Fetch market data for a timeframe
 * Throws on network errors so they can be tracked
 */
async function fetchMarketData(
  symbol: MarketSymbol,
  timeframe: Timeframe
): Promise<OHLCData[]> {
  const periods = TIMEFRAME_CONFIG[timeframe].periods;
  const url = `${API_BASE}/market-data?symbol=${symbol}&timeframe=${timeframe}&periods=${periods}`;

  const response = await fetch(url);
  if (!response.ok) return [];
  const data = await response.json();
  return data.success ? data.data : [];
}

/**
 * Fetch trend assessment for a timeframe
 * Throws on network errors so they can be tracked
 */
async function fetchTrendAssessment(
  symbol: MarketSymbol,
  timeframe: Timeframe
): Promise<{ direction: string; confidence: number; swing_high: number; swing_low: number } | null> {
  const url = `${API_BASE}/workflow/assess?symbol=${symbol}&timeframe=${timeframe}`;

  const response = await fetch(url);
  if (!response.ok) return null;
  return await response.json();
}

/**
 * Detect if a bar shows rejection at a Fibonacci level
 */
function detectFibRejection(
  bar: OHLCData,
  level: number,
  direction: TradeDirection
): boolean {
  const tolerance = level * 0.005; // 0.5% tolerance

  if (direction === "long") {
    // For long, look for price testing level from above and bouncing
    const testedLevel = bar.low <= level + tolerance;
    const closedAbove = bar.close > level;
    const isBullish = bar.close > bar.open;
    return testedLevel && closedAbove && isBullish;
  } else {
    // For short, look for price testing level from below and rejecting
    const testedLevel = bar.high >= level - tolerance;
    const closedBelow = bar.close < level;
    const isBearish = bar.close < bar.open;
    return testedLevel && closedBelow && isBearish;
  }
}

/**
 * Detect signals for a single timeframe
 */
async function detectTimeframeSignals(
  symbol: MarketSymbol,
  timeframe: Timeframe
): Promise<AggregatedSignal[]> {
  const signals: AggregatedSignal[] = [];
  const now = new Date().toISOString();

  // Fetch market data and trend assessment in parallel
  const [data, trend] = await Promise.all([
    fetchMarketData(symbol, timeframe),
    fetchTrendAssessment(symbol, timeframe),
  ]);

  if (data.length < 10 || !trend) return signals;

  // Calculate swing points
  const swingHigh = trend.swing_high;
  const swingLow = trend.swing_low;
  const range = swingHigh - swingLow;

  if (range <= 0) return signals;

  // Determine trend direction
  const trendDirection: TradeDirection =
    trend.direction === "bullish" ? "long" : trend.direction === "bearish" ? "short" : "long";

  // Check recent bars for Fibonacci rejections
  const recentBars = data.slice(-5);
  for (const level of RETRACEMENT_LEVELS) {
    const fibPrice = swingHigh - range * level.ratio;

    for (const bar of recentBars) {
      if (detectFibRejection(bar, fibPrice, trendDirection)) {
        signals.push({
          id: `${timeframe}-fib-${level.ratio}-${now}`,
          timeframe,
          direction: trendDirection,
          type: "fib_rejection",
          confidence: Math.round(trend.confidence * (1 - Math.abs(level.ratio - 0.618) * 0.5)),
          price: fibPrice,
          description: `${trendDirection === "long" ? "Bounce" : "Rejection"} at ${level.label} retracement`,
          isActive: true,
          timestamp: now,
          fibLevel: level.ratio,
          fibStrategy: "retracement",
        });
        break; // Only one signal per level
      }
    }
  }

  // Add trend alignment signal if trend is clear
  if (trend.confidence >= 60) {
    signals.push({
      id: `${timeframe}-trend-${now}`,
      timeframe,
      direction: trendDirection,
      type: "trend_alignment",
      confidence: trend.confidence,
      price: data[data.length - 1].close,
      description: `${timeframe} trend is ${trend.direction} with ${trend.confidence}% confidence`,
      isActive: trend.confidence >= 70,
      timestamp: now,
    });
  }

  return signals;
}

/**
 * Detect confluence zones from signals
 */
function detectConfluence(signals: AggregatedSignal[]): AggregatedSignal[] {
  const confluenceSignals: AggregatedSignal[] = [];
  const tolerance = 0.005; // 0.5%

  // Group signals by similar price
  const priceGroups: Map<number, AggregatedSignal[]> = new Map();

  for (const signal of signals) {
    let foundGroup = false;
    for (const [groupPrice, group] of priceGroups) {
      if (Math.abs(signal.price - groupPrice) / groupPrice < tolerance) {
        group.push(signal);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) {
      priceGroups.set(signal.price, [signal]);
    }
  }

  // Create confluence signals for groups with 2+ signals
  for (const [price, group] of priceGroups) {
    if (group.length >= 2) {
      const avgConfidence = group.reduce((sum, s) => sum + s.confidence, 0) / group.length;
      const dominantDirection = group.filter((s) => s.direction === "long").length >=
        group.filter((s) => s.direction === "short").length
        ? "long"
        : "short";

      confluenceSignals.push({
        id: `confluence-${price}-${Date.now()}`,
        timeframe: group[0].timeframe,
        direction: dominantDirection as TradeDirection,
        type: "confluence",
        confidence: Math.min(95, Math.round(avgConfidence + group.length * 5)),
        price,
        description: `${group.length} levels converge near ${price.toFixed(0)}`,
        isActive: true,
        timestamp: new Date().toISOString(),
        confluenceCount: group.length,
      });
    }
  }

  return confluenceSignals;
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
 * Calculate signal counts
 */
function calculateCounts(signals: AggregatedSignal[]): SignalCounts {
  const counts: SignalCounts = {
    long: 0,
    short: 0,
    total: signals.length,
    byTimeframe: {} as Record<Timeframe, number>,
    byType: {} as Record<SignalType, number>,
  };

  for (const signal of signals) {
    if (signal.direction === "long") counts.long++;
    else counts.short++;

    counts.byTimeframe[signal.timeframe] = (counts.byTimeframe[signal.timeframe] || 0) + 1;
    counts.byType[signal.type] = (counts.byType[signal.type] || 0) + 1;
  }

  return counts;
}

/**
 * Hook to aggregate signals across timeframes
 */
export function useSignalAggregation({
  symbol,
  enabled = true,
  timeframes = DEFAULT_TIMEFRAMES,
  filters: initialFilters = {},
  sortBy: initialSortBy = "confidence",
}: UseSignalAggregationOptions): UseSignalAggregationResult {
  const [signals, setSignals] = useState<AggregatedSignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SignalFilters>(initialFilters);
  const [sortBy, setSortBy] = useState<SignalSortBy>(initialSortBy);

  const isFetching = useRef(false);
  const fetchIdRef = useRef(0);

  // Fetch all signals
  const fetchSignals = useCallback(async () => {
    if (!enabled || timeframes.length === 0 || isFetching.current) {
      return;
    }

    const fetchId = ++fetchIdRef.current;
    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch signals for all timeframes in parallel with error tracking
      const results = await Promise.allSettled(
        timeframes.map((tf) => detectTimeframeSignals(symbol, tf))
      );

      // Only update if this is still the latest fetch
      if (fetchId !== fetchIdRef.current) return;

      // Check for errors
      const errors = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      if (errors.length === results.length) {
        // All timeframes failed
        throw new Error(errors[0]?.reason?.message || "Failed to fetch signals");
      }

      // Collect successful results
      const allSignals = results
        .filter((r): r is PromiseFulfilledResult<AggregatedSignal[]> => r.status === "fulfilled")
        .flatMap((r) => r.value);

      // Detect confluence zones
      const confluenceSignals = detectConfluence(allSignals);

      // Combine and deduplicate
      const combined = [...allSignals, ...confluenceSignals];

      setSignals(combined);

      // Set partial error if some timeframes failed
      if (errors.length > 0) {
        setError(`Some timeframes failed to load`);
      }
    } catch (err) {
      if (fetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch signals");
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false);
        isFetching.current = false;
      }
    }
  }, [enabled, symbol, timeframes]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchSignals();
  }, [symbol, enabled, timeframes.join(",")]);

  // Apply filters and sorting
  const filteredSignals = useMemo(() => {
    let result = filterSignals(signals, filters);
    result = sortSignals(result, sortBy);
    return result;
  }, [signals, filters, sortBy]);

  // Calculate counts
  const counts = useMemo(() => calculateCounts(signals), [signals]);

  return {
    signals,
    filteredSignals,
    counts,
    isLoading,
    error,
    refresh: fetchSignals,
    setFilters,
    setSortBy,
  };
}
