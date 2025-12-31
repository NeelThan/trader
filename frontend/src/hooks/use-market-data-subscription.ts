"use client";

/**
 * Hook for subscribing to market data from the centralized store.
 *
 * This hook provides a component with access to market data for a specific
 * symbol+timeframe pair, with local countdown timer and auto-refresh.
 *
 * Multiple components can subscribe to the same symbol+timeframe without
 * triggering duplicate API calls.
 */

import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import type { OHLCData, Time } from "@/components/trading";
import {
  Timeframe,
  MarketSymbol,
  MarketStatus,
  DataSource,
  TIMEFRAME_CONFIG,
} from "@/lib/chart-constants";
import {
  useMarketDataContext,
  type CacheEntry,
} from "@/contexts/MarketDataContext";
import { generateMarketData } from "@/lib/market-utils";

export type UseMarketDataSubscriptionOptions = {
  autoRefresh?: boolean;
  enabled?: boolean;
};

export type UseMarketDataSubscriptionReturn = {
  data: OHLCData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  fetchError: string | null;
  lastUpdated: Date | null;
  countdown: number;
  autoRefreshEnabled: boolean;
  marketStatus: MarketStatus | null;
  isRateLimited: boolean;
  isUsingSimulatedData: boolean;
  isBackendUnavailable: boolean;
  isCached: boolean;
  provider: string | null;
  setAutoRefreshEnabled: (enabled: boolean) => void;
  refreshNow: () => void;
  loadMoreData: (oldestTime: Time) => void;
};

export function useMarketDataSubscription(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  dataSource: DataSource = "yahoo",
  options: UseMarketDataSubscriptionOptions = {}
): UseMarketDataSubscriptionReturn {
  const { autoRefresh = true, enabled = true } = options;

  const context = useMarketDataContext();

  // Local state for this subscription
  const [countdown, setCountdown] = useState<number>(
    TIMEFRAME_CONFIG[timeframe].refreshInterval
  );
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Subscribe to store updates for this symbol+timeframe
  const cacheEntry = useSyncExternalStore(
    context.subscribe,
    () => context.getData(symbol, timeframe),
    () => null // Server snapshot
  );

  // Subscribe to backend availability
  const isBackendUnavailable = useSyncExternalStore(
    context.subscribe,
    () => context.getSnapshot().isBackendUnavailable,
    () => false
  );

  // Fetch data function
  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!enabled) return;

      setIsLoading(true);
      try {
        await context.fetchData(symbol, timeframe, forceRefresh);
        setCountdown(TIMEFRAME_CONFIG[timeframe].refreshInterval);
      } finally {
        setIsLoading(false);
      }
    },
    [context, symbol, timeframe, enabled]
  );

  // Refresh now function
  const refreshNow = useCallback(() => {
    if (dataSource === "yahoo") {
      fetchData(true);
    } else {
      // For simulated mode, we don't use the store
      // Just reset countdown
      setCountdown(TIMEFRAME_CONFIG[timeframe].refreshInterval);
    }
  }, [dataSource, fetchData, timeframe]);

  // Initial data fetch
  useEffect(() => {
    if (!hasMounted || !enabled) return;

    if (dataSource === "yahoo") {
      // Fetch from centralized store
      fetchData();
    }
  }, [hasMounted, enabled, dataSource, fetchData]);

  // Re-fetch when symbol or timeframe changes
  useEffect(() => {
    if (!hasMounted || !enabled) return;

    if (dataSource === "yahoo") {
      fetchData();
    }
    // Reset countdown on symbol/timeframe change
    setCountdown(TIMEFRAME_CONFIG[timeframe].refreshInterval);
  }, [symbol, timeframe, hasMounted, enabled, dataSource, fetchData]);

  // Auto-refresh countdown timer
  useEffect(() => {
    if (!hasMounted || !autoRefreshEnabled || !enabled) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger refresh
          if (dataSource === "yahoo") {
            fetchData();
          }
          return TIMEFRAME_CONFIG[timeframe].refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasMounted, autoRefreshEnabled, enabled, dataSource, timeframe, fetchData]);

  // Generate simulated data for manual simulated mode
  const simulatedData = hasMounted && dataSource !== "yahoo"
    ? generateMarketData(symbol, timeframe, TIMEFRAME_CONFIG[timeframe].periods)
    : [];

  // Determine final data
  const data: OHLCData[] =
    dataSource === "yahoo"
      ? cacheEntry?.data || []
      : simulatedData;

  // Determine if using simulated data
  const isUsingSimulatedData =
    dataSource !== "yahoo" ||
    isBackendUnavailable ||
    cacheEntry?.provider === "simulated" ||
    cacheEntry?.provider === "fallback";

  // Determine if rate limited (backend returned simulated when yahoo was requested)
  const isRateLimited =
    dataSource === "yahoo" && cacheEntry?.provider === "simulated";

  // Load more data placeholder (pagination not yet supported by backend)
  const loadMoreData = useCallback((_oldestTime: Time) => {
    console.warn("Load more data: pagination not yet supported by backend");
  }, []);

  return {
    data,
    isLoading: isLoading || (!cacheEntry && dataSource === "yahoo" && enabled),
    isLoadingMore: false, // Pagination not yet implemented
    fetchError: cacheEntry?.error || null,
    lastUpdated: cacheEntry?.lastUpdated || null,
    countdown,
    autoRefreshEnabled,
    marketStatus: cacheEntry?.marketStatus || null,
    isRateLimited,
    isUsingSimulatedData,
    isBackendUnavailable,
    isCached: cacheEntry?.isCached || false,
    provider: cacheEntry?.provider || (dataSource !== "yahoo" ? "simulated" : null),
    setAutoRefreshEnabled,
    refreshNow,
    loadMoreData,
  };
}
