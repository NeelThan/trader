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
import { generateMarketData } from "@/lib/market-utils";
import type { OHLCData } from "@/components/trading";

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

// Cache for fallback trend data to prevent infinite re-renders
// Key format: "symbol:timeframe:lookback"
const fallbackCache = new Map<string, TimeframeTrend>();

function getFallbackCacheKey(symbol: MarketSymbol, tf: Timeframe, lookback: number): string {
  return `${symbol}:${tf}:${lookback}`;
}

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
 * Check if an error is a connection/backend unavailable error
 */
function isConnectionError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("fetch failed") ||
      msg.includes("failed to fetch") ||
      msg.includes("network") ||
      msg.includes("econnrefused")
    );
  }
  return false;
}

/**
 * Calculate RSI client-side (simple implementation)
 * Uses Wilder's smoothing method
 */
function calculateClientRSI(data: OHLCData[], period = 14): number | null {
  if (data.length < period + 1) return null;

  const closes = data.map((d) => d.close);
  const changes: number[] = [];

  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Initial averages
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }

  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for remaining values
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Calculate MACD histogram client-side (simple implementation)
 */
function calculateClientMACD(
  data: OHLCData[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): number | null {
  if (data.length < slowPeriod + signalPeriod) return null;

  const closes = data.map((d) => d.close);

  // Calculate EMAs
  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  if (!emaFast || !emaSlow) return null;

  // MACD line values
  const macdLine: number[] = [];
  const startIdx = slowPeriod - 1;

  for (let i = startIdx; i < closes.length; i++) {
    const fastIdx = i - (slowPeriod - fastPeriod);
    if (fastIdx >= 0 && fastIdx < emaFast.length) {
      macdLine.push(emaFast[fastIdx] - emaSlow[i - startIdx]);
    }
  }

  if (macdLine.length < signalPeriod) return null;

  // Signal line (EMA of MACD)
  const signalLine = calculateEMA(macdLine, signalPeriod);
  if (!signalLine || signalLine.length === 0) return null;

  // Latest histogram value
  const latestMacd = macdLine[macdLine.length - 1];
  const latestSignal = signalLine[signalLine.length - 1];

  return latestMacd - latestSignal;
}

/**
 * Calculate Exponential Moving Average
 */
function calculateEMA(data: number[], period: number): number[] | null {
  if (data.length < period) return null;

  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // Start with SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  ema.push(sum / period);

  // Calculate EMA for rest
  for (let i = period; i < data.length; i++) {
    ema.push((data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1]);
  }

  return ema;
}

/**
 * Detect swing markers client-side (simplified)
 * Returns basic HH/HL/LH/LL patterns
 */
function detectClientSwings(
  data: OHLCData[],
  lookback: number
): { markers: SwingMarkerTrend[]; pivots: PivotData[] } {
  if (data.length < lookback * 2 + 1) {
    return { markers: [], pivots: [] };
  }

  const pivots: PivotData[] = [];

  // Find pivot highs and lows
  for (let i = lookback; i < data.length - lookback; i++) {
    const bar = data[i];
    let isHigh = true;
    let isLow = true;

    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (data[j].high >= bar.high) isHigh = false;
      if (data[j].low <= bar.low) isLow = false;
    }

    if (isHigh) {
      pivots.push({
        index: i,
        price: bar.high,
        type: "high",
        time: bar.time as string | number,
      });
    }
    if (isLow) {
      pivots.push({
        index: i,
        price: bar.low,
        type: "low",
        time: bar.time as string | number,
      });
    }
  }

  // Sort by index
  pivots.sort((a, b) => a.index - b.index);

  // Generate swing markers from pivots
  const markers: SwingMarkerTrend[] = [];
  let lastHigh: PivotData | null = null;
  let lastLow: PivotData | null = null;

  for (const pivot of pivots) {
    if (pivot.type === "high") {
      if (lastHigh) {
        const swingType = pivot.price > lastHigh.price ? "HH" : "LH";
        markers.push({
          index: pivot.index,
          price: pivot.price,
          time: pivot.time,
          swingType,
        });
      }
      lastHigh = pivot;
    } else {
      if (lastLow) {
        const swingType = pivot.price > lastLow.price ? "HL" : "LL";
        markers.push({
          index: pivot.index,
          price: pivot.price,
          time: pivot.time,
          swingType,
        });
      }
      lastLow = pivot;
    }
  }

  return { markers, pivots };
}

/**
 * Generate fallback trend data using simulated market data and client-side calculations.
 * Results are cached to prevent infinite re-renders from regenerating random data.
 */
function generateFallbackTrend(
  tf: Timeframe,
  symbol: MarketSymbol,
  lookback: number
): TimeframeTrend {
  // Check cache first to prevent infinite re-renders
  const cacheKey = getFallbackCacheKey(symbol, tf, lookback);
  const cached = fallbackCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Generate simulated market data
  const periods = TIMEFRAME_CONFIG[tf].periods;
  const simulatedData = generateMarketData(symbol, tf, periods);

  if (simulatedData.length < 26) {
    const result: TimeframeTrend = {
      timeframe: tf,
      trend: "ranging",
      confidence: 0,
      swing: { signal: "neutral" },
      rsi: { signal: "neutral" },
      macd: { signal: "neutral" },
      isLoading: false,
      error: null,
    };
    fallbackCache.set(cacheKey, result);
    return result;
  }

  // Calculate indicators client-side
  const { markers, pivots } = detectClientSwings(simulatedData, lookback);
  const rsiValue = calculateClientRSI(simulatedData);
  const macdHistogram = calculateClientMACD(simulatedData);

  // Analyze indicators
  const swing = analyzeSwingTrend(markers);
  const rsi = analyzeRSI(rsiValue);
  const macd = analyzeMACD(macdHistogram);

  // Combine for overall trend
  const { trend, confidence } = combineTrends(swing, rsi, macd);

  // Get current price
  const currentPrice =
    simulatedData.length > 0 ? simulatedData[simulatedData.length - 1].close : undefined;

  const result: TimeframeTrend = {
    timeframe: tf,
    trend,
    confidence,
    swing,
    rsi,
    macd,
    isLoading: false,
    error: null,
    pivots,
    markers,
    currentPrice,
  };

  // Cache the result
  fallbackCache.set(cacheKey, result);
  return result;
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
    // Clear fallback cache for this symbol to get fresh data
    for (const tf of timeframes) {
      const cacheKey = getFallbackCacheKey(symbol, tf, lookback);
      fallbackCache.delete(cacheKey);
    }
    setRefreshKey(k => k + 1);
  }, [symbol, timeframes, lookback]);

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
          // If backend is unavailable (503), use client-side fallback
          if (marketRes.status === 503) {
            console.warn(
              `[useTrendAlignment] Backend unavailable for ${tf}, using client-side fallback`
            );
            return generateFallbackTrend(tf, symbol, lookback);
          }
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

        // Fetch swing markers, RSI, and MACD from backend in parallel
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

        // Check if backend is unavailable (503 errors)
        const backendUnavailable = [swingRes, rsiRes, macdRes].some(r => r.status === 503);
        if (backendUnavailable) {
          return {
            timeframe: tf,
            trend: "ranging",
            confidence: 0,
            swing: { signal: "neutral" },
            rsi: { signal: "neutral" },
            macd: { signal: "neutral" },
            isLoading: false,
            error: "Backend unavailable - start the backend server for full analysis",
            currentPrice: bars.length > 0 ? bars[bars.length - 1].close : undefined,
          };
        }

        // Parse responses from backend
        const swingData = swingRes.ok ? await swingRes.json() : { markers: [], pivots: [] };
        const rsiData = rsiRes.ok ? await rsiRes.json() : { rsi: [] };
        const macdData = macdRes.ok ? await macdRes.json() : { histogram: [] };

        // Get raw pivots for pivot-based sync
        const rawPivots: PivotData[] = (swingData.pivots || []).map((p: { index: number; price: number; type: string; time: string | number }) => ({
          index: p.index,
          price: p.price,
          type: p.type as "high" | "low",
          time: p.time,
        }));

        // Get swing markers (API returns swing_type, we need swingType)
        const rawMarkers: SwingMarkerTrend[] = (swingData.markers || []).map((m: { index: number; price: number; time: string | number; swing_type: string }) => ({
          index: m.index,
          price: m.price,
          time: m.time,
          swingType: m.swing_type as "HH" | "HL" | "LH" | "LL",
        }));

        const rsiValues = rsiData.rsi || [];
        const histogramValues = macdData.histogram || [];

        const latestRSI = rsiValues.filter((v: number | null) => v !== null).slice(-1)[0] ?? null;
        const latestHistogram = histogramValues.filter((v: number | null) => v !== null).slice(-1)[0] ?? null;

        // Get current price (latest close)
        const currentPrice = bars.length > 0 ? bars[bars.length - 1].close : undefined;

        // Analyze each indicator
        const swing = analyzeSwingTrend(rawMarkers);
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
          pivots: rawPivots,
          markers: rawMarkers,
          currentPrice,
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

        // If backend is unavailable, use client-side fallback with simulated data
        if (isConnectionError(err)) {
          console.warn(
            `[useTrendAlignment] Backend unavailable for ${tf}, using client-side fallback`
          );
          return generateFallbackTrend(tf, symbol, lookback);
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
