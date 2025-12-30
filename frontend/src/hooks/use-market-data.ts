"use client";

/**
 * Hook for fetching and managing market data from Yahoo Finance.
 * Handles auto-refresh, countdown timer, and market status.
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { OHLCData } from "@/components/trading";
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
  fetchError: string | null;
  lastUpdated: Date | null;
  countdown: number;
  autoRefreshEnabled: boolean;
  marketStatus: MarketStatus | null;
  setAutoRefreshEnabled: (enabled: boolean) => void;
  refreshNow: () => void;
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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);

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

      setYahooData(result.data as OHLCData[]);
      setLastUpdated(new Date());
      setCountdown(TIMEFRAME_CONFIG[timeframe].refreshInterval);

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
    fetchError,
    lastUpdated,
    countdown,
    autoRefreshEnabled,
    marketStatus,
    setAutoRefreshEnabled,
    refreshNow: fetchYahooData,
  };
}
