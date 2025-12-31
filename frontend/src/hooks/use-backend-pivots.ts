"use client";

/**
 * Hook for backend-driven pivot detection.
 *
 * IMPORTANT: This hook sends the chart's current data to the backend
 * for pivot detection. The chart data (whether real or simulated) is
 * the single source of truth - no separate data fetching happens.
 *
 * Data flow:
 * 1. Chart displays OHLC data (real or simulated)
 * 2. This hook sends THE SAME data to backend /pivot/detect
 * 3. Backend returns detected pivots
 * 4. Frontend displays pivots on the chart
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { Time, BusinessDay } from "lightweight-charts";
import { OHLCData } from "@/components/trading";
import { detectPivots, type PivotDetectResponse, type PivotPointData } from "@/lib/api";

/**
 * Convert Lightweight Charts Time type to string | number for API.
 * Time can be string, number, or BusinessDay object.
 */
function timeToApiFormat(time: Time): string | number {
  if (typeof time === "string" || typeof time === "number") {
    return time;
  }
  // BusinessDay object - convert to ISO date string
  const bd = time as BusinessDay;
  const month = String(bd.month).padStart(2, "0");
  const day = String(bd.day).padStart(2, "0");
  return `${bd.year}-${month}-${day}`;
}

export type UseBackendPivotsConfig = {
  /** Number of bars to check on each side for swing detection */
  lookback?: number;
  /** Maximum number of recent pivots to return */
  count?: number;
};

export type UseBackendPivotsReturn = {
  /** All detected pivots in chronological order */
  pivots: PivotPointData[];
  /** Most recent N pivots */
  recentPivots: PivotPointData[];
  /** Highest price among detected high pivots */
  pivotHigh: number;
  /** Lowest price among detected low pivots */
  pivotLow: number;
  /** Most recently detected swing high */
  swingHigh: PivotPointData | null;
  /** Most recently detected swing low */
  swingLow: PivotPointData | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if detection failed */
  error: string | null;
  /** Whether backend is available */
  isBackendAvailable: boolean;
  /** Manually trigger pivot detection (usually automatic on data change) */
  refresh: () => void;
};

const DEFAULT_CONFIG: UseBackendPivotsConfig = {
  lookback: 5,
  count: 10,
};

/**
 * Hook that sends chart data to the backend for pivot detection.
 *
 * @param data - The OHLC data currently displayed on the chart
 * @param enabled - Whether to enable backend pivot detection
 * @param config - Configuration for pivot detection
 */
export function useBackendPivots(
  data: OHLCData[],
  enabled: boolean = true,
  config: UseBackendPivotsConfig = DEFAULT_CONFIG
): UseBackendPivotsReturn {
  const [pivots, setPivots] = useState<PivotPointData[]>([]);
  const [recentPivots, setRecentPivots] = useState<PivotPointData[]>([]);
  const [pivotHigh, setPivotHigh] = useState(0);
  const [pivotLow, setPivotLow] = useState(0);
  const [swingHigh, setSwingHigh] = useState<PivotPointData | null>(null);
  const [swingLow, setSwingLow] = useState<PivotPointData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);

  // Track last data hash to avoid redundant API calls
  const lastDataHashRef = useRef<string>("");

  // Create a simple hash of the data to detect changes
  const getDataHash = useCallback((ohlcData: OHLCData[]): string => {
    if (ohlcData.length === 0) return "";
    // Use first, last bar times and length as a quick hash
    const first = ohlcData[0];
    const last = ohlcData[ohlcData.length - 1];
    return `${first.time}-${last.time}-${ohlcData.length}`;
  }, []);

  const fetchPivots = useCallback(async () => {
    if (!enabled || data.length === 0) {
      return;
    }

    // Check if data actually changed
    const currentHash = getDataHash(data);
    if (currentHash === lastDataHashRef.current) {
      return;
    }
    lastDataHashRef.current = currentHash;

    setIsLoading(true);
    setError(null);

    try {
      // Send chart data to backend for pivot detection
      // Uses timeToApiFormat to handle BusinessDay objects from Lightweight Charts
      const response: PivotDetectResponse = await detectPivots({
        data: data.map((bar) => ({
          time: timeToApiFormat(bar.time),
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        })),
        lookback: config.lookback ?? DEFAULT_CONFIG.lookback,
        count: config.count ?? DEFAULT_CONFIG.count,
      });

      setPivots(response.pivots);
      setRecentPivots(response.recent_pivots);
      setPivotHigh(response.pivot_high);
      setPivotLow(response.pivot_low);
      setSwingHigh(response.swing_high);
      setSwingLow(response.swing_low);
      setIsBackendAvailable(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to detect pivots";
      setError(message);

      // Check if backend is unavailable
      if (message.includes("Backend unavailable") || message.includes("503")) {
        setIsBackendAvailable(false);
      }

      console.warn("Backend pivot detection failed:", message);
    } finally {
      setIsLoading(false);
    }
  }, [data, enabled, config.lookback, config.count, getDataHash]);

  // Fetch pivots when data changes
  useEffect(() => {
    fetchPivots();
  }, [fetchPivots]);

  const refresh = useCallback(() => {
    lastDataHashRef.current = ""; // Force refetch
    fetchPivots();
  }, [fetchPivots]);

  return {
    pivots,
    recentPivots,
    pivotHigh,
    pivotLow,
    swingHigh,
    swingLow,
    isLoading,
    error,
    isBackendAvailable,
    refresh,
  };
}
