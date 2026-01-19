/**
 * Pivot Manager Hook
 *
 * Manages pivot points for Workflow V2 with:
 * - CRUD operations for pivots
 * - Lock/unlock from auto-refresh
 * - Persistence to localStorage
 * - ABC label assignment
 * - Multi-timeframe support
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { Timeframe, MarketSymbol } from "@/lib/chart-constants";
import { TIMEFRAME_CONFIG } from "@/lib/chart-constants";
import { useWorkflowV2Storage } from "./use-workflow-v2-storage";
import type {
  StoredPivotPoint,
  TradeDirection,
  TimeframePivotData,
} from "@/types/workflow-v2";
import type { OHLCData } from "@/components/trading";

const API_BASE = "/api/trader";

/**
 * ABC label for Fibonacci correlation
 */
export type ABCLabel = "A" | "B" | "C";

/**
 * Pivot with ABC label and ID
 */
export type ManagedPivot = StoredPivotPoint & {
  id: string;
  abcLabel?: ABCLabel;
};

/**
 * Input for adding a new pivot
 */
export type NewPivotInput = {
  index: number;
  price: number;
  type: "high" | "low";
};

export type UsePivotManagerOptions = {
  symbol: MarketSymbol;
  enabled?: boolean;
};

export type UsePivotManagerResult = {
  // Pivot getters
  getPivots: (timeframe: Timeframe) => ManagedPivot[];
  getPivotsWithLabels: (timeframe: Timeframe) => ManagedPivot[];
  getTimeframesWithPivots: () => Timeframe[];

  // Pivot mutations
  addPivot: (timeframe: Timeframe, pivot: NewPivotInput) => void;
  updatePivotPrice: (timeframe: Timeframe, pivotId: string, newPrice: number) => void;
  removePivot: (timeframe: Timeframe, pivotId: string) => void;
  clearPivots: (timeframe: Timeframe) => void;

  // Lock/unlock
  lockPivots: (timeframe: Timeframe, locked: boolean) => void;
  isLocked: (timeframe: Timeframe) => boolean;

  // Trend direction
  setTrendDirection: (timeframe: Timeframe, direction: TradeDirection | "ranging") => void;
  getTrendDirection: (timeframe: Timeframe) => TradeDirection | "ranging";

  // Detection
  detectPivots: (timeframe: Timeframe) => Promise<void>;

  // Reset
  resetAll: () => void;

  // Loading state
  isLoading: boolean;
};

/**
 * Generate unique ID for a pivot
 */
function generatePivotId(
  pivot: NewPivotInput,
  timeframe: Timeframe,
  timestamp: string
): string {
  return `${timeframe}-${pivot.type}-${pivot.index}-${timestamp}`;
}

/**
 * Convert stored pivots to managed pivots with IDs
 */
function toManagedPivots(
  data: TimeframePivotData | null,
  timeframe: Timeframe
): ManagedPivot[] {
  if (!data) return [];

  return data.points.map((p) => ({
    ...p,
    id: `${timeframe}-${p.type}-${p.index}-${p.timestamp}`,
  }));
}

/**
 * Assign ABC labels to the most recent 3 alternating pivots.
 * Pattern: A (oldest) → B (opposite type) → C (same type as A, most recent)
 */
function assignABCLabels(pivots: ManagedPivot[]): ManagedPivot[] {
  if (pivots.length < 3) return pivots;

  // Sort by index, most recent first
  const sorted = [...pivots].sort((a, b) => b.index - a.index);

  // Find point C (most recent)
  const pointC = sorted[0];
  if (!pointC) return pivots;

  // Find point B (opposite type, before C)
  const pointB = sorted.find(
    (p) => p.type !== pointC.type && p.index < pointC.index
  );
  if (!pointB) return pivots;

  // Find point A (same type as C, before B)
  const pointA = sorted.find(
    (p) => p.type === pointC.type && p.index < pointB.index
  );
  if (!pointA) return pivots;

  // Create label map
  const labelMap = new Map<string, ABCLabel>();
  labelMap.set(pointA.id, "A");
  labelMap.set(pointB.id, "B");
  labelMap.set(pointC.id, "C");

  // Apply labels
  return pivots.map((p) => ({
    ...p,
    abcLabel: labelMap.get(p.id),
  }));
}

/**
 * Fetch market data for pivot detection
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
 * Detect pivots from market data
 */
async function detectPivotsFromData(
  data: OHLCData[]
): Promise<StoredPivotPoint[]> {
  if (data.length < 11) return [];

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

    if (!response.ok) return [];

    const result = await response.json();
    const now = new Date().toISOString();

    return (result.pivots || []).map((p: { index: number; price: number; type: "high" | "low" }) => ({
      index: p.index,
      price: p.price,
      type: p.type,
      timestamp: now,
      isManual: false,
    }));
  } catch {
    return [];
  }
}

const ALL_TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "5m", "3m", "1m"];

const EMPTY_PIVOTS: Record<Timeframe, ManagedPivot[]> = {
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

/**
 * Hook to manage pivot points for Workflow V2
 */
export function usePivotManager({
  symbol,
  enabled = true,
}: UsePivotManagerOptions): UsePivotManagerResult {
  const {
    getPivots: getStoredPivots,
    setPivots: setStoredPivots,
    lockPivots: lockStoredPivots,
    clearPivots: clearStoredPivots,
    storage,
  } = useWorkflowV2Storage();

  const [localPivots, setLocalPivots] = useState<Record<Timeframe, ManagedPivot[]>>(EMPTY_PIVOTS);
  const [isLoading, setIsLoading] = useState(false);

  // Ref to storage functions to avoid dependency issues
  const storageRef = useRef({ getStoredPivots, setStoredPivots, lockStoredPivots, clearStoredPivots });
  storageRef.current = { getStoredPivots, setStoredPivots, lockStoredPivots, clearStoredPivots };

  // Load pivots from storage on mount and symbol change
  useEffect(() => {
    if (!enabled) return;

    // Load from storage using ref to avoid dependency on changing functions
    const loaded: Record<Timeframe, ManagedPivot[]> = { ...EMPTY_PIVOTS };

    for (const tf of ALL_TIMEFRAMES) {
      const data = storageRef.current.getStoredPivots(symbol, tf);
      loaded[tf] = toManagedPivots(data, tf);
    }

    setLocalPivots(loaded);
  }, [symbol, enabled]); // Only depend on symbol and enabled

  // Get pivots for a timeframe
  const getPivots = useCallback(
    (timeframe: Timeframe): ManagedPivot[] => {
      return localPivots[timeframe] || [];
    },
    [localPivots]
  );

  // Get pivots with ABC labels
  const getPivotsWithLabels = useCallback(
    (timeframe: Timeframe): ManagedPivot[] => {
      const pivots = localPivots[timeframe] || [];
      return assignABCLabels(pivots);
    },
    [localPivots]
  );

  // Get timeframes that have pivots
  const getTimeframesWithPivots = useCallback((): Timeframe[] => {
    return (Object.entries(localPivots) as [Timeframe, ManagedPivot[]][])
      .filter(([, pivots]) => pivots.length > 0)
      .map(([tf]) => tf);
  }, [localPivots]);

  // Add a new pivot
  const addPivot = useCallback(
    (timeframe: Timeframe, pivot: NewPivotInput) => {
      const timestamp = new Date().toISOString();
      const newPivot: ManagedPivot = {
        ...pivot,
        timestamp,
        isManual: true,
        id: generatePivotId(pivot, timeframe, timestamp),
      };

      setLocalPivots((prev) => {
        const updated = [...(prev[timeframe] || []), newPivot];

        // Persist to storage
        const storedPivots: StoredPivotPoint[] = updated.map((p) => ({
          index: p.index,
          price: p.price,
          type: p.type,
          timestamp: p.timestamp,
          isManual: p.isManual,
        }));

        const existingData = getStoredPivots(symbol, timeframe);
        setStoredPivots(symbol, timeframe, storedPivots, existingData?.trendDirection);

        return { ...prev, [timeframe]: updated };
      });
    },
    [symbol, getStoredPivots, setStoredPivots]
  );

  // Update pivot price
  const updatePivotPrice = useCallback(
    (timeframe: Timeframe, pivotId: string, newPrice: number) => {
      setLocalPivots((prev) => {
        const updated = (prev[timeframe] || []).map((p) =>
          p.id === pivotId ? { ...p, price: newPrice, isManual: true } : p
        );

        // Persist to storage
        const storedPivots: StoredPivotPoint[] = updated.map((p) => ({
          index: p.index,
          price: p.price,
          type: p.type,
          timestamp: p.timestamp,
          isManual: p.isManual,
        }));

        const existingData = getStoredPivots(symbol, timeframe);
        setStoredPivots(symbol, timeframe, storedPivots, existingData?.trendDirection);

        return { ...prev, [timeframe]: updated };
      });
    },
    [symbol, getStoredPivots, setStoredPivots]
  );

  // Remove a pivot
  const removePivot = useCallback(
    (timeframe: Timeframe, pivotId: string) => {
      setLocalPivots((prev) => {
        const updated = (prev[timeframe] || []).filter((p) => p.id !== pivotId);

        // Persist to storage
        const storedPivots: StoredPivotPoint[] = updated.map((p) => ({
          index: p.index,
          price: p.price,
          type: p.type,
          timestamp: p.timestamp,
          isManual: p.isManual,
        }));

        const existingData = getStoredPivots(symbol, timeframe);
        if (storedPivots.length > 0) {
          setStoredPivots(symbol, timeframe, storedPivots, existingData?.trendDirection);
        } else {
          clearStoredPivots(symbol, timeframe);
        }

        return { ...prev, [timeframe]: updated };
      });
    },
    [symbol, getStoredPivots, setStoredPivots, clearStoredPivots]
  );

  // Clear all pivots for a timeframe
  const clearPivots = useCallback(
    (timeframe: Timeframe) => {
      setLocalPivots((prev) => {
        clearStoredPivots(symbol, timeframe);
        return { ...prev, [timeframe]: [] };
      });
    },
    [symbol, clearStoredPivots]
  );

  // Lock/unlock pivots
  const lockPivots = useCallback(
    (timeframe: Timeframe, locked: boolean) => {
      lockStoredPivots(symbol, timeframe, locked);
    },
    [symbol, lockStoredPivots]
  );

  // Check if pivots are locked
  const isLocked = useCallback(
    (timeframe: Timeframe): boolean => {
      const data = getStoredPivots(symbol, timeframe);
      return data?.lockedFromRefresh ?? false;
    },
    [symbol, getStoredPivots]
  );

  // Set trend direction
  const setTrendDirection = useCallback(
    (timeframe: Timeframe, direction: TradeDirection | "ranging") => {
      const existingData = getStoredPivots(symbol, timeframe);
      if (existingData) {
        setStoredPivots(symbol, timeframe, existingData.points, direction);
      } else {
        setStoredPivots(symbol, timeframe, [], direction);
      }
    },
    [symbol, getStoredPivots, setStoredPivots]
  );

  // Get trend direction
  const getTrendDirection = useCallback(
    (timeframe: Timeframe): TradeDirection | "ranging" => {
      const data = getStoredPivots(symbol, timeframe);
      return data?.trendDirection ?? "ranging";
    },
    [symbol, getStoredPivots]
  );

  // Detect pivots from market data
  const detectPivots = useCallback(
    async (timeframe: Timeframe) => {
      // Skip if locked
      const locked = getStoredPivots(symbol, timeframe)?.lockedFromRefresh ?? false;
      if (locked) return;

      setIsLoading(true);

      try {
        const data = await fetchMarketData(symbol, timeframe);
        if (data.length === 0) return;

        const detectedPivots = await detectPivotsFromData(data);
        if (detectedPivots.length === 0) return;

        // Convert to managed pivots
        const managedPivots: ManagedPivot[] = detectedPivots.map((p) => ({
          ...p,
          id: `${timeframe}-${p.type}-${p.index}-${p.timestamp}`,
        }));

        setLocalPivots((prev) => {
          // Persist to storage
          setStoredPivots(symbol, timeframe, detectedPivots);
          return { ...prev, [timeframe]: managedPivots };
        });
      } finally {
        setIsLoading(false);
      }
    },
    [symbol, getStoredPivots, setStoredPivots]
  );

  // Reset all data
  const resetAll = useCallback(() => {
    for (const tf of ALL_TIMEFRAMES) {
      clearStoredPivots(symbol, tf);
    }

    setLocalPivots({ ...EMPTY_PIVOTS });
  }, [symbol, clearStoredPivots]);

  return {
    getPivots,
    getPivotsWithLabels,
    getTimeframesWithPivots,
    addPivot,
    updatePivotPrice,
    removePivot,
    clearPivots,
    lockPivots,
    isLocked,
    setTrendDirection,
    getTrendDirection,
    detectPivots,
    resetAll,
    isLoading,
  };
}
