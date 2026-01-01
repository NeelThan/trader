"use client";

/**
 * Trend Alignment Panel
 *
 * Displays trend analysis across all timeframes showing:
 * - Individual timeframe trend status (bullish/bearish/ranging)
 * - Indicator breakdown (Swing, RSI, MACD)
 * - Overall market alignment summary
 */

import { TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  TimeframeTrend,
  OverallAlignment,
  TrendDirection,
  IndicatorStatus,
} from "@/hooks/use-trend-alignment";

export type TrendAlignmentPanelProps = {
  trends: TimeframeTrend[];
  overall: OverallAlignment;
  isLoading: boolean;
  onRefresh: () => void;
  chartColors: { up: string; down: string };
};

/**
 * Get icon and color for trend direction
 */
function getTrendDisplay(
  trend: TrendDirection,
  chartColors: { up: string; down: string }
) {
  switch (trend) {
    case "bullish":
      return {
        icon: TrendingUp,
        color: chartColors.up,
        label: "Bullish",
        bgClass: "bg-green-500/10",
      };
    case "bearish":
      return {
        icon: TrendingDown,
        color: chartColors.down,
        label: "Bearish",
        bgClass: "bg-red-500/10",
      };
    default:
      return {
        icon: Minus,
        color: "#9ca3af",
        label: "Ranging",
        bgClass: "bg-gray-500/10",
      };
  }
}

/**
 * Get color for indicator signal
 */
function getSignalColor(
  signal: IndicatorStatus["signal"],
  chartColors: { up: string; down: string }
): string {
  switch (signal) {
    case "bullish":
      return chartColors.up;
    case "bearish":
      return chartColors.down;
    default:
      return "#6b7280";
  }
}

/**
 * Signal dot indicator
 */
function SignalDot({
  signal,
  chartColors,
}: {
  signal: IndicatorStatus["signal"];
  chartColors: { up: string; down: string };
}) {
  const color = getSignalColor(signal, chartColors);
  return (
    <span
      className="w-2 h-2 rounded-full inline-block"
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Individual timeframe row
 */
function TimeframeRow({
  trend,
  chartColors,
}: {
  trend: TimeframeTrend;
  chartColors: { up: string; down: string };
}) {
  const display = getTrendDisplay(trend.trend, chartColors);
  const Icon = display.icon;

  if (trend.isLoading) {
    return (
      <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/20">
        <span className="w-8 text-xs font-medium text-muted-foreground">
          {trend.timeframe}
        </span>
        <Skeleton className="h-4 w-20" />
      </div>
    );
  }

  if (trend.error) {
    return (
      <div className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/20">
        <span className="w-8 text-xs font-medium text-muted-foreground">
          {trend.timeframe}
        </span>
        <span className="text-xs text-muted-foreground">{trend.error}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 py-2 px-3 rounded-lg ${display.bgClass}`}>
      {/* Timeframe */}
      <span className="w-8 text-xs font-medium text-muted-foreground">
        {trend.timeframe}
      </span>

      {/* Trend Icon & Label */}
      <div className="flex items-center gap-1.5 w-20">
        <Icon className="w-4 h-4" style={{ color: display.color }} />
        <span className="text-sm font-medium" style={{ color: display.color }}>
          {display.label}
        </span>
      </div>

      {/* Confidence */}
      <span className="text-xs text-muted-foreground w-10">
        {trend.confidence}%
      </span>

      {/* Indicator Breakdown */}
      <div className="flex items-center gap-3 ml-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Swing</span>
              <SignalDot signal={trend.swing.signal} chartColors={chartColors} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Swing: {trend.swing.signal}
            {trend.swing.value !== undefined && ` (${trend.swing.value}%)`}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">RSI</span>
              <SignalDot signal={trend.rsi.signal} chartColors={chartColors} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            RSI: {trend.rsi.signal}
            {trend.rsi.value !== undefined && ` (${trend.rsi.value.toFixed(1)})`}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">MACD</span>
              <SignalDot signal={trend.macd.signal} chartColors={chartColors} />
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            MACD: {trend.macd.signal}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

/**
 * Overall alignment summary badge
 */
function AlignmentBadge({
  overall,
  chartColors,
}: {
  overall: OverallAlignment;
  chartColors: { up: string; down: string };
}) {
  const display = getTrendDisplay(overall.direction, chartColors);

  const strengthColors = {
    strong: "ring-2",
    moderate: "ring-1",
    weak: "",
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${display.bgClass} ${strengthColors[overall.strength]}`}
      style={{
        borderColor: display.color,
        ...(overall.strength !== "weak" && { ringColor: display.color })
      }}
    >
      <display.icon className="w-5 h-5" style={{ color: display.color }} />
      <div>
        <div className="text-sm font-semibold" style={{ color: display.color }}>
          {display.label.toUpperCase()}
        </div>
        <div className="text-[10px] text-muted-foreground capitalize">
          {overall.strength} alignment
        </div>
      </div>
    </div>
  );
}

/**
 * Main Trend Alignment Panel component
 */
export function TrendAlignmentPanel({
  trends,
  overall,
  isLoading,
  onRefresh,
  chartColors,
}: TrendAlignmentPanelProps) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            Trend Alignment
            {isLoading && (
              <Badge variant="secondary" className="text-xs">
                Loading...
              </Badge>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-7 px-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Summary */}
        <div className="flex items-center justify-between">
          <AlignmentBadge overall={overall} chartColors={chartColors} />
          <div className="text-right">
            <div className="flex items-center gap-2 text-xs">
              <span style={{ color: chartColors.up }}>
                {overall.bullishCount} Bullish
              </span>
              <span className="text-muted-foreground">|</span>
              <span style={{ color: chartColors.down }}>
                {overall.bearishCount} Bearish
              </span>
              <span className="text-muted-foreground">|</span>
              <span className="text-gray-400">
                {overall.rangingCount} Ranging
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {overall.description}
            </p>
          </div>
        </div>

        {/* Timeframe Grid */}
        <div className="space-y-1">
          {trends.map((trend) => (
            <TimeframeRow
              key={trend.timeframe}
              trend={trend}
              chartColors={chartColors}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 pt-2 border-t text-[10px] text-muted-foreground">
          <span>Indicators:</span>
          <span>Swing (40%)</span>
          <span>RSI (30%)</span>
          <span>MACD (30%)</span>
        </div>
      </CardContent>
    </Card>
  );
}
