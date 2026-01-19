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
 * Ensures unique, ascending timestamps.
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
    "3m": 15,
    "5m": 20,
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
    "3m": 3 * 60 * 1000,
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1H": 60 * 60 * 1000,
    "4H": 4 * 60 * 60 * 1000,
    "1D": 24 * 60 * 60 * 1000,
    "1W": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
  };
  const interval = intervalMap[timeframe];

  const now = new Date();
  const seenTimes = new Set<string | number>();
  let periodsGenerated = 0;
  let offset = 0;

  // Generate enough periods, skipping weekends for daily data
  while (periodsGenerated < periods && offset < periods * 2) {
    const timestamp = now.getTime() - offset * interval;
    const date = new Date(timestamp);
    offset++;

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

    // Skip duplicates (safety check)
    const timeKey = String(time);
    if (seenTimes.has(timeKey)) {
      continue;
    }
    seenTimes.add(timeKey);

    data.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    });

    basePrice = close;
    periodsGenerated++;
  }

  // Sort ascending by time (data is generated newest to oldest, so reverse)
  return data.reverse();
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

/**
 * Key Fibonacci retracement ratios used for signal detection.
 */
export const FIBONACCI_RATIOS = [0.236, 0.382, 0.5, 0.618, 0.786] as const;

/**
 * Calculate Fibonacci retracement levels from swing high and low.
 * @param high - Swing high price
 * @param low - Swing low price
 * @param direction - "buy" calculates from high to low, "sell" from low to high
 * @returns Object with each Fibonacci ratio and its corresponding price level
 */
export function calculateFibonacciLevels(
  high: number,
  low: number,
  direction: "buy" | "sell" = "buy"
): Record<number, number> {
  const range = high - low;
  const levels: Record<number, number> = {};

  for (const ratio of FIBONACCI_RATIOS) {
    if (direction === "buy") {
      // Buy direction: retracement from high down
      levels[ratio] = high - range * ratio;
    } else {
      // Sell direction: retracement from low up
      levels[ratio] = low + range * ratio;
    }
  }

  return levels;
}

/**
 * Check if a price is near any Fibonacci level.
 * @param price - Price to check
 * @param fibLevels - Fibonacci levels from calculateFibonacciLevels
 * @param tolerance - How close price must be to level (as percentage, e.g., 0.005 = 0.5%)
 * @returns Object with isAtLevel, nearestLevel, and distance
 */
export function checkFibonacciAlignment(
  price: number,
  fibLevels: Record<number, number>,
  tolerance: number = 0.005
): { isAtLevel: boolean; nearestRatio: number | null; nearestLevel: number | null; distance: number } {
  let nearestRatio: number | null = null;
  let nearestLevel: number | null = null;
  let minDistance = Infinity;

  for (const [ratio, level] of Object.entries(fibLevels)) {
    const distance = Math.abs(price - level) / price;
    if (distance < minDistance) {
      minDistance = distance;
      nearestRatio = parseFloat(ratio);
      nearestLevel = level;
    }
  }

  return {
    isAtLevel: minDistance <= tolerance,
    nearestRatio,
    nearestLevel,
    distance: minDistance,
  };
}

/**
 * Check if a pivot point aligns with a Fibonacci level.
 * This makes the pivot a more significant signal.
 * @param pivotPrice - The pivot point price
 * @param swingHigh - The reference swing high
 * @param swingLow - The reference swing low
 * @param tolerance - Tolerance for level matching (default 0.5%)
 * @returns Alignment result with signal boost factor
 */
export function checkPivotFibonacciAlignment(
  pivotPrice: number,
  swingHigh: number,
  swingLow: number,
  tolerance: number = 0.005
): { isAligned: boolean; ratio: number | null; signalBoost: number } {
  // Calculate levels for both directions and check alignment
  const buyLevels = calculateFibonacciLevels(swingHigh, swingLow, "buy");
  const sellLevels = calculateFibonacciLevels(swingHigh, swingLow, "sell");

  const buyAlignment = checkFibonacciAlignment(pivotPrice, buyLevels, tolerance);
  const sellAlignment = checkFibonacciAlignment(pivotPrice, sellLevels, tolerance);

  // Use whichever is closer
  const bestAlignment = buyAlignment.distance < sellAlignment.distance ? buyAlignment : sellAlignment;

  if (!bestAlignment.isAtLevel) {
    return { isAligned: false, ratio: null, signalBoost: 0 };
  }

  // Higher signal boost for key Fibonacci levels (61.8%, 50%, 38.2%)
  const ratio = bestAlignment.nearestRatio;
  let signalBoost = 0.1; // Base boost for any Fibonacci alignment

  if (ratio === 0.618) {
    signalBoost = 0.2; // Golden ratio - strongest
  } else if (ratio === 0.5) {
    signalBoost = 0.15; // 50% level - strong
  } else if (ratio === 0.382) {
    signalBoost = 0.15; // 38.2% level - strong
  } else if (ratio === 0.786) {
    signalBoost = 0.1; // 78.6% level - moderate
  }

  return {
    isAligned: true,
    ratio,
    signalBoost,
  };
}

/**
 * Calculate psychological price levels within a given range.
 *
 * Psychological levels are round numbers where traders psychologically
 * place orders. These act as support/resistance due to human behavior.
 *
 * The function automatically determines appropriate intervals based on
 * the price magnitude:
 * - Prices < 10: intervals of 1 (e.g., 5, 6, 7)
 * - Prices 10-100: intervals of 5 or 10 (e.g., 50, 55, 60)
 * - Prices 100-1000: intervals of 25 or 50 (e.g., 150, 175, 200)
 * - Prices 1000-10000: intervals of 250 or 500 (e.g., 5000, 5500)
 * - Prices 10000-100000: intervals of 1000 or 2500 (e.g., 42000, 43000)
 * - Prices > 100000: intervals of 5000 or 10000
 *
 * @param low - Lower bound of the price range
 * @param high - Upper bound of the price range
 * @param maxLevels - Maximum number of levels to return (default 10)
 * @returns Array of psychological price levels
 */
export function calculatePsychologicalLevels(
  low: number,
  high: number,
  maxLevels: number = 10
): number[] {
  const range = high - low;
  const midPrice = (high + low) / 2;

  // Extend range by 25% on each side to catch nearby major levels
  const extendedLow = low - range * 0.25;
  const extendedHigh = high + range * 0.25;

  // Determine base interval based on price magnitude
  // Use smaller intervals for more granularity
  let interval: number;
  if (midPrice < 10) {
    interval = 0.5;
  } else if (midPrice < 100) {
    interval = 5;
  } else if (midPrice < 1000) {
    interval = 25;
  } else if (midPrice < 10000) {
    interval = 250;
  } else if (midPrice < 100000) {
    interval = 1000;
  } else {
    interval = 5000;
  }

  // Find the first round number at or above extended low
  const firstLevel = Math.ceil(extendedLow / interval) * interval;

  const levels: number[] = [];
  let level = firstLevel;

  // Collect all psychological levels within extended range
  while (level <= extendedHigh && levels.length < maxLevels * 3) {
    levels.push(level);
    level += interval;
  }

  // Score levels by "roundness" - rounder numbers are more significant
  const roundnessScore = (n: number): number => {
    let score = 0;
    if (n % 50000 === 0) score += 6;
    else if (n % 25000 === 0) score += 5;
    else if (n % 10000 === 0) score += 4;
    else if (n % 5000 === 0) score += 3;
    else if (n % 1000 === 0) score += 2;
    else if (n % 500 === 0) score += 1;
    else if (n % 100 === 0) score += 0.5;
    else if (n % 50 === 0) score += 0.25;
    return score;
  };

  // If we have too many levels, keep only the most significant ones
  if (levels.length > maxLevels) {
    // Sort by roundness (descending) and take top maxLevels
    levels.sort((a, b) => roundnessScore(b) - roundnessScore(a));
    levels.splice(maxLevels);
    // Re-sort by price
    levels.sort((a, b) => a - b);
  }

  return levels;
}

/**
 * Check if a price is a psychological level (round number).
 * Used in confluence scoring.
 *
 * @param price - Price to check
 * @returns True if the price is a round number
 */
export function isPsychologicalLevel(price: number): boolean {
  // Define thresholds for what counts as "round" based on price magnitude
  if (price < 10) {
    return price % 1 === 0; // Whole numbers
  } else if (price < 100) {
    return price % 5 === 0; // Multiples of 5
  } else if (price < 1000) {
    return price % 25 === 0; // Multiples of 25
  } else if (price < 10000) {
    return price % 100 === 0; // Multiples of 100
  } else if (price < 100000) {
    return price % 500 === 0; // Multiples of 500
  } else {
    return price % 1000 === 0; // Multiples of 1000
  }
}
