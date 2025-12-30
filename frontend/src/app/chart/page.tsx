"use client";

import { useState, useMemo } from "react";
import {
  CandlestickChart,
  OHLCData,
  PriceLine,
  FibonacciLevels,
} from "@/components/trading";
import { Button } from "@/components/ui/button";
import { LineStyle } from "lightweight-charts";

type Timeframe = "1H" | "4H" | "1D" | "1W";

const TIMEFRAME_CONFIG: Record<
  Timeframe,
  { label: string; periods: number; description: string }
> = {
  "1H": { label: "1H", periods: 168, description: "1 week of hourly data" },
  "4H": { label: "4H", periods: 126, description: "3 weeks of 4-hour data" },
  "1D": { label: "1D", periods: 90, description: "90 days of daily data" },
  "1W": { label: "1W", periods: 52, description: "1 year of weekly data" },
};

// Generate Dow Jones-like OHLC data for different timeframes
function generateDowJonesData(
  timeframe: Timeframe,
  periods: number
): OHLCData[] {
  const data: OHLCData[] = [];
  let basePrice = 42500;

  // Volatility scales with timeframe
  const volatilityMap: Record<Timeframe, number> = {
    "1H": 50,
    "4H": 100,
    "1D": 200,
    "1W": 500,
  };
  const baseVolatility = volatilityMap[timeframe];

  const now = new Date();

  for (let i = periods - 1; i >= 0; i--) {
    let timestamp: number;

    switch (timeframe) {
      case "1H":
        timestamp = now.getTime() - i * 60 * 60 * 1000;
        break;
      case "4H":
        timestamp = now.getTime() - i * 4 * 60 * 60 * 1000;
        break;
      case "1D":
        timestamp = now.getTime() - i * 24 * 60 * 60 * 1000;
        break;
      case "1W":
        timestamp = now.getTime() - i * 7 * 24 * 60 * 60 * 1000;
        break;
    }

    const date = new Date(timestamp);

    // Skip weekends for daily timeframe
    if (timeframe === "1D" && (date.getDay() === 0 || date.getDay() === 6)) {
      continue;
    }

    const volatility = baseVolatility * (0.5 + Math.random());
    const trend = Math.random() > 0.48 ? 1 : -1;

    const open = basePrice;
    const change = (Math.random() - 0.5) * volatility + trend * (volatility * 0.1);
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;

    // Format time based on timeframe
    let time: OHLCData["time"];
    if (timeframe === "1D" || timeframe === "1W") {
      time = date.toISOString().split("T")[0] as OHLCData["time"];
    } else {
      time = (Math.floor(timestamp / 1000)) as OHLCData["time"];
    }

    data.push({
      time,
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
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [showFibonacci, setShowFibonacci] = useState(true);
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);

  // Generate data based on timeframe
  const data = useMemo(() => {
    const config = TIMEFRAME_CONFIG[timeframe];
    return generateDowJonesData(timeframe, config.periods);
  }, [timeframe]);

  // Calculate high/low for Fibonacci levels
  const high = Math.max(...data.map((d) => d.high));
  const low = Math.min(...data.map((d) => d.low));
  const range = high - low;

  // Fibonacci retracement levels
  const fibonacciLevels: PriceLine[] = useMemo(() => {
    if (!showFibonacci) return [];
    return [
      {
        price: high,
        color: "#6b7280",
        title: "0%",
        lineStyle: LineStyle.Dotted,
      },
      { price: high - range * 0.236, color: "#9ca3af", title: "23.6%" },
      { price: high - range * 0.382, color: "#f59e0b", title: "38.2%" },
      { price: high - range * 0.5, color: "#8b5cf6", title: "50%" },
      { price: high - range * 0.618, color: "#22c55e", title: "61.8%" },
      { price: high - range * 0.786, color: "#ef4444", title: "78.6%" },
      {
        price: low,
        color: "#6b7280",
        title: "100%",
        lineStyle: LineStyle.Dotted,
      },
    ];
  }, [showFibonacci, high, low, range]);

  const currentPrice = data[data.length - 1]?.close ?? 0;
  const startPrice = data[0]?.open ?? 0;
  const priceChange = currentPrice - startPrice;
  const percentChange = ((priceChange / startPrice) * 100).toFixed(2);

  const formatDisplayPrice = (price: number) => {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                Dow Jones Industrial Average
              </h1>
              <p className="text-muted-foreground">
                DJI - {TIMEFRAME_CONFIG[timeframe].description}
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

          {/* Timeframe Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">
              Timeframe:
            </span>
            {(Object.keys(TIMEFRAME_CONFIG) as Timeframe[]).map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? "default" : "outline"}
                size="sm"
                onClick={() => setTimeframe(tf)}
              >
                {TIMEFRAME_CONFIG[tf].label}
              </Button>
            ))}
          </div>

          {/* Price Summary */}
          <div className="flex items-center gap-6 p-4 rounded-lg bg-card border">
            <div>
              <span className="text-muted-foreground text-sm">Symbol</span>
              <p className="text-xl font-bold font-mono">DJI</p>
            </div>
            <div>
              <span className="text-muted-foreground text-sm">Price</span>
              <p className="text-xl font-bold font-mono">
                {formatDisplayPrice(crosshairPrice ?? currentPrice)}
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
                {formatDisplayPrice(priceChange)} ({percentChange}%)
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
              <h2 className="font-semibold mb-3">
                Fibonacci Retracement Levels
              </h2>
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
