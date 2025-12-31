"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  MarketSymbol,
  TradeAction,
} from "@/lib/chart-constants";
import type { FibonacciLevel } from "@/hooks/use-workflow-state";
import { usePositionSizing } from "@/hooks/use-position-sizing";
import { usePositionSizingAPI } from "@/hooks/use-position-sizing-api";

// Custom hook to use a ref for callbacks that shouldn't trigger re-renders
 
function useCallbackRef<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  // eslint-disable-next-line react-hooks/use-memo -- Intentional ref-based callback pattern
  return useCallback(((...args) => callbackRef.current(...args)) as T, []);
}

type PositionSizingToolProps = {
  // Data props
  symbol: MarketSymbol;
  tradeDirection: TradeAction;
  selectedLevel: number | null;
  fibLevels: FibonacciLevel[];
  entryPrice: number;
  stopLoss: number;
  targets: number[];
  positionSize: number;
  riskRewardRatio: number;
  riskAmount: number;
  onChange: (updates: {
    entryPrice?: number;
    stopLoss?: number;
    targets?: number[];
    positionSize?: number;
    riskRewardRatio?: number;
    riskAmount?: number;
  }) => void;

  // Workflow integration
  onComplete?: () => void;
  workflowMode?: boolean;

  // Display customization
  compact?: boolean;
};

export function PositionSizingTool({
  symbol,
  tradeDirection,
  selectedLevel,
  fibLevels,
  entryPrice,
  stopLoss,
  targets,
  positionSize,
  riskRewardRatio,
  riskAmount,
  onChange,
  onComplete,
  workflowMode = false,
  compact = false,
}: PositionSizingToolProps) {
  // Use the position sizing hook for account settings
  const { settings } = usePositionSizing();

  // Use the backend API for calculations
  const { isLoading, error, isBackendAvailable, calculate: apiCalculate } = usePositionSizingAPI();

  const initialized = useRef(false);

  // Stabilize onChange callback to prevent infinite re-renders
  const stableOnChange = useCallbackRef(onChange);

  const isBuy = tradeDirection === "GO_LONG";

  // Initialize values from previous step data on mount (run once)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const updates: Record<string, unknown> = {};

    // Set entry price from selected level if not already set
    if (selectedLevel && selectedLevel > 0 && entryPrice === 0) {
      updates.entryPrice = selectedLevel;
    }

    // Auto-suggest stop loss if not set (1% from entry)
    const effectiveEntry = selectedLevel || entryPrice;
    if (effectiveEntry > 0 && stopLoss === 0) {
      updates.stopLoss = isBuy ? effectiveEntry * 0.99 : effectiveEntry * 1.01;
    }

    // Auto-suggest first target from fib extension levels if not set
    if (targets.length === 0 && fibLevels.length > 0) {
      const extensionLevels = fibLevels.filter((l) => l.ratio >= 1.0);
      if (extensionLevels.length > 0) {
        updates.targets = [extensionLevels[0].price];
      } else if (effectiveEntry > 0) {
        // Fallback: 2% profit target
        updates.targets = [isBuy ? effectiveEntry * 1.02 : effectiveEntry * 0.98];
      }
    }

    if (Object.keys(updates).length > 0) {
      stableOnChange(updates);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Track last calculated values to prevent infinite loops
  const lastCalculation = useRef<{
    entryPrice: number;
    stopLoss: number;
    targets: number[];
    settingsHash: string;
  } | null>(null);

  // Calculate position size and R:R using backend API
  const calculate = useCallback(async () => {
    if (!entryPrice || !stopLoss) {
      return;
    }

    const distance = Math.abs(entryPrice - stopLoss);
    if (distance === 0) {
      return;
    }

    // Create a hash of settings to detect changes
    const settingsHash = `${settings.usePercentageRisk}-${settings.accountBalance}-${settings.riskPercentage}-${settings.riskCapital}`;

    // Check if inputs have actually changed to prevent infinite loop
    const lastCalc = lastCalculation.current;
    if (
      lastCalc &&
      lastCalc.entryPrice === entryPrice &&
      lastCalc.stopLoss === stopLoss &&
      lastCalc.settingsHash === settingsHash &&
      lastCalc.targets.length === targets.length &&
      lastCalc.targets.every((t, i) => t === targets[i])
    ) {
      // Inputs haven't changed, skip recalculation
      return;
    }

    // Update last calculation tracker
    lastCalculation.current = {
      entryPrice,
      stopLoss,
      targets: [...targets],
      settingsHash,
    };

    // Get risk capital based on settings
    const riskCapital = settings.usePercentageRisk
      ? settings.accountBalance * (settings.riskPercentage / 100)
      : settings.riskCapital;

    // Call the backend API
    const result = await apiCalculate({
      entryPrice,
      stopLoss,
      targets,
      riskCapital,
      accountBalance: settings.accountBalance,
    });

    if (result) {
      stableOnChange({
        positionSize: Math.floor(result.positionSize),
        riskRewardRatio: result.riskRewardRatio,
        riskAmount: result.riskAmount,
      });
    }
  }, [entryPrice, stopLoss, targets, settings, apiCalculate, stableOnChange]);

  // Auto-calculate when key values change
  useEffect(() => {
    if (entryPrice > 0 && stopLoss > 0 && entryPrice !== stopLoss) {
      calculate();
    }
  }, [entryPrice, stopLoss, targets, calculate]);

  // Suggest stop loss based on trade direction
  const suggestStopLoss = useCallback(() => {
    if (!entryPrice) return;
    // Suggest 1% away from entry
    const suggestedStop = isBuy ? entryPrice * 0.99 : entryPrice * 1.01;
    stableOnChange({ stopLoss: suggestedStop });
  }, [entryPrice, isBuy, stableOnChange]);

  // Suggest targets from fib levels
  const suggestTargets = useCallback(() => {
    if (fibLevels.length === 0) {
      // No fib levels available, create default targets based on entry
      if (entryPrice > 0) {
        const defaultTargets = isBuy
          ? [entryPrice * 1.02, entryPrice * 1.05, entryPrice * 1.10]
          : [entryPrice * 0.98, entryPrice * 0.95, entryPrice * 0.90];
        stableOnChange({ targets: defaultTargets });
      }
      return;
    }

    // Try extension levels first (ratio >= 1.0)
    const extensionLevels = fibLevels.filter((l) => l.ratio >= 1.0);
    if (extensionLevels.length > 0) {
      stableOnChange({ targets: extensionLevels.slice(0, 3).map((l) => l.price) });
      return;
    }

    // Fallback to any fib levels sorted by distance from entry
    if (entryPrice > 0) {
      const sortedLevels = [...fibLevels]
        .filter((l) => isBuy ? l.price > entryPrice : l.price < entryPrice)
        .sort((a, b) => isBuy ? a.price - b.price : b.price - a.price);

      if (sortedLevels.length > 0) {
        stableOnChange({ targets: sortedLevels.slice(0, 3).map((l) => l.price) });
        return;
      }
    }

    // Last resort: use all available levels
    stableOnChange({ targets: fibLevels.slice(0, 3).map((l) => l.price) });
  }, [fibLevels, entryPrice, isBuy, stableOnChange]);

  // Update target at index
  const updateTarget = useCallback(
    (index: number, value: number) => {
      const newTargets = [...targets];
      newTargets[index] = value;
      stableOnChange({ targets: newTargets });
    },
    [targets, stableOnChange]
  );

  // Add target
  const addTarget = useCallback(() => {
    if (targets.length >= 5) return;
    const lastTarget = targets[targets.length - 1] || entryPrice;
    const newTarget = isBuy ? lastTarget * 1.02 : lastTarget * 0.98;
    stableOnChange({ targets: [...targets, newTarget] });
  }, [targets, entryPrice, isBuy, stableOnChange]);

  // Remove target
  const removeTarget = useCallback(
    (index: number) => {
      stableOnChange({ targets: targets.filter((_, i) => i !== index) });
    },
    [targets, stableOnChange]
  );

  const isValid = useMemo(() => {
    if (!entryPrice || !stopLoss) return false;
    if (isBuy && stopLoss >= entryPrice) return false;
    if (!isBuy && stopLoss <= entryPrice) return false;
    return true;
  }, [entryPrice, stopLoss, isBuy]);

  // For proceeding to next step - R:R is discretionary (user decides in checklist)
  // Only require valid entry/stop, position size calculated, and at least one target
  const canProceed = isValid && positionSize > 0 && targets.length > 0;

  // For calculating, we just need entry and stop
  const canCalculate = entryPrice > 0 && stopLoss > 0 && entryPrice !== stopLoss;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm">
          Size: <span className="font-mono font-medium">{positionSize}</span>
        </span>
        <Badge
          variant="outline"
          className={cn(
            riskRewardRatio >= 2 ? "text-green-400 border-green-500" :
            riskRewardRatio >= 1 ? "text-amber-400 border-amber-500" :
            "text-red-400 border-red-500"
          )}
        >
          R:R {riskRewardRatio.toFixed(1)}:1
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Backend Status Warning */}
      {!isBackendAvailable && (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
          <div className="flex items-center gap-2 text-amber-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Backend unavailable - calculations may not work
          </div>
        </div>
      )}

      {/* Account Settings Summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium">Account Settings</div>
          <Badge variant="outline">{symbol}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Account Balance</div>
            <div className="font-mono font-medium">${settings.accountBalance.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Risk per Trade</div>
            <div className="font-mono font-medium">{settings.riskPercentage}%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Max Risk</div>
            <div className="font-mono font-medium text-amber-400">
              ${(settings.accountBalance * settings.riskPercentage / 100).toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Entry, Stop, Targets */}
      <div className="grid gap-4">
        {/* Entry Price */}
        <div className="space-y-2">
          <Label>Entry Price</Label>
          <Input
            type="number"
            value={entryPrice || ""}
            onChange={(e) => stableOnChange({ entryPrice: parseFloat(e.target.value) || 0 })}
            placeholder="Enter price"
            className="font-mono"
          />
        </div>

        {/* Stop Loss */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Stop Loss</Label>
            <Button variant="ghost" size="sm" onClick={suggestStopLoss}>
              Suggest
            </Button>
          </div>
          <Input
            type="number"
            value={stopLoss || ""}
            onChange={(e) => stableOnChange({ stopLoss: parseFloat(e.target.value) || 0 })}
            placeholder="Stop loss price"
            className={cn(
              "font-mono",
              stopLoss && entryPrice && (
                (isBuy && stopLoss >= entryPrice) || (!isBuy && stopLoss <= entryPrice)
              ) && "border-red-500"
            )}
          />
          {stopLoss > 0 && entryPrice > 0 && (
            <div className="text-xs text-muted-foreground">
              Distance: {Math.abs(entryPrice - stopLoss).toFixed(2)} ({((Math.abs(entryPrice - stopLoss) / entryPrice) * 100).toFixed(2)}%)
            </div>
          )}
        </div>

        {/* Targets */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Profit Targets</Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={suggestTargets} disabled={!entryPrice}>
                {fibLevels.length > 0 ? "Use Fib Levels" : "Auto-Generate"}
              </Button>
              <Button variant="ghost" size="sm" onClick={addTarget} disabled={targets.length >= 5}>
                Add Target
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {targets.map((target, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Badge variant="outline" className="w-8">T{idx + 1}</Badge>
                <Input
                  type="number"
                  value={target || ""}
                  onChange={(e) => updateTarget(idx, parseFloat(e.target.value) || 0)}
                  className="font-mono flex-1"
                />
                {idx > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => removeTarget(idx)}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                )}
              </div>
            ))}
            {targets.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-2 border border-dashed rounded-lg">
                No targets set. Click &quot;Use Fib Levels&quot; or &quot;Add Target&quot;
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calculate Button */}
      <Button onClick={calculate} className="w-full" disabled={!canCalculate || isLoading}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Calculating...
          </span>
        ) : positionSize > 0 ? (
          "Recalculate Position Size"
        ) : (
          "Calculate Position Size"
        )}
      </Button>

      {/* Error display */}
      {error && (
        <div className="text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      {/* Missing data warnings */}
      {!canCalculate && !error && (
        <div className="text-sm text-amber-400 text-center">
          {!entryPrice && "Enter an entry price"}
          {entryPrice > 0 && !stopLoss && "Enter a stop loss price"}
          {entryPrice > 0 && stopLoss > 0 && entryPrice === stopLoss && "Stop loss cannot equal entry price"}
        </div>
      )}

      {/* Live R:R Display - Always visible with real-time updates */}
      <div className={cn(
        "rounded-lg border p-4 space-y-4 sticky bottom-0 bg-background/95 backdrop-blur-sm",
        riskRewardRatio >= 3 ? "border-green-500/50" :
        riskRewardRatio >= 2 ? "border-green-500/30" :
        riskRewardRatio >= 1.5 ? "border-blue-500/30" :
        riskRewardRatio >= 1 ? "border-amber-500/30" :
        riskRewardRatio > 0 ? "border-red-500/30" :
        "border-border"
      )}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Risk:Reward Analysis</div>
          {canCalculate && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                riskRewardRatio >= 3 ? "text-green-400 border-green-500" :
                riskRewardRatio >= 2 ? "text-green-400 border-green-500" :
                riskRewardRatio >= 1.5 ? "text-blue-400 border-blue-500" :
                riskRewardRatio >= 1 ? "text-amber-400 border-amber-500" :
                riskRewardRatio > 0 ? "text-red-400 border-red-500" :
                "text-muted-foreground"
              )}
            >
              {riskRewardRatio >= 3 ? "Excellent" :
               riskRewardRatio >= 2 ? "Good" :
               riskRewardRatio >= 1.5 ? "Acceptable" :
               riskRewardRatio >= 1 ? "Marginal" :
               riskRewardRatio > 0 ? "Poor" : "—"}
            </Badge>
          )}
        </div>

        {/* Main R:R Display */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Risk</div>
            <div className="text-lg font-mono font-bold text-red-400">
              {riskAmount > 0 ? `$${riskAmount.toFixed(0)}` : "—"}
            </div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">R:R Ratio</div>
            <div
              className={cn(
                "text-2xl font-mono font-bold",
                riskRewardRatio >= 2 ? "text-green-400" :
                riskRewardRatio >= 1 ? "text-amber-400" :
                riskRewardRatio > 0 ? "text-red-400" :
                "text-muted-foreground"
              )}
            >
              {riskRewardRatio > 0 ? `${riskRewardRatio.toFixed(1)}:1` : "—"}
            </div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/30">
            <div className="text-xs text-muted-foreground mb-1">Reward (T1)</div>
            <div className="text-lg font-mono font-bold text-green-400">
              {riskRewardRatio > 0 && riskAmount > 0
                ? `$${(riskAmount * riskRewardRatio).toFixed(0)}`
                : "—"}
            </div>
          </div>
        </div>

        {/* Position Size */}
        {positionSize > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <span className="text-sm text-muted-foreground">Position Size</span>
            <span className="text-lg font-mono font-bold">{positionSize} units</span>
          </div>
        )}

        {/* R:R Quality Guide */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground font-medium">What to aim for:</div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className={cn(
              "p-2 rounded text-center",
              riskRewardRatio >= 3 ? "bg-green-500/20 text-green-400 ring-1 ring-green-500" : "bg-muted/30 text-muted-foreground"
            )}>
              <div className="font-bold">3:1+</div>
              <div>Excellent</div>
            </div>
            <div className={cn(
              "p-2 rounded text-center",
              riskRewardRatio >= 2 && riskRewardRatio < 3 ? "bg-green-500/20 text-green-400 ring-1 ring-green-500" : "bg-muted/30 text-muted-foreground"
            )}>
              <div className="font-bold">2:1</div>
              <div>Good</div>
            </div>
            <div className={cn(
              "p-2 rounded text-center",
              riskRewardRatio >= 1 && riskRewardRatio < 2 ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500" : "bg-muted/30 text-muted-foreground"
            )}>
              <div className="font-bold">1:1</div>
              <div>Break-even</div>
            </div>
            <div className={cn(
              "p-2 rounded text-center",
              riskRewardRatio > 0 && riskRewardRatio < 1 ? "bg-red-500/20 text-red-400 ring-1 ring-red-500" : "bg-muted/30 text-muted-foreground"
            )}>
              <div className="font-bold">&lt;1:1</div>
              <div>Avoid</div>
            </div>
          </div>
        </div>

        {/* Warning/Success Messages */}
        {riskRewardRatio > 0 && (
          <div className={cn(
            "rounded-lg border p-3 text-sm",
            riskRewardRatio >= 2
              ? "border-green-500/50 bg-green-500/10"
              : riskRewardRatio >= 1
              ? "border-amber-500/50 bg-amber-500/10"
              : "border-red-500/50 bg-red-500/10"
          )}>
            {riskRewardRatio >= 3 ? (
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Excellent setup!</strong> 3:1 or better means you only need to win 25% of trades to break even.</span>
              </div>
            ) : riskRewardRatio >= 2 ? (
              <div className="flex items-center gap-2 text-green-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span><strong>Good setup.</strong> 2:1 is the minimum recommended for consistent profitability.</span>
              </div>
            ) : riskRewardRatio >= 1 ? (
              <div className="flex items-start gap-2 text-amber-400">
                <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <strong>Marginal setup.</strong> You need &gt;50% win rate to be profitable.
                  <p className="text-xs text-muted-foreground mt-1">Consider widening targets or tightening stop loss. You can still proceed.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-red-400">
                <svg className="w-4 h-4 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <strong>Unfavorable setup.</strong> Risking more than potential reward.
                  <p className="text-xs text-muted-foreground mt-1">Strongly recommend adjusting entry, stop, or targets. You can still proceed if you accept this risk.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Continue */}
      {canProceed && workflowMode && onComplete && (
        <div className="flex justify-end">
          <Button onClick={onComplete}>
            Continue to Pre-Trade Checklist
          </Button>
        </div>
      )}
    </div>
  );
}
