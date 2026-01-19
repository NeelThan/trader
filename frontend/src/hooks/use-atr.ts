"use client";

/**
 * Hook for fetching ATR (Average True Range) indicator from the backend API.
 *
 * ATR measures volatility and helps with:
 * - Stop loss placement (1x, 1.5x, 2x ATR)
 * - Position sizing based on volatility
 * - Identifying market conditions (quiet vs volatile)
 *
 * Per ADR-20260101, technical indicators are calculated in the backend
 * following the thin client architecture. Frontend is a dumb client.
 */

import { useState, useEffect, useCallback } from "react";
import type { OHLCData } from "@/components/trading";

export type ATRAnalysis = {
  atr: number;
  atr_percent: number;
  volatility_level: "low" | "normal" | "high" | "extreme";
  current_price: number;
  suggested_stop_1x: number;
  suggested_stop_1_5x: number;
  suggested_stop_2x: number;
  interpretation: string;
};

export type ATRData = {
  atr_values: (number | null)[];
  analysis: ATRAnalysis | null;
};

export type UseATROptions = {
  data: OHLCData[];
  period?: number;
  enabled?: boolean;
};

export type UseATRReturn = {
  atrData: ATRData | null;
  isLoading: boolean;
  error: string | null;
  isBackendUnavailable: boolean;
  refresh: () => void;
};

const API_BASE = "/api/trader";

/**
 * Fetches ATR indicator values from the backend API.
 * Frontend is a dumb client - all calculations done by backend.
 */
export function useATR({
  data,
  period = 14,
  enabled = true,
}: UseATROptions): UseATRReturn {
  const [atrData, setAtrData] = useState<ATRData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackendUnavailable, setIsBackendUnavailable] = useState(false);

  const fetchATR = useCallback(async () => {
    // Need enough data for ATR period
    if (!enabled || data.length < period) {
      setAtrData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsBackendUnavailable(false);

    try {
      // Convert OHLCData to the format expected by the API
      const ohlcData = data.map((bar) => ({
        time: bar.time,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
      }));

      const response = await fetch(`${API_BASE}/indicators/atr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: ohlcData,
          period,
        }),
      });

      if (response.status === 503) {
        setIsBackendUnavailable(true);
        setAtrData(null);
        setError(null); // Not an error, just backend unavailable
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setAtrData({
        atr_values: result.atr_values,
        analysis: result.analysis,
      });
    } catch (err) {
      // Check for connection errors (backend not running)
      if (err instanceof TypeError && err.message.toLowerCase().includes("fetch")) {
        setIsBackendUnavailable(true);
        setAtrData(null);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to fetch ATR");
        setAtrData(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [data, period, enabled]);

  // Fetch ATR when dependencies change
  useEffect(() => {
    fetchATR();
  }, [fetchATR]);

  const refresh = useCallback(() => {
    fetchATR();
  }, [fetchATR]);

  return {
    atrData,
    isLoading,
    error,
    isBackendUnavailable,
    refresh,
  };
}
