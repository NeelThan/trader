"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NewTradeButton } from "@/components/layout";
import {
  useJournal,
  formatCurrency,
  formatRMultiple,
  formatPercentage,
  formatDate,
  workflowToJournalEntry,
  isWorkflowImported,
} from "@/hooks/use-journal";
import { useWorkflowManager, type StoredWorkflow } from "@/hooks/use-workflow-manager";
import type { JournalEntryData, JournalEntryRequest, TradeDirection } from "@/lib/api";
import { MARKET_CONFIG, type MarketSymbol } from "@/lib/chart-constants";

const SYMBOLS = Object.keys(MARKET_CONFIG) as MarketSymbol[];

// Analytics Card Component
function AnalyticsCard({
  label,
  value,
  subValue,
  color,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  color?: "green" | "red" | "blue" | "amber" | "default";
}) {
  const colorClasses = {
    green: "text-green-400",
    red: "text-red-400",
    blue: "text-blue-400",
    amber: "text-amber-400",
    default: "text-foreground",
  };

  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`text-2xl font-bold ${colorClasses[color ?? "default"]}`}>
          {value}
        </div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {subValue && (
          <div className="text-xs text-muted-foreground mt-1">{subValue}</div>
        )}
      </CardContent>
    </Card>
  );
}

// Entry Row Component
function EntryRow({
  entry,
  onDelete,
}: {
  entry: JournalEntryData;
  onDelete: (id: string) => void;
}) {
  const isWin = entry.outcome === "win";
  const isLoss = entry.outcome === "loss";

  return (
    <tr className="border-b border-border hover:bg-muted/50">
      <td className="p-3">
        <div className="font-medium">{entry.symbol}</div>
        <div className="text-xs text-muted-foreground">
          {entry.timeframe ?? "N/A"}
        </div>
      </td>
      <td className="p-3">
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            entry.direction === "long"
              ? "bg-green-500/20 text-green-400"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {entry.direction.toUpperCase()}
        </span>
      </td>
      <td className="p-3 text-right font-mono text-sm">
        {entry.entry_price.toLocaleString()}
      </td>
      <td className="p-3 text-right font-mono text-sm">
        {entry.exit_price.toLocaleString()}
      </td>
      <td className={`p-3 text-right font-mono font-medium ${isWin ? "text-green-400" : isLoss ? "text-red-400" : "text-muted-foreground"}`}>
        {formatCurrency(entry.pnl)}
      </td>
      <td className={`p-3 text-right font-mono ${isWin ? "text-green-400" : isLoss ? "text-red-400" : "text-muted-foreground"}`}>
        {formatRMultiple(entry.r_multiple)}
      </td>
      <td className="p-3">
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            isWin
              ? "bg-green-500/20 text-green-400"
              : isLoss
              ? "bg-red-500/20 text-red-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {entry.outcome.toUpperCase()}
        </span>
      </td>
      <td className="p-3 text-sm text-muted-foreground">
        {formatDate(entry.exit_time)}
      </td>
      <td className="p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(entry.id)}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
        >
          Delete
        </Button>
      </td>
    </tr>
  );
}

// Workflow Import Card Component
function WorkflowImportCard({
  workflow,
  onImport,
  isImported,
}: {
  workflow: StoredWorkflow;
  onImport: (workflow: StoredWorkflow, exitPrice?: number) => void;
  isImported: boolean;
}) {
  const [exitPrice, setExitPrice] = useState("");
  const [showInput, setShowInput] = useState(false);

  const state = workflow.state;
  const needsExitPrice = state.tradeStatus === "closed" && (!state.tradeLog.some(e => e.action === "exit" || e.action === "target_hit"));
  const isBuy = state.tradeDirection === "GO_LONG";

  const handleImport = () => {
    if (needsExitPrice && !showInput) {
      setShowInput(true);
      return;
    }

    const exit = needsExitPrice ? parseFloat(exitPrice) : undefined;
    if (needsExitPrice && (!exit || exit <= 0)) {
      return;
    }

    onImport(workflow, exit);
  };

  if (isImported) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{workflow.name}</div>
              <div className="text-xs text-green-400">Already imported</div>
            </div>
            <div className="text-green-400">✓</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">{workflow.name}</div>
            <div className="text-xs text-muted-foreground">
              {state.symbol} • {isBuy ? "LONG" : "SHORT"} • Entry: ${state.entryPrice.toFixed(2)}
            </div>
          </div>
          <span className={`px-2 py-1 rounded text-xs ${
            isBuy ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          }`}>
            {isBuy ? "LONG" : "SHORT"}
          </span>
        </div>

        {showInput && needsExitPrice && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Exit Price (required)
            </label>
            <input
              type="number"
              step="0.01"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              placeholder="Enter exit price"
              className="w-full p-2 rounded bg-background border border-border text-foreground text-sm"
              autoFocus
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleImport}
            disabled={showInput && needsExitPrice && (!exitPrice || parseFloat(exitPrice) <= 0)}
            className="flex-1"
          >
            {needsExitPrice && !showInput ? "Enter Exit Price" : "Import to Journal"}
          </Button>
          {showInput && (
            <Button size="sm" variant="outline" onClick={() => setShowInput(false)}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Add Entry Form Component
function AddEntryForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (entry: JournalEntryRequest) => void;
  onCancel: () => void;
}) {
  const [symbol, setSymbol] = useState<MarketSymbol>("DJI");
  const [direction, setDirection] = useState<TradeDirection>("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [positionSize, setPositionSize] = useState("");
  const [timeframe, setTimeframe] = useState("1D");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const now = new Date().toISOString();

    onSubmit({
      symbol,
      direction,
      entry_price: parseFloat(entryPrice),
      exit_price: parseFloat(exitPrice),
      stop_loss: parseFloat(stopLoss),
      position_size: parseFloat(positionSize),
      entry_time: now,
      exit_time: now,
      timeframe,
      notes: notes || undefined,
    });
  };

  const isValid =
    entryPrice &&
    exitPrice &&
    stopLoss &&
    positionSize &&
    parseFloat(entryPrice) > 0 &&
    parseFloat(exitPrice) > 0 &&
    parseFloat(stopLoss) > 0 &&
    parseFloat(positionSize) > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Symbol */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1">
            Symbol
          </label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value as MarketSymbol)}
            className="w-full p-2 rounded bg-background border border-border text-foreground"
          >
            {SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Direction */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1">
            Direction
          </label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as TradeDirection)}
            className="w-full p-2 rounded bg-background border border-border text-foreground"
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
        </div>

        {/* Timeframe */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1">
            Timeframe
          </label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="w-full p-2 rounded bg-background border border-border text-foreground"
          >
            <option value="1m">1m</option>
            <option value="15m">15m</option>
            <option value="1H">1H</option>
            <option value="4H">4H</option>
            <option value="1D">1D</option>
            <option value="1W">1W</option>
            <option value="1M">1M</option>
          </select>
        </div>

        {/* Position Size */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1">
            Position Size
          </label>
          <input
            type="number"
            step="0.01"
            value={positionSize}
            onChange={(e) => setPositionSize(e.target.value)}
            placeholder="Units"
            className="w-full p-2 rounded bg-background border border-border text-foreground"
          />
        </div>

        {/* Entry Price */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1">
            Entry Price
          </label>
          <input
            type="number"
            step="0.01"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            placeholder="Entry"
            className="w-full p-2 rounded bg-background border border-border text-foreground"
          />
        </div>

        {/* Exit Price */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1">
            Exit Price
          </label>
          <input
            type="number"
            step="0.01"
            value={exitPrice}
            onChange={(e) => setExitPrice(e.target.value)}
            placeholder="Exit"
            className="w-full p-2 rounded bg-background border border-border text-foreground"
          />
        </div>

        {/* Stop Loss */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1">
            Stop Loss
          </label>
          <input
            type="number"
            step="0.01"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="Stop"
            className="w-full p-2 rounded bg-background border border-border text-foreground"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="text-sm text-muted-foreground block mb-1">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Trade notes..."
          rows={2}
          className="w-full p-2 rounded bg-background border border-border text-foreground resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid}>
          Add Entry
        </Button>
      </div>
    </form>
  );
}

export default function JournalPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showAddForm, setShowAddForm] = useState(false);
  const [symbolFilter, setSymbolFilter] = useState<string>("");
  const [showWorkflowImport, setShowWorkflowImport] = useState(false);

  const {
    entries,
    analytics,
    isLoading,
    error,
    isBackendAvailable,
    addEntry,
    removeEntry,
    refresh,
  } = useJournal(symbolFilter || undefined);

  // Get workflows for import
  const { workflows, getWorkflow } = useWorkflowManager();

  // Filter to importable workflows (completed with entry price)
  const importableWorkflows = workflows
    .filter(w => w.status === "completed" && w.entryPrice && w.entryPrice > 0)
    .map(summary => getWorkflow(summary.id))
    .filter((w): w is StoredWorkflow => w !== null);

  const handleAddEntry = async (entry: JournalEntryRequest) => {
    const result = await addEntry(entry);
    if (result) {
      setShowAddForm(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      await removeEntry(id);
    }
  };

  const handleWorkflowImport = async (workflow: StoredWorkflow, exitPriceOverride?: number) => {
    const journalEntry = workflowToJournalEntry(workflow, exitPriceOverride);
    if (!journalEntry) {
      console.error("Failed to convert workflow to journal entry");
      return;
    }

    const result = await addEntry(journalEntry);
    if (result) {
      setShowWorkflowImport(false);
    }
  };

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Trade Journal</h1>
              <p className="text-muted-foreground">
                Track and analyze your trading performance
              </p>
            </div>
            <div className="flex items-center gap-2">
              <NewTradeButton />
              <ThemeToggle
                theme={theme}
                onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </div>
          </div>

          {/* Backend Error */}
          {!isBackendAvailable && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="font-medium">Backend Offline</span>
                <span className="text-orange-400/80 ml-2">
                  Start the backend server to access journal features.
                </span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && isBackendAvailable && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={refresh}>
                Retry
              </Button>
            </div>
          )}

          {/* Analytics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <AnalyticsCard
              label="Total Trades"
              value={analytics.total_trades}
              color="blue"
            />
            <AnalyticsCard
              label="Win Rate"
              value={formatPercentage(analytics.win_rate)}
              subValue={`${analytics.wins}W / ${analytics.losses}L`}
              color={analytics.win_rate >= 50 ? "green" : "red"}
            />
            <AnalyticsCard
              label="Total P&L"
              value={formatCurrency(analytics.total_pnl)}
              color={analytics.total_pnl >= 0 ? "green" : "red"}
            />
            <AnalyticsCard
              label="Avg R-Multiple"
              value={formatRMultiple(analytics.average_r)}
              color={analytics.average_r >= 0 ? "green" : "red"}
            />
            <AnalyticsCard
              label="Profit Factor"
              value={analytics.profit_factor >= 999999 ? "N/A" : analytics.profit_factor.toFixed(2)}
              color={analytics.profit_factor >= 1.5 ? "green" : analytics.profit_factor >= 1 ? "amber" : "red"}
            />
          </div>

          {/* Win/Loss Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Largest Win</div>
                <div className="text-xl font-bold text-green-400">
                  {formatCurrency(analytics.largest_win)}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-500/5 border-red-500/20">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Largest Loss</div>
                <div className="text-xl font-bold text-red-400">
                  {formatCurrency(analytics.largest_loss)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Wins</div>
                <div className="text-xl font-bold text-green-400">{analytics.wins}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground mb-1">Losses</div>
                <div className="text-xl font-bold text-red-400">{analytics.losses}</div>
              </CardContent>
            </Card>
          </div>

          {/* Workflow Import Section */}
          {importableWorkflows.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  Import from Workflows
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowWorkflowImport(!showWorkflowImport)}
                >
                  {showWorkflowImport ? "Hide" : `Show (${importableWorkflows.length})`}
                </Button>
              </CardHeader>
              {showWorkflowImport && (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {importableWorkflows.map((workflow) => (
                      <WorkflowImportCard
                        key={workflow.id}
                        workflow={workflow}
                        onImport={handleWorkflowImport}
                        isImported={isWorkflowImported(workflow.id, entries)}
                      />
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Add Entry Section */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                {showAddForm ? "Add Trade Entry" : "Trade Entries"}
              </CardTitle>
              <div className="flex items-center gap-2">
                {!showAddForm && (
                  <>
                    <select
                      value={symbolFilter}
                      onChange={(e) => setSymbolFilter(e.target.value)}
                      className="p-2 rounded bg-background border border-border text-foreground text-sm"
                    >
                      <option value="">All Symbols</option>
                      {SYMBOLS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <Button
                      onClick={() => setShowAddForm(true)}
                      disabled={!isBackendAvailable}
                    >
                      Add Entry
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {showAddForm ? (
                <AddEntryForm
                  onSubmit={handleAddEntry}
                  onCancel={() => setShowAddForm(false)}
                />
              ) : (
                <>
                  {isLoading && entries.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Loading entries...
                    </div>
                  ) : entries.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <div className="text-4xl mb-2">📔</div>
                      <div>No trade entries yet.</div>
                      <div className="text-sm mt-1">
                        Add your first trade to start tracking performance.
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border text-left text-sm text-muted-foreground">
                            <th className="p-3">Symbol</th>
                            <th className="p-3">Direction</th>
                            <th className="p-3 text-right">Entry</th>
                            <th className="p-3 text-right">Exit</th>
                            <th className="p-3 text-right">P&L</th>
                            <th className="p-3 text-right">R</th>
                            <th className="p-3">Outcome</th>
                            <th className="p-3">Date</th>
                            <th className="p-3"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {entries.map((entry) => (
                            <EntryRow
                              key={entry.id}
                              entry={entry}
                              onDelete={handleDeleteEntry}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Info */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-blue-400">Tip:</span>{" "}
              Track your trades consistently to identify patterns in your trading.
              Focus on R-multiples rather than absolute P&L for better risk management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
