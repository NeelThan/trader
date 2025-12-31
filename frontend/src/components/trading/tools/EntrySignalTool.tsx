"use client";

import { useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  MarketSymbol,
  Timeframe,
  TradeAction,
} from "@/lib/chart-constants";
import type {
  FibonacciLevel,
  DetectedSignal,
  SignalBar,
} from "@/hooks/use-workflow-state";
import { useMarketDataSubscription } from "@/hooks/use-market-data-subscription";

type EntrySignalToolProps = {
  // Data props
  symbol: MarketSymbol;
  timeframe: Timeframe;
  fibLevels: FibonacciLevel[];
  tradeDirection: TradeAction;
  selectedLevel: number | null;
  signalBar: SignalBar | null;
  entryConfirmed: boolean;
  detectedSignals: DetectedSignal[];
  onChange: (updates: {
    selectedLevel?: number | null;
    signalBar?: SignalBar | null;
    entryConfirmed?: boolean;
  }) => void;

  // Workflow integration
  onComplete?: () => void;
  workflowMode?: boolean;

  // Display customization
  compact?: boolean;
};

export function EntrySignalTool({
  symbol,
  timeframe,
  fibLevels,
  tradeDirection,
  selectedLevel,
  signalBar,
  entryConfirmed,
  detectedSignals,
  onChange,
  onComplete,
  workflowMode = false,
  compact = false,
}: EntrySignalToolProps) {
  // Fetch real market data for the selected symbol and timeframe
  const { data, isLoading } = useMarketDataSubscription(symbol, timeframe, "yahoo");

  // Get current price from actual market data
  const currentPrice = useMemo(() => {
    if (data.length === 0) return 0;
    return data[data.length - 1].close;
  }, [data]);

  // Select a level for entry
  const handleLevelSelect = useCallback(
    (level: FibonacciLevel) => {
      onChange({ selectedLevel: level.price, signalBar: null, entryConfirmed: false });
    },
    [onChange]
  );

  // Confirm a signal bar
  const confirmSignalBar = useCallback(
    (signal: DetectedSignal) => {
      const bar: SignalBar = {
        time: new Date().toISOString(),
        open: currentPrice - 5,
        high: currentPrice + 10,
        low: currentPrice - 15,
        close: currentPrice,
        signalType: signal.signalType,
        direction: signal.direction,
        level: signal.level,
      };
      onChange({ signalBar: bar, selectedLevel: signal.level, entryConfirmed: true });
    },
    [currentPrice, onChange]
  );

  // Manual confirmation
  const manualConfirm = useCallback(() => {
    if (selectedLevel === null) return;

    const bar: SignalBar = {
      time: new Date().toISOString(),
      open: currentPrice - 5,
      high: currentPrice + 10,
      low: currentPrice - 15,
      close: currentPrice,
      signalType: "type_2",
      direction: tradeDirection === "GO_LONG" ? "buy" : "sell",
      level: selectedLevel,
    };
    onChange({ signalBar: bar, entryConfirmed: true });
  }, [selectedLevel, currentPrice, tradeDirection, onChange]);

  const isBuySetup = tradeDirection === "GO_LONG";
  const canProceed = entryConfirmed && signalBar !== null;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {entryConfirmed ? (
          <>
            <Badge variant="default" className="bg-green-500">Entry Confirmed</Badge>
            {signalBar && (
              <span className="text-sm text-muted-foreground">
                {signalBar.signalType === "type_1" ? "Type 1" : "Type 2"} at {signalBar.level.toFixed(2)}
              </span>
            )}
          </>
        ) : (
          <Badge variant="outline">Awaiting Confirmation</Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Price Monitor */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Current Price</div>
            <div className="text-2xl font-mono font-bold">{currentPrice.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Trade Direction</div>
            <Badge
              className={cn(
                isBuySetup ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              )}
            >
              {isBuySetup ? "Looking to BUY" : "Looking to SELL"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Detected Signals at Levels */}
      {detectedSignals.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Signal Bars Detected</Label>
          <div className="grid gap-2">
            {detectedSignals.map((signal, idx) => {
              const isSelected = selectedLevel === signal.level && entryConfirmed;
              const matchesDirection =
                (isBuySetup && signal.direction === "buy") ||
                (!isBuySetup && signal.direction === "sell");

              return (
                <button
                  key={idx}
                  onClick={() => confirmSignalBar(signal)}
                  disabled={entryConfirmed}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-all text-left w-full",
                    isSelected && "border-green-500 bg-green-500/10",
                    !isSelected && matchesDirection && "border-blue-500/50 hover:border-blue-500",
                    !isSelected && !matchesDirection && "border-gray-600 opacity-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "w-3 h-3 rounded-full",
                        signal.signalType === "type_1" ? "bg-blue-500" : "bg-purple-500"
                      )}
                    />
                    <div>
                      <div className="font-medium">
                        {signal.signalType === "type_1" ? "Type 1" : "Type 2"} Signal
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {signal.direction.toUpperCase()} at {signal.levelType} ({signal.level.toFixed(2)})
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">Strength</div>
                      <div className="font-mono">{Math.round(signal.strength * 100)}%</div>
                    </div>
                    {isSelected && (
                      <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual Level Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Select Entry Level</Label>
        <div className="grid gap-2">
          {fibLevels.map((level, idx) => {
            const isSelected = selectedLevel === level.price;
            const distance = Math.abs(currentPrice - level.price);
            const isNearby = distance < 20;

            return (
              <button
                key={idx}
                onClick={() => handleLevelSelect(level)}
                disabled={entryConfirmed}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-all",
                  isSelected && "border-primary bg-primary/10",
                  !isSelected && isNearby && "border-amber-500/50",
                  !isSelected && !isNearby && "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{level.label}</span>
                  <span className="font-mono text-sm">{level.price.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isNearby && !isSelected && (
                    <Badge variant="outline" className="text-amber-400 border-amber-500">
                      Nearby
                    </Badge>
                  )}
                  {isSelected && (
                    <Badge variant="default">Selected</Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Confirmation */}
      {selectedLevel !== null && !entryConfirmed && (
        <div className="rounded-lg border border-dashed border-border p-4 text-center">
          <div className="text-sm text-muted-foreground mb-3">
            No automatic signal detected at this level. You can manually confirm the entry if you see a valid signal bar.
          </div>
          <Button onClick={manualConfirm}>
            Manually Confirm Entry at {selectedLevel.toFixed(2)}
          </Button>
        </div>
      )}

      {/* Entry Confirmation Summary */}
      {entryConfirmed && signalBar && (
        <div className="rounded-lg border-2 border-green-500 bg-green-500/10 p-4">
          <div className="flex items-center gap-3 mb-3">
            <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-lg font-semibold text-green-400">Entry Signal Confirmed!</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Signal Type</div>
              <div className="font-medium">
                {signalBar.signalType === "type_1" ? "Type 1 (Tested & Rejected)" : "Type 2 (Near Level)"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Direction</div>
              <div className="font-medium">{signalBar.direction.toUpperCase()}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Entry Level</div>
              <div className="font-mono">{signalBar.level.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Signal Bar Close</div>
              <div className="font-mono">{signalBar.close.toFixed(2)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Continue Button */}
      {canProceed && workflowMode && onComplete && (
        <div className="flex justify-end">
          <Button onClick={onComplete}>
            Continue to Position Sizing
          </Button>
        </div>
      )}
    </div>
  );
}
