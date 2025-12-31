"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MarketSymbol,
  Timeframe,
  TradeAction,
  PivotPoint,
  DataSource,
} from "@/lib/chart-constants";
import type { FibonacciTool, FibonacciLevel } from "@/hooks/use-workflow-state";
import { useMarketData } from "@/hooks/use-market-data";
import { useBackendPivots } from "@/hooks/use-backend-pivots";

type FibonacciSetupToolProps = {
  // Data props
  symbol: MarketSymbol;
  timeframe: Timeframe;
  pivots: PivotPoint[];
  fibTool: FibonacciTool;
  fibLevels: FibonacciLevel[];
  selectedLevelIndex: number | null;
  tradeDirection: TradeAction;
  dataSource?: DataSource;
  onChange: (updates: {
    pivots?: PivotPoint[];
    fibTool?: FibonacciTool;
    fibLevels?: FibonacciLevel[];
    selectedLevelIndex?: number | null;
  }) => void;

  // Workflow integration
  onComplete?: () => void;
  workflowMode?: boolean;

  // Display customization
  compact?: boolean;
};

const FIBONACCI_TOOL_OPTIONS: { value: FibonacciTool; label: string; description: string }[] = [
  { value: "retracement", label: "Retracement", description: "For pullbacks within a trend" },
  { value: "extension", label: "Extension", description: "For targets beyond the origin" },
  { value: "projection", label: "Projection", description: "For 3-point measured moves" },
  { value: "expansion", label: "Expansion", description: "For expanding range targets" },
];

const FIB_TOOL_RATIOS: Record<FibonacciTool, number[]> = {
  retracement: [0.382, 0.5, 0.618, 0.786],
  extension: [1.272, 1.618, 2.618],
  projection: [0.618, 0.786, 1.0, 1.272, 1.618],
  expansion: [0.382, 0.5, 0.618, 1.0, 1.618],
};

export function FibonacciSetupTool({
  symbol,
  timeframe,
  pivots,
  fibTool,
  fibLevels,
  selectedLevelIndex,
  tradeDirection,
  dataSource = "yahoo",
  onChange,
  onComplete,
  workflowMode = false,
  compact = false,
}: FibonacciSetupToolProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Fetch market data for pivot detection
  const { data: marketData, isLoading: isLoadingData } = useMarketData(
    symbol,
    timeframe,
    dataSource,
    hasMounted
  );

  // Detect pivots from market data using backend
  const {
    recentPivots: backendPivots,
    isLoading: isDetecting,
    error: pivotError,
  } = useBackendPivots(marketData, true, { lookback: 5, count: 10 });

  // Convert backend pivot format to workflow pivot format
  const detectedPivots = useMemo(() => {
    return backendPivots.map((p) => ({
      index: p.index,
      price: p.price,
      type: p.type as "high" | "low",
    }));
  }, [backendPivots]);

  // Auto-update pivots when detected
  useEffect(() => {
    if (detectedPivots.length > 0 && pivots.length === 0) {
      onChange({ pivots: detectedPivots });
    }
  }, [detectedPivots, pivots.length, onChange]);

  // Calculate Fibonacci levels based on pivots and tool type
  const calculateLevels = useCallback(async () => {
    if (pivots.length < 2) return;

    setIsCalculating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const ratios = FIB_TOOL_RATIOS[fibTool];
      const pivot1 = pivots[0];
      const pivot2 = pivots[1];
      const range = Math.abs(pivot1.price - pivot2.price);
      const isUpswing = pivot1.price < pivot2.price;

      const levels: FibonacciLevel[] = ratios.map((ratio) => {
        let price: number;
        if (fibTool === "retracement") {
          // Retracement: levels between pivot1 and pivot2
          price = isUpswing
            ? pivot2.price - range * ratio
            : pivot2.price + range * ratio;
        } else {
          // Extension/Projection/Expansion: levels beyond the origin
          price = isUpswing
            ? pivot1.price + range * ratio
            : pivot1.price - range * ratio;
        }

        return {
          ratio,
          price,
          label: `${(ratio * 100).toFixed(1)}%`,
        };
      });

      onChange({ fibLevels: levels });
    } finally {
      setIsCalculating(false);
    }
  }, [pivots, fibTool, onChange]);

  const handleToolChange = useCallback(
    (tool: FibonacciTool) => {
      onChange({ fibTool: tool, fibLevels: [], selectedLevelIndex: null });
    },
    [onChange]
  );

  const handleLevelSelect = useCallback(
    (index: number) => {
      onChange({ selectedLevelIndex: selectedLevelIndex === index ? null : index });
    },
    [selectedLevelIndex, onChange]
  );

  const canProceed = pivots.length >= 2 && fibLevels.length > 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="outline">{fibTool}</Badge>
        <span className="text-sm text-muted-foreground">
          {fibLevels.length} levels
        </span>
        {selectedLevelIndex !== null && fibLevels[selectedLevelIndex] && (
          <Badge variant="secondary">
            Selected: {fibLevels[selectedLevelIndex].label}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pivot Detection Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Pivot Points</Label>
          <div className="flex items-center gap-2">
            {isLoadingData && (
              <span className="text-xs text-muted-foreground">Loading data...</span>
            )}
            {pivotError && (
              <span className="text-xs text-destructive">Error: {pivotError}</span>
            )}
          </div>
        </div>

        {isDetecting || isLoadingData ? (
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : pivots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {pivots.map((pivot, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-lg border p-3 text-center",
                  pivot.type === "high"
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-red-500/50 bg-red-500/10"
                )}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  Pivot {idx + 1}
                </div>
                <div className="font-mono font-semibold">
                  {pivot.price.toFixed(2)}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "mt-1 text-xs",
                    pivot.type === "high" ? "text-green-400" : "text-red-400"
                  )}
                >
                  {pivot.type.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {pivotError
              ? "Failed to detect pivots. Check backend connection or data source."
              : "No pivots detected yet. Pivots are automatically detected from market data."}
          </div>
        )}
      </div>

      {/* Fibonacci Tool Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Fibonacci Tool</Label>
        <div className="grid grid-cols-2 gap-2">
          {FIBONACCI_TOOL_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={fibTool === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleToolChange(option.value)}
              className="h-auto py-2"
            >
              <div className="text-left">
                <div className="font-semibold">{option.label}</div>
                <div className="text-[10px] opacity-70">{option.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Calculate Levels */}
      {pivots.length >= 2 && (
        <div className="flex justify-center">
          <Button onClick={calculateLevels} disabled={isCalculating || pivots.length < 2}>
            {isCalculating ? "Calculating..." : "Calculate Fibonacci Levels"}
          </Button>
        </div>
      )}

      {/* Fibonacci Levels Display */}
      {fibLevels.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Fibonacci Levels</Label>
          <div className="space-y-1">
            {fibLevels.map((level, idx) => (
              <button
                key={idx}
                onClick={() => handleLevelSelect(idx)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-2 rounded-lg border transition-all",
                  selectedLevelIndex === idx
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: getLevelColor(level.ratio),
                    }}
                  />
                  <span className="font-medium">{level.label}</span>
                </div>
                <span className="font-mono">{level.price.toFixed(2)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Summary & Continue */}
      {canProceed && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Fibonacci Setup Complete</div>
              <div className="text-xs text-muted-foreground mt-1">
                {pivots.length} pivots identified, {fibLevels.length} {fibTool} levels calculated
                {selectedLevelIndex !== null && ` (${fibLevels[selectedLevelIndex].label} selected)`}
              </div>
            </div>
            {workflowMode && onComplete && (
              <Button onClick={onComplete}>Continue to Pattern Scan</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getLevelColor(ratio: number): string {
  if (ratio <= 0.382) return "#f59e0b";
  if (ratio <= 0.5) return "#8b5cf6";
  if (ratio <= 0.618) return "#22c55e";
  if (ratio <= 0.786) return "#ef4444";
  if (ratio <= 1.0) return "#3b82f6";
  if (ratio <= 1.618) return "#06b6d4";
  return "#ec4899";
}
