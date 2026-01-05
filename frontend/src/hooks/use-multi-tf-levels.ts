"use client";

/**
 * Hook for fetching and aggregating Fibonacci levels across multiple timeframes.
 *
 * This hook:
 * 1. Fetches market data for each enabled timeframe
 * 2. Detects pivots for each timeframe
 * 3. Calculates Fibonacci retracement/extension levels for both directions
 * 4. Aggregates levels and calculates confluence heat scores
 * 5. Respects visibility configuration for filtering
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { TIMEFRAME_CONFIG, type Timeframe, type MarketSymbol } from "@/lib/chart-constants";
import type { OHLCData } from "@/components/trading";
import {
  type StrategyLevel,
  type StrategySource,
  type LevelDirection,
  type MultiTFLevelsResult,
  type TimeframeLevels,
  type VisibilityConfig,
  generateLevelId,
  calculateHeat,
  formatRatioLabel,
  isLevelVisible,
  ALL_TIMEFRAMES,
} from "@/lib/chart-pro/strategy-types";
import {
  cacheMarketData,
  getCachedMarketData,
} from "@/lib/market-data-cache";
import type { DataMode } from "@/hooks/use-data-mode";

const API_BASE = "/api/trader";

type MarketDataResponse = {
  success: boolean;
  data: OHLCData[];
  error?: string;
};

type PivotResponse = {
  pivots: Array<{
    index: number;
    price: number;
    type: "high" | "low";
    time: string | number;
  }>;
  pivot_high: number;
  pivot_low: number;
  swing_high: { price: number; time: string | number } | null;
  swing_low: { price: number; time: string | number } | null;
};

type FibonacciResponse = {
  levels: Record<string, number>;
};

export type UseMultiTFLevelsOptions = {
  symbol: MarketSymbol;
  visibilityConfig: VisibilityConfig;
  confluenceTolerance?: number;
  enabled?: boolean;
  /** Data mode - "live" fetches from API, "simulated" uses cached data only */
  dataMode?: DataMode;
};

export type UseMultiTFLevelsReturn = MultiTFLevelsResult & {
  isLoading: boolean;
  refresh: () => void;
  toggleLevelVisibility: (levelId: string) => void;
};

/**
 * Fetch market data for a symbol and timeframe
 * - In simulated mode, returns cached data only
 * - In live mode, fetches from API and caches the result
 * - Falls back to cached data on rate limit (429) errors
 */
async function fetchMarketData(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  dataMode: DataMode = "live"
): Promise<OHLCData[]> {
  // In simulated mode, only use cached data
  if (dataMode === "simulated") {
    const cached = getCachedMarketData(symbol, timeframe);
    if (cached) return cached.data;
    return [];
  }

  // Live mode - fetch from API with timeframe-appropriate periods
  const periods = TIMEFRAME_CONFIG[timeframe].periods;
  const url = `${API_BASE}/market-data?symbol=${symbol}&timeframe=${timeframe}&periods=${periods}`;

  try {
    const response = await fetch(url);

    // Handle rate limiting - fall back to cached data
    if (response.status === 429) {
      const cached = getCachedMarketData(symbol, timeframe);
      if (cached) return cached.data;
      return [];
    }

    if (!response.ok) {
      // Try cached data as fallback
      const cached = getCachedMarketData(symbol, timeframe);
      if (cached) return cached.data;
      return [];
    }

    const data: MarketDataResponse = await response.json();
    if (!data.success || !data.data) return [];

    // Cache the successful response
    cacheMarketData(symbol, timeframe, data.data, "yahoo");

    return data.data;
  } catch {
    // Try cached data as fallback on network errors
    const cached = getCachedMarketData(symbol, timeframe);
    if (cached) return cached.data;
    return [];
  }
}

/**
 * Fetch pivot points for a given OHLC dataset
 */
async function fetchPivots(data: OHLCData[]): Promise<PivotResponse | null> {
  if (data.length < 11) return null; // Need at least 2*lookback+1 bars

  try {
    const response = await fetch(`${API_BASE}/pivot/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: data.map((bar) => ({
          time: bar.time,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        })),
        lookback: 5,
        count: 10,
      }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch Fibonacci retracement/extension levels from API
 */
async function fetchFibonacciLevels(
  high: number,
  low: number,
  direction: "buy" | "sell",
  type: "retracement" | "extension"
): Promise<FibonacciResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/fibonacci/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ high, low, direction }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch Fibonacci expansion levels from API
 * Expansion uses point_a (start) and point_b (end) to project levels
 */
async function fetchExpansionLevels(
  pointA: number,
  pointB: number,
  direction: "buy" | "sell"
): Promise<FibonacciResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/fibonacci/expansion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ point_a: pointA, point_b: pointB, direction }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch Fibonacci projection levels from API
 * Projection uses ABC pattern: point_a → point_b → point_c to project levels
 */
async function fetchProjectionLevels(
  pointA: number,
  pointB: number,
  pointC: number,
  direction: "buy" | "sell"
): Promise<FibonacciResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/fibonacci/projection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        point_a: pointA,
        point_b: pointB,
        point_c: pointC,
        direction,
      }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Extract ABC points from pivots array for projection calculation
 * For buy: finds low → high → low pattern (ABC correction)
 * For sell: finds high → low → high pattern
 */
function extractABCPoints(
  pivots: PivotResponse["pivots"],
  direction: "buy" | "sell"
): { pointA: number; pointB: number; pointC: number } | null {
  if (pivots.length < 3) return null;

  // Sort pivots by index (most recent first is usually already sorted)
  const sorted = [...pivots].sort((a, b) => b.index - a.index);

  // For buy: look for low → high → low (C is most recent low, B is high, A is earlier low)
  // For sell: look for high → low → high
  const targetFirstType = direction === "buy" ? "low" : "high";
  const targetSecondType = direction === "buy" ? "high" : "low";

  // Find the most recent pivot matching first type (point C)
  const pointCPivot = sorted.find((p) => p.type === targetFirstType);
  if (!pointCPivot) return null;

  // Find point B (opposite type, before C)
  const pointBPivot = sorted.find(
    (p) => p.type === targetSecondType && p.index < pointCPivot.index
  );
  if (!pointBPivot) return null;

  // Find point A (same type as C, before B)
  const pointAPivot = sorted.find(
    (p) => p.type === targetFirstType && p.index < pointBPivot.index
  );
  if (!pointAPivot) return null;

  return {
    pointA: pointAPivot.price,
    pointB: pointBPivot.price,
    pointC: pointCPivot.price,
  };
}

/**
 * Options for converting Fibonacci response to levels
 */
type FibConversionOptions = {
  response: FibonacciResponse;
  timeframe: Timeframe;
  strategy: StrategySource;
  direction: LevelDirection;
  /** Pivot high price used in calculation */
  pivotHigh?: number;
  /** Pivot low price used in calculation */
  pivotLow?: number;
  /** Point A price (for projection/expansion) */
  pointA?: number;
  /** Point B price (for projection/expansion) */
  pointB?: number;
  /** Point C price (for projection) */
  pointC?: number;
};

/**
 * Convert Fibonacci API response to StrategyLevel array
 */
function fibResponseToLevels(options: FibConversionOptions): StrategyLevel[] {
  const {
    response,
    timeframe,
    strategy,
    direction,
    pivotHigh,
    pivotLow,
    pointA,
    pointB,
    pointC,
  } = options;

  // Map strategy to level type
  const typeMap: Record<StrategySource, StrategyLevel["type"]> = {
    RETRACEMENT: "retracement",
    EXTENSION: "extension",
    PROJECTION: "projection",
    EXPANSION: "expansion",
    HARMONIC: "harmonic_prz",
    SIGNAL: "support", // fallback
  };
  const type = typeMap[strategy] ?? "extension";

  return Object.entries(response.levels).map(([ratioKey, price]) => {
    // API returns ratio * 1000 as key (e.g., "618" for 0.618)
    const ratio = parseInt(ratioKey, 10) / 1000;

    return {
      id: generateLevelId(timeframe, strategy, direction, ratio, price),
      price,
      timeframe,
      strategy,
      type,
      direction,
      ratio,
      label: formatRatioLabel(strategy, ratio),
      visible: true,
      heat: 0, // Will be calculated after all levels are collected
      pivotHigh,
      pivotLow,
      pointA,
      pointB,
      pointC,
    };
  });
}

/**
 * Get enabled strategies for a timeframe and direction
 */
function getEnabledStrategies(
  config: VisibilityConfig,
  timeframe: Timeframe,
  direction: LevelDirection
): StrategySource[] {
  const tfConfig = config.timeframes.find((tf) => tf.timeframe === timeframe);
  if (!tfConfig || !tfConfig.enabled) return [];

  return tfConfig.strategies
    .filter((s) => s[direction].enabled)
    .map((s) => s.strategy);
}

/**
 * Check if any direction is enabled for a timeframe
 */
function hasAnyDirectionEnabled(
  config: VisibilityConfig,
  timeframe: Timeframe
): boolean {
  const tfConfig = config.timeframes.find((tf) => tf.timeframe === timeframe);
  if (!tfConfig || !tfConfig.enabled) return false;

  return tfConfig.strategies.some((s) => s.long.enabled || s.short.enabled);
}

export function useMultiTFLevels({
  symbol,
  visibilityConfig,
  confluenceTolerance = 0.5,
  enabled = true,
  dataMode = "live",
}: UseMultiTFLevelsOptions): UseMultiTFLevelsReturn {
  const [byTimeframe, setByTimeframe] = useState<TimeframeLevels[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<Timeframe, boolean>>(
    {} as Record<Timeframe, boolean>
  );
  const [errors, setErrors] = useState<Record<Timeframe, string | null>>(
    {} as Record<Timeframe, string | null>
  );
  const [visibilityOverrides, setVisibilityOverrides] = useState<
    Record<string, boolean>
  >({});

  // Cache for market data to avoid refetching
  const marketDataCache = useRef<Record<string, OHLCData[]>>({});

  // Get cache key for symbol+timeframe
  const getCacheKey = (sym: MarketSymbol, tf: Timeframe) => `${sym}-${tf}`;

  // Get enabled timeframes from visibility config
  const enabledTimeframes = useMemo(() => {
    return visibilityConfig.timeframes
      .filter((tf) => tf.enabled && hasAnyDirectionEnabled(visibilityConfig, tf.timeframe))
      .map((tf) => tf.timeframe);
  }, [visibilityConfig]);

  // Fetch levels for a single timeframe (both directions)
  const fetchLevelsForTimeframe = useCallback(
    async (timeframe: Timeframe): Promise<TimeframeLevels | null> => {
      const cacheKey = getCacheKey(symbol, timeframe);

      // Check in-memory cache first (for this session)
      let data = marketDataCache.current[cacheKey];

      // Fetch if not in memory cache
      if (!data || data.length === 0) {
        data = await fetchMarketData(symbol, timeframe, dataMode);
        if (data.length > 0) {
          marketDataCache.current[cacheKey] = data;
        }
      }

      if (!data || data.length < 11) {
        return {
          timeframe,
          levels: [],
          pivotHigh: null,
          pivotLow: null,
        };
      }

      // Fetch pivots
      const pivots = await fetchPivots(data);
      if (!pivots || !pivots.swing_high || !pivots.swing_low) {
        return {
          timeframe,
          levels: [],
          pivotHigh: pivots?.pivot_high ?? null,
          pivotLow: pivots?.pivot_low ?? null,
        };
      }

      const high = pivots.swing_high.price;
      const low = pivots.swing_low.price;

      // Determine which pivot is most recent (swing endpoint)
      // This tells us the actual B vs C relationship for smart direction detection
      const highTime = typeof pivots.swing_high.time === "string"
        ? new Date(pivots.swing_high.time).getTime()
        : pivots.swing_high.time;
      const lowTime = typeof pivots.swing_low.time === "string"
        ? new Date(pivots.swing_low.time).getTime()
        : pivots.swing_low.time;
      const swingEndpoint: "high" | "low" = highTime > lowTime ? "high" : "low";

      const levels: StrategyLevel[] = [];

      // Extract ABC points for projection (may be null if not enough pivots)
      const buyABC = extractABCPoints(pivots.pivots, "buy");
      const sellABC = extractABCPoints(pivots.pivots, "sell");

      // Fetch levels for LONG direction
      const longStrategies = getEnabledStrategies(visibilityConfig, timeframe, "long");
      const shortStrategies = getEnabledStrategies(visibilityConfig, timeframe, "short");

      for (const strategy of longStrategies) {
        if (strategy === "RETRACEMENT") {
          const retracement = await fetchFibonacciLevels(high, low, "buy", "retracement");
          if (retracement) {
            // Long/buy retracement: B < C (B is low, C is high)
            levels.push(...fibResponseToLevels({
              response: retracement,
              timeframe,
              strategy: "RETRACEMENT",
              direction: "long",
              pivotHigh: high,
              pivotLow: low,
              pointB: low,
              pointC: high,
            }));
          }
        }
        if (strategy === "EXTENSION") {
          const extension = await fetchFibonacciLevels(high, low, "buy", "extension");
          if (extension) {
            // Long/buy extension: B < C (B is low, C is high)
            levels.push(...fibResponseToLevels({
              response: extension,
              timeframe,
              strategy: "EXTENSION",
              direction: "long",
              pivotHigh: high,
              pivotLow: low,
              pointB: low,
              pointC: high,
            }));
          }
        }
        if (strategy === "PROJECTION" && buyABC) {
          const projection = await fetchProjectionLevels(
            buyABC.pointA,
            buyABC.pointB,
            buyABC.pointC,
            "buy"
          );
          if (projection) {
            levels.push(...fibResponseToLevels({
              response: projection,
              timeframe,
              strategy: "PROJECTION",
              direction: "long",
              pointA: buyABC.pointA,
              pointB: buyABC.pointB,
              pointC: buyABC.pointC,
            }));
          }
        }
        if (strategy === "EXPANSION") {
          // For buy expansion: project from low to high
          const expansion = await fetchExpansionLevels(low, high, "buy");
          if (expansion) {
            levels.push(...fibResponseToLevels({
              response: expansion,
              timeframe,
              strategy: "EXPANSION",
              direction: "long",
              pointA: low,
              pointB: high,
            }));
          }
        }
      }

      // Fetch levels for SHORT direction
      for (const strategy of shortStrategies) {
        if (strategy === "RETRACEMENT") {
          const retracement = await fetchFibonacciLevels(high, low, "sell", "retracement");
          if (retracement) {
            // Short/sell retracement: B > C (B is high, C is low)
            levels.push(...fibResponseToLevels({
              response: retracement,
              timeframe,
              strategy: "RETRACEMENT",
              direction: "short",
              pivotHigh: high,
              pivotLow: low,
              pointB: high,
              pointC: low,
            }));
          }
        }
        if (strategy === "EXTENSION") {
          const extension = await fetchFibonacciLevels(high, low, "sell", "extension");
          if (extension) {
            // Short/sell extension: B > C (B is high, C is low)
            levels.push(...fibResponseToLevels({
              response: extension,
              timeframe,
              strategy: "EXTENSION",
              direction: "short",
              pivotHigh: high,
              pivotLow: low,
              pointB: high,
              pointC: low,
            }));
          }
        }
        if (strategy === "PROJECTION" && sellABC) {
          const projection = await fetchProjectionLevels(
            sellABC.pointA,
            sellABC.pointB,
            sellABC.pointC,
            "sell"
          );
          if (projection) {
            levels.push(...fibResponseToLevels({
              response: projection,
              timeframe,
              strategy: "PROJECTION",
              direction: "short",
              pointA: sellABC.pointA,
              pointB: sellABC.pointB,
              pointC: sellABC.pointC,
            }));
          }
        }
        if (strategy === "EXPANSION") {
          // For sell expansion: project from high to low
          const expansion = await fetchExpansionLevels(high, low, "sell");
          if (expansion) {
            levels.push(...fibResponseToLevels({
              response: expansion,
              timeframe,
              strategy: "EXPANSION",
              direction: "short",
              pointA: high,
              pointB: low,
            }));
          }
        }
      }

      return {
        timeframe,
        levels,
        pivotHigh: high,
        pivotLow: low,
        swingEndpoint,
      };
    },
    [symbol, visibilityConfig, dataMode]
  );

  // Fetch all levels
  // Note: We fetch pivot data for ALL timeframes (for smart direction detection),
  // but only calculate Fib levels for enabled timeframes
  const fetchAllLevels = useCallback(async () => {
    if (!enabled) {
      setByTimeframe([]);
      return;
    }

    // Initialize loading states for all timeframes
    const initialLoadingStates: Record<Timeframe, boolean> = {} as Record<
      Timeframe,
      boolean
    >;
    const initialErrors: Record<Timeframe, string | null> = {} as Record<
      Timeframe,
      string | null
    >;

    ALL_TIMEFRAMES.forEach((tf) => {
      initialLoadingStates[tf] = true;
      initialErrors[tf] = null;
    });

    setLoadingStates(initialLoadingStates);
    setErrors(initialErrors);

    // Fetch levels for ALL timeframes in parallel (pivot data for smart detection)
    // Fib levels are only calculated for enabled timeframes via getEnabledStrategies
    const results = await Promise.all(
      ALL_TIMEFRAMES.map(async (tf) => {
        try {
          const result = await fetchLevelsForTimeframe(tf);
          setLoadingStates((prev) => ({ ...prev, [tf]: false }));
          return result;
        } catch (error) {
          setLoadingStates((prev) => ({ ...prev, [tf]: false }));
          setErrors((prev) => ({
            ...prev,
            [tf]: error instanceof Error ? error.message : "Unknown error",
          }));
          return null;
        }
      })
    );

    // Filter out nulls and set state
    const validResults = results.filter(
      (r): r is TimeframeLevels => r !== null
    );

    setByTimeframe(validResults);
  }, [enabled, fetchLevelsForTimeframe]);

  // Clear cache when symbol changes
  useEffect(() => {
    marketDataCache.current = {};
  }, [symbol]);

  // Track if a fetch is in progress to prevent overlapping requests
  const isFetching = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced fetch - wait 300ms after last config change before fetching
  // Fetch levels when dependencies change
  // Note: We always fetch when enabled=true (for pivot data), regardless of enabledTimeframes
  useEffect(() => {
    // Clear any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Skip if not enabled
    if (!enabled) {
      return;
    }

    // Skip if already fetching
    if (isFetching.current) {
      return;
    }

    // Debounce the fetch by 300ms to avoid rapid successive calls
    fetchTimeoutRef.current = setTimeout(() => {
      isFetching.current = true;
      fetchAllLevels().finally(() => {
        isFetching.current = false;
      });
    }, 300);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [fetchAllLevels, enabled]);

  // Calculate all levels with heat scores
  const allLevels = useMemo(() => {
    const levels = byTimeframe.flatMap((tf) => tf.levels);

    // Apply visibility overrides
    const levelsWithVisibility = levels.map((level) => ({
      ...level,
      visible: visibilityOverrides[level.id] ?? level.visible,
    }));

    // Calculate heat scores
    return levelsWithVisibility.map((level) => ({
      ...level,
      heat: calculateHeat(level, levelsWithVisibility, confluenceTolerance),
    }));
  }, [byTimeframe, visibilityOverrides, confluenceTolerance]);

  // Get visible levels based on visibility config
  const visibleLevels = useMemo(() => {
    return allLevels.filter((level) => isLevelVisible(level, visibilityConfig));
  }, [allLevels, visibilityConfig]);

  // Deduplicate levels within tolerance
  const uniqueLevels = useMemo(() => {
    const sorted = [...visibleLevels].sort((a, b) => b.heat - a.heat);
    const unique: StrategyLevel[] = [];
    const seenPrices: number[] = [];

    for (const level of sorted) {
      const tolerance = level.price * (confluenceTolerance / 100);
      const isDuplicate = seenPrices.some(
        (price) => Math.abs(price - level.price) <= tolerance
      );

      if (!isDuplicate) {
        unique.push(level);
        seenPrices.push(level.price);
      }
    }

    return unique;
  }, [visibleLevels, confluenceTolerance]);

  // Toggle level visibility
  const toggleLevelVisibility = useCallback((levelId: string) => {
    setVisibilityOverrides((prev) => ({
      ...prev,
      [levelId]: prev[levelId] === undefined ? false : !prev[levelId],
    }));
  }, []);

  // Check if any timeframe is loading
  const isLoading = Object.values(loadingStates).some((loading) => loading);

  return {
    allLevels,
    byTimeframe,
    uniqueLevels,
    loadingStates,
    errors,
    isLoading,
    refresh: fetchAllLevels,
    toggleLevelVisibility,
  };
}
