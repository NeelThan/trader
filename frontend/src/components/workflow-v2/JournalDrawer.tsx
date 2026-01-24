"use client";

/**
 * JournalDrawer - Full journal view with P&L charts and analytics
 *
 * Slides in from the right side, containing:
 * - Key metrics summary
 * - Equity curve chart
 * - Drawdown chart
 * - R-multiple distribution
 * - Performance by symbol/timeframe tables
 * - Trade history
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useJournal,
  useDetailedJournalAnalytics,
  formatCurrency,
  formatRMultiple,
  formatPercentage,
  formatDate,
} from "@/hooks/use-journal";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

type JournalDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function JournalDrawer({ isOpen, onClose }: JournalDrawerProps) {
  const { analytics, entries, isBackendAvailable } = useJournal();
  const { detailedAnalytics, refresh } = useDetailedJournalAnalytics(10);
  const [activeTab, setActiveTab] = useState("overview");

  // Prepare equity curve data
  const equityCurveData = detailedAnalytics.equity_curve.map((point) => ({
    date: point.date,
    pnl: point.cumulative_pnl,
    trades: point.trade_count,
  }));

  // Calculate drawdown data
  const drawdownData = calculateDrawdown(detailedAnalytics.equity_curve);

  // Prepare R-multiple distribution
  const rDistribution = prepareRDistribution(entries);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed right-0 top-0 bottom-0 w-full sm:w-[600px] lg:w-[800px]",
          "bg-background border-l border-border z-50",
          "overflow-y-auto transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Trade Journal</h2>
              <p className="text-sm text-muted-foreground">
                {analytics.total_trades} trades recorded
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={refresh}>
                Refresh
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <CloseIcon />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {!isBackendAvailable ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-orange-400">Backend offline</p>
              <p className="text-sm">Start the backend to view journal data</p>
            </div>
          ) : analytics.total_trades === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No trades recorded yet</p>
              <p className="text-sm">Complete trades to see analytics</p>
            </div>
          ) : (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard
                  label="Total P&L"
                  value={formatCurrency(analytics.total_pnl)}
                  color={analytics.total_pnl >= 0 ? "green" : "red"}
                />
                <MetricCard
                  label="Win Rate"
                  value={formatPercentage(analytics.win_rate)}
                  subValue={`${analytics.wins}W / ${analytics.losses}L`}
                  color={analytics.win_rate >= 50 ? "green" : "red"}
                />
                <MetricCard
                  label="Avg R"
                  value={formatRMultiple(analytics.average_r)}
                  color={analytics.average_r >= 0 ? "green" : "red"}
                />
                <MetricCard
                  label="Profit Factor"
                  value={
                    analytics.profit_factor >= 999999
                      ? "N/A"
                      : analytics.profit_factor.toFixed(2)
                  }
                  color={
                    analytics.profit_factor >= 1.5
                      ? "green"
                      : analytics.profit_factor >= 1
                        ? "amber"
                        : "red"
                  }
                />
              </div>

              {/* Streaks */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Current:</span>
                  <Badge
                    variant={
                      detailedAnalytics.streaks.current > 0
                        ? "default"
                        : "destructive"
                    }
                    className={cn(
                      detailedAnalytics.streaks.current > 0
                        ? "bg-green-500/20 text-green-400"
                        : detailedAnalytics.streaks.current < 0
                          ? "bg-red-500/20 text-red-400"
                          : ""
                    )}
                  >
                    {detailedAnalytics.streaks.current > 0 ? "+" : ""}
                    {detailedAnalytics.streaks.current}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Best Win:</span>
                  <span className="text-green-400">
                    {detailedAnalytics.streaks.best_win_streak}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Worst Loss:</span>
                  <span className="text-red-400">
                    {detailedAnalytics.streaks.worst_loss_streak}
                  </span>
                </div>
              </div>

              {/* Tabs for different views */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Charts</TabsTrigger>
                  <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
                  <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  <TabsTrigger value="trades">Trades</TabsTrigger>
                </TabsList>

                {/* Charts Tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Equity Curve */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Equity Curve</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={equityCurveData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#333"
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10 }}
                              stroke="#666"
                            />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              stroke="#666"
                              tickFormatter={(v) =>
                                v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v
                              }
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#1a1a1a",
                                border: "1px solid #333",
                                borderRadius: "4px",
                              }}
                              formatter={(value) => [
                                formatCurrency(Number(value ?? 0)),
                                "P&L",
                              ]}
                            />
                            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                            <Area
                              type="monotone"
                              dataKey="pnl"
                              stroke="#22c55e"
                              fill="#22c55e"
                              fillOpacity={0.2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Drawdown Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Drawdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[150px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={drawdownData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#333"
                            />
                            <XAxis
                              dataKey="date"
                              tick={{ fontSize: 10 }}
                              stroke="#666"
                            />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              stroke="#666"
                              tickFormatter={(v) => `${v.toFixed(0)}%`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#1a1a1a",
                                border: "1px solid #333",
                                borderRadius: "4px",
                              }}
                              formatter={(value) => [
                                `${Number(value ?? 0).toFixed(2)}%`,
                                "Drawdown",
                              ]}
                            />
                            <Area
                              type="monotone"
                              dataKey="drawdown"
                              stroke="#ef4444"
                              fill="#ef4444"
                              fillOpacity={0.2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* R-Multiple Distribution */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">R-Multiple Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[150px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={rDistribution}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="#333"
                            />
                            <XAxis
                              dataKey="range"
                              tick={{ fontSize: 10 }}
                              stroke="#666"
                            />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              stroke="#666"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#1a1a1a",
                                border: "1px solid #333",
                                borderRadius: "4px",
                              }}
                            />
                            <Bar
                              dataKey="count"
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Breakdown Tab */}
                <TabsContent value="breakdown" className="space-y-4 mt-4">
                  {/* By Symbol */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">By Symbol</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PerformanceTable
                        data={detailedAnalytics.by_symbol.map((s) => ({
                          name: s.symbol,
                          trades: s.trades,
                          winRate: s.win_rate,
                          pnl: s.total_pnl,
                          avgR: s.average_r,
                        }))}
                      />
                    </CardContent>
                  </Card>

                  {/* By Timeframe */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">By Timeframe</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PerformanceTable
                        data={detailedAnalytics.by_timeframe.map((t) => ({
                          name: t.timeframe,
                          trades: t.trades,
                          winRate: t.win_rate,
                          pnl: t.total_pnl,
                          avgR: t.average_r,
                        }))}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Monthly Tab */}
                <TabsContent value="monthly" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Monthly Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PerformanceTable
                        data={detailedAnalytics.by_month.map((m) => ({
                          name: m.month,
                          trades: m.trades,
                          winRate: m.win_rate,
                          pnl: m.total_pnl,
                          avgR: m.average_r,
                        }))}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Trades Tab */}
                <TabsContent value="trades" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Recent Trades</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {detailedAnalytics.recent_trades.map((trade) => (
                          <div
                            key={trade.id}
                            className="flex items-center justify-between p-2 rounded bg-muted/50"
                          >
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  trade.direction === "long"
                                    ? "border-green-500/50 text-green-400"
                                    : "border-red-500/50 text-red-400"
                                )}
                              >
                                {trade.symbol}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {trade.timeframe ?? "N/A"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(trade.exit_time)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span
                                className={cn(
                                  "font-mono text-sm",
                                  trade.pnl >= 0
                                    ? "text-green-400"
                                    : "text-red-400"
                                )}
                              >
                                {formatCurrency(trade.pnl)}
                              </span>
                              <Badge
                                className={cn(
                                  "text-xs",
                                  trade.outcome === "win"
                                    ? "bg-green-500/20 text-green-400"
                                    : trade.outcome === "loss"
                                      ? "bg-red-500/20 text-red-400"
                                      : "bg-gray-500/20 text-gray-400"
                                )}
                              >
                                {trade.outcome.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Helper Components

type MetricCardProps = {
  label: string;
  value: string;
  subValue?: string;
  color: "green" | "red" | "amber" | "blue" | "default";
};

function MetricCard({ label, value, subValue, color }: MetricCardProps) {
  const colorClasses = {
    green: "text-green-400",
    red: "text-red-400",
    amber: "text-amber-400",
    blue: "text-blue-400",
    default: "text-foreground",
  };

  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className={cn("text-lg font-bold", colorClasses[color])}>
          {value}
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {subValue && (
          <div className="text-xs text-muted-foreground mt-0.5">{subValue}</div>
        )}
      </CardContent>
    </Card>
  );
}

type PerformanceTableProps = {
  data: {
    name: string;
    trades: number;
    winRate: number;
    pnl: number;
    avgR: number;
  }[];
};

function PerformanceTable({ data }: PerformanceTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        No data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-xs">
            <th className="text-left p-2">Name</th>
            <th className="text-right p-2">Trades</th>
            <th className="text-right p-2">Win %</th>
            <th className="text-right p-2">P&L</th>
            <th className="text-right p-2">Avg R</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.name} className="border-b border-border/50">
              <td className="p-2 font-medium">{row.name}</td>
              <td className="text-right p-2 text-muted-foreground">{row.trades}</td>
              <td
                className={cn(
                  "text-right p-2",
                  row.winRate >= 50 ? "text-green-400" : "text-red-400"
                )}
              >
                {formatPercentage(row.winRate)}
              </td>
              <td
                className={cn(
                  "text-right p-2 font-mono",
                  row.pnl >= 0 ? "text-green-400" : "text-red-400"
                )}
              >
                {formatCurrency(row.pnl)}
              </td>
              <td
                className={cn(
                  "text-right p-2 font-mono",
                  row.avgR >= 0 ? "text-green-400" : "text-red-400"
                )}
              >
                {formatRMultiple(row.avgR)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper functions

import type { EquityCurvePointData, JournalEntryData } from "@/lib/api";

function calculateDrawdown(
  equityCurve: EquityCurvePointData[]
): { date: string; drawdown: number }[] {
  if (equityCurve.length === 0) return [];

  let peak = equityCurve[0].cumulative_pnl;
  return equityCurve.map((point) => {
    if (point.cumulative_pnl > peak) {
      peak = point.cumulative_pnl;
    }
    // Calculate drawdown from peak. When peak is 0 or negative, use absolute value
    // to avoid division by zero and handle underwater accounts correctly.
    let drawdown = 0;
    if (peak > 0) {
      drawdown = ((peak - point.cumulative_pnl) / peak) * 100;
    } else if (peak === 0 && point.cumulative_pnl < 0) {
      // Started at 0, now underwater - show loss as percentage of first loss
      drawdown = 100; // 100% drawdown from 0
    } else if (peak < 0 && point.cumulative_pnl < peak) {
      // Both negative, calculate how much worse we got
      drawdown = ((peak - point.cumulative_pnl) / Math.abs(peak)) * 100;
    }
    return {
      date: point.date,
      drawdown: -Math.abs(drawdown), // Negative for visual representation
    };
  });
}

function prepareRDistribution(
  entries: JournalEntryData[]
): { range: string; count: number }[] {
  // Use exclusive lower bound (>) to avoid double-counting at boundaries
  // Breakeven (0R) gets its own category since it's a distinct outcome
  const bins = [
    { range: "< -2R", min: -Infinity, max: -2, includeMax: false },
    { range: "-2R to -1R", min: -2, max: -1, includeMax: false },
    { range: "-1R to 0R", min: -1, max: 0, includeMax: false },
    { range: "0R", min: 0, max: 0.001, includeMax: false }, // Breakeven
    { range: "0R to 1R", min: 0.001, max: 1, includeMax: false },
    { range: "1R to 2R", min: 1, max: 2, includeMax: false },
    { range: "2R to 3R", min: 2, max: 3, includeMax: false },
    { range: "> 3R", min: 3, max: Infinity, includeMax: true },
  ];

  return bins.map((bin) => ({
    range: bin.range,
    count: entries.filter((e) => {
      const r = e.r_multiple;
      return r >= bin.min && (bin.includeMax ? r <= bin.max : r < bin.max);
    }).length,
  }));
}

function CloseIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
