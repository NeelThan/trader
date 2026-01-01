"use client";

/**
 * Chart Pro - Visual-First Trading Workflow
 *
 * Phase 2: MACD and RSI indicator integration.
 * Future phases will add: swing detection, multi-TF levels, heatmap, monitors.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CandlestickChart, CandlestickChartHandle } from "@/components/trading";
import { RSIPane } from "@/components/chart-pro";
import { useMarketDataSubscription } from "@/hooks/use-market-data-subscription";
import { useMACD } from "@/hooks/use-macd";
import { useRSI } from "@/hooks/use-rsi";
import {
  Timeframe,
  MarketSymbol,
  TIMEFRAME_CONFIG,
  MARKET_CONFIG,
} from "@/lib/chart-constants";

const SYMBOLS: MarketSymbol[] = ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"];
const TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "1m"];

export default function ChartProPage() {
  const [symbol, setSymbol] = useState<MarketSymbol>("DJI");
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [hasMounted, setHasMounted] = useState(false);
  const chartRef = useRef<CandlestickChartHandle>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional mount detection
    setHasMounted(true);
  }, []);

  // Get market data
  const {
    data: marketData,
    isLoading: isLoadingData,
    provider,
    isBackendUnavailable,
  } = useMarketDataSubscription(symbol, timeframe, "yahoo", { autoRefresh: true });

  // Get MACD indicator
  const {
    macdData,
    isLoading: isLoadingMACD,
    error: macdError,
  } = useMACD({
    data: marketData,
    enabled: marketData.length >= 26,
  });

  // Get RSI indicator
  const {
    rsiData,
    isLoading: isLoadingRSI,
    error: rsiError,
  } = useRSI({
    data: marketData,
    enabled: marketData.length >= 15,
  });

  // Get current OHLC values
  const currentOHLC = useMemo(() => {
    if (marketData.length === 0) return null;
    const bar = marketData[marketData.length - 1];
    return {
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    };
  }, [marketData]);

  // Get current MACD values
  const currentMACD = useMemo(() => {
    if (!macdData || macdData.macd.length === 0) return null;

    // Get last non-null values
    const lastMacd = macdData.macd.filter((v) => v !== null).slice(-1)[0];
    const lastSignal = macdData.signal.filter((v) => v !== null).slice(-1)[0];
    const lastHistogram = macdData.histogram.filter((v) => v !== null).slice(-1)[0];

    return {
      macd: lastMacd ?? 0,
      signal: lastSignal ?? 0,
      histogram: lastHistogram ?? 0,
    };
  }, [macdData]);

  // Determine MACD signal
  const macdSignal = useMemo(() => {
    if (!currentMACD) return null;

    if (currentMACD.histogram > 0) {
      return { direction: "bullish", label: "Bullish", color: "text-green-400" };
    } else if (currentMACD.histogram < 0) {
      return { direction: "bearish", label: "Bearish", color: "text-red-400" };
    }
    return { direction: "neutral", label: "Neutral", color: "text-gray-400" };
  }, [currentMACD]);

  // Format price based on symbol
  const formatPrice = (price: number) => {
    if (symbol === "EURUSD") return price.toFixed(5);
    if (price >= 10000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return price.toFixed(2);
  };

  if (!hasMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Chart Pro
              <Badge variant="secondary" className="text-xs">
                Phase 2
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              Visual-first trading workflow with multi-timeframe analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={symbol} onValueChange={(v) => setSymbol(v as MarketSymbol)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYMBOLS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((tf) => (
                  <SelectItem key={tf} value={tf}>
                    {TIMEFRAME_CONFIG[tf].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Backend Status */}
        {isBackendUnavailable && (
          <div className="p-4 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400">
            Backend Offline - Cannot load market data
          </div>
        )}

        {/* OHLC Summary Bar */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-xs text-muted-foreground mr-2">Symbol:</span>
                  <span className="font-semibold">{symbol}</span>
                  <span className="text-xs text-muted-foreground ml-1">
                    ({MARKET_CONFIG[symbol].name})
                  </span>
                </div>
                <Badge variant="outline">{timeframe}</Badge>
              </div>
              {currentOHLC && (
                <div className="flex items-center gap-6 text-sm font-mono">
                  <span className="text-xs text-muted-foreground">(Last Bar)</span>
                  <div>
                    <span className="text-muted-foreground mr-1">O:</span>
                    <span>{formatPrice(currentOHLC.open)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-1">H:</span>
                    <span className="text-green-400">{formatPrice(currentOHLC.high)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-1">L:</span>
                    <span className="text-red-400">{formatPrice(currentOHLC.low)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground mr-1">C:</span>
                    <span className={currentOHLC.close >= currentOHLC.open ? "text-green-400" : "text-red-400"}>
                      {formatPrice(currentOHLC.close)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Chart */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Price Chart</span>
              <span className="text-sm font-normal text-muted-foreground">
                {marketData.length} bars{provider && ` from ${provider}`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingData && marketData.length === 0 ? (
              <Skeleton className="h-[400px] w-full" />
            ) : marketData.length > 0 ? (
              <div className="h-[400px]">
                <CandlestickChart
                  ref={chartRef}
                  data={marketData}
                  upColor="#22c55e"
                  downColor="#ef4444"
                  chartType="candlestick"
                />
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Indicators Grid - RSI and MACD side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RSI Indicator Panel */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>RSI (14)</span>
                {rsiError && (
                  <Badge variant="destructive" className="text-xs">
                    Error
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingRSI ? (
                <Skeleton className="h-[120px] w-full" />
              ) : rsiError ? (
                <div className="text-red-400 text-sm">{rsiError}</div>
              ) : (
                <RSIPane rsiData={rsiData} />
              )}
            </CardContent>
          </Card>

          {/* MACD Indicator Panel */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  MACD (12, 26, 9)
                  {macdSignal && (
                    <Badge variant="outline" className={macdSignal.color}>
                      {macdSignal.label}
                    </Badge>
                  )}
                </span>
                {macdError && (
                  <Badge variant="destructive" className="text-xs">
                    Error
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingMACD ? (
                <Skeleton className="h-[150px] w-full" />
              ) : macdError ? (
                <div className="text-red-400 text-sm">{macdError}</div>
              ) : currentMACD ? (
                <div className="space-y-4">
                  {/* MACD Values */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground mb-1">MACD Line</div>
                      <div
                        className={`text-xl font-mono font-semibold ${
                          currentMACD.macd >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {currentMACD.macd.toFixed(4)}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground mb-1">Signal Line</div>
                      <div
                        className={`text-xl font-mono font-semibold ${
                          currentMACD.signal >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {currentMACD.signal.toFixed(4)}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="text-xs text-muted-foreground mb-1">Histogram</div>
                      <div
                        className={`text-xl font-mono font-semibold ${
                          currentMACD.histogram >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {currentMACD.histogram.toFixed(4)}
                      </div>
                    </div>
                  </div>

                  {/* Simple MACD Visualization */}
                  <MACDChart macdData={macdData} />
                </div>
              ) : (
                <div className="text-muted-foreground">
                  Need at least 26 bars to calculate MACD
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Phase 2 Status */}
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-base">Implementation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatusItem label="MACD Indicator" status="done" />
              <StatusItem label="RSI Pane" status="done" />
              <StatusItem label="Swing Detection" status="pending" />
              <StatusItem label="Multi-TF Levels" status="pending" />
              <StatusItem label="Confluence Heatmap" status="pending" />
              <StatusItem label="Levels Table" status="pending" />
              <StatusItem label="Monitor Zones" status="pending" />
              <StatusItem label="Trade Creation" status="pending" />
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-blue-400">Phase 2 Complete:</span>{" "}
            MACD and RSI indicators are now calculated server-side per the thin client architecture.
            Both indicators show overbought/oversold conditions and momentum direction.
            Next phases will add swing detection, multi-timeframe levels, and more.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple MACD histogram chart using SVG
 */
function MACDChart({ macdData }: { macdData: { histogram: (number | null)[] } | null }) {
  if (!macdData || !macdData.histogram) return null;

  // Get last 50 histogram values
  const histogramValues = macdData.histogram
    .slice(-50)
    .map((v) => v ?? 0);

  if (histogramValues.length === 0) return null;

  const maxAbs = Math.max(...histogramValues.map(Math.abs), 0.0001);
  const height = 100;
  const width = 100;
  const barWidth = width / histogramValues.length;

  return (
    <div className="mt-4">
      <div className="text-xs text-muted-foreground mb-2">MACD Histogram (last 50 bars)</div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[100px] border border-border rounded"
        preserveAspectRatio="none"
      >
        {/* Zero line */}
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="0.5"
        />

        {/* Histogram bars */}
        {histogramValues.map((value, i) => {
          const normalizedValue = (value / maxAbs) * (height / 2 - 5);
          const barHeight = Math.abs(normalizedValue);
          const y = value >= 0 ? height / 2 - barHeight : height / 2;

          return (
            <rect
              key={i}
              x={i * barWidth}
              y={y}
              width={barWidth - 0.5}
              height={barHeight}
              fill={value >= 0 ? "#22c55e" : "#ef4444"}
              opacity={0.8}
            />
          );
        })}
      </svg>
    </div>
  );
}

function StatusItem({ label, status }: { label: string; status: "done" | "pending" | "in-progress" }) {
  return (
    <div className="flex items-center gap-2">
      {status === "done" && (
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {status === "pending" && (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
        </svg>
      )}
      {status === "in-progress" && (
        <svg className="w-4 h-4 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      <span className="text-sm">{label}</span>
    </div>
  );
}
