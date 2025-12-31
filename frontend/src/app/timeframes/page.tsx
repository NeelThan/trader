"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MultiTimeframeViewer } from "@/components/trading/MultiTimeframeViewer";
import { MarketSymbol, MARKET_CONFIG } from "@/lib/chart-constants";

const SYMBOLS: MarketSymbol[] = ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"];

export default function TimeframesPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [selectedSymbol, setSelectedSymbol] = useState<MarketSymbol>("DJI");

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold">Timeframe Analysis</h1>
              <p className="text-sm text-muted-foreground">
                View all timeframes with trend and OHLC data
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/chart">
                <Button variant="outline" size="sm">Chart</Button>
              </Link>
              <Link href="/trend-analysis">
                <Button variant="outline" size="sm">Trend Analysis</Button>
              </Link>
              <Link href="/workflow">
                <Button variant="outline" size="sm">Workflow</Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm">Settings</Button>
              </Link>
              <ThemeToggle
                theme={theme}
                onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </div>
          </div>
        </header>

        {/* Symbol Selector */}
        <div className="border-b border-border bg-card/50 px-6 py-3">
          <div className="flex items-center gap-3 max-w-7xl mx-auto">
            <span className="text-sm text-muted-foreground">Symbol:</span>
            <div className="flex flex-wrap gap-2">
              {SYMBOLS.map((symbol) => (
                <Button
                  key={symbol}
                  variant={selectedSymbol === symbol ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSymbol(symbol)}
                  className="h-8"
                >
                  <span className="font-semibold">{symbol}</span>
                  <span className="ml-1 text-xs opacity-70 hidden sm:inline">
                    {MARKET_CONFIG[symbol].name}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="p-6 max-w-7xl mx-auto">
          <MultiTimeframeViewer symbol={selectedSymbol} />
        </main>

        {/* Footer Info */}
        <footer className="border-t border-border bg-card/50 px-6 py-4 mt-8">
          <div className="max-w-7xl mx-auto text-sm text-muted-foreground">
            <p>
              Data refreshes automatically based on timeframe. Trend analysis uses
              pivot points, moving averages, and RSI indicators to determine direction.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
