"use client";

/**
 * Hook for managing editable pivot points with localStorage persistence.
 *
 * Extends useEditablePivots to persist user modifications across page refreshes.
 * User-modified pivots are NOT overwritten by auto-refresh - only unmodified
 * pivots get updated from the API.
 *
 * Storage key: `workflow-v2-pivots-{symbol}-{timeframe}`
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Timeframe, MarketSymbol } from "@/lib/chart-constants";
import type { PivotPoint } from "@/hooks/use-swing-markers";

const STORAGE_KEY_PREFIX = "workflow-v2-pivots";

/**
 * ABC label for Fibonacci correlation
 */
export type ABCLabel = "A" | "B" | "C";

/**
 * Stored pivot modification
 */
type StoredPivotModification = {
  /** Pivot identifier (type-index-time) */
  pivotKey: string;
  /** User-modified price */
  modifiedPrice: number;
  /** Original price when modification was made */
  originalPrice: number;
  /** Timestamp of modification */
  modifiedAt: number;
};

/**
 * Stored data structure
 */
type StoredPivotData = {
  modifications: StoredPivotModification[];
  lastUpdated: number;
};

/**
 * An editable pivot with modification tracking
 */
export type EditablePivot = PivotPoint & {
  /** Unique identifier for this pivot */
  id: string;
  /** Key for matching across refreshes */
  pivotKey: string;
  /** Original price from API detection */
  originalPrice: number;
  /** Whether the price has been modified by user */
  isModified: boolean;
  /** Whether this pivot is "locked" (user-modified, survives refresh) */
  isLocked: boolean;
  /** Timeframe this pivot belongs to */
  timeframe: Timeframe;
  /** ABC label for Fibonacci correlation */
  abcLabel?: ABCLabel;
};

export type UsePersistedEditablePivotsReturn = {
  /** Editable pivots with modification tracking */
  pivots: EditablePivot[];
  /** Update a specific pivot's price (locks it from refresh) */
  updatePivotPrice: (id: string, newPrice: number) => void;
  /** Reset a specific pivot to its original price (unlocks it) */
  resetPivot: (id: string) => void;
  /** Reset all pivots to their original prices (unlocks all) */
  resetAllPivots: () => void;
  /** Whether any pivots have been modified */
  hasModifications: boolean;
  /** Count of modified pivots */
  modifiedCount: number;
  /** Get pivot highs only */
  pivotHighs: EditablePivot[];
  /** Get pivot lows only */
  pivotLows: EditablePivot[];
  /** Whether storage has loaded */
  isLoaded: boolean;
};

/**
 * Generate a stable key for a pivot point that survives across API refreshes
 * Uses type + approximate time window to match pivots
 */
function generatePivotKey(pivot: PivotPoint): string {
  // Round time to nearest hour to handle slight time variations
  const timeValue = typeof pivot.time === "string"
    ? new Date(pivot.time).getTime()
    : pivot.time * 1000;
  const roundedTime = Math.floor(timeValue / 3600000) * 3600000;
  return `${pivot.type}-${roundedTime}`;
}

/**
 * Generate a unique ID for a pivot point
 */
function generatePivotId(pivot: PivotPoint, timeframe: Timeframe): string {
  return `${timeframe}-${pivot.type}-${pivot.index}-${pivot.time}`;
}

/**
 * Assign ABC labels to the most recent 3 alternating pivots.
 */
function assignABCLabels(pivots: PivotPoint[]): Map<number, ABCLabel> {
  const labels = new Map<number, ABCLabel>();

  if (pivots.length < 3) return labels;

  const sorted = [...pivots].sort((a, b) => b.index - a.index);
  const pointC = sorted[0];
  if (!pointC) return labels;

  const pointB = sorted.find(
    (p) => p.type !== pointC.type && p.index < pointC.index
  );
  if (!pointB) return labels;

  const pointA = sorted.find(
    (p) => p.type === pointC.type && p.index < pointB.index
  );
  if (!pointA) return labels;

  labels.set(pointA.index, "A");
  labels.set(pointB.index, "B");
  labels.set(pointC.index, "C");

  return labels;
}

/**
 * Get storage key for a symbol/timeframe combination
 */
function getStorageKey(symbol: MarketSymbol, timeframe: Timeframe): string {
  return `${STORAGE_KEY_PREFIX}-${symbol}-${timeframe}`;
}

/**
 * Load stored modifications from localStorage
 */
function loadStoredModifications(
  symbol: MarketSymbol,
  timeframe: Timeframe
): StoredPivotModification[] {
  if (typeof window === "undefined") return [];

  try {
    const key = getStorageKey(symbol, timeframe);
    const stored = localStorage.getItem(key);
    if (!stored) return [];

    const data: StoredPivotData = JSON.parse(stored);
    return data.modifications || [];
  } catch {
    return [];
  }
}

/**
 * Save modifications to localStorage
 */
function saveStoredModifications(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  modifications: StoredPivotModification[]
): void {
  if (typeof window === "undefined") return;

  try {
    const key = getStorageKey(symbol, timeframe);

    if (modifications.length === 0) {
      localStorage.removeItem(key);
      return;
    }

    const data: StoredPivotData = {
      modifications,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Silently fail if localStorage is full
  }
}

/**
 * Hook that provides editable pivot state management with localStorage persistence
 */
export function usePersistedEditablePivots(
  apiPivots: PivotPoint[],
  symbol: MarketSymbol,
  timeframe: Timeframe
): UsePersistedEditablePivotsReturn {
  const [pivots, setPivots] = useState<EditablePivot[]>([]);
  const [storedMods, setStoredMods] = useState<StoredPivotModification[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load stored modifications on mount
  useEffect(() => {
    const mods = loadStoredModifications(symbol, timeframe);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: syncing localStorage to state on mount
    setStoredMods(mods);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: tracking load state
    setIsLoaded(true);
  }, [symbol, timeframe]);

  // Update pivots when API data changes, preserving user modifications
  useEffect(() => {
    if (!isLoaded) return;

    if (!apiPivots || apiPivots.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: syncing API data to state
      setPivots([]);
      return;
    }

    const abcLabels = assignABCLabels(apiPivots);

    // Create new editable pivots from API data
    const newPivots: EditablePivot[] = apiPivots.map((apiPivot) => {
      const id = generatePivotId(apiPivot, timeframe);
      const pivotKey = generatePivotKey(apiPivot);
      const abcLabel = abcLabels.get(apiPivot.index);

      // Check if we have a stored modification for this pivot
      const storedMod = storedMods.find((m) => m.pivotKey === pivotKey);

      if (storedMod) {
        // User has modified this pivot - use their price, mark as locked
        return {
          ...apiPivot,
          id,
          pivotKey,
          originalPrice: apiPivot.price, // Update original from API
          price: storedMod.modifiedPrice, // Keep user's modified price
          isModified: true,
          isLocked: true,
          timeframe,
          abcLabel,
        };
      }

      // Unmodified pivot - use API price
      return {
        ...apiPivot,
        id,
        pivotKey,
        originalPrice: apiPivot.price,
        isModified: false,
        isLocked: false,
        timeframe,
        abcLabel,
      };
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: syncing API data to state
    setPivots(newPivots);
  }, [apiPivots, timeframe, storedMods, isLoaded]);

  // Update a specific pivot's price and persist to localStorage
  const updatePivotPrice = useCallback(
    (id: string, newPrice: number) => {
      setPivots((prev) => {
        const updated = prev.map((pivot) => {
          if (pivot.id !== id) return pivot;

          // Check if new price is same as original
          const isBackToOriginal =
            Math.abs(newPrice - pivot.originalPrice) < 0.0001;

          return {
            ...pivot,
            price: newPrice,
            isModified: !isBackToOriginal,
            isLocked: !isBackToOriginal,
          };
        });

        // Update stored modifications
        const newMods: StoredPivotModification[] = [];
        for (const pivot of updated) {
          if (pivot.isModified) {
            newMods.push({
              pivotKey: pivot.pivotKey,
              modifiedPrice: pivot.price,
              originalPrice: pivot.originalPrice,
              modifiedAt: Date.now(),
            });
          }
        }

        // Persist to localStorage
        saveStoredModifications(symbol, timeframe, newMods);
        setStoredMods(newMods);

        return updated;
      });
    },
    [symbol, timeframe]
  );

  // Reset a specific pivot to its original price
  const resetPivot = useCallback(
    (id: string) => {
      setPivots((prev) => {
        const updated = prev.map((pivot) => {
          if (pivot.id !== id) return pivot;

          return {
            ...pivot,
            price: pivot.originalPrice,
            isModified: false,
            isLocked: false,
          };
        });

        // Update stored modifications (remove the reset one)
        const resetPivot = prev.find((p) => p.id === id);
        const newMods = storedMods.filter(
          (m) => m.pivotKey !== resetPivot?.pivotKey
        );

        saveStoredModifications(symbol, timeframe, newMods);
        setStoredMods(newMods);

        return updated;
      });
    },
    [symbol, timeframe, storedMods]
  );

  // Reset all pivots to their original prices
  const resetAllPivots = useCallback(() => {
    setPivots((prev) =>
      prev.map((pivot) => ({
        ...pivot,
        price: pivot.originalPrice,
        isModified: false,
        isLocked: false,
      }))
    );

    // Clear all stored modifications
    saveStoredModifications(symbol, timeframe, []);
    setStoredMods([]);
  }, [symbol, timeframe]);

  // Derived values
  const hasModifications = useMemo(
    () => pivots.some((p) => p.isModified),
    [pivots]
  );

  const modifiedCount = useMemo(
    () => pivots.filter((p) => p.isModified).length,
    [pivots]
  );

  const pivotHighs = useMemo(
    () => pivots.filter((p) => p.type === "high"),
    [pivots]
  );

  const pivotLows = useMemo(
    () => pivots.filter((p) => p.type === "low"),
    [pivots]
  );

  return {
    pivots,
    updatePivotPrice,
    resetPivot,
    resetAllPivots,
    hasModifications,
    modifiedCount,
    pivotHighs,
    pivotLows,
    isLoaded,
  };
}
