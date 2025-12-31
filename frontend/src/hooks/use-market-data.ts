"use client";

/**
 * Hook for fetching and managing market data.
 * Fetches from the backend multi-provider service with caching and fallback.
 * Handles countdown timer, market status, and auto-refresh.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { OHLCData, Time } from "@/components/trading";
import {
  Timeframe,
  MarketSymbol,
  DataSource,
  MarketStatus,
  TIMEFRAME_CONFIG,
} from "@/lib/chart-constants";
import { generateMarketData } from "@/lib/market-utils";

// Backend API response types
type BackendMarketDataResponse = {
  success: boolean;
  data: Array<{
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  provider: string | null;
  cached: boolean;
  cache_expires_at: string | null;
  rate_limit_remaining: number | null;
  market_status: {
    state: string;
    state_display: string;
    is_open: boolean;
  } | null;
  error: string | null;
};

export type UseMarketDataReturn = {
  data: OHLCData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  fetchError: string | null;
  lastUpdated: Date | null;
  countdown: number;
  autoRefreshEnabled: boolean;
  marketStatus: MarketStatus | null;
  isRateLimited: boolean; // True when backend rate limited (using simulated fallback)
  isUsingSimulatedData: boolean; // True when using simulated provider
  isBackendUnavailable: boolean; // True when backend server is not reachable
  isCached: boolean; // True when data was served from cache
  provider: string | null; // Current data provider (yahoo, simulated, fallback)
  setAutoRefreshEnabled: (enabled: boolean) => void;
  refreshNow: () => void;
  loadMoreData: (oldestTime: Time) => void;
};

export function useMarketData(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  dataSource: DataSource,
  hasMounted: boolean
): UseMarketDataReturn {
  // Backend API state
  const [backendData, setBackendData] = useState<OHLCData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [simulatedDataVersion, setSimulatedDataVersion] = useState(0); // For manual simulated mode
  const oldestLoadedTimeRef = useRef<string | null>(null);

  // Generate simulated data for manual simulated mode
  const simulatedData = useMemo(() => {
    if (!hasMounted) return [];
    const config = TIMEFRAME_CONFIG[timeframe];
    return generateMarketData(symbol, timeframe, config.periods);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe, hasMounted, simulatedDataVersion]);

  // Fetch data from backend (handles provider fallback automatically)
  const fetchBackendData = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const params = new URLSearchParams({
        symbol,
        timeframe,
        periods: String(TIMEFRAME_CONFIG[timeframe].periods),
      });
      if (forceRefresh) {
        params.set("force_refresh", "true");
      }

      const response = await fetch(`/api/trader/market-data?${params}`);
      const result: BackendMarketDataResponse = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.error || "Failed to fetch market data";
        setFetchError(errorMessage);
        console.error("Backend market data error:", errorMessage);
        return;
      }

      // Update state with backend response
      const newData = result.data as OHLCData[];
      setBackendData(newData);
      setLastUpdated(new Date());
      setCountdown(TIMEFRAME_CONFIG[timeframe].refreshInterval);
      setIsCached(result.cached);
      setProvider(result.provider);

      // Track provider type
      setIsRateLimited(result.provider === "simulated" && dataSource === "yahoo");

      // Track the oldest loaded time for preventing duplicate loads
      if (newData.length > 0) {
        oldestLoadedTimeRef.current = String(newData[0].time);
      }

      // Update market status
      if (result.market_status) {
        setMarketStatus({
          state: result.market_status.state,
          stateDisplay: result.market_status.state_display,
          isOpen: result.market_status.is_open,
          isPreMarket: false,
          isAfterHours: false,
          isClosed: !result.market_status.is_open,
        });
      }
    } catch (error) {
      // Check if this is a connection error (backend unavailable)
      const isConnectionError = error instanceof TypeError &&
        (error.message.includes("fetch failed") || error.message.includes("Failed to fetch"));

      if (isConnectionError) {
        console.warn("Backend unavailable, using simulated data as fallback");
        setIsBackendUnavailable(true);
        setProvider("fallback");
        setFetchError(null); // Clear error since we have fallback
        setLastUpdated(new Date());
        setCountdown(TIMEFRAME_CONFIG[timeframe].refreshInterval);
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to fetch market data";
        console.error("Failed to fetch market data:", errorMessage);
        setFetchError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe, dataSource]);

  // Load more historical data (for infinite scroll) - currently not supported by backend
  const loadMoreData = useCallback(async (_oldestTime: Time) => {
    // Note: Backend currently doesn't support `before` parameter for pagination
    // This is a placeholder for future implementation
    if (dataSource !== "yahoo" || isLoadingMore) return;

    // For now, just log that pagination isn't supported yet
    console.warn("Load more data: pagination not yet supported by backend");
  }, [dataSource, isLoadingMore]);

  // Refresh simulated data function (for manual simulated mode)
  const refreshSimulatedData = useCallback(() => {
    setSimulatedDataVersion((v) => v + 1);
    setLastUpdated(new Date());
    setCountdown(TIMEFRAME_CONFIG[timeframe].refreshInterval);
    setProvider("simulated");
    setIsCached(false);
  }, [timeframe]);

  // Unified refresh function that works for both data sources
  const refreshNow = useCallback(() => {
    if (dataSource === "yahoo") {
      // Use backend (which handles fallback internally)
      fetchBackendData(true); // Force refresh to bypass cache
    } else {
      // Manual simulated mode - use client-side generation
      refreshSimulatedData();
    }
  }, [dataSource, fetchBackendData, refreshSimulatedData]);

  // Initialize data and countdown when data source changes
  useEffect(() => {
    if (dataSource === "yahoo") {
      fetchBackendData();
    } else {
      // Manual simulated data source - use client-side generation
      setFetchError(null);
      setMarketStatus(null);
      setLastUpdated(new Date());
      setCountdown(TIMEFRAME_CONFIG[timeframe].refreshInterval);
      setProvider("simulated");
      setIsCached(false);
    }
  }, [dataSource, symbol, timeframe, fetchBackendData]);

  // Auto-refresh countdown timer (works for both data sources)
  useEffect(() => {
    if (!autoRefreshEnabled) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Refresh based on current data source
          if (dataSource === "yahoo") {
            fetchBackendData();
          } else {
            refreshSimulatedData();
          }
          return TIMEFRAME_CONFIG[timeframe].refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [dataSource, autoRefreshEnabled, timeframe, fetchBackendData, refreshSimulatedData]);

  // Use appropriate data based on source
  const data = useMemo(() => {
    // Use backend data if available (for yahoo mode) and backend is reachable
    if (dataSource === "yahoo" && backendData.length > 0 && !isBackendUnavailable) {
      return backendData;
    }
    // Fall back to client-side simulated data (manual mode or backend unavailable)
    return simulatedData;
  }, [dataSource, backendData, simulatedData, isBackendUnavailable]);

  // Track whether we're showing simulated data
  const isUsingSimulatedData = useMemo(() => {
    // True if: manual simulated mode, backend unavailable, OR backend returned simulated provider
    return dataSource !== "yahoo" || isBackendUnavailable || provider === "simulated" || provider === "fallback";
  }, [dataSource, provider, isBackendUnavailable]);

  return {
    data,
    isLoading,
    isLoadingMore,
    fetchError,
    lastUpdated,
    countdown,
    autoRefreshEnabled,
    marketStatus,
    isRateLimited,
    isUsingSimulatedData,
    isBackendUnavailable,
    isCached,
    provider,
    setAutoRefreshEnabled,
    refreshNow,
    loadMoreData,
  };
}
