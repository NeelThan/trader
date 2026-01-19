"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Timeframe, MarketSymbol } from "@/lib/chart-constants";
import { detectPivotPoints } from "@/lib/market-utils";
import { OHLCData } from "@/components/trading";
import { useMarketDataContext } from "@/contexts/MarketDataContext";

type ScannedSignal = {
  timeframe: Timeframe;
  signalType: "type_1" | "type_2";
  direction: "buy" | "sell";
  level: number;
  levelType: string; // e.g., "0.618 Retracement"
  strength: number;
  barTime: string;
  close: number;
};

type TimeframeScanResult = {
  timeframe: Timeframe;
  signals: ScannedSignal[];
  high: number;
  low: number;
  isLoading: boolean;
  error: string | null;
};

const SCAN_TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "5m", "3m", "1m"];

const RETRACEMENT_LEVELS = [
  { ratio: 0.382, label: "38.2%" },
  { ratio: 0.5, label: "50%" },
  { ratio: 0.618, label: "61.8%" },
  { ratio: 0.786, label: "78.6%" },
];

const EXTENSION_LEVELS = [
  { ratio: 1.272, label: "127.2%" },
  { ratio: 1.618, label: "161.8%" },
];

type SignalScannerProps = {
  symbol: MarketSymbol;
  enabled?: boolean;
  lookbackBars?: number;
};

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function detectSignalType(
  bar: OHLCData,
  level: number,
  direction: "buy" | "sell"
): "type_1" | "type_2" | null {
  const isBullishBar = bar.close > bar.open;
  const isBearishBar = bar.close < bar.open;

  if (direction === "buy") {
    // For buy signals, we want price near support (at or below level)
    const testedLevel = bar.low <= level;
    const closedAbove = bar.close > level;

    if (testedLevel && closedAbove && isBullishBar) {
      // Type 1: Tested and rejected the level
      return "type_1";
    } else if (closedAbove && isBullishBar && !testedLevel) {
      // Type 2: Closed above without deep test
      const nearLevel = Math.abs(bar.low - level) / level < 0.02; // Within 2%
      if (nearLevel) return "type_2";
    }
  } else {
    // For sell signals, we want price near resistance (at or above level)
    const testedLevel = bar.high >= level;
    const closedBelow = bar.close < level;

    if (testedLevel && closedBelow && isBearishBar) {
      // Type 1: Tested and rejected the level
      return "type_1";
    } else if (closedBelow && isBearishBar && !testedLevel) {
      // Type 2: Closed below without deep test
      const nearLevel = Math.abs(bar.high - level) / level < 0.02; // Within 2%
      if (nearLevel) return "type_2";
    }
  }

  return null;
}

function calculateSignalStrength(
  signalType: "type_1" | "type_2",
  bar: OHLCData,
  level: number
): number {
  // Type 1 signals are stronger
  let baseStrength = signalType === "type_1" ? 0.8 : 0.6;

  // Adjust based on bar size (larger bars = stronger rejection)
  const barRange = bar.high - bar.low;
  const avgPrice = (bar.high + bar.low) / 2;
  const barSizeRatio = barRange / avgPrice;

  if (barSizeRatio > 0.02) baseStrength += 0.1;
  if (barSizeRatio > 0.03) baseStrength += 0.1;

  return Math.min(1, baseStrength);
}


function scanForSignals(
  data: OHLCData[],
  timeframe: Timeframe,
  lookbackBars: number
): { signals: ScannedSignal[]; high: number; low: number } {
  if (data.length < 10) {
    return { signals: [], high: 0, low: 0 };
  }

  // Detect pivots to find high/low
  const pivots = detectPivotPoints(data, 5);
  const highPivots = pivots.filter((p) => p.type === "high");
  const lowPivots = pivots.filter((p) => p.type === "low");

  if (highPivots.length === 0 || lowPivots.length === 0) {
    return { signals: [], high: 0, low: 0 };
  }

  const high = Math.max(...highPivots.map((p) => p.price));
  const low = Math.min(...lowPivots.map((p) => p.price));
  const range = high - low;

  if (range <= 0) {
    return { signals: [], high, low };
  }

  // Calculate Fibonacci levels
  const levels: { price: number; label: string; direction: "buy" | "sell" }[] = [];

  // Retracement levels (support/resistance within range)
  for (const level of RETRACEMENT_LEVELS) {
    const price = high - range * level.ratio;
    levels.push({ price, label: `${level.label} Ret`, direction: "buy" });
    levels.push({ price, label: `${level.label} Ret`, direction: "sell" });
  }

  // Extension levels (beyond range)
  for (const level of EXTENSION_LEVELS) {
    const priceUp = low + range * level.ratio;
    const priceDown = high - range * level.ratio;
    levels.push({ price: priceUp, label: `${level.label} Ext`, direction: "sell" });
    levels.push({ price: priceDown, label: `${level.label} Ext`, direction: "buy" });
  }

  // Scan recent bars for signals
  const signals: ScannedSignal[] = [];
  const recentBars = data.slice(-lookbackBars);

  for (const bar of recentBars) {
    for (const level of levels) {
      const signalType = detectSignalType(bar, level.price, level.direction);
      if (signalType) {
        const strength = calculateSignalStrength(signalType, bar, level.price);

        // Format bar time
        let barTime: string;
        if (typeof bar.time === "number") {
          barTime = new Date(bar.time * 1000).toLocaleDateString();
        } else if (typeof bar.time === "string") {
          barTime = bar.time;
        } else {
          barTime = `${bar.time.year}-${bar.time.month}-${bar.time.day}`;
        }

        signals.push({
          timeframe,
          signalType,
          direction: level.direction,
          level: level.price,
          levelType: level.label,
          strength,
          barTime,
          close: bar.close,
        });
      }
    }
  }

  // Deduplicate signals (same level, same direction, same bar)
  const uniqueSignals = signals.filter(
    (signal, index, self) =>
      index ===
      self.findIndex(
        (s) =>
          s.barTime === signal.barTime &&
          Math.abs(s.level - signal.level) < 0.001 &&
          s.direction === signal.direction
      )
  );

  // Sort by strength descending
  uniqueSignals.sort((a, b) => b.strength - a.strength);

  return { signals: uniqueSignals.slice(0, 5), high, low }; // Max 5 per timeframe
}

export function SignalScanner({
  symbol,
  enabled = true,
  lookbackBars = 10,
}: SignalScannerProps) {
  const context = useMarketDataContext();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<TimeframeScanResult[]>([]);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const runScan = useCallback(async () => {
    setIsScanning(true);
    const newResults: TimeframeScanResult[] = [];

    // Fetch all timeframes in parallel using centralized store
    const fetchPromises = SCAN_TIMEFRAMES.map(async (timeframe) => {
      try {
        const entry = await context.fetchData(symbol, timeframe);
        const data = entry.data;
        const { signals, high, low } = scanForSignals(data, timeframe, lookbackBars);
        return {
          timeframe,
          signals,
          high,
          low,
          isLoading: false,
          error: entry.error,
        };
      } catch (error) {
        return {
          timeframe,
          signals: [],
          high: 0,
          low: 0,
          isLoading: false,
          error: error instanceof Error ? error.message : "Scan failed",
        };
      }
    });

    const fetchResults = await Promise.all(fetchPromises);
    newResults.push(...fetchResults);

    setResults(newResults);
    setLastScanTime(new Date());
    setIsScanning(false);
  }, [symbol, lookbackBars, context]);

  // Auto-scan on mount
  useEffect(() => {
    if (enabled && results.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional initial scan
      runScan();
    }
  }, [enabled, results.length, runScan]);

  if (!enabled) return null;

  const allSignals = results.flatMap((r) => r.signals);
  const buySignals = allSignals.filter((s) => s.direction === "buy");
  const sellSignals = allSignals.filter((s) => s.direction === "sell");
  const type1Signals = allSignals.filter((s) => s.signalType === "type_1");

  return (
    <Card className="border-purple-500/30 border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-purple-400">
            Signal Scanner
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={runScan}
              disabled={isScanning}
              className="text-xs h-7"
            >
              {isScanning ? "Scanning..." : "Scan Now"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "−" : "+"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Scan {SCAN_TIMEFRAMES.join(", ")} for signals at Fibonacci levels
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {/* Summary */}
          {allSignals.length > 0 && (
            <div className="flex items-center gap-4 p-2 rounded bg-muted/50 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>{buySignals.length} Buy</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>{sellSignals.length} Sell</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-amber-400">★</span>
                <span>{type1Signals.length} Type 1</span>
              </div>
            </div>
          )}

          {/* Last scan time */}
          {lastScanTime && (
            <div className="text-xs text-muted-foreground">
              Last scan: {lastScanTime.toLocaleTimeString()}
            </div>
          )}

          {/* Results by Timeframe */}
          {results.length > 0 ? (
            <div className="space-y-2">
              {results.map((result) => (
                <div
                  key={result.timeframe}
                  className="p-2 rounded bg-muted/30 border border-muted"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {result.timeframe}
                    </span>
                    {result.error ? (
                      <span className="text-xs text-red-400">{result.error}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {result.signals.length} signal{result.signals.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {result.signals.length > 0 ? (
                    <div className="space-y-1">
                      {result.signals.map((signal, idx) => (
                        <Tooltip key={idx}>
                          <TooltipTrigger asChild>
                            <div
                              className={`flex items-center justify-between text-xs p-1.5 rounded cursor-help ${
                                signal.direction === "buy"
                                  ? "bg-green-500/10"
                                  : "bg-red-500/10"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-medium ${
                                    signal.direction === "buy"
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }`}
                                >
                                  {signal.direction.toUpperCase()}
                                </span>
                                <span className="text-muted-foreground">
                                  {signal.signalType === "type_1" ? "T1" : "T2"}
                                </span>
                                <span className="text-blue-400">
                                  {signal.levelType}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono">
                                  {formatPrice(signal.level)}
                                </span>
                                <span className="text-muted-foreground">
                                  {(signal.strength * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <div className="text-xs space-y-1">
                              <div>Bar: {signal.barTime}</div>
                              <div>Close: {formatPrice(signal.close)}</div>
                              <div>Level: {formatPrice(signal.level)}</div>
                              <div>Type: {signal.signalType === "type_1" ? "Type 1 (tested & rejected)" : "Type 2 (near level)"}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ) : !result.error ? (
                    <div className="text-xs text-muted-foreground">
                      No signals detected
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : isScanning ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Scanning timeframes...
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Click &quot;Scan Now&quot; to detect signals
            </div>
          )}

          {/* Legend */}
          <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
            <div><span className="text-amber-400">T1</span> = Type 1: Level tested and rejected (stronger)</div>
            <div><span className="text-muted-foreground">T2</span> = Type 2: Close beyond level without deep test</div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
