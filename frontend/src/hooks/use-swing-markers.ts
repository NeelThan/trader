"use client";

/**
 * Hook for detecting swing patterns (HH/HL/LH/LL) from the backend API.
 *
 * Per ADR-20260101, swing detection is calculated in the backend
 * following the thin client architecture.
 *
 * Swing patterns are classified by comparing consecutive pivots:
 * - HH (Higher High): current high > previous high
 * - HL (Higher Low): current low > previous low
 * - LH (Lower High): current high < previous high
 * - LL (Lower Low): current low < previous low
 *
 * Supports optional caching via pivot-cache.ts for reduced API calls.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import type { OHLCData } from "@/components/trading";
import type { Timeframe, MarketSymbol } from "@/lib/chart-constants";
import {
  getCachedPivots,
  cachePivots,
  getCacheTTLRemaining,
} from "@/lib/pivot-cache";

export type SwingType = "HH" | "HL" | "LH" | "LL";

export type SwingMarker = {
  index: number;
  price: number;
  time: string | number;
  swingType: SwingType;
};

export type PivotPoint = {
  index: number;
  price: number;
  type: "high" | "low";
  time: string | number;
};

export type SwingDetectionResult = {
  pivots: PivotPoint[];
  markers: SwingMarker[];
};

export type UseSwingMarkersOptions = {
  data: OHLCData[];
  lookback?: number;
  enabled?: boolean;
  /** Optional symbol for caching (enables cache if provided with timeframe) */
  symbol?: MarketSymbol;
  /** Optional timeframe for caching (enables cache if provided with symbol) */
  timeframe?: Timeframe;
  /** Whether to use cache (default true, requires symbol and timeframe) */
  useCache?: boolean;
};

export type UseSwingMarkersReturn = {
  result: SwingDetectionResult | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  /** Force refresh bypassing cache */
  forceRefresh: () => void;
  /** Whether result is from cache */
  isFromCache: boolean;
  /** TTL remaining in ms (null if not cached) */
  cacheTTL: number | null;
};

const API_BASE = "/api/trader";

/**
 * Fetches swing markers from the backend API with optional caching.
 */
export function useSwingMarkers({
  data,
  lookback = 5,
  enabled = true,
  symbol,
  timeframe,
  useCache = true,
}: UseSwingMarkersOptions): UseSwingMarkersReturn {
  const [result, setResult] = useState<SwingDetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheTTL, setCacheTTL] = useState<number | null>(null);

  // Track if we should bypass cache on next fetch
  const bypassCacheRef = useRef(false);

  // Check if caching is possible
  const canCache = useCache && symbol !== undefined && timeframe !== undefined;

  const fetchSwingMarkers = useCallback(
    async (skipCache = false) => {
      // Need at least lookback * 2 + 1 bars for pivot detection
      const minBars = lookback * 2 + 1;
      if (!enabled || data.length < minBars) {
        setResult(null);
        setError(null);
        setIsFromCache(false);
        setCacheTTL(null);
        return;
      }

      // Check cache first (unless bypassing)
      if (canCache && !skipCache) {
        const cached = getCachedPivots(symbol, timeframe, lookback);
        if (cached) {
          console.log(
            `[SwingMarkers] Using cached data for ${symbol} ${timeframe} (lookback=${lookback})`
          );
          setResult({ pivots: cached.pivots, markers: cached.markers });
          setIsFromCache(true);
          setCacheTTL(getCacheTTLRemaining(symbol, timeframe, lookback));
          setError(null);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);
      setIsFromCache(false);

      try {
        // Convert OHLCData to the format expected by the API
        const ohlcData = data.map((bar) => ({
          time: bar.time,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        }));

        const response = await fetch(`${API_BASE}/pivot/swings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            data: ohlcData,
            lookback,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const data_result = await response.json();

        // Map API response to typed result
        const pivots: PivotPoint[] = data_result.pivots.map(
          (p: { index: number; price: number; type: string; time: string | number }) => ({
            index: p.index,
            price: p.price,
            type: p.type as "high" | "low",
            time: p.time,
          })
        );

        const markers: SwingMarker[] = data_result.markers.map(
          (m: {
            index: number;
            price: number;
            time: string | number;
            swing_type: string;
          }) => ({
            index: m.index,
            price: m.price,
            time: m.time,
            swingType: m.swing_type as SwingType,
          })
        );

        // Cache the result if caching is enabled
        if (canCache) {
          cachePivots(symbol, timeframe, lookback, pivots, markers);
          setCacheTTL(getCacheTTLRemaining(symbol, timeframe, lookback));
        } else {
          setCacheTTL(null);
        }

        setResult({ pivots, markers });
      } catch (err) {
        console.error("Failed to fetch swing markers:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch swing markers");
        setResult(null);
        setCacheTTL(null);
      } finally {
        setIsLoading(false);
      }
    },
    [data, lookback, enabled, canCache, symbol, timeframe]
  );

  // Fetch swing markers when dependencies change
  useEffect(() => {
    const shouldBypass = bypassCacheRef.current;
    bypassCacheRef.current = false;
    fetchSwingMarkers(shouldBypass);
  }, [fetchSwingMarkers]);

  // Normal refresh (uses cache if available)
  const refresh = useCallback(() => {
    fetchSwingMarkers(false);
  }, [fetchSwingMarkers]);

  // Force refresh (bypasses cache)
  const forceRefresh = useCallback(() => {
    bypassCacheRef.current = true;
    fetchSwingMarkers(true);
  }, [fetchSwingMarkers]);

  return {
    result,
    isLoading,
    error,
    refresh,
    forceRefresh,
    isFromCache,
    cacheTTL,
  };
}
