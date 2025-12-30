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

type Timeframe = "1m" | "15m" | "1H" | "4H" | "1D" | "1W" | "1M";

const TIMEFRAME_CONFIG: Record<
  Timeframe,
  { label: string; periods: number; description: string }
> = {
  "1m": { label: "1m", periods: 240, description: "4 hours of 1-minute data" },
  "15m": {
    label: "15m",
    periods: 192,
    description: "2 days of 15-minute data",
  },
  "1H": { label: "1H", periods: 168, description: "1 week of hourly data" },
  "4H": { label: "4H", periods: 126, description: "3 weeks of 4-hour data" },
  "1D": { label: "1D", periods: 90, description: "90 days of daily data" },
  "1W": { label: "1W", periods: 52, description: "1 year of weekly data" },
  "1M": { label: "1M", periods: 60, description: "5 years of monthly data" },
};

type FibonacciVisibility = {
  retracement: boolean;
  extension: boolean;
  expansion: boolean;
  projection: boolean;
};

// Fibonacci level ratios
const RETRACEMENT_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const EXTENSION_RATIOS = [1.272, 1.414, 1.618, 2.0, 2.618];
const EXPANSION_RATIOS = [0.618, 1.0, 1.618, 2.618];
const PROJECTION_RATIOS = [0.618, 1.0, 1.272, 1.618];

// Colors for each Fibonacci type
const FIB_COLORS = {
  retracement: {
    0: "#6b7280",
    0.236: "#9ca3af",
    0.382: "#f59e0b",
    0.5: "#8b5cf6",
    0.618: "#22c55e",
    0.786: "#ef4444",
    1: "#6b7280",
  } as Record<number, string>,
  extension: "#3b82f6", // Blue
  expansion: "#ec4899", // Pink
  projection: "#14b8a6", // Teal
};

// Generate Dow Jones-like OHLC data for different timeframes
function generateDowJonesData(
  timeframe: Timeframe,
  periods: number
): OHLCData[] {
  const data: OHLCData[] = [];
  let basePrice = 42500;

  const volatilityMap: Record<Timeframe, number> = {
    "1m": 10,
    "15m": 25,
    "1H": 50,
    "4H": 100,
    "1D": 200,
    "1W": 500,
    "1M": 1500,
  };
  const baseVolatility = volatilityMap[timeframe];

  const intervalMap: Record<Timeframe, number> = {
    "1m": 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1H": 60 * 60 * 1000,
    "4H": 4 * 60 * 60 * 1000,
    "1D": 24 * 60 * 60 * 1000,
    "1W": 7 * 24 * 60 * 60 * 1000,
    "1M": 30 * 24 * 60 * 60 * 1000,
  };
  const interval = intervalMap[timeframe];

  const now = new Date();

  for (let i = periods - 1; i >= 0; i--) {
    const timestamp = now.getTime() - i * interval;
    const date = new Date(timestamp);

    if (timeframe === "1D" && (date.getDay() === 0 || date.getDay() === 6)) {
      continue;
    }

    const volatility = baseVolatility * (0.5 + Math.random());
    const trend = Math.random() > 0.48 ? 1 : -1;

    const open = basePrice;
    const change =
      (Math.random() - 0.5) * volatility + trend * (volatility * 0.1);
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.3;
    const low = Math.min(open, close) - Math.random() * volatility * 0.3;

    let time: OHLCData["time"];
    if (timeframe === "1D" || timeframe === "1W" || timeframe === "1M") {
      time = date.toISOString().split("T")[0] as OHLCData["time"];
    } else {
      time = Math.floor(timestamp / 1000) as OHLCData["time"];
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
  const [fibVisibility, setFibVisibility] = useState<FibonacciVisibility>({
    retracement: true,
    extension: true,
    expansion: true,
    projection: true,
  });
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);

  const data = useMemo(() => {
    const config = TIMEFRAME_CONFIG[timeframe];
    return generateDowJonesData(timeframe, config.periods);
  }, [timeframe]);

  // Calculate swing high/low for Fibonacci calculations
  const high = Math.max(...data.map((d) => d.high));
  const low = Math.min(...data.map((d) => d.low));
  const range = high - low;

  // For projection, we need a third point (using current price as C)
  const currentPrice = data[data.length - 1]?.close ?? high;

  // Build price lines based on visibility
  const priceLines: PriceLine[] = useMemo(() => {
    const lines: PriceLine[] = [];

    // Retracement: Levels between high and low
    if (fibVisibility.retracement) {
      RETRACEMENT_RATIOS.forEach((ratio) => {
        const price = high - range * ratio;
        const label =
          ratio === 0 ? "0%" : ratio === 1 ? "100%" : `${ratio * 100}%`;
        lines.push({
          price,
          color: FIB_COLORS.retracement[ratio] ?? "#6b7280",
          title: `R ${label}`,
          lineStyle:
            ratio === 0 || ratio === 1 ? LineStyle.Dotted : LineStyle.Dashed,
        });
      });
    }

    // Extension: Levels beyond the swing (below low for downtrend)
    if (fibVisibility.extension) {
      EXTENSION_RATIOS.forEach((ratio) => {
        const price = high - range * ratio;
        lines.push({
          price,
          color: FIB_COLORS.extension,
          title: `Ext ${ratio * 100}%`,
          lineStyle: LineStyle.Dashed,
        });
      });
    }

    // Expansion: AB=CD pattern projections from low
    if (fibVisibility.expansion) {
      EXPANSION_RATIOS.forEach((ratio) => {
        const price = low + range * ratio;
        lines.push({
          price,
          color: FIB_COLORS.expansion,
          title: `Exp ${ratio * 100}%`,
          lineStyle: LineStyle.Dashed,
        });
      });
    }

    // Projection: Based on A-B-C pattern (high to low to current)
    if (fibVisibility.projection) {
      const projectionBase = currentPrice;
      const projectionRange = high - low;
      PROJECTION_RATIOS.forEach((ratio) => {
        const price = projectionBase + projectionRange * ratio;
        lines.push({
          price,
          color: FIB_COLORS.projection,
          title: `Proj ${ratio * 100}%`,
          lineStyle: LineStyle.Dashed,
        });
      });
    }

    return lines;
  }, [fibVisibility, high, low, range, currentPrice]);

  const startPrice = data[0]?.open ?? 0;
  const priceChange = currentPrice - startPrice;
  const percentChange = ((priceChange / startPrice) * 100).toFixed(2);

  const formatDisplayPrice = (price: number) => {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const toggleFibType = (type: keyof FibonacciVisibility) => {
    setFibVisibility((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleAllFib = () => {
    const allVisible = Object.values(fibVisibility).every(Boolean);
    setFibVisibility({
      retracement: !allVisible,
      extension: !allVisible,
      expansion: !allVisible,
      projection: !allVisible,
    });
  };

  const anyFibVisible = Object.values(fibVisibility).some(Boolean);

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

          {/* Fibonacci Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground mr-2">
              Fibonacci:
            </span>
            <Button
              variant={anyFibVisible ? "default" : "outline"}
              size="sm"
              onClick={toggleAllFib}
            >
              {anyFibVisible ? "Hide All" : "Show All"}
            </Button>
            <div className="w-px h-6 bg-border mx-2" />
            <Button
              variant={fibVisibility.retracement ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFibType("retracement")}
              className={
                fibVisibility.retracement ? "bg-gray-600 hover:bg-gray-700" : ""
              }
            >
              Retracement
            </Button>
            <Button
              variant={fibVisibility.extension ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFibType("extension")}
              className={
                fibVisibility.extension ? "bg-blue-600 hover:bg-blue-700" : ""
              }
            >
              Extension
            </Button>
            <Button
              variant={fibVisibility.expansion ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFibType("expansion")}
              className={
                fibVisibility.expansion ? "bg-pink-600 hover:bg-pink-700" : ""
              }
            >
              Expansion
            </Button>
            <Button
              variant={fibVisibility.projection ? "default" : "outline"}
              size="sm"
              onClick={() => toggleFibType("projection")}
              className={
                fibVisibility.projection ? "bg-teal-600 hover:bg-teal-700" : ""
              }
            >
              Projection
            </Button>
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
          </div>

          {/* Chart */}
          <div className="rounded-lg border overflow-hidden">
            <CandlestickChart
              data={data}
              priceLines={priceLines}
              height={500}
              theme={theme}
              onCrosshairMove={(price) => setCrosshairPrice(price)}
            />
          </div>

          {/* Fibonacci Levels Panel */}
          {anyFibVisible && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Retracement */}
              {fibVisibility.retracement && (
                <div className="p-4 rounded-lg bg-card border">
                  <h3 className="font-semibold mb-3 text-gray-400">
                    Retracement
                  </h3>
                  <FibonacciLevels
                    direction="sell"
                    highPrice={high}
                    lowPrice={low}
                    levels={RETRACEMENT_RATIOS.map((ratio) => ({
                      ratio,
                      label: `${ratio * 100}%`,
                      price: high - range * ratio,
                    }))}
                  />
                </div>
              )}

              {/* Extension */}
              {fibVisibility.extension && (
                <div className="p-4 rounded-lg bg-card border">
                  <h3 className="font-semibold mb-3 text-blue-400">
                    Extension
                  </h3>
                  <FibonacciLevels
                    direction="sell"
                    highPrice={high}
                    lowPrice={low}
                    levels={EXTENSION_RATIOS.map((ratio) => ({
                      ratio,
                      label: `${ratio * 100}%`,
                      price: high - range * ratio,
                    }))}
                  />
                </div>
              )}

              {/* Expansion */}
              {fibVisibility.expansion && (
                <div className="p-4 rounded-lg bg-card border">
                  <h3 className="font-semibold mb-3 text-pink-400">
                    Expansion
                  </h3>
                  <FibonacciLevels
                    direction="buy"
                    highPrice={low + range * Math.max(...EXPANSION_RATIOS)}
                    lowPrice={low}
                    levels={EXPANSION_RATIOS.map((ratio) => ({
                      ratio,
                      label: `${ratio * 100}%`,
                      price: low + range * ratio,
                    }))}
                  />
                </div>
              )}

              {/* Projection */}
              {fibVisibility.projection && (
                <div className="p-4 rounded-lg bg-card border">
                  <h3 className="font-semibold mb-3 text-teal-400">
                    Projection
                  </h3>
                  <FibonacciLevels
                    direction="buy"
                    highPrice={
                      currentPrice + range * Math.max(...PROJECTION_RATIOS)
                    }
                    lowPrice={currentPrice}
                    levels={PROJECTION_RATIOS.map((ratio) => ({
                      ratio,
                      label: `${ratio * 100}%`,
                      price: currentPrice + range * ratio,
                    }))}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
