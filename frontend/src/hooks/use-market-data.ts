"use client";

/**
 * Hook for fetching and managing market data from Yahoo Finance.
 * Handles auto-refresh, countdown timer, market status, and infinite scrolling.
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
  const oldestLoadedTimeRef = useRef<string | null>(null);

  // Generate simulated data (only after mount to avoid hydration mismatch)
  const simulatedData = useMemo(() => {
    if (!hasMounted) return [];
    const config = TIMEFRAME_CONFIG[timeframe];
    return generateMarketData(symbol, timeframe, config.periods);
  }, [symbol, timeframe, hasMounted]);

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
        throw new Error(result.error || "Failed to fetch data");
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
      console.error("Failed to fetch market data:", error);
      setFetchError(
        error instanceof Error ? error.message : "Failed to fetch market data"
      );
    } finally {
      setIsLoading(false);
    }
  }, [symbol, timeframe]);

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

  // Fetch Yahoo Finance data when dataSource is "yahoo"
  useEffect(() => {
    if (dataSource !== "yahoo") {
      setFetchError(null);
      setLastUpdated(null);
      setCountdown(0);
      setMarketStatus(null);
      return;
    }

    fetchYahooData();
  }, [dataSource, symbol, timeframe, fetchYahooData]);

  // Auto-refresh countdown timer
  useEffect(() => {
    if (dataSource !== "yahoo" || !autoRefreshEnabled) {
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchYahooData();
          return TIMEFRAME_CONFIG[timeframe].refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [dataSource, autoRefreshEnabled, timeframe, fetchYahooData]);

  // Use appropriate data based on source
  const data = useMemo(() => {
    if (dataSource === "yahoo" && yahooData.length > 0) {
      return yahooData;
    }
    return simulatedData;
  }, [dataSource, yahooData, simulatedData]);

  return {
    data,
    isLoading,
    isLoadingMore,
    fetchError,
    lastUpdated,
    countdown,
    autoRefreshEnabled,
    marketStatus,
    setAutoRefreshEnabled,
    refreshNow: fetchYahooData,
    loadMoreData,
  };
}
