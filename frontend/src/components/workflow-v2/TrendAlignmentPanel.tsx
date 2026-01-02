"use client";

/**
 * TrendAlignmentPanel - Displays detailed trend alignment across timeframes
 *
 * Shows per-timeframe trend status (bullish/bearish/neutral) with
 * visual indicators and summary statistics.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TimeframeTrend, OverallAlignment } from "@/hooks/use-trend-alignment";
import type { Timeframe } from "@/lib/chart-constants";
import { TIMEFRAME_COLORS } from "@/lib/chart-pro/strategy-types";

type TrendAlignmentPanelProps = {
  /** Per-timeframe trend data */
  trends: TimeframeTrend[];
  /** Overall trend summary */
  overall: OverallAlignment;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Chart colors for up/down */
  chartColors: { up: string; down: string };
  /** Callback when panel should close */
  onClose?: () => void;
};

const TREND_ICONS = {
  bullish: "▲",
  bearish: "▼",
  ranging: "●",
} as const;

/**
 * Get trend display info
 */
function getTrendInfo(trend: "bullish" | "bearish" | "ranging", chartColors: { up: string; down: string }) {
  switch (trend) {
    case "bullish":
      return {
        icon: TREND_ICONS.bullish,
        color: chartColors.up,
        bgColor: `${chartColors.up}20`,
        label: "Bullish",
      };
    case "bearish":
      return {
        icon: TREND_ICONS.bearish,
        color: chartColors.down,
        bgColor: `${chartColors.down}20`,
        label: "Bearish",
      };
    case "ranging":
      return {
        icon: TREND_ICONS.ranging,
        color: "#888888",
        bgColor: "#88888820",
        label: "Ranging",
      };
  }
}

/**
 * Convert strength to confidence percentage
 */
function strengthToConfidence(strength: "strong" | "moderate" | "weak"): number {
  switch (strength) {
    case "strong":
      return 85;
    case "moderate":
      return 60;
    case "weak":
      return 35;
  }
}

/**
 * Order timeframes from highest to lowest
 */
const TIMEFRAME_ORDER: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "1m"];

export function TrendAlignmentPanel({
  trends,
  overall,
  isLoading = false,
  chartColors,
  onClose,
}: TrendAlignmentPanelProps) {
  // Sort trends by timeframe order
  const sortedTrends = [...trends].sort((a, b) => {
    const aIdx = TIMEFRAME_ORDER.indexOf(a.timeframe);
    const bIdx = TIMEFRAME_ORDER.indexOf(b.timeframe);
    return aIdx - bIdx;
  });

  const bullishCount = trends.filter((t) => t.trend === "bullish").length;
  const bearishCount = trends.filter((t) => t.trend === "bearish").length;
  const rangingCount = trends.filter((t) => t.trend === "ranging").length;
  const confidence = strengthToConfidence(overall.strength);

  const overallInfo = getTrendInfo(overall.direction, chartColors);

  if (isLoading) {
    return (
      <Card className="shrink-0">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Trend Alignment</span>
            <Skeleton className="h-5 w-16" />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shrink-0">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            Trend Alignment
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0"
              style={{
                borderColor: overallInfo.color,
                color: overallInfo.color,
                backgroundColor: overallInfo.bgColor,
              }}
            >
              {overallInfo.icon} {overallInfo.label}
            </Badge>
          </span>
          <div className="flex items-center gap-2 text-xs font-normal">
            <span style={{ color: chartColors.up }}>{bullishCount} Bull</span>
            <span className="text-muted-foreground">/</span>
            <span style={{ color: chartColors.down }}>{bearishCount} Bear</span>
            {rangingCount > 0 && (
              <>
                <span className="text-muted-foreground">/</span>
                <span className="text-muted-foreground">{rangingCount} Ranging</span>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="grid grid-cols-7 gap-1">
          {sortedTrends.map((trend) => {
            const info = getTrendInfo(trend.trend, chartColors);
            const tfColor = TIMEFRAME_COLORS[trend.timeframe];

            return (
              <div
                key={trend.timeframe}
                className={cn(
                  "flex flex-col items-center p-1.5 rounded",
                  "border border-border/50 hover:border-border transition-colors"
                )}
                style={{ backgroundColor: info.bgColor }}
              >
                <span
                  className="text-[10px] font-medium mb-0.5"
                  style={{ color: tfColor }}
                >
                  {trend.timeframe}
                </span>
                <span className="text-lg" style={{ color: info.color }}>
                  {info.icon}
                </span>
                <span
                  className="text-[9px] mt-0.5"
                  style={{ color: info.color }}
                >
                  {info.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Confidence indicator */}
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Confidence:</span>
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${confidence}%`,
                backgroundColor: overallInfo.color,
              }}
            />
          </div>
          <span className="text-[10px] font-medium" style={{ color: overallInfo.color }}>
            {confidence}%
          </span>
        </div>

        {/* Trading recommendation */}
        <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
          {overall.direction === "ranging" ? (
            <span className="text-muted-foreground">
              Mixed signals across timeframes. Wait for clearer alignment.
            </span>
          ) : (
            <span style={{ color: overallInfo.color }}>
              {overall.direction === "bullish"
                ? "Higher timeframes favor long positions. Look for pullback entries."
                : "Higher timeframes favor short positions. Look for rally entries."}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact trend indicator button for chart controls
 */
export function TrendIndicatorButton({
  bullishCount,
  bearishCount,
  overall,
  chartColors,
  onClick,
  isActive,
}: {
  bullishCount: number;
  bearishCount: number;
  overall: OverallAlignment;
  chartColors: { up: string; down: string };
  onClick: () => void;
  isActive: boolean;
}) {
  const overallInfo = getTrendInfo(overall.direction, chartColors);

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all",
        isActive
          ? "bg-primary/20 ring-1 ring-primary/40"
          : "hover:bg-muted/80"
      )}
      style={{
        backgroundColor: isActive ? overallInfo.bgColor : undefined,
      }}
      title="Click to view trend alignment details"
    >
      <span style={{ color: chartColors.up }} className="font-medium">
        {bullishCount}
      </span>
      <span className="text-muted-foreground">/</span>
      <span style={{ color: chartColors.down }} className="font-medium">
        {bearishCount}
      </span>
      <span
        className="text-[10px] px-1 py-0.5 rounded"
        style={{
          backgroundColor: overallInfo.bgColor,
          color: overallInfo.color,
        }}
      >
        {overall.direction === "bullish" ? "Bull" : overall.direction === "bearish" ? "Bear" : "Range"}
      </span>
    </button>
  );
}
