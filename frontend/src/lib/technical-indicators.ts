/**
 * Technical indicator calculations for trend analysis.
 * All functions work with arrays of closing prices.
 */

import { OHLCData } from "@/components/trading";

/**
 * Calculate Simple Moving Average (SMA).
 * @param data - Array of OHLC data
 * @param period - Number of periods for the average
 * @returns Array of SMA values (null for insufficient data)
 */
export function calculateSMA(data: OHLCData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push(sum / period);
    }
  }

  return result;
}

/**
 * Calculate Exponential Moving Average (EMA).
 * @param data - Array of OHLC data
 * @param period - Number of periods
 * @returns Array of EMA values (null for insufficient data)
 */
export function calculateEMA(data: OHLCData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      // First EMA is SMA
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push(sum / period);
    } else {
      const prevEMA = result[i - 1];
      if (prevEMA !== null) {
        result.push((data[i].close - prevEMA) * multiplier + prevEMA);
      } else {
        result.push(null);
      }
    }
  }

  return result;
}

/**
 * Calculate Relative Strength Index (RSI).
 * @param data - Array of OHLC data
 * @param period - RSI period (default 14)
 * @returns Array of RSI values (0-100, null for insufficient data)
 */
export function calculateRSI(data: OHLCData[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = [];

  if (data.length < period + 1) {
    return data.map(() => null);
  }

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  // First RSI calculation uses simple average
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Fill nulls for insufficient data
  for (let i = 0; i < period; i++) {
    result.push(null);
  }

  // Calculate first RSI
  if (avgLoss === 0) {
    result.push(100);
  } else {
    const rs = avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }

  // Calculate subsequent RSI values using smoothed averages
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - 100 / (1 + rs));
    }
  }

  return result;
}

/**
 * Calculate True Range for a single bar.
 */
function trueRange(current: OHLCData, previous: OHLCData): number {
  const hl = current.high - current.low;
  const hc = Math.abs(current.high - previous.close);
  const lc = Math.abs(current.low - previous.close);
  return Math.max(hl, hc, lc);
}

/**
 * Calculate Average Directional Index (ADX).
 * Returns ADX value and +DI/-DI for trend direction.
 * @param data - Array of OHLC data
 * @param period - ADX period (default 14)
 * @returns Object with adx, plusDI, minusDI arrays
 */
export function calculateADX(
  data: OHLCData[],
  period: number = 14
): {
  adx: (number | null)[];
  plusDI: (number | null)[];
  minusDI: (number | null)[];
} {
  const adx: (number | null)[] = [];
  const plusDI: (number | null)[] = [];
  const minusDI: (number | null)[] = [];

  if (data.length < period * 2) {
    return {
      adx: data.map(() => null),
      plusDI: data.map(() => null),
      minusDI: data.map(() => null),
    };
  }

  // Calculate +DM, -DM, and TR
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const upMove = data[i].high - data[i - 1].high;
    const downMove = data[i - 1].low - data[i].low;

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }

    tr.push(trueRange(data[i], data[i - 1]));
  }

  // Smooth the values using Wilder's smoothing
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;
  let smoothedTR = 0;

  // Initial sum for first period
  for (let i = 0; i < period; i++) {
    smoothedPlusDM += plusDM[i];
    smoothedMinusDM += minusDM[i];
    smoothedTR += tr[i];
  }

  // Fill nulls for insufficient data
  for (let i = 0; i < period; i++) {
    adx.push(null);
    plusDI.push(null);
    minusDI.push(null);
  }

  // Calculate first DI values
  const firstPlusDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
  const firstMinusDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
  plusDI.push(firstPlusDI);
  minusDI.push(firstMinusDI);

  // Calculate first DX
  const diSum = firstPlusDI + firstMinusDI;
  const dx: number[] = [diSum > 0 ? (Math.abs(firstPlusDI - firstMinusDI) / diSum) * 100 : 0];
  adx.push(null); // ADX needs more periods

  // Calculate subsequent values
  for (let i = period; i < plusDM.length; i++) {
    // Wilder's smoothing
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDM[i];
    smoothedTR = smoothedTR - smoothedTR / period + tr[i];

    const pDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    const mDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;

    plusDI.push(pDI);
    minusDI.push(mDI);

    const sum = pDI + mDI;
    dx.push(sum > 0 ? (Math.abs(pDI - mDI) / sum) * 100 : 0);
  }

  // Calculate ADX as smoothed DX
  let smoothedDX = 0;
  for (let i = 0; i < period && i < dx.length; i++) {
    smoothedDX += dx[i];
  }
  smoothedDX /= period;

  // Fill more nulls until we have enough DX values
  for (let i = period + 1; i < period * 2 && i < data.length; i++) {
    adx.push(null);
  }

  if (dx.length >= period) {
    adx.push(smoothedDX);

    // Calculate subsequent ADX
    for (let i = period; i < dx.length; i++) {
      smoothedDX = (smoothedDX * (period - 1) + dx[i]) / period;
      adx.push(smoothedDX);
    }
  }

  return { adx, plusDI, minusDI };
}

/**
 * Get the latest indicator values for trend analysis.
 */
export type IndicatorValues = {
  smaFast: number | null;
  smaSlow: number | null;
  maSignal: "bullish" | "bearish" | "neutral";
  rsi: number | null;
  rsiSignal: "bullish" | "bearish" | "neutral";
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;
  adxSignal: "bullish" | "bearish" | "neutral";
  isTrending: boolean;
};

/**
 * Calculate all indicator values for trend analysis.
 */
export function calculateIndicators(
  data: OHLCData[],
  config: {
    maFastPeriod: number;
    maSlowPeriod: number;
    rsiPeriod: number;
    rsiThreshold: number;
    adxPeriod: number;
    adxThreshold: number;
  }
): IndicatorValues {
  const smaFastArr = calculateSMA(data, config.maFastPeriod);
  const smaSlowArr = calculateSMA(data, config.maSlowPeriod);
  const rsiArr = calculateRSI(data, config.rsiPeriod);
  const { adx: adxArr, plusDI: plusDIArr, minusDI: minusDIArr } = calculateADX(
    data,
    config.adxPeriod
  );

  // Get latest values
  const smaFast = smaFastArr[smaFastArr.length - 1];
  const smaSlow = smaSlowArr[smaSlowArr.length - 1];
  const rsi = rsiArr[rsiArr.length - 1];
  const adx = adxArr[adxArr.length - 1];
  const plusDI = plusDIArr[plusDIArr.length - 1];
  const minusDI = minusDIArr[minusDIArr.length - 1];

  // Determine MA signal
  let maSignal: "bullish" | "bearish" | "neutral" = "neutral";
  if (smaFast !== null && smaSlow !== null) {
    if (smaFast > smaSlow) {
      maSignal = "bullish";
    } else if (smaFast < smaSlow) {
      maSignal = "bearish";
    }
  }

  // Determine RSI signal
  let rsiSignal: "bullish" | "bearish" | "neutral" = "neutral";
  if (rsi !== null) {
    if (rsi > config.rsiThreshold) {
      rsiSignal = "bullish";
    } else if (rsi < config.rsiThreshold) {
      rsiSignal = "bearish";
    }
  }

  // Determine ADX signal
  let adxSignal: "bullish" | "bearish" | "neutral" = "neutral";
  const isTrending = adx !== null && adx >= config.adxThreshold;
  if (isTrending && plusDI !== null && minusDI !== null) {
    if (plusDI > minusDI) {
      adxSignal = "bullish";
    } else if (minusDI > plusDI) {
      adxSignal = "bearish";
    }
  }

  return {
    smaFast,
    smaSlow,
    maSignal,
    rsi,
    rsiSignal,
    adx,
    plusDI,
    minusDI,
    adxSignal,
    isTrending,
  };
}
