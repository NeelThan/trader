"use client";

/**
 * Hook for managing editable pivot points.
 *
 * Wraps API-detected pivot points with editing metadata,
 * allowing users to manually adjust pivot prices while
 * tracking modifications and providing reset functionality.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Timeframe } from "@/lib/chart-constants";
import type { PivotPoint } from "@/hooks/use-swing-markers";

/**
 * ABC label for Fibonacci correlation
 * A = Starting pivot (oldest in the pattern)
 * B = Reversal pivot (middle)
 * C = Most recent pivot
 */
export type ABCLabel = "A" | "B" | "C";

/**
 * An editable pivot with modification tracking
 */
export type EditablePivot = PivotPoint & {
  /** Unique identifier for this pivot */
  id: string;
  /** Original price from API detection */
  originalPrice: number;
  /** Whether the price has been modified */
  isModified: boolean;
  /** Timeframe this pivot belongs to */
  timeframe: Timeframe;
  /** ABC label for Fibonacci correlation (if this pivot is part of the ABC pattern) */
  abcLabel?: ABCLabel;
};

export type UseEditablePivotsReturn = {
  /** Editable pivots with modification tracking */
  pivots: EditablePivot[];
  /** Update a specific pivot's price */
  updatePivotPrice: (id: string, newPrice: number) => void;
  /** Reset a specific pivot to its original price */
  resetPivot: (id: string) => void;
  /** Reset all pivots to their original prices */
  resetAllPivots: () => void;
  /** Whether any pivots have been modified */
  hasModifications: boolean;
  /** Count of modified pivots */
  modifiedCount: number;
  /** Get pivot highs only */
  pivotHighs: EditablePivot[];
  /** Get pivot lows only */
  pivotLows: EditablePivot[];
};

/**
 * Generate a unique ID for a pivot point
 */
function generatePivotId(pivot: PivotPoint, timeframe: Timeframe): string {
  return `${timeframe}-${pivot.type}-${pivot.index}-${pivot.time}`;
}

/**
 * Assign ABC labels to the most recent 3 alternating pivots.
 * This matches the logic used in Fibonacci projection calculations.
 *
 * The pattern is: A (oldest) → B (opposite type) → C (same type as A, most recent)
 * For example: Low(A) → High(B) → Low(C)
 *
 * Returns a map of pivot index → ABC label
 */
function assignABCLabels(pivots: PivotPoint[]): Map<number, ABCLabel> {
  const labels = new Map<number, ABCLabel>();

  if (pivots.length < 3) return labels;

  // Sort pivots by index, most recent first
  const sorted = [...pivots].sort((a, b) => b.index - a.index);

  // Find the most recent pivot - this will be point C
  const pointC = sorted[0];
  if (!pointC) return labels;

  // Find point B: first pivot of opposite type before C
  const pointB = sorted.find(
    (p) => p.type !== pointC.type && p.index < pointC.index
  );
  if (!pointB) return labels;

  // Find point A: first pivot of same type as C, before B
  const pointA = sorted.find(
    (p) => p.type === pointC.type && p.index < pointB.index
  );
  if (!pointA) return labels;

  // Assign labels
  labels.set(pointA.index, "A");
  labels.set(pointB.index, "B");
  labels.set(pointC.index, "C");

  return labels;
}

/**
 * Hook that provides editable pivot state management
 */
export function useEditablePivots(
  apiPivots: PivotPoint[],
  timeframe: Timeframe
): UseEditablePivotsReturn {
  // State for editable pivots
  const [pivots, setPivots] = useState<EditablePivot[]>([]);

  // Update pivots when API data changes
  useEffect(() => {
    if (!apiPivots || apiPivots.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: syncing external prop to state
      setPivots([]);
      return;
    }

    // Assign ABC labels based on the most recent 3 alternating pivots
    const abcLabels = assignABCLabels(apiPivots);

    // Create new editable pivots from API data
    // Preserve modifications for pivots that still exist
    setPivots((prevPivots) => {
      const newPivots: EditablePivot[] = apiPivots.map((apiPivot) => {
        const id = generatePivotId(apiPivot, timeframe);
        const abcLabel = abcLabels.get(apiPivot.index);

        // Check if we have an existing modified pivot with this ID
        const existing = prevPivots.find((p) => p.id === id);

        if (existing && existing.isModified) {
          // Keep the user's modification
          return {
            ...apiPivot,
            id,
            originalPrice: apiPivot.price,
            price: existing.price, // Keep user's modified price
            isModified: true,
            timeframe,
            abcLabel,
          };
        }

        // New pivot or unmodified - use API price
        return {
          ...apiPivot,
          id,
          originalPrice: apiPivot.price,
          isModified: false,
          timeframe,
          abcLabel,
        };
      });

      return newPivots;
    });
  }, [apiPivots, timeframe]);

  // Update a specific pivot's price
  const updatePivotPrice = useCallback((id: string, newPrice: number) => {
    setPivots((prev) =>
      prev.map((pivot) => {
        if (pivot.id !== id) return pivot;

        // Check if new price is same as original (within small tolerance)
        const isBackToOriginal = Math.abs(newPrice - pivot.originalPrice) < 0.0001;

        return {
          ...pivot,
          price: newPrice,
          isModified: !isBackToOriginal,
        };
      })
    );
  }, []);

  // Reset a specific pivot to its original price
  const resetPivot = useCallback((id: string) => {
    setPivots((prev) =>
      prev.map((pivot) => {
        if (pivot.id !== id) return pivot;

        return {
          ...pivot,
          price: pivot.originalPrice,
          isModified: false,
        };
      })
    );
  }, []);

  // Reset all pivots to their original prices
  const resetAllPivots = useCallback(() => {
    setPivots((prev) =>
      prev.map((pivot) => ({
        ...pivot,
        price: pivot.originalPrice,
        isModified: false,
      }))
    );
  }, []);

  // Calculate derived values
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
  };
}
