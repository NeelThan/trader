"use client";

import { useState } from "react";
import {
  CandlestickChart,
  OHLCData,
  PriceLine,
  FibonacciLevels,
} from "@/components/trading";
import { Button } from "@/components/ui/button";
import { LineStyle } from "lightweight-charts";

// Generate realistic sample OHLC data
function generateSampleData(days: number = 90): OHLCData[] {
  const data: OHLCData[] = [];
  let basePrice = 100;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const volatility = 2 + Math.random() * 3;
    const trend = Math.random() > 0.48 ? 1 : -1; // Slight bullish bias

    const open = basePrice;
    const change = (Math.random() - 0.5) * volatility + trend * 0.3;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;

    const dateStr = date.toISOString().split("T")[0];

    data.push({
      time: dateStr as OHLCData["time"],
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    });

    basePrice = close;
  }

  return data;
}

export default function ChartDemoPage() {
  const [data] = useState(() => generateSampleData(90));
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showFibonacci, setShowFibonacci] = useState(true);
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);

  // Calculate high/low for Fibonacci levels
  const high = Math.max(...data.map((d) => d.high));
  const low = Math.min(...data.map((d) => d.low));
  const range = high - low;

  // Fibonacci retracement levels
  const fibonacciLevels: PriceLine[] = showFibonacci
    ? [
        { price: high, color: "#6b7280", title: "0%", lineStyle: LineStyle.Dotted },
        { price: high - range * 0.236, color: "#9ca3af", title: "23.6%" },
        { price: high - range * 0.382, color: "#f59e0b", title: "38.2%" },
        { price: high - range * 0.5, color: "#8b5cf6", title: "50%" },
        { price: high - range * 0.618, color: "#22c55e", title: "61.8%" },
        { price: high - range * 0.786, color: "#ef4444", title: "78.6%" },
        { price: low, color: "#6b7280", title: "100%", lineStyle: LineStyle.Dotted },
      ]
    : [];

  const currentPrice = data[data.length - 1]?.close ?? 0;
  const startPrice = data[0]?.open ?? 0;
  const priceChange = currentPrice - startPrice;
  const percentChange = ((priceChange / startPrice) * 100).toFixed(2);

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Chart Demo</h1>
              <p className="text-muted-foreground">
                TradingView Lightweight Charts integration
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                Dark
              </Button>
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                Light
              </Button>
            </div>
          </div>

          {/* Price Summary */}
          <div className="flex items-center gap-6 p-4 rounded-lg bg-card border">
            <div>
              <span className="text-muted-foreground text-sm">Symbol</span>
              <p className="text-xl font-bold font-mono">DEMO/USD</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Price</span>
              <p className="text-xl font-bold font-mono">
                {crosshairPrice?.toFixed(2) ?? currentPrice.toFixed(2)}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Change</span>
              <p
                className={`text-xl font-bold font-mono ${
                  priceChange >= 0 ? "text-buy" : "text-sell"
                }`}
              >
                {priceChange >= 0 ? "+" : ""}
                {priceChange.toFixed(2)} ({percentChange}%)
              </p>
            </div>
            <div className="ml-auto">
              <Button
                variant={showFibonacci ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFibonacci(!showFibonacci)}
              >
                {showFibonacci ? "Hide" : "Show"} Fibonacci
              </Button>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-lg border overflow-hidden">
            <CandlestickChart
              data={data}
              priceLines={fibonacciLevels}
              height={500}
              theme={theme}
              onCrosshairMove={(price) => setCrosshairPrice(price)}
            />
          </div>

          {/* Fibonacci Levels Panel */}
          {showFibonacci && (
            <div className="p-4 rounded-lg bg-card border">
              <h2 className="font-semibold mb-3">Fibonacci Retracement Levels</h2>
              <FibonacciLevels
                direction="sell"
                highPrice={high}
                lowPrice={low}
                levels={[
                  { ratio: 0, label: "0% (High)", price: high },
                  { ratio: 0.236, label: "23.6%", price: high - range * 0.236 },
                  { ratio: 0.382, label: "38.2%", price: high - range * 0.382 },
                  { ratio: 0.5, label: "50%", price: high - range * 0.5 },
                  { ratio: 0.618, label: "61.8%", price: high - range * 0.618 },
                  { ratio: 0.786, label: "78.6%", price: high - range * 0.786 },
                  { ratio: 1, label: "100% (Low)", price: low },
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
