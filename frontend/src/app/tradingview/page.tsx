"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type WidgetSymbol = "INDEX:DJI" | "INDEX:SPX" | "NASDAQ:NDX" | "BINANCE:BTCUSDT" | "FX:EURUSD" | "TVC:GOLD";

const SYMBOLS: Record<WidgetSymbol, string> = {
  "INDEX:DJI": "Dow Jones",
  "INDEX:SPX": "S&P 500",
  "NASDAQ:NDX": "Nasdaq 100",
  "BINANCE:BTCUSDT": "Bitcoin",
  "FX:EURUSD": "EUR/USD",
  "TVC:GOLD": "Gold",
};

type Interval = "1" | "5" | "15" | "60" | "240" | "D" | "W" | "M";

const INTERVALS: Record<Interval, string> = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "60": "1H",
  "240": "4H",
  "D": "1D",
  "W": "1W",
  "M": "1M",
};

declare global {
  interface Window {
    TradingView?: {
      widget: new (config: Record<string, unknown>) => unknown;
    };
  }
}

export default function TradingViewPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const [symbol, setSymbol] = useState<WidgetSymbol>("INDEX:DJI");
  const [interval, setInterval] = useState<Interval>("D");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  // Generate a unique widget ID based on current settings
  const widgetId = `tradingview_widget_${symbol}_${interval}_${theme}`.replace(/[^a-zA-Z0-9_]/g, "_");

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Clear previous widget
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Create container div for widget
    const widgetDiv = document.createElement("div");
    widgetDiv.id = widgetId;
    widgetDiv.style.height = "100%";
    widgetDiv.style.width = "100%";
    container.appendChild(widgetDiv);

    // Function to create the widget
    const createWidget = () => {
      if (typeof window !== "undefined" && window.TradingView) {
        new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: interval,
          timezone: "Etc/UTC",
          theme: theme,
          style: "1",
          locale: "en",
          toolbar_bg: theme === "dark" ? "#1a1a1a" : "#f1f3f6",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: widgetId,
          hide_side_toolbar: false,
          studies: [
            "MASimple@tv-basicstudies",
            "RSI@tv-basicstudies",
          ],
        });
      }
    };

    // Only load script once, then reuse
    if (scriptLoadedRef.current && window.TradingView) {
      createWidget();
    } else {
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        createWidget();
      };
      container.appendChild(script);
    }

    return () => {
      // Clean up widget container on unmount or re-render
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [symbol, interval, theme, widgetId]);

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">TradingView Widget</h1>
              <p className="text-muted-foreground">
                Free embeddable TradingView chart with real market data
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/chart">
                <Button variant="outline" size="sm">
                  Custom Chart
                </Button>
              </Link>
              <ThemeToggle
                theme={theme}
                onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <h3 className="font-semibold text-blue-400 mb-2">About TradingView Widgets</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>- <strong>Free to use</strong> - No API key or license required</li>
              <li>- <strong>Real market data</strong> - Live prices from TradingView&apos;s data feeds</li>
              <li>- <strong>Full features</strong> - Drawing tools, indicators, alerts</li>
              <li>- <strong>Limitations</strong> - Cannot customize data source or deep behavior</li>
            </ul>
          </div>

          {/* Symbol Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground mr-2">Symbol:</span>
            {(Object.keys(SYMBOLS) as WidgetSymbol[]).map((sym) => (
              <Button
                key={sym}
                variant={symbol === sym ? "default" : "outline"}
                size="sm"
                onClick={() => setSymbol(sym)}
              >
                {SYMBOLS[sym]}
              </Button>
            ))}
          </div>

          {/* Interval Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground mr-2">Interval:</span>
            {(Object.keys(INTERVALS) as Interval[]).map((int) => (
              <Button
                key={int}
                variant={interval === int ? "default" : "outline"}
                size="sm"
                onClick={() => setInterval(int)}
              >
                {INTERVALS[int]}
              </Button>
            ))}
          </div>

          {/* TradingView Widget Container */}
          <div
            ref={containerRef}
            className="rounded-lg border overflow-hidden bg-card"
            style={{ height: "600px" }}
          />

          {/* Documentation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-card border">
              <h3 className="font-semibold mb-2">TradingView Widget (Free)</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Embed via iframe or JavaScript</li>
                <li>- Real-time data included</li>
                <li>- Customizable appearance</li>
                <li>- No license required</li>
                <li>- Cannot access raw data</li>
              </ul>
              <a
                href="https://www.tradingview.com/widget/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-sm mt-2 inline-block hover:underline"
              >
                View Widget Documentation
              </a>
            </div>

            <div className="p-4 rounded-lg bg-card border">
              <h3 className="font-semibold mb-2">TradingView Charting Library (Pro)</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Requires business license ($$$)</li>
                <li>- Full API access</li>
                <li>- Custom data sources</li>
                <li>- White-label solution</li>
                <li>- For brokers/platforms only</li>
              </ul>
              <a
                href="https://www.tradingview.com/HTML5-stock-forex-bitcoin-charting-library/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 text-sm mt-2 inline-block hover:underline"
              >
                Apply for Charting Library
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
