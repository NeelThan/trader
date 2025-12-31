"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { TradeAction, MarketSymbol, Timeframe } from "@/lib/chart-constants";
import type { TradeStatus, TradeLogEntry } from "@/hooks/use-workflow-state";
import { useMarketDataSubscription } from "@/hooks/use-market-data-subscription";

// Custom hook to use a ref for callbacks that shouldn't trigger re-renders
 
function useCallbackRef<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  // eslint-disable-next-line react-hooks/use-memo -- Intentional ref-based callback pattern
  return useCallback(((...args) => callbackRef.current(...args)) as T, []);
}

type TradeManagementPanelProps = {
  // Data props
  symbol: MarketSymbol;
  timeframe: Timeframe;
  tradeDirection: TradeAction;
  entryPrice: number;
  stopLoss: number;
  targets: number[];
  positionSize: number;
  tradeStatus: TradeStatus;
  currentPnL: number;
  breakEvenPrice: number;
  freeTradeActive: boolean;
  trailingEnabled: boolean;
  trailingStopPrice: number | null;
  tradeLog: TradeLogEntry[];
  onAddLogEntry: (entry: Omit<TradeLogEntry, "timestamp">) => void;
  onChange: (updates: {
    tradeStatus?: TradeStatus;
    currentPnL?: number;
    breakEvenPrice?: number;
    freeTradeActive?: boolean;
    trailingEnabled?: boolean;
    trailingStopPrice?: number | null;
  }) => void;

  // Workflow integration
  onComplete?: () => void;
  workflowMode?: boolean;

  // Display customization
  compact?: boolean;
};

const STATUS_CONFIG: Record<TradeStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: "Pending Entry", color: "#9ca3af", bgColor: "bg-gray-500/20" },
  active: { label: "Active", color: "#3b82f6", bgColor: "bg-blue-500/20" },
  at_breakeven: { label: "At Breakeven", color: "#22c55e", bgColor: "bg-green-500/20" },
  trailing: { label: "Trailing Stop", color: "#8b5cf6", bgColor: "bg-purple-500/20" },
  closed: { label: "Closed", color: "#6b7280", bgColor: "bg-gray-500/20" },
};

export function TradeManagementPanel({
  symbol,
  timeframe,
  tradeDirection,
  entryPrice,
  stopLoss,
  targets,
  positionSize,
  tradeStatus,
  currentPnL,
  breakEvenPrice,
  freeTradeActive,
  trailingEnabled,
  trailingStopPrice,
  tradeLog,
  onAddLogEntry,
  onChange,
  onComplete,
  workflowMode = false,
  compact = false,
}: TradeManagementPanelProps) {
  const [logNote, setLogNote] = useState("");

  // Fetch real market data for the selected symbol and timeframe
  const { data } = useMarketDataSubscription(symbol, timeframe, "yahoo");

  // Get current price from actual market data
  const currentPrice = useMemo(() => {
    if (data.length === 0) return entryPrice; // Fallback to entry price if no data
    return data[data.length - 1].close;
  }, [data, entryPrice]);

  // Stabilize callbacks to prevent infinite re-renders
  const stableOnChange = useCallbackRef(onChange);
  const stableOnAddLogEntry = useCallbackRef(onAddLogEntry);

  const isBuy = tradeDirection === "GO_LONG";
  const riskPerUnit = Math.abs(entryPrice - stopLoss);

  // Update P&L when price changes
  useEffect(() => {
    if (tradeStatus === "closed" || tradeStatus === "pending") return;

    const pnlPerUnit = isBuy ? currentPrice - entryPrice : entryPrice - currentPrice;
    const totalPnL = pnlPerUnit * positionSize;
    stableOnChange({ currentPnL: totalPnL });

    // Check for breakeven opportunity
    if (!freeTradeActive && Math.abs(pnlPerUnit) >= riskPerUnit) {
      // Could trigger breakeven alert here
    }

    // Check for stop hit
    if ((isBuy && currentPrice <= stopLoss) || (!isBuy && currentPrice >= stopLoss)) {
      stableOnChange({ tradeStatus: "closed" });
      stableOnAddLogEntry({
        action: "exit",
        price: currentPrice,
        note: "Stop loss hit",
      });
    }

    // Check for target hit
    for (let i = 0; i < targets.length; i++) {
      if ((isBuy && currentPrice >= targets[i]) || (!isBuy && currentPrice <= targets[i])) {
        stableOnAddLogEntry({
          action: "target_hit",
          price: targets[i],
          note: `Target ${i + 1} reached`,
        });
        break;
      }
    }
  }, [currentPrice, entryPrice, isBuy, positionSize, stopLoss, targets, freeTradeActive, riskPerUnit, stableOnChange, stableOnAddLogEntry, tradeStatus]);

  // Activate trade
  const activateTrade = useCallback(() => {
    stableOnChange({ tradeStatus: "active" });
    stableOnAddLogEntry({
      action: "entry",
      price: entryPrice,
      note: `Entered ${isBuy ? "LONG" : "SHORT"} position`,
    });
  }, [entryPrice, isBuy, stableOnChange, stableOnAddLogEntry]);

  // Move stop to breakeven
  const moveToBreakeven = useCallback(() => {
    stableOnChange({
      freeTradeActive: true,
      tradeStatus: "at_breakeven",
    });
    stableOnAddLogEntry({
      action: "stop_moved",
      price: entryPrice,
      note: "Stop moved to breakeven - FREE TRADE",
    });
  }, [entryPrice, stableOnChange, stableOnAddLogEntry]);

  // Enable trailing stop
  const enableTrailing = useCallback(() => {
    const trailPrice = isBuy ? currentPrice - riskPerUnit * 0.5 : currentPrice + riskPerUnit * 0.5;
    stableOnChange({
      trailingEnabled: true,
      trailingStopPrice: trailPrice,
      tradeStatus: "trailing",
    });
    stableOnAddLogEntry({
      action: "stop_moved",
      price: trailPrice,
      note: "Trailing stop enabled",
    });
  }, [currentPrice, isBuy, riskPerUnit, stableOnChange, stableOnAddLogEntry]);

  // Close trade
  const closeTrade = useCallback(() => {
    stableOnChange({ tradeStatus: "closed" });
    stableOnAddLogEntry({
      action: "exit",
      price: currentPrice,
      note: logNote || "Manual exit",
    });
    setLogNote("");
  }, [currentPrice, logNote, stableOnChange, stableOnAddLogEntry]);

  // Add custom log note
  const addNote = useCallback(() => {
    if (!logNote.trim()) return;
    stableOnAddLogEntry({
      action: "stop_moved",
      price: currentPrice,
      note: logNote,
    });
    setLogNote("");
  }, [currentPrice, logNote, stableOnAddLogEntry]);

  const statusConfig = STATUS_CONFIG[tradeStatus];
  const pnlPercent = entryPrice > 0 ? (currentPnL / (entryPrice * positionSize)) * 100 : 0;
  const rMultiple = riskPerUnit > 0 ? currentPnL / (riskPerUnit * positionSize) : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Badge className={cn(statusConfig.bgColor)} style={{ color: statusConfig.color }}>
          {statusConfig.label}
        </Badge>
        <span className={cn(
          "font-mono text-sm",
          currentPnL >= 0 ? "text-green-400" : "text-red-400"
        )}>
          {currentPnL >= 0 ? "+" : ""}{currentPnL.toFixed(2)}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live P&L Panel */}
      <div className={cn(
        "rounded-lg border-2 p-6",
        currentPnL >= 0 ? "border-green-500/50 bg-green-500/10" : "border-red-500/50 bg-red-500/10"
      )}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-muted-foreground">Current Position</div>
            <div className="text-lg font-medium">
              {positionSize} units {isBuy ? "LONG" : "SHORT"} {symbol}
            </div>
          </div>
          <Badge className={cn(statusConfig.bgColor)} style={{ color: statusConfig.color }}>
            {statusConfig.label}
          </Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground">Current Price</div>
            <div className="text-xl font-mono font-bold">{currentPrice.toFixed(2)}</div>
          </div>
          <div className="p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground">Unrealized P&L</div>
            <div className={cn(
              "text-xl font-mono font-bold",
              currentPnL >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {currentPnL >= 0 ? "+" : ""}{currentPnL.toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground">P&L %</div>
            <div className={cn(
              "text-xl font-mono font-bold",
              pnlPercent >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-background/50">
            <div className="text-xs text-muted-foreground">R-Multiple</div>
            <div className={cn(
              "text-xl font-mono font-bold",
              rMultiple >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {rMultiple >= 0 ? "+" : ""}{rMultiple.toFixed(2)}R
            </div>
          </div>
        </div>
      </div>

      {/* Trade Controls */}
      {tradeStatus !== "closed" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {tradeStatus === "pending" && (
            <Button onClick={activateTrade} className="col-span-full bg-blue-600 hover:bg-blue-700">
              Activate Trade
            </Button>
          )}

          {tradeStatus === "active" && !freeTradeActive && (
            <Button onClick={moveToBreakeven} variant="outline" className="text-green-400 border-green-500">
              Move to Breakeven
            </Button>
          )}

          {(tradeStatus === "active" || tradeStatus === "at_breakeven") && !trailingEnabled && (
            <Button onClick={enableTrailing} variant="outline" className="text-purple-400 border-purple-500">
              Enable Trailing Stop
            </Button>
          )}

          {tradeStatus !== "pending" && (
            <Button onClick={closeTrade} variant="outline" className="text-red-400 border-red-500">
              Close Position
            </Button>
          )}
        </div>
      )}

      {/* Free Trade Alert */}
      {freeTradeActive && (
        <div className="rounded-lg border border-green-500 bg-green-500/10 p-4 flex items-center gap-3">
          <div className="text-3xl">🆓</div>
          <div>
            <div className="font-semibold text-green-400">FREE TRADE ACTIVE</div>
            <div className="text-sm text-muted-foreground">
              Stop moved to breakeven. You cannot lose on this trade!
            </div>
          </div>
        </div>
      )}

      {/* Trailing Stop Settings */}
      {trailingEnabled && (
        <div className="rounded-lg border border-purple-500 bg-purple-500/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-purple-400">Trailing Stop Active</div>
            <Switch
              checked={trailingEnabled}
              onCheckedChange={(checked) => stableOnChange({ trailingEnabled: checked })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Current Trail Price</div>
              <div className="font-mono">{trailingStopPrice?.toFixed(2) || "N/A"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Distance</div>
              <div className="font-mono">
                {trailingStopPrice
                  ? Math.abs(currentPrice - trailingStopPrice).toFixed(2)
                  : "N/A"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price Levels */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Price Levels</Label>
        <div className="grid gap-2">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border">
            <span className="text-sm">Entry</span>
            <span className="font-mono">{entryPrice.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/50 bg-red-500/5">
            <span className="text-sm text-red-400">Stop Loss</span>
            <span className="font-mono text-red-400">
              {freeTradeActive ? entryPrice.toFixed(2) : stopLoss.toFixed(2)}
            </span>
          </div>
          {targets.map((target, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3 rounded-lg border border-green-500/50 bg-green-500/5"
            >
              <span className="text-sm text-green-400">Target {idx + 1}</span>
              <span className="font-mono text-green-400">{target.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trade Log */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Trade Log</Label>

        {/* Add note */}
        <div className="flex gap-2">
          <Input
            placeholder="Add a note..."
            value={logNote}
            onChange={(e) => setLogNote(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" onClick={addNote} disabled={!logNote.trim()}>
            Add Note
          </Button>
        </div>

        {/* Log entries */}
        <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-auto">
          {tradeLog.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No log entries yet
            </div>
          ) : (
            tradeLog.slice().reverse().map((entry, idx) => (
              <div key={idx} className="p-3 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs">
                    {entry.action.replace("_", " ").toUpperCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{entry.note}</span>
                  <span className="font-mono">{entry.price.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Workflow Complete */}
      {tradeStatus === "closed" && workflowMode && (
        <div className="rounded-lg border border-border bg-muted/30 p-6 text-center">
          <div className="text-2xl mb-2">🏁</div>
          <div className="font-semibold mb-1">Trade Completed</div>
          <div className="text-sm text-muted-foreground mb-4">
            Final P&L: <span className={cn(
              "font-mono font-medium",
              currentPnL >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {currentPnL >= 0 ? "+" : ""}{currentPnL.toFixed(2)}
            </span>
          </div>
          {onComplete && (
            <Button onClick={onComplete}>
              Start New Trade
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
