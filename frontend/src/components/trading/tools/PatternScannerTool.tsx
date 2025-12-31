"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  MarketSymbol,
  Timeframe,
  TradeAction,
} from "@/lib/chart-constants";
import type {
  DetectedPattern,
  DetectedSignal,
  FibonacciLevel,
} from "@/hooks/use-workflow-state";

type PatternScannerToolProps = {
  // Data props
  symbol: MarketSymbol;
  timeframe: Timeframe;
  fibLevels: FibonacciLevel[];
  tradeDirection: TradeAction;
  detectedPatterns: DetectedPattern[];
  detectedSignals: DetectedSignal[];
  scanCompleted: boolean;
  onChange: (updates: {
    detectedPatterns?: DetectedPattern[];
    detectedSignals?: DetectedSignal[];
    scanCompleted?: boolean;
  }) => void;

  // Workflow integration
  onComplete?: () => void;
  workflowMode?: boolean;

  // Display customization
  compact?: boolean;
};

const PATTERN_CONFIGS: Record<DetectedPattern["type"], { label: string; color: string }> = {
  gartley: { label: "Gartley", color: "#22c55e" },
  butterfly: { label: "Butterfly", color: "#8b5cf6" },
  bat: { label: "Bat", color: "#f59e0b" },
  crab: { label: "Crab", color: "#ef4444" },
};

export function PatternScannerTool({
  symbol,
  timeframe,
  fibLevels,
  tradeDirection,
  detectedPatterns,
  detectedSignals,
  scanCompleted,
  onChange,
  onComplete,
  workflowMode = false,
  compact = false,
}: PatternScannerToolProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState<"signals" | "harmonics" | "complete">("signals");

  // Run comprehensive scan
  const runScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanPhase("signals");

    try {
      // Phase 1: Signal scan
      for (let i = 0; i <= 50; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setScanProgress(i);
      }

      // Simulated signal detection
      const signals: DetectedSignal[] = fibLevels.slice(0, 2).map((level, idx) => ({
        timeframe,
        signalType: idx === 0 ? "type_1" : "type_2",
        direction: tradeDirection === "GO_LONG" ? "buy" : "sell",
        level: level.price,
        levelType: level.label,
        strength: 0.6 + Math.random() * 0.3,
      }));

      onChange({ detectedSignals: signals });

      // Phase 2: Harmonic pattern scan
      setScanPhase("harmonics");
      for (let i = 50; i <= 100; i += 10) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        setScanProgress(i);
      }

      // Simulated pattern detection (may or may not find patterns)
      // Only generate patterns if we have valid fib levels to base them on
      let patterns: DetectedPattern[] = [];
      if (fibLevels.length > 0 && Math.random() > 0.5) {
        const basePrice = fibLevels[0].price;
        // Use percentage-based offsets (1-2% of price) instead of fixed values
        const priceScale = basePrice * 0.01; // 1% of price
        patterns = [
          {
            type: ["gartley", "butterfly", "bat", "crab"][Math.floor(Math.random() * 4)] as DetectedPattern["type"],
            direction: tradeDirection === "GO_LONG" ? "buy" : "sell",
            confidence: 0.7 + Math.random() * 0.2,
            x: basePrice,
            a: basePrice + priceScale * 5,    // ~5% above base
            b: basePrice + priceScale * 2,    // ~2% above base
            c: basePrice + priceScale * 3.5,  // ~3.5% above base
            d: basePrice + priceScale * 0.5,  // ~0.5% above base (entry zone)
          },
        ];
      }

      onChange({
        detectedPatterns: patterns,
        scanCompleted: true,
      });

      setScanPhase("complete");
    } finally {
      setIsScanning(false);
    }
  }, [fibLevels, timeframe, tradeDirection, onChange]);

  const canProceed = scanCompleted;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {scanCompleted ? (
          <>
            <Badge variant="secondary">{detectedSignals.length} Signals</Badge>
            <Badge variant="secondary">{detectedPatterns.length} Patterns</Badge>
          </>
        ) : (
          <Badge variant="outline">Not scanned</Badge>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scan Controls */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Pattern & Signal Scanner</div>
          <div className="text-xs text-muted-foreground">
            Scanning {symbol} on {timeframe} for signals at Fibonacci levels
          </div>
        </div>
        <Button onClick={runScan} disabled={isScanning}>
          {isScanning ? "Scanning..." : scanCompleted ? "Re-Scan" : "Start Scan"}
        </Button>
      </div>

      {/* Scan Progress */}
      {isScanning && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {scanPhase === "signals" && "Scanning for signal bars..."}
              {scanPhase === "harmonics" && "Detecting harmonic patterns..."}
              {scanPhase === "complete" && "Scan complete!"}
            </span>
            <span className="font-mono">{scanProgress}%</span>
          </div>
          <Progress value={scanProgress} />
        </div>
      )}

      {/* Detected Signals */}
      {detectedSignals.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Detected Signals</Label>
          <div className="grid gap-2">
            {detectedSignals.map((signal, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  signal.direction === "buy"
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-red-500/50 bg-red-500/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    className={cn(
                      signal.signalType === "type_1"
                        ? "border-blue-500 text-blue-400"
                        : "border-purple-500 text-purple-400"
                    )}
                  >
                    {signal.signalType === "type_1" ? "Type 1" : "Type 2"}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium">
                      {signal.direction.toUpperCase()} at {signal.levelType}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Price: {signal.level.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Strength</div>
                  <div className="font-mono text-sm">
                    {Math.round(signal.strength * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detected Harmonic Patterns */}
      {detectedPatterns.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Harmonic Patterns</Label>
          <div className="grid gap-2">
            {detectedPatterns.map((pattern, idx) => {
              const config = PATTERN_CONFIGS[pattern.type];
              return (
                <div
                  key={idx}
                  className="p-4 rounded-lg border border-border bg-muted/30"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        style={{
                          backgroundColor: `${config.color}20`,
                          color: config.color,
                          borderColor: config.color,
                        }}
                      >
                        {config.label}
                      </Badge>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          pattern.direction === "buy" ? "text-green-400" : "text-red-400"
                        )}
                      >
                        {pattern.direction.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Confidence</div>
                      <div className="font-mono text-sm">
                        {Math.round(pattern.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-2 text-center text-xs">
                    {(["x", "a", "b", "c", "d"] as const).map((point) => (
                      <div key={point} className="p-2 rounded bg-background/50">
                        <div className="text-muted-foreground uppercase">{point}</div>
                        <div className="font-mono">{pattern[point].toFixed(0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No Patterns Found */}
      {scanCompleted && detectedPatterns.length === 0 && (
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
          <div className="text-sm text-muted-foreground">
            No harmonic patterns detected. Proceeding with Fibonacci levels and signal bars.
          </div>
        </div>
      )}

      {/* Summary & Continue */}
      {canProceed && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Scan Complete</div>
              <div className="text-xs text-muted-foreground mt-1">
                Found {detectedSignals.length} signals and {detectedPatterns.length} harmonic patterns
              </div>
            </div>
            {workflowMode && onComplete && (
              <Button onClick={onComplete}>Continue to Entry Confirmation</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
