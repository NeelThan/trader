/**
 * BacktestPanel - Configuration form and results display for backtest replay.
 * Split into sub-components for single responsibility.
 */

import { useState } from "react";
import { Play, Loader2, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { MarketSymbol } from "@/types/market";
import type {
  BacktestConfig,
  BacktestResult,
  BacktestTrade,
  BacktestMetrics,
  BacktestEquityPoint,
} from "@/types/backtest";
import { DEFAULT_BACKTEST_CONFIG } from "@/types/backtest";

type BacktestPanelProps = {
  symbol: MarketSymbol;
  result: BacktestResult | null;
  isLoading: boolean;
  error: string | null;
  onRunBacktest: (config: BacktestConfig) => void;
  onSelectTrade: (index: number) => void;
  selectedTradeIndex: number | null;
};

function sixMonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// --- Sub-components ---

function BacktestConfigForm({
  symbol,
  isLoading,
  onRunBacktest,
}: {
  symbol: MarketSymbol;
  isLoading: boolean;
  onRunBacktest: (config: BacktestConfig) => void;
}) {
  const [startDate, setStartDate] = useState(sixMonthsAgo);
  const [endDate, setEndDate] = useState(today);

  const handleRun = () => {
    onRunBacktest({
      ...DEFAULT_BACKTEST_CONFIG,
      symbol,
      start_date: startDate,
      end_date: endDate,
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="backtest-start">Start Date</Label>
          <input
            id="backtest-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="backtest-end">End Date</Label>
          <input
            id="backtest-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          />
        </div>
      </div>
      <Button
        onClick={handleRun}
        disabled={isLoading}
        className="w-full"
        size="sm"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Run Backtest
          </>
        )}
      </Button>
    </div>
  );
}

function BacktestMetricsCard({ metrics }: { metrics: BacktestMetrics }) {
  return (
    <div className="rounded-lg border border-border p-3 space-y-2">
      <h4 className="text-sm font-medium">Results</h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <span className="text-muted-foreground">Trades</span>
        <span className="text-right font-mono">{metrics.total_trades}</span>

        <span className="text-muted-foreground">Win Rate</span>
        <span className="text-right font-mono">
          {(metrics.win_rate * 100).toFixed(1)}%
        </span>

        <span className="text-muted-foreground">Profit Factor</span>
        <span className="text-right font-mono">
          {metrics.profit_factor.toFixed(2)}
        </span>

        <span className="text-muted-foreground">Total PnL</span>
        <span
          className={`text-right font-mono ${metrics.total_pnl >= 0 ? "text-green-500" : "text-red-500"}`}
        >
          {metrics.total_pnl >= 0 ? "+" : ""}
          {metrics.total_pnl.toFixed(0)}
        </span>

        <span className="text-muted-foreground">Avg R</span>
        <span className="text-right font-mono">
          {metrics.average_r.toFixed(2)}R
        </span>

        <span className="text-muted-foreground">Sharpe</span>
        <span className="text-right font-mono">
          {metrics.sharpe_ratio.toFixed(2)}
        </span>

        <span className="text-muted-foreground">Max DD</span>
        <span className="text-right font-mono text-red-500">
          {(metrics.max_drawdown * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function BacktestEquityCurve({ curve }: { curve: BacktestEquityPoint[] }) {
  if (curve.length < 2) return null;

  const min = Math.min(...curve.map((p) => p.equity));
  const max = Math.max(...curve.map((p) => p.equity));
  const range = max - min || 1;
  const height = 60;
  const width = 100;

  const points = curve
    .map((p, i) => {
      const x = (i / (curve.length - 1)) * width;
      const y = height - ((p.equity - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  const isPositive = curve[curve.length - 1].equity >= curve[0].equity;

  return (
    <div className="rounded-lg border border-border p-3">
      <h4 className="text-sm font-medium mb-2">Equity Curve</h4>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? "#22c55e" : "#ef4444"}
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

function BacktestTradeList({
  trades,
  selectedIndex,
  onSelectTrade,
}: {
  trades: BacktestTrade[];
  selectedIndex: number | null;
  onSelectTrade: (index: number) => void;
}) {
  return (
    <div className="space-y-1">
      <h4 className="text-sm font-medium">
        Trades ({trades.length})
      </h4>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {trades.map((trade, index) => {
          const isWin = trade.pnl > 0;
          const isSelected = selectedIndex === index;

          return (
            <button
              key={`${trade.entry_time}-${index}`}
              aria-label={`Trade ${index + 1}`}
              onClick={() => onSelectTrade(index)}
              className={`w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors
                ${isSelected ? "bg-accent border border-accent-foreground/20" : "hover:bg-accent/50"}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {trade.direction === "long" ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className="font-medium uppercase">
                    {trade.direction === "long" ? "LONG" : "SHORT"}
                  </span>
                  <span className="text-muted-foreground">
                    {trade.entry_time.slice(0, 10)}
                  </span>
                </div>
                <span
                  className={`font-mono ${isWin ? "text-green-500" : "text-red-500"}`}
                >
                  {trade.r_multiple >= 0 ? "+" : ""}
                  {trade.r_multiple.toFixed(1)}R
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- Main component ---

export function BacktestPanel({
  symbol,
  result,
  isLoading,
  error,
  onRunBacktest,
  onSelectTrade,
  selectedTradeIndex,
}: BacktestPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Backtest Replay</h3>
        <span className="text-xs text-muted-foreground">{symbol}</span>
      </div>

      <BacktestConfigForm
        symbol={symbol}
        isLoading={isLoading}
        onRunBacktest={onRunBacktest}
      />

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <>
          <BacktestMetricsCard metrics={result.metrics} />
          <BacktestEquityCurve curve={result.equity_curve} />
          <BacktestTradeList
            trades={result.trades}
            selectedIndex={selectedTradeIndex}
            onSelectTrade={onSelectTrade}
          />
          <p className="text-xs text-muted-foreground text-center">
            Completed in {result.execution_time_seconds.toFixed(1)}s
          </p>
        </>
      )}
    </div>
  );
}
