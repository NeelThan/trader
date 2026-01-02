/**
 * Manage Panel Component
 *
 * Active trade management interface.
 * Tracks P&L, supports breakeven/trailing stop, and logs trade actions.
 */

"use client";

import { useState } from "react";
import { Target, Shield, TrendingUp, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTradeManagement } from "@/hooks/use-trade-management";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { SizingData } from "@/hooks/use-trade-execution";

export type ManagePanelProps = {
  opportunity: TradeOpportunity;
  sizing: SizingData;
  onClose: () => void;
};

/**
 * Format price to 2 decimal places
 */
function formatPrice(price: number): string {
  return price.toFixed(2);
}

/**
 * Format currency amount
 */
function formatCurrency(amount: number): string {
  const sign = amount >= 0 ? "" : "-";
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

/**
 * Get status badge styling
 */
function getStatusStyle(status: string): string {
  switch (status) {
    case "pending":
      return "bg-zinc-500";
    case "active":
      return "bg-blue-500";
    case "at_breakeven":
      return "bg-green-500";
    case "trailing":
      return "bg-purple-500";
    case "closed":
      return "bg-zinc-700";
    default:
      return "bg-zinc-500";
  }
}

/**
 * Format status for display
 */
function formatStatus(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "active":
      return "Active";
    case "at_breakeven":
      return "At Breakeven";
    case "trailing":
      return "Trailing";
    case "closed":
      return "Closed";
    default:
      return status;
  }
}

export function ManagePanel({ opportunity, sizing, onClose }: ManagePanelProps) {
  const isLong = opportunity.direction === "long";
  const [noteInput, setNoteInput] = useState("");
  const [priceInput, setPriceInput] = useState(sizing.entryPrice.toString());

  const {
    status,
    currentPrice,
    currentPnL,
    rMultiple,
    freeTradeActive,
    trailingEnabled,
    trailingStopPrice,
    effectiveStopPrice,
    tradeLog,
    activateTrade,
    updateCurrentPrice,
    moveToBreakeven,
    enableTrailingStop,
    closeTrade,
    addNote,
  } = useTradeManagement({ opportunity, sizing });

  const isPending = status === "pending";
  const isClosed = status === "closed";
  const canManage = !isPending && !isClosed;

  const handlePriceChange = (value: string) => {
    setPriceInput(value);
  };

  const handlePriceBlur = () => {
    const price = parseFloat(priceInput);
    if (!isNaN(price) && price > 0) {
      updateCurrentPrice(price);
    }
  };

  const handleAddNote = () => {
    if (noteInput.trim()) {
      addNote(noteInput);
      setNoteInput("");
    }
  };

  const handleCloseTrade = () => {
    closeTrade("Manually closed");
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Manage Trade</h2>
        <Badge className={getStatusStyle(status)}>{formatStatus(status)}</Badge>
      </div>

      {/* Trade Info */}
      <div className="flex items-center gap-2">
        <span className="font-semibold">{opportunity.symbol}</span>
        <span
          className={cn(
            "font-semibold",
            isLong ? "text-green-400" : "text-red-400"
          )}
        >
          {opportunity.direction.toUpperCase()}
        </span>
        {freeTradeActive && (
          <Badge variant="outline" className="text-green-400 border-green-400">
            FREE TRADE
          </Badge>
        )}
      </div>

      {/* P&L Display */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">P&L</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-2">
            <span
              className={cn(
                "text-2xl font-bold",
                currentPnL >= 0 ? "text-green-400" : "text-red-400"
              )}
            >
              {formatCurrency(currentPnL)}
            </span>
            <span className="text-sm text-muted-foreground">
              {rMultiple.toFixed(2)}R
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Price Display */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Prices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Price</span>
            <span className="font-medium">{formatPrice(currentPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entry</span>
            <span className="font-medium">{formatPrice(sizing.entryPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stop</span>
            <span className="font-medium text-red-400">
              {formatPrice(effectiveStopPrice)}
            </span>
          </div>
          {trailingEnabled && trailingStopPrice !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trail:</span>
              <span className="font-medium text-purple-400">
                {formatPrice(trailingStopPrice)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Price Simulation (only when active) */}
      {!isPending && (
        <div className="space-y-2">
          <Label htmlFor="price-input">Simulate Price</Label>
          <Input
            id="price-input"
            type="number"
            value={priceInput}
            onChange={(e) => handlePriceChange(e.target.value)}
            onBlur={handlePriceBlur}
          />
        </div>
      )}

      {/* Targets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1">
            <Target className="h-4 w-4" />
            Targets
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {sizing.targets.map((target, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target {index + 1}</span>
              <span className="font-medium text-green-400">
                {formatPrice(target)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {isPending && (
          <Button onClick={activateTrade} className="col-span-2">
            Start Trade
          </Button>
        )}
        <Button
          variant="outline"
          onClick={moveToBreakeven}
          disabled={isPending || isClosed || freeTradeActive}
        >
          <Shield className="mr-1 h-4 w-4" />
          Breakeven
        </Button>
        <Button
          variant="outline"
          onClick={enableTrailingStop}
          disabled={isPending || isClosed || trailingEnabled}
        >
          <TrendingUp className="mr-1 h-4 w-4" />
          Trailing
        </Button>
        <Button
          variant="destructive"
          onClick={handleCloseTrade}
          disabled={isPending || isClosed}
          className="col-span-2"
        >
          <X className="mr-1 h-4 w-4" />
          Close Trade
        </Button>
      </div>

      {/* Add Note */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Add Note</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Add a note..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
          />
          <Button size="sm" onClick={handleAddNote}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </CardContent>
      </Card>

      {/* Trade Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Trade Log</CardTitle>
        </CardHeader>
        <CardContent>
          {tradeLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {tradeLog.map((entry, index) => (
                <div
                  key={index}
                  className="text-sm border-l-2 border-muted pl-2 py-1"
                >
                  <div className="font-medium">{entry.note}</div>
                  <div className="text-xs text-muted-foreground">
                    @ {formatPrice(entry.price)} -{" "}
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Finish Button (only when closed) */}
      {isClosed && (
        <Button onClick={onClose} className="w-full">
          Finish
        </Button>
      )}
    </div>
  );
}
