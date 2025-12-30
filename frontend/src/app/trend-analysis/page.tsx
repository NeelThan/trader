"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTrendAnalysis } from "@/hooks/use-trend-analysis";
import { TrendAlignmentPanel } from "@/components/chart";
import {
  MarketSymbol,
  MARKET_CONFIG,
  TIMEFRAME_PAIR_PRESETS,
  TimeframePair,
} from "@/lib/chart-constants";

const SYMBOLS: { value: MarketSymbol; label: string }[] = [
  { value: "DJI", label: "Dow Jones" },
  { value: "SPX", label: "S&P 500" },
  { value: "NDX", label: "Nasdaq 100" },
  { value: "BTCUSD", label: "Bitcoin" },
  { value: "EURUSD", label: "EUR/USD" },
  { value: "GOLD", label: "Gold" },
];

export default function TrendAnalysisPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [symbol, setSymbol] = useState<MarketSymbol>("DJI");
  const [hasMounted, setHasMounted] = useState(false);

  // Track mount state for hydration
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional mount detection
    setHasMounted(true);
  }, []);

  // Use trend analysis hook
  const trendAnalysis = useTrendAnalysis({
    symbol,
    pairs: TIMEFRAME_PAIR_PRESETS,
    enabled: hasMounted,
  });

  // Count actionable signals
  const longSignals = trendAnalysis.alignments.filter(
    (a) => a.action === "GO_LONG"
  ).length;
  const shortSignals = trendAnalysis.alignments.filter(
    (a) => a.action === "GO_SHORT"
  ).length;

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Trend Analysis</h1>
              <p className="text-muted-foreground">
                Multi-timeframe trend alignment for{" "}
                {MARKET_CONFIG[symbol].name}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/chart">
                <Button variant="outline" size="sm">
                  Back to Chart
                </Button>
              </Link>
              <Link href="/position-sizing">
                <Button variant="outline" size="sm">
                  Position Sizing
                </Button>
              </Link>
              <ThemeToggle
                theme={theme}
                onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </div>
          </div>

          {/* Market Selection */}
          <div className="p-4 rounded-lg bg-card border">
            <h3 className="font-semibold mb-3">Select Market</h3>
            <div className="flex flex-wrap gap-2">
              {SYMBOLS.map((s) => (
                <Button
                  key={s.value}
                  variant={symbol === s.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSymbol(s.value)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Summary */}
          {!trendAnalysis.isLoading && trendAnalysis.alignments.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                <p className="text-3xl font-bold text-green-400">
                  {longSignals}
                </p>
                <p className="text-sm text-muted-foreground">Long Signals</p>
              </div>
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
                <p className="text-3xl font-bold text-red-400">{shortSignals}</p>
                <p className="text-sm text-muted-foreground">Short Signals</p>
              </div>
              <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/30 text-center">
                <p className="text-3xl font-bold text-gray-400">
                  {trendAnalysis.alignments.length - longSignals - shortSignals}
                </p>
                <p className="text-sm text-muted-foreground">Stand Aside</p>
              </div>
            </div>
          )}

          {/* Trend Alignment Panel */}
          <TrendAlignmentPanel
            alignments={trendAnalysis.alignments}
            selectedPair={trendAnalysis.selectedPair}
            isLoading={trendAnalysis.isLoading}
            error={trendAnalysis.error}
            onSelectPair={trendAnalysis.setSelectedPair}
            onRefresh={trendAnalysis.refresh}
          />

          {/* Strategy Guide */}
          <div className="p-4 rounded-lg bg-card border space-y-4">
            <h3 className="font-semibold">Trading Strategy Guide</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded bg-green-500/10 border border-green-500/30">
                <p className="font-medium text-green-400 mb-2">GO LONG Setup</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>1. Higher timeframe trending UP</li>
                  <li>2. Lower timeframe pulling back (DOWN)</li>
                  <li>3. Look for BUY signals at Fibonacci support</li>
                  <li>4. Enter when signal bar confirms reversal</li>
                </ul>
              </div>
              <div className="p-3 rounded bg-red-500/10 border border-red-500/30">
                <p className="font-medium text-red-400 mb-2">GO SHORT Setup</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>1. Higher timeframe trending DOWN</li>
                  <li>2. Lower timeframe bouncing (UP)</li>
                  <li>3. Look for SELL signals at Fibonacci resistance</li>
                  <li>4. Enter when signal bar confirms reversal</li>
                </ul>
              </div>
            </div>
            <div className="p-3 rounded bg-muted/50 border">
              <p className="font-medium mb-2">Stand Aside Conditions</p>
              <p className="text-sm text-muted-foreground">
                When both timeframes are trending in the same direction, wait
                for the lower timeframe to show a counter-trend move before
                entering. This creates the optimal &quot;buy the dip&quot; or
                &quot;sell the rally&quot; setup.
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-blue-400">Next Steps:</span>{" "}
              Once you identify an actionable signal, go to the{" "}
              <Link href="/chart" className="underline hover:text-blue-400">
                Chart page
              </Link>{" "}
              to analyze Fibonacci levels and detect signal bars, then use the{" "}
              <Link
                href="/position-sizing"
                className="underline hover:text-blue-400"
              >
                Position Sizing calculator
              </Link>{" "}
              to determine your trade size.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
