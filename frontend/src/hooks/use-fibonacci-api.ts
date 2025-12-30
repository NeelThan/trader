/**
 * Hook for fetching Fibonacci levels from the backend API.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getRetracementLevels,
  getExtensionLevels,
  type FibonacciLevel,
  type Direction,
} from "@/lib/api";

export type FibonacciLevelsState = {
  retracement: FibonacciLevel[];
  extension: FibonacciLevel[];
  isLoading: boolean;
  error: string | null;
  isBackendAvailable: boolean;
};

export type UseFibonacciAPIOptions = {
  high: number | null;
  low: number | null;
  direction: Direction;
  enabled?: boolean;
};

/**
 * Fetches Fibonacci retracement and extension levels from the backend API.
 * Falls back gracefully if backend is unavailable.
 */
export function useFibonacciAPI({
  high,
  low,
  direction,
  enabled = true,
}: UseFibonacciAPIOptions): FibonacciLevelsState {
  const [state, setState] = useState<FibonacciLevelsState>({
    retracement: [],
    extension: [],
    isLoading: false,
    error: null,
    isBackendAvailable: true,
  });

  const fetchLevels = useCallback(async () => {
    if (!enabled || high === null || low === null || high === low) {
      setState((prev) => ({
        ...prev,
        retracement: [],
        extension: [],
        isLoading: false,
        error: null,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch retracement and extension levels in parallel
      const [retracementResult, extensionResult] = await Promise.all([
        getRetracementLevels({ high, low, direction }),
        getExtensionLevels({ high, low, direction }),
      ]);

      setState({
        retracement: retracementResult.levels,
        extension: extensionResult.levels,
        isLoading: false,
        error: null,
        isBackendAvailable: true,
      });
    } catch (error) {
      console.error("Failed to fetch Fibonacci levels:", error);

      // Check if backend is unavailable
      const isUnavailable =
        error instanceof Error &&
        (error.message.includes("Backend unavailable") ||
          error.message.includes("fetch"));

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: isUnavailable
          ? "Backend unavailable - using client-side calculation"
          : "Failed to fetch Fibonacci levels",
        isBackendAvailable: !isUnavailable,
      }));
    }
  }, [high, low, direction, enabled]);

  // Fetch levels when dependencies change.
  // This effect syncs with the external backend API - a valid use case for effects.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing with external API
    fetchLevels();
  }, [fetchLevels]);

  return state;
}

/**
 * Calculate Fibonacci levels client-side (fallback when backend unavailable).
 */
export function calculateClientSideLevels(
  high: number,
  low: number,
  direction: Direction
): { retracement: FibonacciLevel[]; extension: FibonacciLevel[] } {
  const range = high - low;

  // Retracement ratios
  const retracementRatios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const retracement = retracementRatios.map((ratio) => ({
    ratio,
    price:
      direction === "buy" ? high - range * ratio : low + range * ratio,
  }));

  // Extension ratios
  const extensionRatios = [1.272, 1.414, 1.618, 2.0, 2.618];
  const extension = extensionRatios.map((ratio) => ({
    ratio,
    price:
      direction === "buy" ? low - range * (ratio - 1) : high + range * (ratio - 1),
  }));

  return { retracement, extension };
}
