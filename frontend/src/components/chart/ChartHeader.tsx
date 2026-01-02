"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MarketSymbol, Timeframe, MARKET_CONFIG, TIMEFRAME_CONFIG } from "@/lib/chart-constants";

type ChartHeaderProps = {
  symbol: MarketSymbol;
  timeframe: Timeframe;
};

export function ChartHeader({
  symbol,
  timeframe,
}: ChartHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">{MARKET_CONFIG[symbol].name}</h1>
        <p className="text-muted-foreground">
          {symbol} - {TIMEFRAME_CONFIG[timeframe].description}
        </p>
      </div>
      <div className="flex gap-2">
        <Link href="/position-sizing">
          <Button variant="outline" size="sm">
            Position Size
          </Button>
        </Link>
        <Link href="/trend-analysis">
          <Button variant="outline" size="sm">
            Trend Analysis
          </Button>
        </Link>
        <Link href="/settings">
          <Button variant="outline" size="sm">
            Settings
          </Button>
        </Link>
        {process.env.NODE_ENV === "development" && (
          <Link href="/dev/components">
            <Button variant="outline" size="sm">
              Components
            </Button>
          </Link>
        )}
        <Link href="/tradingview">
          <Button variant="outline" size="sm">
            TradingView
          </Button>
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
}
