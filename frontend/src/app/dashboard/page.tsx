"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NewTradeButton } from "@/components/layout";
import {
  MarketSymbol,
  MARKET_CONFIG,
  TIMEFRAME_PAIR_PRESETS,
} from "@/lib/chart-constants";
import { useMarketDataSubscription } from "@/hooks/use-market-data-subscription";
import { useIsBackendUnavailable } from "@/contexts/MarketDataContext";

const MARKETS: MarketSymbol[] = ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"];

function formatPrice(price: number, symbol: MarketSymbol): string {
  if (symbol === "EURUSD") return price.toFixed(5);
  if (price >= 10000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (price >= 100) return price.toFixed(2);
  return price.toFixed(2);
}

function formatChange(change: number, symbol: MarketSymbol): string {
  const prefix = change >= 0 ? "+" : "";
  if (symbol === "EURUSD") return `${prefix}${change.toFixed(5)}`;
  if (Math.abs(change) >= 100) return `${prefix}${change.toFixed(0)}`;
  return `${prefix}${change.toFixed(2)}`;
}

/**
 * Market card that uses centralized store for data.
 * Shares data with Chart page when viewing the same symbol+timeframe.
 */
function MarketCard({ symbol }: { symbol: MarketSymbol }) {
  const config = MARKET_CONFIG[symbol];

  // Subscribe to 1D timeframe data from centralized store
  const { data, isLoading, fetchError } = useMarketDataSubscription(
    symbol,
    "1D",
    "yahoo",
    { autoRefresh: true }
  );

  // Calculate derived values from OHLC data
  const { price, change, changePercent, high, low } = useMemo(() => {
    if (data.length < 2) {
      return { price: 0, change: 0, changePercent: 0, high: 0, low: 0 };
    }

    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    const priceChange = current.close - previous.close;
    const pctChange = (priceChange / previous.close) * 100;

    // Get high/low from recent data
    const recentData = data.slice(-20);
    const recentHigh = Math.max(...recentData.map((d) => d.high));
    const recentLow = Math.min(...recentData.map((d) => d.low));

    return {
      price: current.close,
      change: priceChange,
      changePercent: pctChange,
      high: recentHigh,
      low: recentLow,
    };
  }, [data]);

  const isPositive = change >= 0;
  const hasError = !!fetchError && data.length === 0;

  return (
    <Link href={`/chart?symbol=${symbol}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-lg">{symbol}</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                {config.name}
              </p>
            </div>
            {hasError ? (
              <span className="text-xs text-red-400">{fetchError}</span>
            ) : isLoading && data.length === 0 ? (
              <span className="text-xs text-muted-foreground">Loading...</span>
            ) : null}
          </div>

          {!hasError && data.length > 0 && (
            <>
              <div className="text-2xl font-mono font-bold mb-1">
                {formatPrice(price, symbol)}
              </div>
              <div className={`flex items-center gap-2 text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
                <span>{formatChange(change, symbol)}</span>
                <span>({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                <span>H: {formatPrice(high, symbol)}</span>
                <span>L: {formatPrice(low, symbol)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Global backend status from centralized store
  const isBackendUnavailable = useIsBackendUnavailable();

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">
                Market overview and signal summary
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NewTradeButton />
              <ThemeToggle
                theme={theme}
                onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </div>
          </div>

          {/* Backend Unavailable Warning */}
          {isBackendUnavailable && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
              </svg>
              <div>
                <span className="font-medium">Backend Offline</span>
                <span className="text-orange-400/80 ml-2">
                  Cannot load market data. Start the backend server to see live prices.
                </span>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{MARKETS.length}</div>
                <div className="text-sm text-muted-foreground">Markets</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{TIMEFRAME_PAIR_PRESETS.length}</div>
                <div className="text-sm text-muted-foreground">TF Pairs</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">7</div>
                <div className="text-sm text-muted-foreground">Timeframes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className={`text-3xl font-bold ${isBackendUnavailable ? "text-orange-400" : "text-green-400"}`}>
                  {isBackendUnavailable ? "Offline" : "Online"}
                </div>
                <div className="text-sm text-muted-foreground">Backend</div>
              </CardContent>
            </Card>
          </div>

          {/* Market Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Markets</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {MARKETS.map((symbol) => (
                <MarketCard key={symbol} symbol={symbol} />
              ))}
            </div>
          </div>

          {/* Trading Workflow CTA */}
          <Card className="hover:border-primary transition-colors border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-6 flex items-center gap-6">
              <div className="text-4xl">🚀</div>
              <div className="flex-1">
                <div className="text-lg font-semibold">Start Trading Workflow</div>
                <div className="text-sm text-muted-foreground">
                  Follow the guided 8-step process to execute trades with confidence
                </div>
              </div>
              <div className="hidden sm:block">
                <NewTradeButton size="default">
                  Start Workflow
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </NewTradeButton>
              </div>
              <div className="sm:hidden">
                <NewTradeButton size="sm">Start</NewTradeButton>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Link href="/trend-analysis">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-1">📊</div>
                    <div className="font-medium">Trend Analysis</div>
                    <div className="text-xs text-muted-foreground">
                      Multi-timeframe alignment
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/position-sizing">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-1">🧮</div>
                    <div className="font-medium">Position Sizing</div>
                    <div className="text-xs text-muted-foreground">
                      Calculate trade size
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/chart">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-1">📈</div>
                    <div className="font-medium">Chart Analysis</div>
                    <div className="text-xs text-muted-foreground">
                      Fibonacci & patterns
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/journal">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-1">📔</div>
                    <div className="font-medium">Trade Journal</div>
                    <div className="text-xs text-muted-foreground">
                      Track performance
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link href="/settings">
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-1">⚙️</div>
                    <div className="font-medium">Settings</div>
                    <div className="text-xs text-muted-foreground">
                      Configure indicators
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Trading Style Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trading Styles by Timeframe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 rounded bg-blue-500/10 border border-blue-500/30">
                  <div className="font-medium text-blue-400">Position</div>
                  <div className="text-xs text-muted-foreground">1M / 1W</div>
                  <div className="text-xs mt-1">Hold weeks to months</div>
                </div>
                <div className="p-3 rounded bg-green-500/10 border border-green-500/30">
                  <div className="font-medium text-green-400">Swing</div>
                  <div className="text-xs text-muted-foreground">1W / 1D</div>
                  <div className="text-xs mt-1">Hold days to weeks</div>
                </div>
                <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30">
                  <div className="font-medium text-amber-400">Day</div>
                  <div className="text-xs text-muted-foreground">4H / 1H</div>
                  <div className="text-xs mt-1">Intraday positions</div>
                </div>
                <div className="p-3 rounded bg-red-500/10 border border-red-500/30">
                  <div className="font-medium text-red-400">Scalping</div>
                  <div className="text-xs text-muted-foreground">15m / 1m</div>
                  <div className="text-xs mt-1">Very short-term</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-blue-400">Tip:</span>{" "}
              Click on any market card to open its chart. Use the Scanners tab to detect
              signals and patterns across all timeframes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
