"use client";

/**
 * Hook for analyzing trend alignment across ALL timeframes.
 *
 * Uses multiple indicators to determine trend:
 * - Swing patterns (HH/HL = bullish, LH/LL = bearish)
 * - RSI (above 50 = bullish momentum, below 50 = bearish momentum)
 * - MACD (histogram > 0 = bullish, < 0 = bearish)
 *
 * Each indicator contributes to a weighted score that determines overall trend.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { TIMEFRAME_CONFIG, type Timeframe, type MarketSymbol } from "@/lib/chart-constants";

export type TrendDirection = "bullish" | "bearish" | "ranging";

export type IndicatorStatus = {
  signal: "bullish" | "bearish" | "neutral";
  value?: number;
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

const ALL_TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "1m"];
const API_BASE = "/api/trader";

/**
 * Analyze swing markers to get swing-based trend signal
 */
function analyzeSwingTrend(markers: Array<{ swingType: string }>): IndicatorStatus {
  if (markers.length < 2) {
    return { signal: "neutral" };
  }

  let bullish = 0;
  let bearish = 0;

  for (const marker of markers) {
    if (marker.swingType === "HH" || marker.swingType === "HL") {
      bullish++;
    } else if (marker.swingType === "LH" || marker.swingType === "LL") {
      bearish++;
    }
  }

  const total = bullish + bearish;
  if (total === 0) return { signal: "neutral" };

  const bullishRatio = bullish / total;
  if (bullishRatio >= 0.6) return { signal: "bullish", value: Math.round(bullishRatio * 100) };
  if (bullishRatio <= 0.4) return { signal: "bearish", value: Math.round((1 - bullishRatio) * 100) };
  return { signal: "neutral", value: 50 };
}

/**
 * Analyze RSI to get momentum signal
 */
function analyzeRSI(rsi: number | null): IndicatorStatus {
  if (rsi === null) return { signal: "neutral" };

  if (rsi >= 60) return { signal: "bullish", value: rsi };
  if (rsi <= 40) return { signal: "bearish", value: rsi };
  if (rsi > 50) return { signal: "bullish", value: rsi };
  if (rsi < 50) return { signal: "bearish", value: rsi };
  return { signal: "neutral", value: rsi };
}

/**
 * Analyze MACD histogram for momentum signal
 */
function analyzeMACD(histogram: number | null): IndicatorStatus {
  if (histogram === null) return { signal: "neutral" };

  if (histogram > 0) return { signal: "bullish", value: histogram };
  if (histogram < 0) return { signal: "bearish", value: histogram };
  return { signal: "neutral", value: 0 };
}

/**
 * Combine indicator signals into overall trend
 */
function combineTrends(
  swing: IndicatorStatus,
  rsi: IndicatorStatus,
  macd: IndicatorStatus
): { trend: TrendDirection; confidence: number } {
  // Weight: Swing 40%, RSI 30%, MACD 30%
  const weights = { swing: 0.4, rsi: 0.3, macd: 0.3 };

  let bullishScore = 0;
  let bearishScore = 0;
  let totalWeight = 0;

  if (swing.signal !== "neutral") {
    if (swing.signal === "bullish") bullishScore += weights.swing;
    else bearishScore += weights.swing;
    totalWeight += weights.swing;
  }

  if (rsi.signal !== "neutral") {
    if (rsi.signal === "bullish") bullishScore += weights.rsi;
    else bearishScore += weights.rsi;
    totalWeight += weights.rsi;
  }

  if (macd.signal !== "neutral") {
    if (macd.signal === "bullish") bullishScore += weights.macd;
    else bearishScore += weights.macd;
    totalWeight += weights.macd;
  }

  if (totalWeight === 0) {
    return { trend: "ranging", confidence: 0 };
  }

  // Normalize scores
  const normalizedBullish = bullishScore / totalWeight;
  const normalizedBearish = bearishScore / totalWeight;

  // Determine trend
  if (normalizedBullish >= 0.65) {
    return { trend: "bullish", confidence: Math.round(normalizedBullish * 100) };
  }
  if (normalizedBearish >= 0.65) {
    return { trend: "bearish", confidence: Math.round(normalizedBearish * 100) };
  }
  if (normalizedBullish > normalizedBearish && normalizedBullish >= 0.5) {
    return { trend: "bullish", confidence: Math.round(normalizedBullish * 100) };
  }
  if (normalizedBearish > normalizedBullish && normalizedBearish >= 0.5) {
    return { trend: "bearish", confidence: Math.round(normalizedBearish * 100) };
  }

  return { trend: "ranging", confidence: 50 };
}

/**
 * Calculate overall alignment from individual timeframe trends
 */
function calculateOverallAlignment(trends: TimeframeTrend[]): OverallAlignment {
  const validTrends = trends.filter(t => !t.isLoading && !t.error);

  if (validTrends.length === 0) {
    return {
      direction: "ranging",
      strength: "weak",
      bullishCount: 0,
      bearishCount: 0,
      rangingCount: 0,
      description: "Insufficient data",
    };
  }

  const bullishCount = validTrends.filter(t => t.trend === "bullish").length;
  const bearishCount = validTrends.filter(t => t.trend === "bearish").length;
  const rangingCount = validTrends.filter(t => t.trend === "ranging").length;
  const total = validTrends.length;

  const bullishRatio = bullishCount / total;
  const bearishRatio = bearishCount / total;

  let direction: TrendDirection;
  let strength: "strong" | "moderate" | "weak";
  let description: string;

  if (bullishRatio >= 0.7) {
    direction = "bullish";
    strength = "strong";
    description = `Strong bullish alignment (${bullishCount}/${total} timeframes)`;
  } else if (bullishRatio >= 0.5) {
    direction = "bullish";
    strength = "moderate";
    description = `Moderate bullish bias (${bullishCount}/${total} timeframes)`;
  } else if (bearishRatio >= 0.7) {
    direction = "bearish";
    strength = "strong";
    description = `Strong bearish alignment (${bearishCount}/${total} timeframes)`;
  } else if (bearishRatio >= 0.5) {
    direction = "bearish";
    strength = "moderate";
    description = `Moderate bearish bias (${bearishCount}/${total} timeframes)`;
  } else {
    direction = "ranging";
    strength = rangingCount >= total / 2 ? "moderate" : "weak";
    description = `Mixed signals (${bullishCount} bullish, ${bearishCount} bearish, ${rangingCount} ranging)`;
  }

  return {
    direction,
    strength,
    bullishCount,
    bearishCount,
    rangingCount,
    description,
  };
}

/**
 * Hook for analyzing trend alignment across multiple timeframes.
 */
export function useTrendAlignment({
  symbol,
  timeframes = ALL_TIMEFRAMES,
  lookback = 5,
  enabled = true,
}: UseTrendAlignmentOptions): UseTrendAlignmentReturn {
  const [trends, setTrends] = useState<TimeframeTrend[]>(() =>
    timeframes.map(tf => ({
      timeframe: tf,
      trend: "ranging",
      confidence: 0,
      swing: { signal: "neutral" },
      rsi: { signal: "neutral" },
      macd: { signal: "neutral" },
      isLoading: true,
      error: null,
    }))
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  // Fetch all indicator data for all timeframes
  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();

    async function fetchTrendForTimeframe(tf: Timeframe): Promise<TimeframeTrend> {
      try {
        // Fetch market data using query params format
        // Use TIMEFRAME_CONFIG periods for appropriate detail per timeframe
        const params = new URLSearchParams({
          symbol,
          timeframe: tf,
          periods: String(TIMEFRAME_CONFIG[tf].periods),
        });
        const marketRes = await fetch(
          `${API_BASE}/market-data?${params}`,
          { signal: controller.signal }
        );

        if (!marketRes.ok) {
          throw new Error(`Market data: ${marketRes.status}`);
        }

        const marketData = await marketRes.json();
        const bars = marketData.data || [];

        if (bars.length < 26) {
          return {
            timeframe: tf,
            trend: "ranging",
            confidence: 0,
            swing: { signal: "neutral" },
            rsi: { signal: "neutral" },
            macd: { signal: "neutral" },
            isLoading: false,
            error: "Insufficient data",
          };
        }

        // Prepare OHLC data for API calls
        const ohlcData = bars.map((bar: { time: string | number; open: number; high: number; low: number; close: number }) => ({
          time: bar.time,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        }));

        // Fetch swing markers, RSI, and MACD in parallel
        const [swingRes, rsiRes, macdRes] = await Promise.all([
          fetch(`${API_BASE}/pivot/swings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: ohlcData,
              lookback,
            }),
            signal: controller.signal,
          }),
          fetch(`${API_BASE}/indicators/rsi`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: ohlcData,
              period: 14,
            }),
            signal: controller.signal,
          }),
          fetch(`${API_BASE}/indicators/macd`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: ohlcData,
              fast_period: 12,
              slow_period: 26,
              signal_period: 9,
            }),
            signal: controller.signal,
          }),
        ]);

        // Parse responses
        const swingData = swingRes.ok ? await swingRes.json() : { markers: [] };
        const rsiData = rsiRes.ok ? await rsiRes.json() : { rsi: [] };
        const macdData = macdRes.ok ? await macdRes.json() : { histogram: [] };

        // Get swing markers (API returns swing_type, we need swingType)
        const markers = (swingData.markers || []).map((m: { swing_type: string }) => ({
          ...m,
          swingType: m.swing_type,
        }));
        const rsiValues = rsiData.rsi || [];
        const histogramValues = macdData.histogram || [];

        const latestRSI = rsiValues.filter((v: number | null) => v !== null).slice(-1)[0] ?? null;
        const latestHistogram = histogramValues.filter((v: number | null) => v !== null).slice(-1)[0] ?? null;

        // Analyze each indicator
        const swing = analyzeSwingTrend(markers);
        const rsi = analyzeRSI(latestRSI);
        const macd = analyzeMACD(latestHistogram);

        // Combine for overall trend
        const { trend, confidence } = combineTrends(swing, rsi, macd);

        return {
          timeframe: tf,
          trend,
          confidence,
          swing,
          rsi,
          macd,
          isLoading: false,
          error: null,
        };
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          return {
            timeframe: tf,
            trend: "ranging",
            confidence: 0,
            swing: { signal: "neutral" },
            rsi: { signal: "neutral" },
            macd: { signal: "neutral" },
            isLoading: false,
            error: null,
          };
        }
        return {
          timeframe: tf,
          trend: "ranging",
          confidence: 0,
          swing: { signal: "neutral" },
          rsi: { signal: "neutral" },
          macd: { signal: "neutral" },
          isLoading: false,
          error: (err as Error).message,
        };
      }
    }

    async function fetchAllTrends() {
      // Set all to loading
      setTrends(timeframes.map(tf => ({
        timeframe: tf,
        trend: "ranging",
        confidence: 0,
        swing: { signal: "neutral" },
        rsi: { signal: "neutral" },
        macd: { signal: "neutral" },
        isLoading: true,
        error: null,
      })));

      // Fetch all timeframes in parallel
      const results = await Promise.all(
        timeframes.map(tf => fetchTrendForTimeframe(tf))
      );

      setTrends(results);
    }

    fetchAllTrends();

    return () => {
      controller.abort();
    };
  }, [symbol, timeframes, lookback, enabled, refreshKey]);

  // Calculate overall alignment
  const overall = useMemo(() => calculateOverallAlignment(trends), [trends]);

  const isLoading = trends.some(t => t.isLoading);

  return {
    trends,
    overall,
    isLoading,
    refresh,
  };
}
