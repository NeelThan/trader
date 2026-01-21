"use client";

/**
 * Hook for analyzing trend alignment across ALL timeframes.
 *
 * ADR Compliant: All business logic is handled server-side via /workflow/trend-alignment.
 * This hook is a pure presentation layer that fetches and transforms data.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { type Timeframe, type MarketSymbol } from "@/lib/chart-constants";

export type TrendDirection = "bullish" | "bearish" | "ranging";

export type IndicatorStatus = {
  signal: "bullish" | "bearish" | "neutral";
  value?: number;
};

/**
 * Pivot point data for analysis
 */
export type PivotData = {
  index: number;
  price: number;
  type: "high" | "low";
  time: string | number;
};

/**
 * Swing marker data for analysis
 */
export type SwingMarkerTrend = {
  index: number;
  price: number;
  time: string | number;
  swingType: "HH" | "HL" | "LH" | "LL";
};

export type TimeframeTrend = {
  timeframe: Timeframe;
  trend: TrendDirection;
  confidence: number; // 0-100
  swing: IndicatorStatus;
  rsi: IndicatorStatus;
  macd: IndicatorStatus;
  isLoading: boolean;
  error: string | null;
  /** Raw pivot points from swing detection (for pivot-based sync) */
  pivots?: PivotData[];
  /** Raw swing markers from detection (for pivot-based sync) */
  markers?: SwingMarkerTrend[];
  /** Current (latest) price for this timeframe */
  currentPrice?: number;
  /** True if price is moving sideways within a range */
  isRanging?: boolean;
  /** Warning message when ranging detected */
  rangingWarning?: string | null;
};

export type OverallAlignment = {
  direction: TrendDirection;
  strength: "strong" | "moderate" | "weak";
  bullishCount: number;
  bearishCount: number;
  rangingCount: number;
  description: string;
};

export type UseTrendAlignmentOptions = {
  symbol: MarketSymbol;
  timeframes?: Timeframe[];
  lookback?: number;
  enabled?: boolean;
};

export type UseTrendAlignmentReturn = {
  trends: TimeframeTrend[];
  overall: OverallAlignment;
  isLoading: boolean;
  refresh: () => void;
};

const ALL_TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "5m", "3m", "1m"];
const API_BASE = "/api/trader";

/**
 * Backend API response types
 */
interface BackendIndicatorSignal {
  signal: "bullish" | "bearish" | "neutral";
  value: number | null;
}

interface BackendPivotPoint {
  index: number;
  price: number;
  type: "high" | "low";
  time: string | number;
}

interface BackendSwingMarker {
  index: number;
  price: number;
  time: string | number;
  swing_type: "HH" | "HL" | "LH" | "LL";
}

interface BackendTimeframeTrend {
  timeframe: string;
  trend: "bullish" | "bearish" | "neutral";
  confidence: number;
  swing: BackendIndicatorSignal;
  rsi: BackendIndicatorSignal;
  macd: BackendIndicatorSignal;
  current_price: number | null;
  is_ranging: boolean;
  ranging_warning: string | null;
  pivots: BackendPivotPoint[];
  markers: BackendSwingMarker[];
}

interface BackendOverallAlignment {
  direction: "bullish" | "bearish" | "neutral";
  strength: "strong" | "moderate" | "weak";
  bullish_count: number;
  bearish_count: number;
  ranging_count: number;
  description: string;
}

interface BackendTrendAlignmentResult {
  trends: BackendTimeframeTrend[];
  overall: BackendOverallAlignment;
}

/**
 * Convert backend trend direction to frontend format
 */
function convertTrendDirection(trend: "bullish" | "bearish" | "neutral"): TrendDirection {
  if (trend === "neutral") return "ranging";
  return trend;
}

/**
 * Convert backend response to frontend format
 */
function convertBackendToFrontend(
  backend: BackendTrendAlignmentResult
): { trends: TimeframeTrend[]; overall: OverallAlignment } {
  const trends: TimeframeTrend[] = backend.trends.map((t) => ({
    timeframe: t.timeframe as Timeframe,
    trend: convertTrendDirection(t.trend),
    confidence: t.confidence,
    swing: {
      signal: t.swing.signal,
      value: t.swing.value ?? undefined,
    },
    rsi: {
      signal: t.rsi.signal,
      value: t.rsi.value ?? undefined,
    },
    macd: {
      signal: t.macd.signal,
      value: t.macd.value ?? undefined,
    },
    isLoading: false,
    error: null,
    pivots: t.pivots.map((p) => ({
      index: p.index,
      price: p.price,
      type: p.type,
      time: p.time,
    })),
    markers: t.markers.map((m) => ({
      index: m.index,
      price: m.price,
      time: m.time,
      swingType: m.swing_type,
    })),
    currentPrice: t.current_price ?? undefined,
    isRanging: t.is_ranging,
    rangingWarning: t.ranging_warning,
  }));

  const overall: OverallAlignment = {
    direction: convertTrendDirection(backend.overall.direction),
    strength: backend.overall.strength,
    bullishCount: backend.overall.bullish_count,
    bearishCount: backend.overall.bearish_count,
    rangingCount: backend.overall.ranging_count,
    description: backend.overall.description,
  };

  return { trends, overall };
}

/**
 * Create initial loading state for timeframes
 */
function createLoadingState(timeframes: Timeframe[]): TimeframeTrend[] {
  return timeframes.map((tf) => ({
    timeframe: tf,
    trend: "ranging",
    confidence: 0,
    swing: { signal: "neutral" },
    rsi: { signal: "neutral" },
    macd: { signal: "neutral" },
    isLoading: true,
    error: null,
  }));
}

/**
 * Create error state for a single timeframe
 */
function createErrorTrend(timeframe: Timeframe, error: string): TimeframeTrend {
  return {
    timeframe,
    trend: "ranging",
    confidence: 0,
    swing: { signal: "neutral" },
    rsi: { signal: "neutral" },
    macd: { signal: "neutral" },
    isLoading: false,
    error,
  };
}

/**
 * Hook for analyzing trend alignment across multiple timeframes.
 *
 * ADR Compliant: Calls backend /workflow/trend-alignment endpoint.
 * All analysis logic is server-side.
 */
export function useTrendAlignment({
  symbol,
  timeframes = ALL_TIMEFRAMES,
  lookback = 5,
  enabled = true,
}: UseTrendAlignmentOptions): UseTrendAlignmentReturn {
  const [trends, setTrends] = useState<TimeframeTrend[]>(() =>
    createLoadingState(timeframes)
  );
  const [overall, setOverall] = useState<OverallAlignment>({
    direction: "ranging",
    strength: "weak",
    bullishCount: 0,
    bearishCount: 0,
    rangingCount: 0,
    description: "Loading...",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Fetch trend alignment from backend API
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setTrends(createLoadingState(timeframes));

    async function fetchTrendAlignment() {
      try {
        const params = new URLSearchParams({
          symbol,
          timeframes: timeframes.join(","),
          lookback: String(lookback),
        });

        const response = await fetch(
          `${API_BASE}/workflow/trend-alignment?${params}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          // Backend unavailable
          const errorMessage = response.status === 503
            ? "Backend unavailable - start the backend server for full analysis"
            : `API error: ${response.status}`;

          setTrends(timeframes.map((tf) => createErrorTrend(tf, errorMessage)));
          setOverall({
            direction: "ranging",
            strength: "weak",
            bullishCount: 0,
            bearishCount: 0,
            rangingCount: 0,
            description: "Backend unavailable",
          });
          setIsLoading(false);
          return;
        }

        const data: BackendTrendAlignmentResult = await response.json();
        const { trends: convertedTrends, overall: convertedOverall } =
          convertBackendToFrontend(data);

        setTrends(convertedTrends);
        setOverall(convertedOverall);
        setIsLoading(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return;
        }

        const errorMessage = (err as Error).message || "Failed to fetch trend data";
        setTrends(timeframes.map((tf) => createErrorTrend(tf, errorMessage)));
        setOverall({
          direction: "ranging",
          strength: "weak",
          bullishCount: 0,
          bearishCount: 0,
          rangingCount: 0,
          description: "Error loading data",
        });
        setIsLoading(false);
      }
    }

    fetchTrendAlignment();

    return () => {
      controller.abort();
    };
  }, [symbol, timeframes, lookback, enabled, refreshKey]);

  return {
    trends,
    overall,
    isLoading,
    refresh,
  };
}
