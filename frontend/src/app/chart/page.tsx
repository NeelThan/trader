"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  CandlestickChart,
  OHLCData,
  PriceLine,
  LineOverlay,
  ChartType,
  FibonacciLevels,
} from "@/components/trading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { LineStyle } from "lightweight-charts";
import { useSettings } from "@/hooks/use-settings";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type Timeframe = "1m" | "15m" | "1H" | "4H" | "1D" | "1W" | "1M";
type MarketSymbol = "DJI" | "SPX" | "NDX" | "BTCUSD" | "EURUSD" | "GOLD";
type DataSource = "simulated" | "yahoo";

const MARKET_CONFIG: Record<
  MarketSymbol,
  { name: string; basePrice: number; volatilityMultiplier: number }
> = {
  DJI: { name: "Dow Jones Industrial Average", basePrice: 42500, volatilityMultiplier: 1 },
  SPX: { name: "S&P 500", basePrice: 5950, volatilityMultiplier: 0.15 },
  NDX: { name: "Nasdaq 100", basePrice: 21200, volatilityMultiplier: 0.5 },
  BTCUSD: { name: "Bitcoin / USD", basePrice: 95000, volatilityMultiplier: 2.5 },
  EURUSD: { name: "Euro / US Dollar", basePrice: 1.04, volatilityMultiplier: 0.00005 },
  GOLD: { name: "Gold", basePrice: 2620, volatilityMultiplier: 0.08 },
};

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

type PivotPoint = {
  index: number;
  price: number;
  type: "high" | "low";
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
  extension: "#3b82f6",
  expansion: "#ec4899",
  projection: "#14b8a6",
};

// Detect swing highs and lows (pivot points) with alternating high-low pattern
function detectPivotPoints(
  data: OHLCData[],
  lookback: number = 5
): PivotPoint[] {
  const rawPivots: PivotPoint[] = [];

  // First pass: find all potential swing highs and lows
  for (let i = lookback; i < data.length - lookback; i++) {
    const currentHigh = data[i].high;
    const currentLow = data[i].low;

    // Check for swing high
    let isSwingHigh = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && data[j].high >= currentHigh) {
        isSwingHigh = false;
        break;
      }
    }
    if (isSwingHigh) {
      rawPivots.push({ index: i, price: currentHigh, type: "high" });
    }

    // Check for swing low
    let isSwingLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j !== i && data[j].low <= currentLow) {
        isSwingLow = false;
        break;
      }
    }
    if (isSwingLow) {
      rawPivots.push({ index: i, price: currentLow, type: "low" });
    }
  }

  // Sort by index
  rawPivots.sort((a, b) => a.index - b.index);

  // Second pass: ensure alternating high-low pattern
  // When consecutive same types, keep the most extreme one
  const alternatingPivots: PivotPoint[] = [];

  for (const pivot of rawPivots) {
    if (alternatingPivots.length === 0) {
      alternatingPivots.push(pivot);
      continue;
    }

    const lastPivot = alternatingPivots[alternatingPivots.length - 1];

    if (pivot.type !== lastPivot.type) {
      // Different type - good, add it
      alternatingPivots.push(pivot);
    } else {
      // Same type - keep the more extreme one
      if (pivot.type === "high" && pivot.price > lastPivot.price) {
        // New high is higher, replace
        alternatingPivots[alternatingPivots.length - 1] = pivot;
      } else if (pivot.type === "low" && pivot.price < lastPivot.price) {
        // New low is lower, replace
        alternatingPivots[alternatingPivots.length - 1] = pivot;
      }
      // Otherwise keep the existing one
    }
  }

  return alternatingPivots;
}

// Generate OHLC data for different markets and timeframes
function generateMarketData(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  periods: number
): OHLCData[] {
  const data: OHLCData[] = [];
  const marketConfig = MARKET_CONFIG[symbol];
  let basePrice = marketConfig.basePrice;

  const volatilityMap: Record<Timeframe, number> = {
    "1m": 10,
    "15m": 25,
    "1H": 50,
    "4H": 100,
    "1D": 200,
    "1W": 500,
    "1M": 1500,
  };
  const baseVolatility = volatilityMap[timeframe] * marketConfig.volatilityMultiplier;

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
  const { settings } = useSettings();

  // Initialize state with defaults (same as DEFAULT_SETTINGS to prevent hydration mismatch)
  const [symbol, setSymbol] = useState<MarketSymbol>("DJI");
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [dataSource, setDataSource] = useState<DataSource>("simulated");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [fibVisibility, setFibVisibility] = useState<FibonacciVisibility>({
    retracement: true,
    extension: true,
    expansion: true,
    projection: true,
  });
  const [showPivots, setShowPivots] = useState(true);
  const [showPivotLines, setShowPivotLines] = useState(true);
  const [useManualPivots, setUseManualPivots] = useState(false);
  const [manualHigh, setManualHigh] = useState<string>("");
  const [manualLow, setManualLow] = useState<string>("");
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const [settingsApplied, setSettingsApplied] = useState(false);

  // Apply settings from localStorage after hydration (only once)
  // This runs when useSyncExternalStore updates settings from localStorage
  useEffect(() => {
    if (!settingsApplied) {
      // Check if settings differ from defaults (indicates localStorage was loaded)
      const hasCustomSettings =
        settings.defaultSymbol !== "DJI" ||
        settings.defaultTimeframe !== "1D" ||
        settings.chartType !== "candlestick" ||
        settings.theme !== "dark" ||
        !settings.showPivots ||
        !settings.showPivotLines ||
        !settings.fibRetracement ||
        !settings.fibExtension ||
        !settings.fibExpansion ||
        !settings.fibProjection;

      if (hasCustomSettings) {
        setSymbol(settings.defaultSymbol);
        setTimeframe(settings.defaultTimeframe);
        setChartType(settings.chartType);
        setTheme(settings.theme);
        setFibVisibility({
          retracement: settings.fibRetracement,
          extension: settings.fibExtension,
          expansion: settings.fibExpansion,
          projection: settings.fibProjection,
        });
        setShowPivots(settings.showPivots);
        setShowPivotLines(settings.showPivotLines);
      }
      setSettingsApplied(true);
    }
  }, [settings, settingsApplied]);

  // Yahoo Finance API state
  const [yahooData, setYahooData] = useState<OHLCData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Generate simulated data
  const simulatedData = useMemo(() => {
    const config = TIMEFRAME_CONFIG[timeframe];
    return generateMarketData(symbol, timeframe, config.periods);
  }, [symbol, timeframe]);

  // Fetch Yahoo Finance data when dataSource is "yahoo"
  useEffect(() => {
    if (dataSource !== "yahoo") {
      setFetchError(null);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setFetchError(null);

      try {
        const response = await fetch(
          `/api/market-data?symbol=${symbol}&timeframe=${timeframe}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch data");
        }

        const result = await response.json();
        setYahooData(result.data as OHLCData[]);
      } catch (error) {
        console.error("Failed to fetch market data:", error);
        setFetchError(
          error instanceof Error ? error.message : "Failed to fetch market data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dataSource, symbol, timeframe]);

  // Use appropriate data based on source
  const data = useMemo(() => {
    if (dataSource === "yahoo" && yahooData.length > 0) {
      return yahooData;
    }
    return simulatedData;
  }, [dataSource, yahooData, simulatedData]);

  // Detect pivot points
  const pivotPoints = useMemo(() => detectPivotPoints(data, 5), [data]);

  // Get the recent pivot points (last 5) for Fibonacci calculations
  // n-1 is the most recent pivot, going back ~5 pivots
  const recentPivots = useMemo(() => {
    if (pivotPoints.length <= 5) return pivotPoints;
    return pivotPoints.slice(-5); // Last 5 pivot points
  }, [pivotPoints]);

  // Get A-B-C pivot points for projection (last 3 alternating pivots)
  const { pivotA, pivotB, pivotC } = useMemo(() => {
    if (recentPivots.length < 3) {
      return { pivotA: null, pivotB: null, pivotC: null };
    }
    // Get last 3 pivots for A-B-C pattern
    const lastThree = recentPivots.slice(-3);
    return {
      pivotA: lastThree[0],
      pivotB: lastThree[1],
      pivotC: lastThree[2],
    };
  }, [recentPivots]);

  // Get the high and low from recent pivots for Fibonacci
  const { high, low, pivotHigh, pivotLow } = useMemo(() => {
    if (useManualPivots) {
      const manualHighVal = parseFloat(manualHigh) || 0;
      const manualLowVal = parseFloat(manualLow) || 0;
      return {
        high: manualHighVal || Math.max(...data.map((d) => d.high)),
        low: manualLowVal || Math.min(...data.map((d) => d.low)),
        pivotHigh: null as PivotPoint | null,
        pivotLow: null as PivotPoint | null,
      };
    }

    // Use only recent pivots (last 5) for Fibonacci
    const recentHighs = recentPivots.filter((p) => p.type === "high");
    const recentLows = recentPivots.filter((p) => p.type === "low");

    const pivotHigh =
      recentHighs.length > 0
        ? recentHighs.reduce((max, p) => (p.price > max.price ? p : max))
        : null;
    const pivotLow =
      recentLows.length > 0
        ? recentLows.reduce((min, p) => (p.price < min.price ? p : min))
        : null;

    return {
      high: pivotHigh?.price ?? Math.max(...data.map((d) => d.high)),
      low: pivotLow?.price ?? Math.min(...data.map((d) => d.low)),
      pivotHigh,
      pivotLow,
    };
  }, [data, recentPivots, useManualPivots, manualHigh, manualLow]);

  const range = high - low;
  const currentPrice = data[data.length - 1]?.close ?? high;

  // Build price lines based on visibility
  const priceLines: PriceLine[] = useMemo(() => {
    const lines: PriceLine[] = [];

    // Add pivot point lines
    if (showPivots && !useManualPivots) {
      pivotPoints.forEach((pivot) => {
        lines.push({
          price: pivot.price,
          color: pivot.type === "high" ? "#22c55e" : "#ef4444",
          title: pivot.type === "high" ? "▼ SH" : "▲ SL",
          lineStyle: LineStyle.Dotted,
        });
      });
    }

    // Retracement levels
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

    // Extension levels
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

    // Expansion levels
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

    // Projection levels (using A-B-C pattern)
    // A-B defines the range, C is the starting point for projection
    if (fibVisibility.projection && pivotA && pivotB && pivotC) {
      const abRange = Math.abs(pivotB.price - pivotA.price);
      // Direction: if C is a low, project up; if C is a high, project down
      const direction = pivotC.type === "low" ? 1 : -1;

      PROJECTION_RATIOS.forEach((ratio) => {
        const price = pivotC.price + direction * abRange * ratio;
        lines.push({
          price,
          color: FIB_COLORS.projection,
          title: `Proj ${ratio * 100}%`,
          lineStyle: LineStyle.Dashed,
        });
      });
    }

    return lines;
  }, [
    fibVisibility,
    high,
    low,
    range,
    showPivots,
    pivotPoints,
    useManualPivots,
    pivotA,
    pivotB,
    pivotC,
  ]);

  // Build line overlays to connect recent pivot points
  const lineOverlays: LineOverlay[] = useMemo(() => {
    if (!showPivotLines || useManualPivots || recentPivots.length < 2) {
      return [];
    }

    // Create line data connecting recent pivot points in sequence
    const lineData = recentPivots.map((pivot) => ({
      time: data[pivot.index].time,
      value: pivot.price,
    }));

    return [
      {
        data: lineData,
        color: "#f59e0b",
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
      },
    ];
  }, [showPivotLines, useManualPivots, recentPivots, data]);

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

  const applyDetectedPivots = useCallback(() => {
    if (pivotHigh) setManualHigh(pivotHigh.price.toFixed(2));
    if (pivotLow) setManualLow(pivotLow.price.toFixed(2));
    setUseManualPivots(true);
  }, [pivotHigh, pivotLow]);

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {MARKET_CONFIG[symbol].name}
              </h1>
              <p className="text-muted-foreground">
                {symbol} - {TIMEFRAME_CONFIG[timeframe].description}
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/settings">
                <Button variant="outline" size="sm">
                  Settings
                </Button>
              </Link>
              <Link href="/tradingview">
                <Button variant="outline" size="sm">
                  TradingView
                </Button>
              </Link>
              <ThemeToggle
                theme={theme}
                onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </div>
          </div>

          {/* Data Source Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground mr-2">Data Source:</span>
            <Button
              variant={dataSource === "simulated" ? "default" : "outline"}
              size="sm"
              onClick={() => setDataSource("simulated")}
            >
              Simulated
            </Button>
            <Button
              variant={dataSource === "yahoo" ? "default" : "outline"}
              size="sm"
              onClick={() => setDataSource("yahoo")}
            >
              Yahoo Finance
            </Button>
            {isLoading && (
              <div className="flex items-center gap-2 ml-2 text-muted-foreground">
                <Spinner size="sm" />
                <span className="text-sm">Loading...</span>
              </div>
            )}
            {fetchError && (
              <span className="text-sm text-red-500 ml-2">
                Error: {fetchError}
              </span>
            )}
          </div>

          {/* Market Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground mr-2">Market:</span>
            {(Object.keys(MARKET_CONFIG) as MarketSymbol[]).map((sym) => (
              <Button
                key={sym}
                variant={symbol === sym ? "default" : "outline"}
                size="sm"
                onClick={() => setSymbol(sym)}
              >
                {sym}
              </Button>
            ))}
          </div>

          {/* Timeframe and Chart Type Selection */}
          <div className="flex items-center gap-4 flex-wrap">
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
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                Chart:
              </span>
              <Button
                variant={chartType === "candlestick" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("candlestick")}
              >
                Candle
              </Button>
              <Button
                variant={chartType === "heikin-ashi" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("heikin-ashi")}
              >
                Heikin Ashi
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartType("bar")}
              >
                Bar
              </Button>
            </div>
          </div>

          {/* Pivot Points Controls */}
          <div className="p-4 rounded-lg bg-card border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Pivot Points</h3>
              <div className="flex gap-2">
                <Button
                  variant={showPivots ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowPivots(!showPivots)}
                >
                  {showPivots ? "Hide Pivots" : "Show Pivots"}
                </Button>
                <Button
                  variant={showPivotLines ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowPivotLines(!showPivotLines)}
                  className={showPivotLines ? "bg-amber-600 hover:bg-amber-700" : ""}
                >
                  {showPivotLines ? "Hide Lines" : "Show Lines"}
                </Button>
                <Button
                  variant={useManualPivots ? "default" : "outline"}
                  size="sm"
                  onClick={() => setUseManualPivots(!useManualPivots)}
                >
                  {useManualPivots ? "Auto Detect" : "Manual Override"}
                </Button>
              </div>
            </div>

            {useManualPivots ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manualHigh">Swing High Price</Label>
                  <Input
                    id="manualHigh"
                    type="number"
                    value={manualHigh}
                    onChange={(e) => setManualHigh(e.target.value)}
                    placeholder={high.toFixed(2)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="manualLow">Swing Low Price</Label>
                  <Input
                    id="manualLow"
                    type="number"
                    value={manualLow}
                    onChange={(e) => setManualLow(e.target.value)}
                    placeholder={low.toFixed(2)}
                    className="font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyDetectedPivots}
                  >
                    Use Detected Values
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p>
                  Detected {pivotPoints.filter((p) => p.type === "high").length}{" "}
                  swing highs and{" "}
                  {pivotPoints.filter((p) => p.type === "low").length} swing
                  lows
                </p>
                <p className="mt-1">
                  Using: High{" "}
                  <span className="font-mono text-foreground">
                    {formatDisplayPrice(high)}
                  </span>{" "}
                  | Low{" "}
                  <span className="font-mono text-foreground">
                    {formatDisplayPrice(low)}
                  </span>
                </p>
              </div>
            )}
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
              <p className="text-xl font-bold font-mono">{symbol}</p>
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
            <div>
              <span className="text-muted-foreground text-sm">Timeframe</span>
              <p className="text-xl font-bold font-mono">
                {TIMEFRAME_CONFIG[timeframe].label}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-lg border overflow-hidden">
            <CandlestickChart
              data={data}
              priceLines={priceLines}
              lineOverlays={lineOverlays}
              chartType={chartType}
              height={500}
              theme={theme}
              onCrosshairMove={(price) => setCrosshairPrice(price)}
            />
          </div>

          {/* Fibonacci Levels Panel */}
          {anyFibVisible && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

              {fibVisibility.projection && pivotA && pivotB && pivotC && (
                <div className="p-4 rounded-lg bg-card border">
                  <h3 className="font-semibold mb-3 text-teal-400">
                    Projection (A-B-C)
                  </h3>
                  <div className="text-xs text-muted-foreground mb-2">
                    A: {pivotA.price.toFixed(2)} | B: {pivotB.price.toFixed(2)} | C: {pivotC.price.toFixed(2)}
                  </div>
                  <FibonacciLevels
                    direction={pivotC.type === "low" ? "buy" : "sell"}
                    highPrice={
                      pivotC.type === "low"
                        ? pivotC.price + Math.abs(pivotB.price - pivotA.price) * Math.max(...PROJECTION_RATIOS)
                        : pivotC.price
                    }
                    lowPrice={
                      pivotC.type === "low"
                        ? pivotC.price
                        : pivotC.price - Math.abs(pivotB.price - pivotA.price) * Math.max(...PROJECTION_RATIOS)
                    }
                    levels={PROJECTION_RATIOS.map((ratio) => {
                      const abRange = Math.abs(pivotB.price - pivotA.price);
                      const direction = pivotC.type === "low" ? 1 : -1;
                      return {
                        ratio,
                        label: `${ratio * 100}%`,
                        price: pivotC.price + direction * abRange * ratio,
                      };
                    })}
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
