"use client";

/**
 * Hook for multi-timeframe trend analysis.
 *
 * Implements the SignalPro multi-timeframe trend alignment strategy:
 * - Higher TF UP + Lower TF DOWN = GO LONG (buy the dip)
 * - Higher TF DOWN + Lower TF UP = GO SHORT (sell the rally)
 * - Both same direction = STAND ASIDE (wait for pullback)
 *
 * Supports configurable trend indicators:
 * - Pivot points (HH/HL/LH/LL analysis)
 * - Moving averages (fast/slow crossover)
 * - RSI (above/below threshold)
 * - ADX (trend strength and direction)
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { OHLCData } from "@/components/trading";
import {
  Timeframe,
  MarketSymbol,
  TimeframePair,
  TimeframeTrend,
  TrendAlignment,
  TrendDirection,
  TradeAction,
  TrendIndicators,
  IndicatorSignal,
  TIMEFRAME_PAIR_PRESETS,
} from "@/lib/chart-constants";
import { detectPivotPoints } from "@/lib/market-utils";
import { calculateIndicators, IndicatorValues } from "@/lib/technical-indicators";
import { useSettings } from "@/hooks/use-settings";

export type TrendIndicatorConfig = {
  usePivots: boolean;
  useMA: boolean;
  maFastPeriod: number;
  maSlowPeriod: number;
  useRSI: boolean;
  rsiPeriod: number;
  rsiThreshold: number;
  useADX: boolean;
  adxPeriod: number;
  adxThreshold: number;
};

export type UseTrendAnalysisOptions = {
  symbol: MarketSymbol;
  pairs?: TimeframePair[];
  lookback?: number; // Pivot detection lookback
  enabled?: boolean;
  indicatorConfig?: Partial<TrendIndicatorConfig>; // Override settings
};

export type UseTrendAnalysisReturn = {
  alignments: TrendAlignment[];
  isLoading: boolean;
  error: string | null;
  selectedPair: TimeframePair | null;
  setSelectedPair: (pair: TimeframePair) => void;
  refresh: () => void;
  indicatorConfig: TrendIndicatorConfig;
};

/**
 * Create default empty indicators.
 */
function createEmptyIndicators(): TrendIndicators {
  return {
    pivotSignal: "neutral",
    pivotHigh: null,
    pivotLow: null,
    smaFast: null,
    smaSlow: null,
    maSignal: "neutral",
    rsi: null,
    rsiSignal: "neutral",
    adx: null,
    plusDI: null,
    minusDI: null,
    adxSignal: "neutral",
    isTrending: false,
  };
}

/**
 * Detect pivot-based trend direction from OHLC data.
 * UP: Higher highs and higher lows
 * DOWN: Lower highs and lower lows
 * NEUTRAL: Mixed or insufficient data
 */
function detectPivotTrend(
  data: OHLCData[],
  lookback: number = 5
): { direction: TrendDirection; strength: number; pivotHigh: number | null; pivotLow: number | null; signal: IndicatorSignal } {
  if (data.length < lookback * 2 + 1) {
    return { direction: "NEUTRAL", strength: 0, pivotHigh: null, pivotLow: null, signal: "neutral" };
  }

  const pivots = detectPivotPoints(data, lookback);
  const recentPivots = pivots.slice(-6);

  const highs = recentPivots.filter((p) => p.type === "high").map((p) => p.price);
  const lows = recentPivots.filter((p) => p.type === "low").map((p) => p.price);

  if (highs.length < 2 || lows.length < 2) {
    return {
      direction: "NEUTRAL",
      strength: 0.3,
      pivotHigh: highs[highs.length - 1] ?? null,
      pivotLow: lows[lows.length - 1] ?? null,
      signal: "neutral",
    };
  }

  const lastTwoHighs = highs.slice(-2);
  const lastTwoLows = lows.slice(-2);

  const higherHighs = lastTwoHighs[1] > lastTwoHighs[0];
  const higherLows = lastTwoLows[1] > lastTwoLows[0];
  const lowerHighs = lastTwoHighs[1] < lastTwoHighs[0];
  const lowerLows = lastTwoLows[1] < lastTwoLows[0];

  let direction: TrendDirection = "NEUTRAL";
  let strength = 0.5;
  let signal: IndicatorSignal = "neutral";

  if (higherHighs && higherLows) {
    direction = "UP";
    strength = 0.9;
    signal = "bullish";
  } else if (lowerHighs && lowerLows) {
    direction = "DOWN";
    strength = 0.9;
    signal = "bearish";
  } else if (higherHighs || higherLows) {
    direction = "UP";
    strength = 0.6;
    signal = "bullish";
  } else if (lowerHighs || lowerLows) {
    direction = "DOWN";
    strength = 0.6;
    signal = "bearish";
  }

  // Price action bias
  const currentPrice = data[data.length - 1].close;
  const latestHigh = highs[highs.length - 1];
  const latestLow = lows[lows.length - 1];

  if (latestHigh && currentPrice > latestHigh * 0.995) {
    if (direction === "NEUTRAL") {
      direction = "UP";
      signal = "bullish";
    }
    strength = Math.min(strength + 0.1, 1.0);
  }
  if (latestLow && currentPrice < latestLow * 1.005) {
    if (direction === "NEUTRAL") {
      direction = "DOWN";
      signal = "bearish";
    }
    strength = Math.min(strength + 0.1, 1.0);
  }

  return {
    direction,
    strength,
    pivotHigh: latestHigh ?? null,
    pivotLow: latestLow ?? null,
    signal,
  };
}

/**
 * Combine multiple indicator signals into a single trend direction.
 */
function combineTrendSignals(
  pivotResult: { direction: TrendDirection; strength: number; signal: IndicatorSignal },
  indicatorValues: IndicatorValues,
  config: TrendIndicatorConfig
): { direction: TrendDirection; strength: number } {
  const signals: { direction: TrendDirection; weight: number }[] = [];

  // Add pivot signal
  if (config.usePivots) {
    signals.push({ direction: pivotResult.direction, weight: 0.4 });
  }

  // Add MA signal
  if (config.useMA && indicatorValues.maSignal !== "neutral") {
    const maDirection: TrendDirection = indicatorValues.maSignal === "bullish" ? "UP" : "DOWN";
    signals.push({ direction: maDirection, weight: 0.25 });
  }

  // Add RSI signal
  if (config.useRSI && indicatorValues.rsiSignal !== "neutral") {
    const rsiDirection: TrendDirection = indicatorValues.rsiSignal === "bullish" ? "UP" : "DOWN";
    signals.push({ direction: rsiDirection, weight: 0.2 });
  }

  // Add ADX signal (only if market is trending)
  if (config.useADX && indicatorValues.isTrending && indicatorValues.adxSignal !== "neutral") {
    const adxDirection: TrendDirection = indicatorValues.adxSignal === "bullish" ? "UP" : "DOWN";
    signals.push({ direction: adxDirection, weight: 0.15 });
  }

  if (signals.length === 0) {
    return { direction: "NEUTRAL", strength: 0 };
  }

  // Calculate weighted consensus
  let upWeight = 0;
  let downWeight = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    if (signal.direction === "UP") {
      upWeight += signal.weight;
    } else if (signal.direction === "DOWN") {
      downWeight += signal.weight;
    }
    totalWeight += signal.weight;
  }

  // Normalize weights
  upWeight /= totalWeight;
  downWeight /= totalWeight;

  // Determine direction based on consensus
  let direction: TrendDirection = "NEUTRAL";
  let strength = 0.5;

  if (upWeight > 0.6) {
    direction = "UP";
    strength = 0.5 + upWeight * 0.5;
  } else if (downWeight > 0.6) {
    direction = "DOWN";
    strength = 0.5 + downWeight * 0.5;
  } else if (upWeight > downWeight) {
    direction = "UP";
    strength = 0.4 + (upWeight - 0.5) * 0.5;
  } else if (downWeight > upWeight) {
    direction = "DOWN";
    strength = 0.4 + (downWeight - 0.5) * 0.5;
  }

  // ADX can boost strength if trending strongly
  if (config.useADX && indicatorValues.isTrending && indicatorValues.adx) {
    const adxBonus = Math.min((indicatorValues.adx - config.adxThreshold) / 50, 0.15);
    strength = Math.min(strength + adxBonus, 1.0);
  }

  return { direction, strength };
}

/**
 * Detect trend direction from OHLC data using configurable indicators.
 */
function detectTrendDirection(
  data: OHLCData[],
  timeframe: Timeframe,
  config: TrendIndicatorConfig,
  lookback: number = 5
): TimeframeTrend {
  if (data.length < Math.max(lookback * 2 + 1, config.maSlowPeriod + 10)) {
    return {
      timeframe,
      direction: "NEUTRAL",
      strength: 0,
      pivotHigh: null,
      pivotLow: null,
      indicators: createEmptyIndicators(),
    };
  }

  // Calculate pivot-based trend
  const pivotResult = detectPivotTrend(data, lookback);

  // Calculate technical indicators
  const indicatorValues = calculateIndicators(data, {
    maFastPeriod: config.maFastPeriod,
    maSlowPeriod: config.maSlowPeriod,
    rsiPeriod: config.rsiPeriod,
    rsiThreshold: config.rsiThreshold,
    adxPeriod: config.adxPeriod,
    adxThreshold: config.adxThreshold,
  });

  // Combine signals
  const combined = combineTrendSignals(pivotResult, indicatorValues, config);

  // Build indicators object
  const indicators: TrendIndicators = {
    pivotSignal: pivotResult.signal,
    pivotHigh: pivotResult.pivotHigh,
    pivotLow: pivotResult.pivotLow,
    smaFast: indicatorValues.smaFast,
    smaSlow: indicatorValues.smaSlow,
    maSignal: indicatorValues.maSignal,
    rsi: indicatorValues.rsi,
    rsiSignal: indicatorValues.rsiSignal,
    adx: indicatorValues.adx,
    plusDI: indicatorValues.plusDI,
    minusDI: indicatorValues.minusDI,
    adxSignal: indicatorValues.adxSignal,
    isTrending: indicatorValues.isTrending,
  };

  return {
    timeframe,
    direction: combined.direction,
    strength: combined.strength,
    pivotHigh: pivotResult.pivotHigh,
    pivotLow: pivotResult.pivotLow,
    indicators,
  };
}

/**
 * Determine trade action based on trend alignment.
 */
function determineTradeAction(
  higherTrend: TrendDirection,
  lowerTrend: TrendDirection
): TradeAction {
  if (higherTrend === "UP" && lowerTrend === "DOWN") {
    return "GO_LONG";
  }
  if (higherTrend === "DOWN" && lowerTrend === "UP") {
    return "GO_SHORT";
  }
  return "STAND_ASIDE";
}

/**
 * Calculate confidence level for the alignment signal.
 */
function calculateConfidence(
  higherTrend: TimeframeTrend,
  lowerTrend: TimeframeTrend,
  action: TradeAction
): number {
  if (action === "STAND_ASIDE") {
    return 0.3;
  }

  const strengthAvg = (higherTrend.strength + lowerTrend.strength) / 2;

  const oppositeBonus =
    (higherTrend.direction === "UP" && lowerTrend.direction === "DOWN") ||
    (higherTrend.direction === "DOWN" && lowerTrend.direction === "UP")
      ? 0.15
      : 0;

  return Math.min(strengthAvg + oppositeBonus, 1.0);
}

/**
 * Fetch data for a specific timeframe from the Next.js API.
 */
async function fetchTimeframeData(
  symbol: MarketSymbol,
  timeframe: Timeframe
): Promise<OHLCData[]> {
  const response = await fetch(
    `/api/market-data?symbol=${symbol}&timeframe=${timeframe}`
  );

  if (!response.ok) {
    if (response.status === 404) {
      return [];
    }
    throw new Error(`Failed to fetch ${timeframe} data for ${symbol}`);
  }

  const result = await response.json();
  return result.data || [];
}

/**
 * Hook for multi-timeframe trend analysis.
 */
export function useTrendAnalysis({
  symbol,
  pairs = TIMEFRAME_PAIR_PRESETS,
  lookback = 5,
  enabled = true,
  indicatorConfig: configOverride,
}: UseTrendAnalysisOptions): UseTrendAnalysisReturn {
  const { settings } = useSettings();

  // Build indicator config from settings with optional overrides
  const indicatorConfig = useMemo<TrendIndicatorConfig>(() => ({
    usePivots: configOverride?.usePivots ?? settings.trendUsePivots,
    useMA: configOverride?.useMA ?? settings.trendUseMA,
    maFastPeriod: configOverride?.maFastPeriod ?? settings.trendMAFast,
    maSlowPeriod: configOverride?.maSlowPeriod ?? settings.trendMASlow,
    useRSI: configOverride?.useRSI ?? settings.trendUseRSI,
    rsiPeriod: configOverride?.rsiPeriod ?? settings.trendRSIPeriod,
    rsiThreshold: configOverride?.rsiThreshold ?? settings.trendRSIThreshold,
    useADX: configOverride?.useADX ?? settings.trendUseADX,
    adxPeriod: configOverride?.adxPeriod ?? settings.trendADXPeriod,
    adxThreshold: configOverride?.adxThreshold ?? settings.trendADXThreshold,
  }), [settings, configOverride]);

  const [dataCache, setDataCache] = useState<Map<Timeframe, OHLCData[]>>(
    new Map()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState<TimeframePair | null>(
    pairs[0] || null
  );
  const [refreshKey, setRefreshKey] = useState(0);

  // Get unique timeframes needed for all pairs
  const uniqueTimeframes = useMemo(() => {
    const tfs = new Set<Timeframe>();
    pairs.forEach((pair) => {
      tfs.add(pair.higherTF);
      tfs.add(pair.lowerTF);
    });
    return Array.from(tfs);
  }, [pairs]);

  // Fetch data for all unique timeframes
  useEffect(() => {
    if (!enabled || uniqueTimeframes.length === 0) return;

    let cancelled = false;
    /* eslint-disable react-hooks/set-state-in-effect -- Loading states for async data fetch */
    setIsLoading(true);
    setError(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          uniqueTimeframes.map(async (tf) => {
            const data = await fetchTimeframeData(symbol, tf);
            return { tf, data };
          })
        );

        if (cancelled) return;

        const newCache = new Map<Timeframe, OHLCData[]>();
        results.forEach(({ tf, data }) => {
          newCache.set(tf, data);
        });
        setDataCache(newCache);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setIsLoading(false);
      }
    };

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [symbol, uniqueTimeframes, enabled, refreshKey]);

  // Calculate alignments for all pairs
  const alignments = useMemo(() => {
    if (dataCache.size === 0) return [];

    return pairs.map((pair) => {
      const higherData = dataCache.get(pair.higherTF) || [];
      const lowerData = dataCache.get(pair.lowerTF) || [];

      const higherTrend = detectTrendDirection(higherData, pair.higherTF, indicatorConfig, lookback);
      const lowerTrend = detectTrendDirection(lowerData, pair.lowerTF, indicatorConfig, lookback);
      const action = determineTradeAction(higherTrend.direction, lowerTrend.direction);
      const confidence = calculateConfidence(higherTrend, lowerTrend, action);

      return {
        pair,
        higherTrend,
        lowerTrend,
        action,
        confidence,
      };
    });
  }, [dataCache, pairs, lookback, indicatorConfig]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return {
    alignments,
    isLoading,
    error,
    selectedPair,
    setSelectedPair,
    refresh,
    indicatorConfig,
  };
}
