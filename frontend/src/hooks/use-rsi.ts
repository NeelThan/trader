"use client";

/**
 * Hook for calculating RSI indicator from the backend API.
 *
 * Per ADR-20260101, technical indicators are calculated in the backend
 * following the thin client architecture.
 */

import { useState, useEffect, useCallback } from "react";
import type { OHLCData } from "@/components/trading";

export type RSIData = {
  rsi: (number | null)[];
};

export type UseRSIOptions = {
  data: OHLCData[];
  period?: number;
  enabled?: boolean;
};

export type UseRSIReturn = {
  rsiData: RSIData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

const API_BASE = "/api/trader";

/**
 * Fetches RSI indicator values from the backend API.
 */
export function useRSI({
  data,
  period = 14,
  enabled = true,
}: UseRSIOptions): UseRSIReturn {
  const [rsiData, setRsiData] = useState<RSIData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRSI = useCallback(async () => {
    // Need enough data for period + 1
    if (!enabled || data.length < period + 1) {
      setRsiData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert OHLCData to the format expected by the API
      const ohlcData = data.map((bar) => ({
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }));

      const response = await fetch(`${API_BASE}/indicators/rsi`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: ohlcData,
          period,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setRsiData({
        rsi: result.rsi,
      });
    } catch (err) {
      console.error("Failed to fetch RSI:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch RSI");
      setRsiData(null);
    } finally {
      setIsLoading(false);
    }
  }, [data, period, enabled]);

  // Fetch RSI when dependencies change
  useEffect(() => {
    fetchRSI();
  }, [fetchRSI]);

  const refresh = useCallback(() => {
    fetchRSI();
  }, [fetchRSI]);

  return {
    rsiData,
    isLoading,
    error,
    refresh,
  };
}
