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
import { validateHarmonicPattern, type PatternType } from "@/lib/api";

type DetectedPattern = {
  timeframe: Timeframe;
  patternType: PatternType;
  direction: "buy" | "sell";
  x: number;
  a: number;
  b: number;
  c: number;
  d: number;
  confidence: number;
};

type TimeframeScanResult = {
  timeframe: Timeframe;
  patterns: DetectedPattern[];
  isLoading: boolean;
  error: string | null;
};

const SCAN_TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "1m"];

const PATTERN_COLORS: Record<string, string> = {
  gartley: "text-emerald-400",
  butterfly: "text-purple-400",
  bat: "text-orange-400",
  crab: "text-cyan-400",
};

const PATTERN_BG: Record<string, string> = {
  gartley: "bg-emerald-500/10 border-emerald-500/30",
  butterfly: "bg-purple-500/10 border-purple-500/30",
  bat: "bg-orange-500/10 border-orange-500/30",
  crab: "bg-cyan-500/10 border-cyan-500/30",
};

type HarmonicScannerProps = {
  symbol: MarketSymbol;
  enabled?: boolean;
};

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

async function fetchTimeframeData(
  symbol: MarketSymbol,
  timeframe: Timeframe
): Promise<OHLCData[]> {
  const response = await fetch(
    `/api/trader/market-data?symbol=${symbol}&timeframe=${timeframe}&periods=100`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch ${timeframe} data`);
  }
  const result = await response.json();
  if (!result.success) {
    return [];
  }
  return result.data || [];
}

async function scanForPatterns(
  data: OHLCData[],
  timeframe: Timeframe
): Promise<DetectedPattern[]> {
  if (data.length < 20) {
    return [];
  }

  // Detect pivots with larger lookback for cleaner patterns
  const pivots = detectPivotPoints(data, 5);

  if (pivots.length < 5) {
    return [];
  }

  // Get the last 10 significant pivots
  const recentPivots = pivots.slice(-10);
  const patterns: DetectedPattern[] = [];

  // Try different combinations of 5 consecutive pivots as potential XABCD
  for (let i = 0; i <= recentPivots.length - 5; i++) {
    const xPivot = recentPivots[i];
    const aPivot = recentPivots[i + 1];
    const bPivot = recentPivots[i + 2];
    const cPivot = recentPivots[i + 3];
    const dPivot = recentPivots[i + 4];

    // Validate the pattern makes sense (alternating highs/lows)
    if (xPivot.type === aPivot.type) continue;
    if (aPivot.type === bPivot.type) continue;
    if (bPivot.type === cPivot.type) continue;
    if (cPivot.type === dPivot.type) continue;

    const x = xPivot.price;
    const a = aPivot.price;
    const b = bPivot.price;
    const c = cPivot.price;
    const d = dPivot.price;

    try {
      const result = await validateHarmonicPattern({ x, a, b, c, d });

      if (result && result.pattern) {
        patterns.push({
          timeframe,
          patternType: result.pattern.pattern_type as PatternType,
          direction: result.pattern.direction as "buy" | "sell",
          x,
          a,
          b,
          c,
          d,
          confidence: 0.8, // Backend validated
        });
      }
    } catch {
      // Pattern validation failed, continue to next combination
    }
  }

  return patterns;
}

export function HarmonicScanner({
  symbol,
  enabled = true,
}: HarmonicScannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<TimeframeScanResult[]>([]);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const runScan = useCallback(async () => {
    setIsScanning(true);
    const newResults: TimeframeScanResult[] = [];

    for (const timeframe of SCAN_TIMEFRAMES) {
      try {
        const data = await fetchTimeframeData(symbol, timeframe);
        const patterns = await scanForPatterns(data, timeframe);
        newResults.push({
          timeframe,
          patterns,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        newResults.push({
          timeframe,
          patterns: [],
          isLoading: false,
          error: error instanceof Error ? error.message : "Scan failed",
        });
      }
    }

    setResults(newResults);
    setLastScanTime(new Date());
    setIsScanning(false);
  }, [symbol]);

  // Don't auto-scan (harmonic scanning is more expensive)
  // User must click "Scan Now"

  if (!enabled) return null;

  const allPatterns = results.flatMap((r) => r.patterns);
  const patternCounts = allPatterns.reduce((acc, p) => {
    acc[p.patternType] = (acc[p.patternType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="border-amber-500/30 border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-amber-400">
            Harmonic Scanner
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
          Detect Gartley, Butterfly, Bat, Crab patterns from pivot points
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {/* Summary */}
          {allPatterns.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-2 rounded bg-muted/50 text-sm">
              {Object.entries(patternCounts).map(([type, count]) => (
                <div key={type} className="flex items-center gap-1">
                  <span className={`capitalize ${PATTERN_COLORS[type] || ""}`}>
                    {type}
                  </span>
                  <span className="text-muted-foreground">({count})</span>
                </div>
              ))}
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
                        {result.patterns.length} pattern{result.patterns.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {result.patterns.length > 0 ? (
                    <div className="space-y-1">
                      {result.patterns.map((pattern, idx) => (
                        <Tooltip key={idx}>
                          <TooltipTrigger asChild>
                            <div
                              className={`p-2 rounded border cursor-help ${
                                PATTERN_BG[pattern.patternType] || "bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-medium capitalize ${
                                      PATTERN_COLORS[pattern.patternType] || ""
                                    }`}
                                  >
                                    {pattern.patternType}
                                  </span>
                                  <span
                                    className={`text-xs ${
                                      pattern.direction === "buy"
                                        ? "text-green-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {pattern.direction === "buy" ? "BULLISH" : "BEARISH"}
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-5 gap-1 mt-1 text-xs">
                                <div className="text-center">
                                  <span className="text-muted-foreground">X</span>
                                  <div className="font-mono text-blue-400">
                                    {formatPrice(pattern.x)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <span className="text-muted-foreground">A</span>
                                  <div className="font-mono text-blue-400">
                                    {formatPrice(pattern.a)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <span className="text-muted-foreground">B</span>
                                  <div className="font-mono text-blue-400">
                                    {formatPrice(pattern.b)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <span className="text-muted-foreground">C</span>
                                  <div className="font-mono text-blue-400">
                                    {formatPrice(pattern.c)}
                                  </div>
                                </div>
                                <div className="text-center">
                                  <span className="text-muted-foreground">D</span>
                                  <div className="font-mono text-blue-400">
                                    {formatPrice(pattern.d)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-xs">
                            <div className="text-xs space-y-1">
                              <div className="font-medium capitalize">
                                {pattern.patternType} Pattern
                              </div>
                              <div>
                                Direction: {pattern.direction === "buy" ? "Bullish (look for long)" : "Bearish (look for short)"}
                              </div>
                              <div>
                                D point ({formatPrice(pattern.d)}) is the potential reversal zone
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  ) : !result.error ? (
                    <div className="text-xs text-muted-foreground">
                      No patterns detected
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : isScanning ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Scanning for harmonic patterns...
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              Click &quot;Scan Now&quot; to detect harmonic patterns.
              <br />
              <span className="text-xs">Requires backend API to be running.</span>
            </div>
          )}

          {/* Pattern Guide */}
          <div className="text-xs text-muted-foreground pt-2 border-t grid grid-cols-2 gap-1">
            <div><span className="text-emerald-400">Gartley</span>: D at 78.6% XA</div>
            <div><span className="text-purple-400">Butterfly</span>: D at 127-162% XA</div>
            <div><span className="text-orange-400">Bat</span>: D at 88.6% XA</div>
            <div><span className="text-cyan-400">Crab</span>: D at 161.8% XA</div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
