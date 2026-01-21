/**
 * useTrendLines Hook
 *
 * Fetches trend line data from the backend and generates chart overlays.
 * Trend lines connect HH (Higher High) and LL (Lower Low) points separately.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import type { Time } from "lightweight-charts";
import type { LineOverlay } from "@/components/trading";
import {
  type TrendLinesResult,
  generateTrendLineOverlays,
} from "@/lib/chart-pro/swing-overlays";

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

type UseTrendLinesOptions = {
  data: OHLCData[];
  lookback?: number;
  enabled?: boolean;
  projectBars?: number;
};

type UseTrendLinesResult = {
  trendLines: TrendLinesResult | null;
  overlays: LineOverlay[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useTrendLines({
  data,
  lookback = 5,
  enabled = true,
  projectBars = 20,
}: UseTrendLinesOptions): UseTrendLinesResult {
  const [trendLines, setTrendLines] = useState<TrendLinesResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrendLines = useCallback(async () => {
    if (!enabled || data.length < lookback * 2 + 1) {
      setTrendLines(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/pivot/trend-lines`, {
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
          lookback,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result: TrendLinesResult = await response.json();
      setTrendLines(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setTrendLines(null);
    } finally {
      setIsLoading(false);
    }
  }, [data, lookback, enabled]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchTrendLines();
  }, [fetchTrendLines]);

  // Generate overlays from trend lines data
  const overlays = useMemo(() => {
    return generateTrendLineOverlays(trendLines, data, projectBars);
  }, [trendLines, data, projectBars]);

  return {
    trendLines,
    overlays,
    isLoading,
    error,
    refresh: fetchTrendLines,
  };
}
