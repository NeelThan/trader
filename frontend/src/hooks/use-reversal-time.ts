/**
 * useReversalTime Hook
 *
 * Fetches reversal time estimates from the backend.
 * Estimates how many bars/time it will take to reach Fibonacci levels
 * based on current price velocity.
 */

import { useState, useEffect, useCallback } from "react";
import type { Time } from "lightweight-charts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type OHLCData = {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
};

// Convert Time to string/number for API
function timeToApiFormat(time: Time): string | number {
  if (typeof time === "number" || typeof time === "string") {
    return time;
  }
  // BusinessDay object - convert to ISO string
  return `${time.year}-${String(time.month).padStart(2, "0")}-${String(time.day).padStart(2, "0")}`;
}

type FibLevel = {
  label: string;
  price: number;
};

type VelocityMetrics = {
  bars_per_atr: number;
  price_per_bar: number;
  direction: "up" | "down" | "sideways";
  consistency: number;
};

type LevelTimeEstimate = {
  target_price: number;
  target_label: string;
  estimated_bars: number;
  estimated_time: string | null;
  confidence: number;
  distance_atr: number;
};

type ReversalTimeResult = {
  estimates: LevelTimeEstimate[];
  velocity: VelocityMetrics;
  current_price: number;
};

type UseReversalTimeOptions = {
  data: OHLCData[];
  fibLevels: FibLevel[];
  timeframe?: string;
  lookback?: number;
  atrPeriod?: number;
  enabled?: boolean;
};

type UseReversalTimeResult = {
  result: ReversalTimeResult | null;
  estimates: LevelTimeEstimate[];
  velocity: VelocityMetrics | null;
  currentPrice: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useReversalTime({
  data,
  fibLevels,
  timeframe = "1D",
  lookback = 10,
  atrPeriod = 14,
  enabled = true,
}: UseReversalTimeOptions): UseReversalTimeResult {
  const [result, setResult] = useState<ReversalTimeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReversalTime = useCallback(async () => {
    if (!enabled || data.length < lookback + atrPeriod || fibLevels.length === 0) {
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/workflow/reversal-time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: data.map((bar) => ({
            time: timeToApiFormat(bar.time),
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          })),
          fib_levels: fibLevels.map((lvl) => ({
            label: lvl.label,
            price: lvl.price,
          })),
          timeframe,
          lookback,
          atr_period: atrPeriod,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data_result: ReversalTimeResult = await response.json();
      setResult(data_result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, [data, fibLevels, timeframe, lookback, atrPeriod, enabled]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchReversalTime();
  }, [fetchReversalTime]);

  return {
    result,
    estimates: result?.estimates ?? [],
    velocity: result?.velocity ?? null,
    currentPrice: result?.current_price ?? 0,
    isLoading,
    error,
    refresh: fetchReversalTime,
  };
}

// Re-export types for convenience
export type {
  VelocityMetrics,
  LevelTimeEstimate,
  ReversalTimeResult,
  FibLevel,
};
