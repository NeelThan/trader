"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MarketSymbol,
  Timeframe,
  TIMEFRAME_CONFIG,
  TREND_DIRECTION_CONFIG,
  TrendDirection,
} from "@/lib/chart-constants";
import { useMarketDataSubscription } from "@/hooks/use-market-data-subscription";
import { useTrendAnalysis } from "@/hooks/use-trend-analysis";

// All available timeframes in order from shortest to longest
const ALL_TIMEFRAMES: Timeframe[] = ["1m", "15m", "1H", "4H", "1D", "1W", "1M"];

type TimeframeCardProps = {
  symbol: MarketSymbol;
  timeframe: Timeframe;
  trend?: TrendDirection;
  trendStrength?: number;
};

function TimeframeCard({ symbol, timeframe, trend, trendStrength }: TimeframeCardProps) {
  const { data, isLoading, fetchError } = useMarketDataSubscription(symbol, timeframe, "yahoo");

  // Get the last closed bar (second to last if we have current incomplete bar)
  const lastBar = useMemo(() => {
    if (data.length < 2) return null;
    // Use the last complete bar
    return data[data.length - 1];
  }, [data]);

  const trendConfig = trend ? TREND_DIRECTION_CONFIG[trend] : null;
  const tfConfig = TIMEFRAME_CONFIG[timeframe];

  // Calculate price change
  const priceChange = useMemo(() => {
    if (!lastBar) return null;
    const change = lastBar.close - lastBar.open;
    const changePercent = (change / lastBar.open) * 100;
    return { change, changePercent, isPositive: change >= 0 };
  }, [lastBar]);

  if (isLoading && !lastBar) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fetchError && !lastBar) {
    return (
      <Card className="h-full border-red-500/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{tfConfig.label}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-400">Error loading data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">{tfConfig.label}</CardTitle>
          {trendConfig && (
            <Badge
              variant="outline"
              className="text-xs"
              style={{
                color: trendConfig.color,
                borderColor: trendConfig.color,
                backgroundColor: `${trendConfig.color}15`,
              }}
            >
              {trendConfig.icon} {trendConfig.label}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{tfConfig.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {lastBar ? (
          <>
            {/* Current Close with Change */}
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-mono font-bold">
                {lastBar.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {priceChange && (
                <span
                  className={cn(
                    "text-sm font-mono",
                    priceChange.isPositive ? "text-green-400" : "text-red-400"
                  )}
                >
                  {priceChange.isPositive ? "+" : ""}
                  {priceChange.changePercent.toFixed(2)}%
                </span>
              )}
            </div>

            {/* OHLC Grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-xs text-muted-foreground">Open</div>
                <div className="font-mono">{lastBar.open.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-xs text-muted-foreground">Close</div>
                <div className="font-mono">{lastBar.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="rounded-md bg-green-500/10 border border-green-500/30 p-2">
                <div className="text-xs text-green-400">High</div>
                <div className="font-mono text-green-400">{lastBar.high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
              <div className="rounded-md bg-red-500/10 border border-red-500/30 p-2">
                <div className="text-xs text-red-400">Low</div>
                <div className="font-mono text-red-400">{lastBar.low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              </div>
            </div>

            {/* Bar Range */}
            <div className="text-xs text-muted-foreground">
              Range: {(lastBar.high - lastBar.low).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({((lastBar.high - lastBar.low) / lastBar.low * 100).toFixed(2)}%)
            </div>

            {/* Trend Strength */}
            {trendStrength !== undefined && trendStrength > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Trend Strength</span>
                  <span className="font-mono">{Math.round(trendStrength * 100)}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${trendStrength * 100}%`,
                      backgroundColor: trendConfig?.color || "#6b7280",
                    }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No data available</p>
        )}
      </CardContent>
    </Card>
  );
}

type MultiTimeframeViewerProps = {
  symbol: MarketSymbol;
  className?: string;
  compact?: boolean;
};

export function MultiTimeframeViewer({
  symbol,
  className,
  compact = false,
}: MultiTimeframeViewerProps) {
  // Create pairs for all timeframes to get trend data
  const timeframePairs = useMemo(() => {
    return ALL_TIMEFRAMES.map((tf) => ({
      id: tf,
      name: tf,
      higherTF: tf,
      lowerTF: tf,
      tradingStyle: "swing" as const,
    }));
  }, []);

  // Get trend analysis for all timeframes
  const { alignments, isLoading: isTrendLoading } = useTrendAnalysis({
    symbol,
    pairs: timeframePairs,
    enabled: true,
  });

  // Map trend data by timeframe
  const trendByTimeframe = useMemo(() => {
    const map = new Map<Timeframe, { direction: TrendDirection; strength: number }>();
    alignments.forEach((alignment) => {
      const tf = alignment.pair.higherTF;
      map.set(tf, {
        direction: alignment.higherTrend.direction,
        strength: alignment.higherTrend.strength,
      });
    });
    return map;
  }, [alignments]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Multi-Timeframe Analysis</h2>
          <p className="text-sm text-muted-foreground">
            {symbol} across all timeframes
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {symbol}
        </Badge>
      </div>

      {/* Timeframe Grid */}
      <div className={cn(
        "grid gap-4",
        compact ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}>
        {ALL_TIMEFRAMES.map((tf) => {
          const trendData = trendByTimeframe.get(tf);
          return (
            <TimeframeCard
              key={tf}
              symbol={symbol}
              timeframe={tf}
              trend={trendData?.direction}
              trendStrength={trendData?.strength}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <span style={{ color: TREND_DIRECTION_CONFIG.UP.color }}>
            {TREND_DIRECTION_CONFIG.UP.icon}
          </span>
          <span>Uptrend</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: TREND_DIRECTION_CONFIG.DOWN.color }}>
            {TREND_DIRECTION_CONFIG.DOWN.icon}
          </span>
          <span>Downtrend</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ color: TREND_DIRECTION_CONFIG.NEUTRAL.color }}>
            {TREND_DIRECTION_CONFIG.NEUTRAL.icon}
          </span>
          <span>Neutral</span>
        </div>
      </div>
    </div>
  );
}
