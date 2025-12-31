"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MarketSymbol,
  Timeframe,
  TrendDirection,
  TradeAction,
  TREND_DIRECTION_CONFIG,
  TRADE_ACTION_CONFIG,
} from "@/lib/chart-constants";
import { useTrendAnalysis } from "@/hooks/use-trend-analysis";

type TrendDecisionPanelProps = {
  // Data props
  symbol: MarketSymbol;
  higherTimeframe: Timeframe;
  lowerTimeframe: Timeframe;
  higherTrend: TrendDirection;
  lowerTrend: TrendDirection;
  tradeDirection: TradeAction;
  trendConfidence: number;
  onChange: (updates: {
    higherTrend?: TrendDirection;
    lowerTrend?: TrendDirection;
    tradeDirection?: TradeAction;
    trendConfidence?: number;
  }) => void;

  // Workflow integration
  onComplete?: () => void;
  workflowMode?: boolean;

  // Display customization
  compact?: boolean;
};

type TrendAnalysisResult = {
  higherTrend: TrendDirection;
  lowerTrend: TrendDirection;
  tradeDirection: TradeAction;
  confidence: number;
};

export function TrendDecisionPanel({
  symbol,
  higherTimeframe,
  lowerTimeframe,
  higherTrend,
  lowerTrend,
  tradeDirection,
  trendConfidence,
  onChange,
  onComplete,
  workflowMode = false,
  compact = false,
}: TrendDecisionPanelProps) {
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);

  // Create timeframe pair for analysis
  const timeframePairs = useMemo(() => [{
    id: `${higherTimeframe}-${lowerTimeframe}`,
    name: `${higherTimeframe}/${lowerTimeframe}`,
    higherTF: higherTimeframe,
    lowerTF: lowerTimeframe,
    tradingStyle: "swing" as const,
  }], [higherTimeframe, lowerTimeframe]);

  // Use real trend analysis from market data
  const {
    alignments,
    isLoading: isAnalyzing,
    refresh: refreshAnalysis,
  } = useTrendAnalysis({
    symbol,
    pairs: timeframePairs,
    enabled: true,
  });

  // Get the current alignment result
  const currentAlignment = alignments[0];

  // Derive trade direction from trend alignment
  const deriveTradeDirection = useCallback(
    (higher: TrendDirection, lower: TrendDirection): TradeAction => {
      if (higher === "UP" && lower === "DOWN") return "GO_LONG";
      if (higher === "DOWN" && lower === "UP") return "GO_SHORT";
      return "STAND_ASIDE";
    },
    []
  );

  // Update workflow state when analysis results change
  useEffect(() => {
    if (currentAlignment) {
      const newHigher = currentAlignment.higherTrend.direction;
      const newLower = currentAlignment.lowerTrend.direction;
      const direction = deriveTradeDirection(newHigher, newLower);

      // Only update if values have actually changed
      if (
        newHigher !== higherTrend ||
        newLower !== lowerTrend ||
        direction !== tradeDirection ||
        currentAlignment.confidence !== trendConfidence
      ) {
        onChange({
          higherTrend: newHigher,
          lowerTrend: newLower,
          tradeDirection: direction,
          trendConfidence: currentAlignment.confidence,
        });
        setLastAnalyzed(new Date().toLocaleTimeString());
      }
    }
  }, [currentAlignment, higherTrend, lowerTrend, tradeDirection, trendConfidence, deriveTradeDirection, onChange]);

  // Refresh analysis
  const analyzeTrends = useCallback(() => {
    refreshAnalysis();
  }, [refreshAnalysis]);

  // Manual trend override
  const handleTrendOverride = useCallback(
    (which: "higher" | "lower", trend: TrendDirection) => {
      const newHigher = which === "higher" ? trend : higherTrend;
      const newLower = which === "lower" ? trend : lowerTrend;
      const direction = deriveTradeDirection(newHigher, newLower);

      onChange({
        higherTrend: newHigher,
        lowerTrend: newLower,
        tradeDirection: direction,
        trendConfidence: direction === "STAND_ASIDE" ? 0 : 0.7,
      });
    },
    [higherTrend, lowerTrend, deriveTradeDirection, onChange]
  );

  const actionConfig = TRADE_ACTION_CONFIG[tradeDirection];
  const canProceed = tradeDirection !== "STAND_ASIDE";

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <TrendBadge direction={higherTrend} label={higherTimeframe} />
        <TrendBadge direction={lowerTrend} label={lowerTimeframe} />
        <Badge
          variant="outline"
          className={cn("font-semibold", actionConfig.bgColor)}
          style={{ color: actionConfig.color }}
        >
          {actionConfig.label}
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trend Analysis Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Higher Timeframe */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-muted-foreground">
              Higher Timeframe
            </div>
            <Badge variant="secondary">{higherTimeframe}</Badge>
          </div>
          {isAnalyzing ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <TrendIndicator
              direction={higherTrend}
              timeframe={higherTimeframe}
              onOverride={(trend) => handleTrendOverride("higher", trend)}
            />
          )}
        </div>

        {/* Lower Timeframe */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-muted-foreground">
              Lower Timeframe
            </div>
            <Badge variant="secondary">{lowerTimeframe}</Badge>
          </div>
          {isAnalyzing ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <TrendIndicator
              direction={lowerTrend}
              timeframe={lowerTimeframe}
              onOverride={(trend) => handleTrendOverride("lower", trend)}
            />
          )}
        </div>
      </div>

      {/* Trade Direction Decision */}
      <div
        className={cn(
          "rounded-lg border-2 p-6 text-center transition-all",
          actionConfig.bgColor,
          tradeDirection === "STAND_ASIDE" && "border-gray-600"
        )}
        style={{ borderColor: actionConfig.color }}
      >
        <div
          className="text-3xl font-bold mb-2"
          style={{ color: actionConfig.color }}
        >
          {actionConfig.label}
        </div>
        <div className="text-sm text-muted-foreground">
          {actionConfig.description}
        </div>
        {trendConfidence > 0 && (
          <div className="mt-3">
            <div className="text-xs text-muted-foreground mb-1">Confidence</div>
            <div className="w-full bg-gray-700 rounded-full h-2 max-w-xs mx-auto">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${trendConfidence * 100}%`,
                  backgroundColor: actionConfig.color,
                }}
              />
            </div>
            <div className="text-xs mt-1" style={{ color: actionConfig.color }}>
              {Math.round(trendConfidence * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* STAND_ASIDE Warning */}
      {tradeDirection === "STAND_ASIDE" && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <div className="text-sm font-medium text-amber-400">Cannot Proceed</div>
              <div className="text-xs text-muted-foreground mt-1">
                Both timeframes are trending in the same direction. Wait for a counter-trend
                move on the lower timeframe before entering a trade.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={analyzeTrends} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Analysis
              </>
            )}
          </Button>
          {lastAnalyzed && (
            <span className="text-xs text-muted-foreground">
              Last analyzed: {lastAnalyzed}
            </span>
          )}
        </div>

        {workflowMode && onComplete && (
          <Button onClick={onComplete} disabled={!canProceed}>
            Continue to Fibonacci Setup
          </Button>
        )}
      </div>
    </div>
  );
}

// Sub-components

function TrendBadge({ direction, label }: { direction: TrendDirection; label: string }) {
  const config = TREND_DIRECTION_CONFIG[direction];
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span style={{ color: config.color }}>
        {config.icon} {config.label}
      </span>
    </div>
  );
}

function TrendIndicator({
  direction,
  timeframe,
  onOverride,
}: {
  direction: TrendDirection;
  timeframe: Timeframe;
  onOverride: (trend: TrendDirection) => void;
}) {
  const config = TREND_DIRECTION_CONFIG[direction];
  const allDirections: TrendDirection[] = ["UP", "DOWN", "NEUTRAL"];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2">
        <span className="text-4xl" style={{ color: config.color }}>
          {config.icon}
        </span>
        <span className="text-xl font-semibold" style={{ color: config.color }}>
          {config.label}
        </span>
      </div>
      <div className="flex justify-center gap-1">
        {allDirections.map((d) => {
          const dConfig = TREND_DIRECTION_CONFIG[d];
          return (
            <Button
              key={d}
              variant={direction === d ? "default" : "ghost"}
              size="sm"
              onClick={() => onOverride(d)}
              className="h-7 px-2"
              style={{
                backgroundColor: direction === d ? `${dConfig.color}30` : undefined,
                color: direction === d ? dConfig.color : undefined,
              }}
            >
              {dConfig.icon}
            </Button>
          );
        })}
      </div>
      <div className="text-xs text-center text-muted-foreground">
        Click to override
      </div>
    </div>
  );
}
