"use client";

/**
 * Hook for fetching and managing market data.
 * Supports both Yahoo Finance (live) and simulated data with auto-refresh.
 * Handles countdown timer, market status, and infinite scrolling.
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

export type UseMarketDataReturn = {
  data: OHLCData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  fetchError: string | null;
  lastUpdated: Date | null;
  countdown: number;
  autoRefreshEnabled: boolean;
  marketStatus: MarketStatus | null;
  isRateLimited: boolean; // True when using simulated data due to rate limit
  isUsingSimulatedData: boolean; // True when displaying simulated data
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
  // Yahoo Finance API state
  const [yahooData, setYahooData] = useState<OHLCData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [simulatedDataVersion, setSimulatedDataVersion] = useState(0); // Increments to trigger regeneration
  const oldestLoadedTimeRef = useRef<string | null>(null);
  const rateLimitLoggedRef = useRef(false); // Prevent console log flooding

  // Generate simulated data (regenerates when version changes or symbol/timeframe changes)
  const simulatedData = useMemo(() => {
    if (!hasMounted) return [];
    const config = TIMEFRAME_CONFIG[timeframe];
    return generateMarketData(symbol, timeframe, config.periods);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe, hasMounted, simulatedDataVersion]);

  // Fetch Yahoo Finance data function
  const fetchYahooData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const response = await fetch(
        `/api/market-data?symbol=${symbol}&timeframe=${timeframe}`
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.market) {
          setMarketStatus(result.market);
        }

        // Handle rate limiting gracefully - fall back to simulated data
        if (response.status === 429 || result.code === "RATE_LIMIT") {
          if (!rateLimitLoggedRef.current) {
            console.warn(
              "Yahoo Finance rate limit reached. Using simulated data. " +
              "Live data will resume when rate limit resets."
            );
            rateLimitLoggedRef.current = true;
          }
          setIsRateLimited(true);
          // Don't throw - just use simulated data
          setFetchError("Rate limited - using simulated data");
          // Set a longer countdown before retrying
          setCountdown(Math.max(60, TIMEFRAME_CONFIG[timeframe].refreshInterval));
          return;
        }

        throw new Error(result.error || "Failed to fetch data");
      }

      // Success - clear rate limit state
      if (isRateLimited) {
        setIsRateLimited(false);
        rateLimitLoggedRef.current = false;
      }

      const newData = result.data as OHLCData[];
      setYahooData(newData);
      setLastUpdated(new Date());
      setCountdown(TIMEFRAME_CONFIG[timeframe].refreshInterval);

      // Track the oldest loaded time for preventing duplicate loads
      if (newData.length > 0) {
        oldestLoadedTimeRef.current = String(newData[0].time);
      }

      if (result.market) {
        setMarketStatus(result.market);
      }
    } catch (error) {
      // Only log non-rate-limit errors once per error type
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch market data";
      console.error("Failed to fetch market data:", errorMessage);
      setFetchError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe, isRateLimited]);

  // Load more historical data (for infinite scroll)
  const loadMoreData = useCallback(async (oldestTime: Time) => {
    if (dataSource !== "yahoo" || isLoadingMore) return;

    // Convert time to ISO string for API
    let beforeDate: string;
    if (typeof oldestTime === "number") {
      // Unix timestamp (seconds)
      beforeDate = new Date(oldestTime * 1000).toISOString();
    } else if (typeof oldestTime === "string") {
      // Date string (YYYY-MM-DD)
      beforeDate = new Date(oldestTime).toISOString();
    } else {
      // BusinessDay object { year, month, day }
      beforeDate = new Date(oldestTime.year, oldestTime.month - 1, oldestTime.day).toISOString();
    }

    // Prevent loading the same data twice
    if (oldestLoadedTimeRef.current === String(oldestTime)) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const response = await fetch(
        `/api/market-data?symbol=${symbol}&timeframe=${timeframe}&before=${beforeDate}`
      );

      const result = await response.json();

      if (!response.ok) {
        console.error("Failed to load more data:", result.error);
        return;
      }

      const olderData = result.data as OHLCData[];

      if (olderData.length > 0) {
        // Update oldest loaded time
        oldestLoadedTimeRef.current = String(olderData[0].time);

        // Prepend older data to existing data (avoid duplicates by checking time)
        setYahooData((prev) => {
          const existingTimes = new Set(prev.map((d) => String(d.time)));
          const uniqueOlderData = olderData.filter(
            (d) => !existingTimes.has(String(d.time))
          );
          return [...uniqueOlderData, ...prev];
        });
      }
    } catch (error) {
      console.error("Failed to load more data:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [symbol, timeframe, dataSource, isLoadingMore]);

  // Refresh simulated data function
  const refreshSimulatedData = useCallback(() => {
    setSimulatedDataVersion((v) => v + 1);
    setLastUpdated(new Date());
    setCountdown(TIMEFRAME_CONFIG[timeframe].refreshInterval);
  }, [timeframe]);

  // Unified refresh function that works for both data sources
  const refreshNow = useCallback(() => {
    if (dataSource === "yahoo" && !isRateLimited) {
      fetchYahooData();
    } else {
      // Refresh simulated data (either explicit simulated source or rate-limited fallback)
      refreshSimulatedData();
    }
  }, [dataSource, isRateLimited, fetchYahooData, refreshSimulatedData]);

  // Initialize data and countdown when data source changes
  useEffect(() => {
    if (dataSource === "yahoo") {
      fetchYahooData();
    } else {
      // Simulated data source - clear Yahoo state and start countdown
      setFetchError(null);
      setMarketStatus(null);
      setLastUpdated(new Date());
      setCountdown(TIMEFRAME_CONFIG[timeframe].refreshInterval);
    }
  }, [dataSource, symbol, timeframe, fetchYahooData]);

  // Auto-refresh countdown timer (works for both data sources)
  useEffect(() => {
    if (!autoRefreshEnabled) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Refresh based on current data source
          if (dataSource === "yahoo" && !isRateLimited) {
            fetchYahooData();
          } else {
            refreshSimulatedData();
          }
          return TIMEFRAME_CONFIG[timeframe].refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [dataSource, autoRefreshEnabled, timeframe, isRateLimited, fetchYahooData, refreshSimulatedData]);

  // Use appropriate data based on source and rate limit status
  const data = useMemo(() => {
    // If rate limited, fall back to simulated data
    if (isRateLimited) {
      return simulatedData;
    }
    // Use Yahoo data if available
    if (dataSource === "yahoo" && yahooData.length > 0) {
      return yahooData;
    }
    return simulatedData;
  }, [dataSource, yahooData, simulatedData, isRateLimited]);

  // Track whether we're showing simulated data
  const isUsingSimulatedData = useMemo(() => {
    return isRateLimited || dataSource !== "yahoo" || yahooData.length === 0;
  }, [isRateLimited, dataSource, yahooData.length]);

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
    setAutoRefreshEnabled,
    refreshNow,
    loadMoreData,
  };
}
