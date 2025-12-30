"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  MarketSymbol,
  Timeframe,
  MARKET_CONFIG,
  TIMEFRAME_CONFIG,
  DataSource,
} from "@/lib/chart-constants";

type UnifiedHeaderProps = {
  symbol: MarketSymbol;
  timeframe: Timeframe;
  theme: "light" | "dark";
  dataSource: DataSource;
  useBackendAPI: boolean;
  onSymbolChange: (symbol: MarketSymbol) => void;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onThemeToggle: () => void;
  onDataSourceChange: (source: DataSource) => void;
  onBackendToggle: () => void;
};

const SYMBOLS: { value: MarketSymbol; label: string }[] = [
  { value: "DJI", label: "Dow Jones (DJI)" },
  { value: "SPX", label: "S&P 500 (SPX)" },
  { value: "NDX", label: "Nasdaq 100 (NDX)" },
  { value: "BTCUSD", label: "Bitcoin (BTC)" },
  { value: "EURUSD", label: "EUR/USD" },
  { value: "GOLD", label: "Gold" },
];

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: "1m", label: "1 Min" },
  { value: "15m", label: "15 Min" },
  { value: "1H", label: "1 Hour" },
  { value: "4H", label: "4 Hour" },
  { value: "1D", label: "Daily" },
  { value: "1W", label: "Weekly" },
  { value: "1M", label: "Monthly" },
];

export function UnifiedHeader({
  symbol,
  timeframe,
  theme,
  dataSource,
  useBackendAPI,
  onSymbolChange,
  onTimeframeChange,
  onThemeToggle,
  onDataSourceChange,
  onBackendToggle,
}: UnifiedHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-lg bg-card border">
      {/* Left: Market & Timeframe */}
      <div className="flex items-center gap-3">
        {/* Market Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[140px] justify-between">
              <span className="font-semibold">{symbol}</span>
              <span className="text-xs text-muted-foreground ml-2">▼</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Select Market</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {SYMBOLS.map((s) => (
              <DropdownMenuItem
                key={s.value}
                onClick={() => onSymbolChange(s.value)}
                className={symbol === s.value ? "bg-accent" : ""}
              >
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Timeframe Pills */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {TIMEFRAMES.map((tf) => (
            <Button
              key={tf.value}
              variant={timeframe === tf.value ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onTimeframeChange(tf.value)}
            >
              {tf.label}
            </Button>
          ))}
        </div>

        {/* Market Name (hidden on small screens) */}
        <span className="text-sm text-muted-foreground hidden lg:inline">
          {MARKET_CONFIG[symbol].name}
        </span>
      </div>

      {/* Right: Navigation & Settings */}
      <div className="flex items-center gap-2">
        {/* Data Source Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded bg-muted/30 text-xs">
          <span className={dataSource === "yahoo" ? "text-green-400" : "text-amber-400"}>
            {dataSource === "yahoo" ? "Live" : "Simulated"}
          </span>
          {useBackendAPI && (
            <>
              <span className="text-muted-foreground">|</span>
              <span className="text-blue-400">API</span>
            </>
          )}
        </div>

        {/* Settings Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="sr-only">Settings</span>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Data Source</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => onDataSourceChange("yahoo")}
              className={dataSource === "yahoo" ? "bg-accent" : ""}
            >
              Yahoo Finance (Live)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDataSourceChange("simulated")}
              className={dataSource === "simulated" ? "bg-accent" : ""}
            >
              Simulated Data
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Backend API</DropdownMenuLabel>
            <DropdownMenuItem onClick={onBackendToggle}>
              {useBackendAPI ? "✓ Enabled" : "○ Disabled"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                All Settings...
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Navigation */}
        <div className="hidden sm:flex gap-1">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              Dashboard
            </Button>
          </Link>
          <Link href="/trend-analysis">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              Trends
            </Button>
          </Link>
          <Link href="/position-sizing">
            <Button variant="ghost" size="sm" className="h-8 text-xs">
              Position
            </Button>
          </Link>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>
    </div>
  );
}
