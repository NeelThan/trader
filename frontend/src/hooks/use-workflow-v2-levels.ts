/**
 * Workflow V2 Levels Hook
 *
 * Simplified hook for fetching and managing Fibonacci levels across
 * multiple timeframes for the Workflow V2 chart-centric interface.
 *
 * Key differences from useMultiTFLevels:
 * - Uses WorkflowV2Storage for visibility settings
 * - Direction-based coloring (blue=long, red=short)
 * - Confluence zone detection
 * - Simplified configuration
 */

import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import type { Timeframe, MarketSymbol } from "@/lib/chart-constants";
import { TIMEFRAME_CONFIG } from "@/lib/chart-constants";
import type { OHLCData } from "@/components/trading";
import type {
  TimeframeVisibility,
  FibStrategy,
  TradeDirection,
  FibonacciLevel,
} from "@/types/workflow-v2";

const API_BASE = "/api/trader";

// Direction colors from design spec
export const WORKFLOW_DIRECTION_COLORS = {
  long: "#3b82f6", // blue
  short: "#ef4444", // red
} as const;

// Confluence zone threshold (percentage)
const CONFLUENCE_THRESHOLD = 0.5;

type FibonacciResponse = {
  levels: Record<string, number>;
};

type PivotResponse = {
  pivot_high: number;
  pivot_low: number;
  swing_high: { price: number; index: number } | null;
  swing_low: { price: number; index: number } | null;
  swing_endpoint: "high" | "low" | null;
};

export type WorkflowLevel = FibonacciLevel & {
  /** Number of nearby levels (confluence) */
  confluenceCount: number;
  /** Is this part of a confluence zone */
  isConfluence: boolean;
};

export type ConfluenceZone = {
  /** Zone identifier */
  id: string;
  /** Average price of levels in zone */
  price: number;
  /** All levels in this zone */
  levels: WorkflowLevel[];
  /** Dominant direction */
  direction: TradeDirection;
  /** Combined strength */
  strength: number;
};

export type UseWorkflowV2LevelsOptions = {
  symbol: MarketSymbol;
  timeframeVisibility: TimeframeVisibility;
  enabled?: boolean;
  /** Which strategies to calculate */
  strategies?: FibStrategy[];
  /** Current trade direction filter (null = show both) */
  directionFilter?: TradeDirection | null;
};

export type UseWorkflowV2LevelsResult = {
  /** All calculated levels */
  levels: WorkflowLevel[];
  /** Levels grouped by timeframe */
  levelsByTimeframe: Record<Timeframe, WorkflowLevel[]>;
  /** Detected confluence zones */
  confluenceZones: ConfluenceZone[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh levels */
  refresh: () => void;
};

/**
 * Format ratio as label (e.g., "R61.8%", "E127.2%")
 */
function formatRatioLabel(strategy: FibStrategy, ratio: number): string {
  const prefix = strategy.charAt(0).toUpperCase();
  return `${prefix}${(ratio * 100).toFixed(1)}%`;
}

/**
 * Generate unique level ID
 */
function generateLevelId(
  timeframe: Timeframe,
  strategy: FibStrategy,
  direction: TradeDirection,
  ratio: number
): string {
  return `${timeframe}-${strategy}-${direction}-${ratio}`;
}

/**
 * Fetch market data for a timeframe
 */
async function fetchMarketData(
  symbol: MarketSymbol,
  timeframe: Timeframe
): Promise<OHLCData[]> {
  const periods = TIMEFRAME_CONFIG[timeframe].periods;
  const url = `${API_BASE}/market-data?symbol=${symbol}&timeframe=${timeframe}&periods=${periods}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

/**
 * Fetch pivot points
 */
async function fetchPivots(data: OHLCData[]): Promise<PivotResponse | null> {
  if (data.length < 11) return null;

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
 * Fetch Fibonacci levels from API
 */
async function fetchFibLevels(
  high: number,
  low: number,
  direction: "buy" | "sell",
  strategy: "retracement" | "extension"
): Promise<FibonacciResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/fibonacci/${strategy}`, {
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
 * Convert API response to WorkflowLevel array
 */
function responseToLevels(
  response: FibonacciResponse,
  timeframe: Timeframe,
  strategy: FibStrategy,
  direction: TradeDirection
): WorkflowLevel[] {
  return Object.entries(response.levels).map(([ratioKey, price]) => {
    const ratio = parseInt(ratioKey, 10) / 1000;
    const label = `${timeframe} ${formatRatioLabel(strategy, ratio)}`;

    return {
      id: generateLevelId(timeframe, strategy, direction, ratio),
      ratio,
      price,
      strategy,
      timeframe,
      direction,
      label,
      visible: true,
      confluenceCount: 0,
      isConfluence: false,
    };
  });
}

/**
 * Calculate confluence for levels
 */
function calculateConfluence(
  levels: WorkflowLevel[],
  tolerance: number = CONFLUENCE_THRESHOLD
): WorkflowLevel[] {
  return levels.map((level) => {
    const priceThreshold = level.price * (tolerance / 100);
    const nearbyLevels = levels.filter(
      (other) =>
        other.id !== level.id &&
        Math.abs(other.price - level.price) <= priceThreshold
    );

    return {
      ...level,
      confluenceCount: nearbyLevels.length,
      isConfluence: nearbyLevels.length >= 2,
    };
  });
}

/**
 * Detect confluence zones (clustered levels)
 */
function detectConfluenceZones(
  levels: WorkflowLevel[],
  tolerance: number = CONFLUENCE_THRESHOLD
): ConfluenceZone[] {
  const zones: ConfluenceZone[] = [];
  const used = new Set<string>();

  // Sort by price for clustering
  const sorted = [...levels].sort((a, b) => a.price - b.price);

  for (const level of sorted) {
    if (used.has(level.id)) continue;

    const priceThreshold = level.price * (tolerance / 100);
    const cluster = sorted.filter(
      (other) =>
        !used.has(other.id) &&
        Math.abs(other.price - level.price) <= priceThreshold
    );

    if (cluster.length >= 2) {
      // Mark all as used
      cluster.forEach((l) => used.add(l.id));

      // Calculate zone properties
      const avgPrice =
        cluster.reduce((sum, l) => sum + l.price, 0) / cluster.length;
      const longCount = cluster.filter((l) => l.direction === "long").length;
      const shortCount = cluster.filter((l) => l.direction === "short").length;
      const direction: TradeDirection = longCount >= shortCount ? "long" : "short";

      zones.push({
        id: `zone-${avgPrice.toFixed(2)}`,
        price: avgPrice,
        levels: cluster,
        direction,
        strength: cluster.length,
      });
    }
  }

  return zones;
}

/**
 * Hook to manage Workflow V2 Fibonacci levels
 */
export function useWorkflowV2Levels({
  symbol,
  timeframeVisibility,
  enabled = true,
  strategies = ["retracement", "extension"],
  directionFilter = null,
}: UseWorkflowV2LevelsOptions): UseWorkflowV2LevelsResult {
  const [levels, setLevels] = useState<WorkflowLevel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFetching = useRef(false);
  const fetchIdRef = useRef(0);

  // Get enabled timeframes
  const enabledTimeframes = useMemo(() => {
    return (Object.entries(timeframeVisibility) as [Timeframe, boolean][])
      .filter(([, visible]) => visible)
      .map(([tf]) => tf);
  }, [timeframeVisibility]);

  // Stable reference to current options
  const optionsRef = useRef({ symbol, strategies, directionFilter });
  optionsRef.current = { symbol, strategies, directionFilter };

  // Fetch levels for a single timeframe
  const fetchTimeframeLevels = useCallback(
    async (timeframe: Timeframe): Promise<WorkflowLevel[]> => {
      const { symbol: sym, strategies: strats, directionFilter: filter } = optionsRef.current;

      const data = await fetchMarketData(sym, timeframe);
      if (data.length === 0) return [];

      const pivots = await fetchPivots(data);
      if (!pivots?.swing_high || !pivots?.swing_low) return [];

      const high = pivots.swing_high.price;
      const low = pivots.swing_low.price;

      // Determine direction from swing endpoint (pivot relationship)
      // B < C (swing UP, most recent is HIGH) → Show BUY levels only
      // B > C (swing DOWN, most recent is LOW) → Show SELL levels only
      const swingEndpoint = pivots.swing_endpoint;
      const directionFromSwing: TradeDirection | null = swingEndpoint
        ? (swingEndpoint === "high" ? "long" : "short")
        : null;

      // Apply direction filter: use swing direction if no explicit filter
      const effectiveFilter = filter ?? directionFromSwing;

      const allLevels: WorkflowLevel[] = [];

      for (const strategy of strats) {
        // Only fetch retracement and extension for now (expansion/projection need ABC)
        if (strategy !== "retracement" && strategy !== "extension") continue;

        // Long direction (buy) - only if direction matches
        if (!effectiveFilter || effectiveFilter === "long") {
          const response = await fetchFibLevels(high, low, "buy", strategy);
          if (response) {
            allLevels.push(
              ...responseToLevels(response, timeframe, strategy, "long")
            );
          }
        }

        // Short direction (sell) - only if direction matches
        if (!effectiveFilter || effectiveFilter === "short") {
          const response = await fetchFibLevels(high, low, "sell", strategy);
          if (response) {
            allLevels.push(
              ...responseToLevels(response, timeframe, strategy, "short")
            );
          }
        }
      }

      return allLevels;
    },
    [] // No dependencies - uses ref for current values
  );

  // Fetch all levels
  const fetchAllLevels = useCallback(async () => {
    if (!enabled || enabledTimeframes.length === 0 || isFetching.current) {
      return;
    }

    const fetchId = ++fetchIdRef.current;
    isFetching.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const results = await Promise.all(
        enabledTimeframes.map(fetchTimeframeLevels)
      );

      // Only update if this is still the latest fetch
      if (fetchId !== fetchIdRef.current) return;

      const allLevels = results.flat();
      const levelsWithConfluence = calculateConfluence(allLevels);

      setLevels(levelsWithConfluence);
    } catch (err) {
      if (fetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err.message : "Failed to fetch levels");
      }
    } finally {
      if (fetchId === fetchIdRef.current) {
        setIsLoading(false);
        isFetching.current = false;
      }
    }
  }, [enabled, enabledTimeframes, fetchTimeframeLevels]);

  // Fetch on mount and when key dependencies change
  useEffect(() => {
    fetchAllLevels();
  }, [symbol, enabled, enabledTimeframes.join(",")]);

  // Group levels by timeframe
  const levelsByTimeframe = useMemo(() => {
    const grouped: Record<Timeframe, WorkflowLevel[]> = {
      "1M": [],
      "1W": [],
      "1D": [],
      "4H": [],
      "1H": [],
      "15m": [],
      "5m": [],
      "3m": [],
      "1m": [],
    };

    levels.forEach((level) => {
      grouped[level.timeframe].push(level);
    });

    return grouped;
  }, [levels]);

  // Calculate confluence zones
  const confluenceZones = useMemo(() => {
    return detectConfluenceZones(levels);
  }, [levels]);

  return {
    levels,
    levelsByTimeframe,
    confluenceZones,
    isLoading,
    error,
    refresh: fetchAllLevels,
  };
}
