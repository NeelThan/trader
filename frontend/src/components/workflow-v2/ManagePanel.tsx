/**
 * Manage Panel Component
 *
 * Active trade management interface.
 * Tracks P&L, supports breakeven/trailing stop, and logs trade actions.
 */

"use client";

import { useState, useCallback } from "react";
import { Target, Shield, TrendingUp, X, Plus, CheckCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TradeLog } from "@/components/ui/trade-log";
import { cn } from "@/lib/utils";
import { formatPriceSimple } from "@/lib/format-utils";
import { withRetry } from "@/lib/retry";
import { useTradeManagement } from "@/hooks/use-trade-management";
import { updateJournalEntry } from "@/lib/api";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { SizingData } from "@/hooks/use-trade-execution";

export type ManagePanelProps = {
  opportunity: TradeOpportunity;
  sizing: SizingData;
  journalEntryId: string | null;
  onClose: () => void;
};

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

export function ManagePanel({ opportunity, sizing, journalEntryId, onClose }: ManagePanelProps) {
  const isLong = opportunity.direction === "long";
  const [noteInput, setNoteInput] = useState("");
  const [priceInput, setPriceInput] = useState(sizing.entryPrice.toString());
  const [journalUpdateStatus, setJournalUpdateStatus] = useState<"idle" | "updating" | "success" | "error">("idle");

  const {
    status,
    currentPrice,
    currentPnL,
    rMultiple,
    freeTradeActive,
    trailingEnabled,
    trailingDistanceR,
    trailingStopPrice,
    effectiveStopPrice,
    tradeLog,
    activateTrade,
    updateCurrentPrice,
    moveToBreakeven,
    enableTrailingStop,
    setTrailingDistanceR,
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

  // Update the journal entry with exit data when trade is closed (with retry)
  const updateJournalOnClose = useCallback(
    async (exitPrice: number, exitReason: string) => {
      if (!journalEntryId) {
        console.warn("No journal entry ID - cannot update journal");
        return;
      }

      setJournalUpdateStatus("updating");
      try {
        // Compile notes from trade log
        const tradeNotes = tradeLog
          .map((entry) => `[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.note}`)
          .join("\n");

        // Use retry logic for network resilience
        await withRetry(() =>
          updateJournalEntry(journalEntryId, {
            exit_price: exitPrice,
            exit_time: new Date().toISOString(),
            exit_reason: exitReason,
            notes: tradeNotes || undefined,
          })
        );
        setJournalUpdateStatus("success");
      } catch (error) {
        console.error("Failed to update journal entry after retries:", error);
        setJournalUpdateStatus("error");
      }
    },
    [journalEntryId, tradeLog]
  );

  const handleCloseTrade = useCallback(() => {
    const exitReason = "Manually closed";
    closeTrade(exitReason);
    // Update the journal with the exit data
    void updateJournalOnClose(currentPrice, exitReason);
  }, [closeTrade, currentPrice, updateJournalOnClose]);

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
            <span className="font-medium">{formatPriceSimple(currentPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entry</span>
            <span className="font-medium">{formatPriceSimple(sizing.entryPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stop</span>
            <span className="font-medium text-red-400">
              {formatPriceSimple(effectiveStopPrice)}
            </span>
          </div>
          {trailingEnabled && trailingStopPrice !== null && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trail:</span>
              <span className="font-medium text-purple-400">
                {formatPriceSimple(trailingStopPrice)}
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
                {formatPriceSimple(target)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Trailing Stop Configuration */}
      {canManage && !trailingEnabled && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              <Settings className="h-4 w-4" />
              Trailing Stop Distance
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Input
              type="number"
              value={trailingDistanceR}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value > 0 && value <= 2) {
                  setTrailingDistanceR(value);
                }
              }}
              min={0.1}
              max={2}
              step={0.1}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">× Risk (R)</span>
            <div className="flex-1 text-right text-xs text-muted-foreground">
              Stop trails {trailingDistanceR}R behind price
            </div>
          </CardContent>
        </Card>
      )}

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
          Trailing ({trailingDistanceR}R)
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
      <TradeLog entries={tradeLog} maxHeight="10rem" />

      {/* Journal Status and Finish Button (only when closed) */}
      {isClosed && (
        <div className="space-y-2">
          {/* Journal save status */}
          {journalEntryId && (
            <div className="flex items-center gap-2 text-sm">
              {journalUpdateStatus === "updating" && (
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  Saving to journal...
                </Badge>
              )}
              {journalUpdateStatus === "success" && (
                <Badge variant="outline" className="text-green-400 border-green-400">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Saved to journal
                </Badge>
              )}
              {journalUpdateStatus === "error" && (
                <Badge variant="outline" className="text-red-400 border-red-400">
                  Failed to save
                </Badge>
              )}
            </div>
          )}
          {!journalEntryId && (
            <p className="text-xs text-muted-foreground">
              No journal entry linked (paper trading only)
            </p>
          )}
          <Button onClick={onClose} className="w-full">
            Finish
          </Button>
        </div>
      )}
    </div>
  );
}
