/**
 * Market data utilities for pivot detection and simulated data generation.
 */

import { OHLCData } from "@/components/trading";
import {
  PivotPoint,
  MarketSymbol,
  Timeframe,
  MARKET_CONFIG,
} from "./chart-constants";

/**
 * Detect swing highs and lows (pivot points) with alternating high-low pattern.
 * Ensures pivots alternate between highs and lows, keeping the most extreme
 * value when consecutive same-type pivots occur.
 */
export function detectPivotPoints(
  data: OHLCData[],
  lookback: number = 5
): PivotPoint[] {
  if (data.length < lookback * 2 + 1) return [];

  const rawPivots: PivotPoint[] = [];

  // First pass: find all potential swing highs and lows
  for (let i = lookback; i < data.length - lookback; i++) {
    const currentHigh = data[i].high;
    const currentLow = data[i].low;

    // Check for swing high
    let isSwingHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && data[j].high >= currentHigh) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) {
      rawPivots.push({ index: i, price: currentHigh, type: "high" });
    }

    // Check for swing low
    let isSwingLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && data[j].low <= currentLow) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) {
      rawPivots.push({ index: i, price: currentLow, type: "low" });
    }
  }

  // Sort by index
  rawPivots.sort((a, b) => a.index - b.index);

  // Second pass: ensure alternating high-low pattern
  // When consecutive same types, keep the most extreme one
  const alternatingPivots: PivotPoint[] = [];

  for (const pivot of rawPivots) {
    if (alternatingPivots.length === 0) {
      alternatingPivots.push(pivot);
      continue;
    }

    const lastPivot = alternatingPivots[alternatingPivots.length - 1];

    if (pivot.type !== lastPivot.type) {
      // Different type - good, add it
      alternatingPivots.push(pivot);
    } else {
      // Same type - keep the more extreme one
      if (pivot.type === "high" && pivot.price > lastPivot.price) {
        alternatingPivots[alternatingPivots.length - 1] = pivot;
      } else if (pivot.type === "low" && pivot.price < lastPivot.price) {
        alternatingPivots[alternatingPivots.length - 1] = pivot;
      }
    }
  }

  return alternatingPivots;
}

/**
 * Generate simulated OHLC data for different markets and timeframes.
 * Uses random walk with market-specific volatility.
 */
export function generateMarketData(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  periods: number
): OHLCData[] {
  const data: OHLCData[] = [];
  const marketConfig = MARKET_CONFIG[symbol];
  let basePrice = marketConfig.basePrice;

  const volatilityMap: Record<Timeframe, number> = {
    "1m": 10,
    "15m": 25,
    "1H": 50,
    "4H": 100,
    "1D": 200,
    "1W": 500,
    "1M": 1500,
  };
  const baseVolatility = volatilityMap[timeframe] * marketConfig.volatilityMultiplier;

  const intervalMap: Record<Timeframe, number> = {
    "1m": 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1H": 60 * 60 * 1000,
    "4H": 4 * 60 * 60 * 1000,
    "1D": 24 * 60 * 60 * 1000,
    "1W": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
  };
  const interval = intervalMap[timeframe];

  const now = new Date();

  for (let i = periods - 1; i >= 0; i--) {
    const timestamp = now.getTime() - i * interval;
    const date = new Date(timestamp);

    // Skip weekends for daily data
    if (timeframe === "1D" && (date.getDay() === 0 || date.getDay() === 6)) {
      continue;
    }

    const volatility = baseVolatility * (0.5 + Math.random());
    const trend = Math.random() > 0.48 ? 1 : -1;

    const open = basePrice;
    const change = (Math.random() - 0.5) * volatility + trend * (volatility * 0.1);
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;

    let time: OHLCData["time"];
    if (timeframe === "1D" || timeframe === "1W" || timeframe === "1M") {
      time = date.toISOString().split("T")[0] as OHLCData["time"];
    } else {
      time = Math.floor(timestamp / 1000) as OHLCData["time"];
    }

    data.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    });

    basePrice = close;
  }

  return data;
}

/**
 * Format a price for display with locale formatting.
 */
export function formatDisplayPrice(price: number): string {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format countdown seconds as M:SS.
 */
export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format refresh interval for display.
 */
export function formatRefreshInterval(seconds: number): string {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}m`;
  }
  return `${seconds}s`;
}
