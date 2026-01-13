"use client";

/**
 * TrendAlignmentPanel - Displays detailed trend alignment across timeframes
 *
 * Shows per-timeframe trend status (bullish/bearish/neutral) with
 * visual indicators and summary statistics.
 *
 * Click any timeframe to see the calculation breakdown.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TrendingUp, TrendingDown, Activity, BarChart3, Info, Zap, RotateCcw, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeframeTrend, OverallAlignment, IndicatorStatus } from "@/hooks/use-trend-alignment";
import type { Timeframe } from "@/lib/chart-constants";
import { TIMEFRAME_COLORS } from "@/lib/chart-pro/strategy-types";
import { detectTrendPhaseFromTrend } from "@/hooks/use-trade-discovery";
import type { TrendPhase } from "@/types/workflow-v2";

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

/**
 * Indicator weights used in calculation
 */
const INDICATOR_WEIGHTS = {
  swing: 0.4,  // 40%
  rsi: 0.3,    // 30%
  macd: 0.3,   // 30%
} as const;

/**
 * Get signal icon component
 */
function getSignalIcon(signal: "bullish" | "bearish" | "neutral", size = 14) {
  switch (signal) {
    case "bullish":
      return <TrendingUp size={size} className="text-green-400" />;
    case "bearish":
      return <TrendingDown size={size} className="text-red-400" />;
    default:
      return <Activity size={size} className="text-muted-foreground" />;
  }
}

/**
 * Get phase display information
 */
function getPhaseInfo(phase: TrendPhase): {
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  bgColor: string;
} {
  switch (phase) {
    case "impulse":
      return {
        icon: <Zap size={12} />,
        label: "Impulse",
        description: "Strong trending move with aligned momentum indicators",
        color: "#22c55e",
        bgColor: "#22c55e20",
      };
    case "correction":
      return {
        icon: <RotateCcw size={12} />,
        label: "Correction",
        description: "Pullback against the trend - potential entry opportunity",
        color: "#f59e0b",
        bgColor: "#f59e0b20",
      };
    case "continuation":
      return {
        icon: <ArrowRight size={12} />,
        label: "Continuation",
        description: "Trend intact, momentum building for next move",
        color: "#3b82f6",
        bgColor: "#3b82f620",
      };
    case "exhaustion":
      return {
        icon: <AlertTriangle size={12} />,
        label: "Exhaustion",
        description: "Weakening momentum - potential trend reversal warning",
        color: "#ef4444",
        bgColor: "#ef444420",
      };
  }
}

/**
 * Format indicator value for display
 */
function formatIndicatorValue(indicator: IndicatorStatus): string {
  if (indicator.value !== undefined) {
    return indicator.value.toFixed(1);
  }
  return "—";
}

/**
 * Calculate weighted score for an indicator
 */
function getIndicatorScore(signal: "bullish" | "bearish" | "neutral", weight: number): number {
  switch (signal) {
    case "bullish":
      return weight * 100;
    case "bearish":
      return -weight * 100;
    default:
      return 0;
  }
}

/**
 * Timeframe calculation breakdown popover
 */
function TimeframeBreakdown({
  trend,
  chartColors,
}: {
  trend: TimeframeTrend;
  chartColors: { up: string; down: string };
}) {
  const swingScore = getIndicatorScore(trend.swing.signal, INDICATOR_WEIGHTS.swing);
  const rsiScore = getIndicatorScore(trend.rsi.signal, INDICATOR_WEIGHTS.rsi);
  const macdScore = getIndicatorScore(trend.macd.signal, INDICATOR_WEIGHTS.macd);
  const totalScore = swingScore + rsiScore + macdScore;

  // Detect trend phase
  const phase = detectTrendPhaseFromTrend(trend);
  const phaseInfo = getPhaseInfo(phase);

  const getScoreColor = (score: number) => {
    if (score > 0) return chartColors.up;
    if (score < 0) return chartColors.down;
    return "#888888";
  };

  const formatScore = (score: number) => {
    const sign = score > 0 ? "+" : "";
    return `${sign}${score.toFixed(0)}`;
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2">
        <span className="font-medium">{trend.timeframe} Calculation</span>
        <Badge
          variant="outline"
          className="text-[10px]"
          style={{
            borderColor: getScoreColor(totalScore),
            color: getScoreColor(totalScore),
          }}
        >
          {trend.trend.toUpperCase()}
        </Badge>
      </div>

      {/* Trend Phase Indicator */}
      <div
        className="p-2 rounded flex items-center gap-2"
        style={{ backgroundColor: phaseInfo.bgColor }}
      >
        <div
          className="flex items-center justify-center w-6 h-6 rounded"
          style={{ backgroundColor: phaseInfo.color, color: "white" }}
        >
          {phaseInfo.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">Phase:</span>
            <span
              className="text-xs font-bold"
              style={{ color: phaseInfo.color }}
            >
              {phaseInfo.label}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {phaseInfo.description}
          </p>
        </div>
      </div>

      {/* Formula explanation */}
      <div className="p-2 bg-muted/50 rounded text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1 mb-1">
          <Info size={10} />
          <span className="font-medium">How it's calculated:</span>
        </div>
        <p>
          Trend = (Swing × 40%) + (RSI × 30%) + (MACD × 30%)
        </p>
        <p className="mt-1">
          Each indicator contributes a score: bullish = +weight, bearish = -weight
        </p>
      </div>

      {/* Indicator breakdown */}
      <div className="space-y-2">
        {/* Swing Analysis */}
        <div className="flex items-center justify-between p-2 rounded bg-muted/30">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-blue-400" />
            <div>
              <div className="text-xs font-medium">Swing Pattern</div>
              <div className="text-[10px] text-muted-foreground">
                HH/HL = Bull, LH/LL = Bear
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getSignalIcon(trend.swing.signal)}
            <span
              className="text-xs font-mono font-medium"
              style={{ color: getScoreColor(swingScore) }}
            >
              {formatScore(swingScore)}
            </span>
            <span className="text-[10px] text-muted-foreground">(40%)</span>
          </div>
        </div>

        {/* RSI Analysis */}
        <div className="flex items-center justify-between p-2 rounded bg-muted/30">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-purple-400" />
            <div>
              <div className="text-xs font-medium">RSI (14)</div>
              <div className="text-[10px] text-muted-foreground">
                {trend.rsi.value !== undefined
                  ? `Value: ${trend.rsi.value.toFixed(1)} (${trend.rsi.value > 50 ? ">50 = Bull" : "<50 = Bear"})`
                  : ">50 = Bull, <50 = Bear"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getSignalIcon(trend.rsi.signal)}
            <span
              className="text-xs font-mono font-medium"
              style={{ color: getScoreColor(rsiScore) }}
            >
              {formatScore(rsiScore)}
            </span>
            <span className="text-[10px] text-muted-foreground">(30%)</span>
          </div>
        </div>

        {/* MACD Analysis */}
        <div className="flex items-center justify-between p-2 rounded bg-muted/30">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-amber-400" />
            <div>
              <div className="text-xs font-medium">MACD Histogram</div>
              <div className="text-[10px] text-muted-foreground">
                {trend.macd.value !== undefined
                  ? `Value: ${trend.macd.value.toFixed(2)} (${trend.macd.value > 0 ? ">0 = Bull" : "<0 = Bear"})`
                  : ">0 = Bull, <0 = Bear"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getSignalIcon(trend.macd.signal)}
            <span
              className="text-xs font-mono font-medium"
              style={{ color: getScoreColor(macdScore) }}
            >
              {formatScore(macdScore)}
            </span>
            <span className="text-[10px] text-muted-foreground">(30%)</span>
          </div>
        </div>
      </div>

      {/* Total Score */}
      <div className="flex items-center justify-between p-2 rounded border-2" style={{ borderColor: getScoreColor(totalScore) }}>
        <span className="text-xs font-medium">Total Score</span>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-mono font-bold"
            style={{ color: getScoreColor(totalScore) }}
          >
            {formatScore(totalScore)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {totalScore >= 50 ? "Strong" : totalScore >= 30 ? "Moderate" : totalScore > 0 ? "Weak" : totalScore <= -50 ? "Strong" : totalScore <= -30 ? "Moderate" : "Weak"}
          </span>
        </div>
      </div>

      {/* Decision logic */}
      <div className="text-[10px] text-muted-foreground border-t pt-2">
        <strong>Decision:</strong>{" "}
        {totalScore >= 50
          ? "Score ≥ 50 → Bullish"
          : totalScore >= 30
          ? "Score ≥ 30 → Bullish (moderate)"
          : totalScore > 0
          ? "Score > 0 → Bullish (weak)"
          : totalScore <= -50
          ? "Score ≤ -50 → Bearish"
          : totalScore <= -30
          ? "Score ≤ -30 → Bearish (moderate)"
          : totalScore < 0
          ? "Score < 0 → Bearish (weak)"
          : "Score = 0 → Ranging (mixed signals)"}
      </div>
    </div>
  );
}

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
        {/* Hint text */}
        <div className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
          <Info size={10} />
          <span>Click any timeframe to see calculation breakdown</span>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {sortedTrends.map((trend) => {
            const info = getTrendInfo(trend.trend, chartColors);
            const tfColor = TIMEFRAME_COLORS[trend.timeframe];

            return (
              <Popover key={trend.timeframe}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex flex-col items-center p-1.5 rounded cursor-pointer",
                      "border border-border/50 hover:border-border hover:scale-105 transition-all"
                    )}
                    style={{ backgroundColor: info.bgColor }}
                    title={`Click to see ${trend.timeframe} calculation`}
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
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80" align="center">
                  <TimeframeBreakdown trend={trend} chartColors={chartColors} />
                </PopoverContent>
              </Popover>
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
