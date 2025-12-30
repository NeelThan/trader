"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useSignalDetection, type DetectedSignal } from "@/hooks/use-signal-detection";
import type { OHLCData } from "@/components/trading";

type SignalDetectionPanelProps = {
  data: OHLCData[];
  fibonacciLevels: number[];
  enabled?: boolean;
  lookbackBars?: number;
};

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function formatDate(time: OHLCData["time"]): string {
  // Handle different time formats from lightweight-charts
  let date: Date;
  if (typeof time === "number") {
    date = new Date(time * 1000);
  } else if (typeof time === "string") {
    date = new Date(time);
  } else {
    // BusinessDay object: { year, month, day }
    date = new Date(time.year, time.month - 1, time.day);
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function SignalCard({ signal }: { signal: DetectedSignal }) {
  const isBuy = signal.direction === "buy";
  const bgColor = isBuy ? "bg-green-500/10" : "bg-red-500/10";
  const borderColor = isBuy ? "border-green-500/30" : "border-red-500/30";
  const textColor = isBuy ? "text-green-400" : "text-red-400";
  const signalTypeLabel = signal.signal_type === "type_1" ? "Type 1" : "Type 2";
  const strengthPercent = (signal.strength * 100).toFixed(0);

  return (
    <div className={`p-3 rounded-lg border ${bgColor} ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-semibold ${textColor}`}>
          {isBuy ? "BUY" : "SELL"} Signal
        </span>
        <span className="text-xs text-muted-foreground">
          {formatDate(signal.bar.time)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Type:</span>{" "}
          <span className="font-medium">{signalTypeLabel}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Strength:</span>{" "}
          <span className="font-medium">{strengthPercent}%</span>
        </div>
        <div>
          <span className="text-muted-foreground">Level:</span>{" "}
          <span className="font-mono text-blue-400">{formatPrice(signal.level)}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Close:</span>{" "}
          <span className="font-mono">{formatPrice(signal.bar.close)}</span>
        </div>
      </div>

      {/* Strength bar */}
      <div className="mt-2">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${isBuy ? "bg-green-500" : "bg-red-500"}`}
            style={{ width: `${signal.strength * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function SignalDetectionPanel({
  data,
  fibonacciLevels,
  enabled = true,
  lookbackBars = 20,
}: SignalDetectionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoDetect, setAutoDetect] = useState(false);

  const {
    signals,
    isLoading,
    error,
    detectSignalsForMultipleLevels,
    clearSignals,
  } = useSignalDetection();

  // Auto-detect signals when data or levels change
  useEffect(() => {
    if (autoDetect && enabled && data.length > 0 && fibonacciLevels.length > 0) {
      detectSignalsForMultipleLevels(data, fibonacciLevels, lookbackBars);
    }
  }, [autoDetect, enabled, data, fibonacciLevels, lookbackBars, detectSignalsForMultipleLevels]);

  const handleDetectNow = () => {
    if (data.length > 0 && fibonacciLevels.length > 0) {
      detectSignalsForMultipleLevels(data, fibonacciLevels, lookbackBars);
    }
  };

  if (!enabled) {
    return null;
  }

  const buySignals = signals.filter((s) => s.direction === "buy");
  const sellSignals = signals.filter((s) => s.direction === "sell");

  return (
    <Card className="border-purple-500/30 border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-purple-400">
            Signal Detection
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={autoDetect ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoDetect(!autoDetect)}
              className="text-xs h-7"
            >
              {autoDetect ? "Auto" : "Manual"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDetectNow}
              disabled={isLoading || data.length === 0}
              className="text-xs h-7"
            >
              {isLoading ? "Scanning..." : "Detect Now"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Detect Type 1/2 signals at Fibonacci levels
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {/* Status */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Checking {fibonacciLevels.length} levels on last {lookbackBars} bars
            </span>
            {signals.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSignals}
                className="text-xs h-6 text-muted-foreground hover:text-foreground"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Summary */}
          {signals.length > 0 && (
            <div className="flex items-center gap-4 p-2 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm">
                  {buySignals.length} Buy Signal{buySignals.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm">
                  {sellSignals.length} Sell Signal{sellSignals.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          )}

          {/* No signals */}
          {signals.length === 0 && !isLoading && !error && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No signals detected. Click &quot;Detect Now&quot; to scan for signals.
            </div>
          )}

          {/* Signal cards */}
          {signals.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {signals
                .sort((a, b) => b.barIndex - a.barIndex)
                .map((signal, index) => (
                  <SignalCard key={`${signal.barIndex}-${signal.level}-${index}`} signal={signal} />
                ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
