"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  MarketSymbol,
  Timeframe,
  MARKET_CONFIG,
  TIMEFRAME_PAIR_PRESETS,
} from "@/lib/chart-constants";

type MarketData = {
  symbol: MarketSymbol;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  isLoading: boolean;
  error: string | null;
  isBackendError?: boolean; // True when error is due to backend being unavailable
};

type SignalSummary = {
  symbol: MarketSymbol;
  buySignals: number;
  sellSignals: number;
  type1Count: number;
};

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

async function fetchMarketData(symbol: MarketSymbol): Promise<MarketData> {
  try {
    // Use backend route which has caching and fallback providers
    const response = await fetch(`/api/trader/market-data?symbol=${symbol}&timeframe=1D&periods=20`);
    if (!response.ok) throw new Error("Failed to fetch");

    const result = await response.json();
    if (!result.success) throw new Error(result.error || "Failed to fetch");
    const data = result.data || [];

    if (data.length < 2) {
      return {
        symbol,
        price: 0,
        change: 0,
        changePercent: 0,
        high: 0,
        low: 0,
        isLoading: false,
        error: "No data",
      };
    }

    const current = data[data.length - 1];
    const previous = data[data.length - 2];
    const change = current.close - previous.close;
    const changePercent = (change / previous.close) * 100;

    // Get high/low from recent data
    const recentData = data.slice(-20);
    const high = Math.max(...recentData.map((d: { high: number }) => d.high));
    const low = Math.min(...recentData.map((d: { low: number }) => d.low));

    return {
      symbol,
      price: current.close,
      change,
      changePercent,
      high,
      low,
      isLoading: false,
      error: null,
    };
  } catch (error) {
    // Check if this is a connection error (backend unavailable)
    const isBackendError = error instanceof TypeError &&
      (error.message.includes("fetch failed") || error.message.includes("Failed to fetch"));

    return {
      symbol,
      price: 0,
      change: 0,
      changePercent: 0,
      high: 0,
      low: 0,
      isLoading: false,
      error: isBackendError ? "Backend offline" : (error instanceof Error ? error.message : "Error"),
      isBackendError,
    };
  }
}

function MarketCard({ data }: { data: MarketData }) {
  const config = MARKET_CONFIG[data.symbol];
  const isPositive = data.change >= 0;

  return (
    <Link href={`/chart?symbol=${data.symbol}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-lg">{data.symbol}</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                {config.name}
              </p>
            </div>
            {data.error ? (
              <span className="text-xs text-red-400">{data.error}</span>
            ) : data.isLoading ? (
              <span className="text-xs text-muted-foreground">Loading...</span>
            ) : null}
          </div>

          {!data.error && !data.isLoading && (
            <>
              <div className="text-2xl font-mono font-bold mb-1">
                {formatPrice(data.price, data.symbol)}
              </div>
              <div className={`flex items-center gap-2 text-sm ${isPositive ? "text-green-400" : "text-red-400"}`}>
                <span>{formatChange(data.change, data.symbol)}</span>
                <span>({isPositive ? "+" : ""}{data.changePercent.toFixed(2)}%)</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex justify-between">
                <span>H: {formatPrice(data.high, data.symbol)}</span>
                <span>L: {formatPrice(data.low, data.symbol)}</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function SignalCard({ summary }: { summary: SignalSummary }) {
  const total = summary.buySignals + summary.sellSignals;
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between p-2 rounded bg-muted/30">
      <span className="font-medium">{summary.symbol}</span>
      <div className="flex items-center gap-3 text-sm">
        {summary.buySignals > 0 && (
          <span className="text-green-400">
            {summary.buySignals} Buy
          </span>
        )}
        {summary.sellSignals > 0 && (
          <span className="text-red-400">
            {summary.sellSignals} Sell
          </span>
        )}
        {summary.type1Count > 0 && (
          <span className="text-amber-400 text-xs">
            ({summary.type1Count} T1)
          </span>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [markets, setMarkets] = useState<MarketData[]>(
    MARKETS.map((symbol) => ({
      symbol,
      price: 0,
      change: 0,
      changePercent: 0,
      high: 0,
      low: 0,
      isLoading: true,
      error: null,
    }))
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    const results = await Promise.all(MARKETS.map(fetchMarketData));
    setMarkets(results);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, []);

  // Initial load
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional initial data fetch
    refreshData();
  }, [refreshData]);

  // Count totals
  const totalPositive = markets.filter((m) => m.change > 0 && !m.error).length;
  const totalNegative = markets.filter((m) => m.change < 0 && !m.error).length;

  // Check if backend is unavailable (all markets have backend error)
  const isBackendUnavailable = markets.every((m) => m.isBackendError) && !markets.some((m) => m.isLoading);

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
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <Link href="/chart">
                <Button variant="outline" size="sm">
                  Chart
                </Button>
              </Link>
              <Link href="/trend-analysis">
                <Button variant="outline" size="sm">
                  Trends
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  Settings
                </Button>
              </Link>
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
                <div className="text-3xl font-bold text-green-400">{totalPositive}</div>
                <div className="text-sm text-muted-foreground">Up Today</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-red-400">{totalNegative}</div>
                <div className="text-sm text-muted-foreground">Down Today</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold">{TIMEFRAME_PAIR_PRESETS.length}</div>
                <div className="text-sm text-muted-foreground">TF Pairs</div>
              </CardContent>
            </Card>
          </div>

          {/* Last Updated */}
          {lastUpdated && (
            <div className="text-xs text-muted-foreground text-right">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {/* Market Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Markets</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {markets.map((market) => (
                <MarketCard key={market.symbol} data={market} />
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
                <Link href="/workflow">
                  <Button>
                    Start Workflow
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </Link>
              </div>
              <div className="sm:hidden">
                <Link href="/workflow">
                  <Button size="sm">Start</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
