"use client";

/**
 * Hook for calculating MACD indicator from the backend API.
 *
 * Per ADR-20260101, technical indicators are calculated in the backend
 * following the thin client architecture.
 */

import { useState, useEffect, useCallback } from "react";
import type { OHLCData } from "@/components/trading";

export type MACDData = {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
};

export type UseMACDOptions = {
  data: OHLCData[];
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  enabled?: boolean;
};

export type UseMACDReturn = {
  macdData: MACDData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

const API_BASE = "/api/trader";

/**
 * Fetches MACD indicator values from the backend API.
 */
export function useMACD({
  data,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
  enabled = true,
}: UseMACDOptions): UseMACDReturn {
  const [macdData, setMacdData] = useState<MACDData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMACD = useCallback(async () => {
    // Need enough data for slow period
    if (!enabled || data.length < slowPeriod) {
      setMacdData(null);
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

      const response = await fetch(`${API_BASE}/indicators/macd`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: ohlcData,
          fast_period: fastPeriod,
          slow_period: slowPeriod,
          signal_period: signalPeriod,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setMacdData({
        macd: result.macd,
        signal: result.signal,
        histogram: result.histogram,
      });
    } catch (err) {
      console.error("Failed to fetch MACD:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch MACD");
      setMacdData(null);
    } finally {
      setIsLoading(false);
    }
  }, [data, fastPeriod, slowPeriod, signalPeriod, enabled]);

  // Fetch MACD when dependencies change
  useEffect(() => {
    fetchMACD();
  }, [fetchMACD]);

  const refresh = useCallback(() => {
    fetchMACD();
  }, [fetchMACD]);

  return {
    macdData,
    isLoading,
    error,
    refresh,
  };
}
