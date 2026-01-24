"use client";

/**
 * JournalSummaryWidget - Compact journal metrics for Workflow V2 sidebar
 *
 * Shows key trading metrics at a glance:
 * - Total P&L with color coding
 * - Win rate percentage
 * - Average R-multiple
 * - Profit factor
 * - Recent trade indicators
 * - Button to open full journal drawer
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  useJournal,
  useDetailedJournalAnalytics,
  formatCurrency,
  formatRMultiple,
  formatPercentage,
} from "@/hooks/use-journal";
import { cn } from "@/lib/utils";

type JournalSummaryWidgetProps = {
  onOpenDrawer: () => void;
};

export function JournalSummaryWidget({ onOpenDrawer }: JournalSummaryWidgetProps) {
  const { analytics, isBackendAvailable } = useJournal();
  const { detailedAnalytics } = useDetailedJournalAnalytics(5);

  // Color classes based on performance
  const pnlColor = analytics.total_pnl >= 0 ? "text-green-400" : "text-red-400";
  const winRateColor = analytics.win_rate >= 50 ? "text-green-400" : "text-red-400";
  const avgRColor = analytics.average_r >= 0 ? "text-green-400" : "text-red-400";
  const pfColor =
    analytics.profit_factor >= 1.5
      ? "text-green-400"
      : analytics.profit_factor >= 1
        ? "text-amber-400"
        : "text-red-400";

  // Recent trades indicators
  const recentTrades = detailedAnalytics.recent_trades.slice(0, 5);

  if (!isBackendAvailable) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-3">
          <div className="text-center text-sm text-muted-foreground">
            <span className="text-orange-400">Backend offline</span>
            <br />
            <span className="text-xs">Start backend to view journal</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analytics.total_trades === 0) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardContent className="p-3">
          <div className="text-center text-sm text-muted-foreground">
            <span>No trades recorded</span>
            <br />
            <span className="text-xs">Complete trades to see metrics</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Journal Summary</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onOpenDrawer}
          title="View full journal"
        >
          <ChartIcon />
        </Button>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {/* P&L */}
          <div>
            <div className="text-xs text-muted-foreground">P&L</div>
            <div className={cn("font-mono font-medium", pnlColor)}>
              {formatCurrency(analytics.total_pnl)}
            </div>
          </div>

          {/* Win Rate */}
          <div>
            <div className="text-xs text-muted-foreground">Win Rate</div>
            <div className={cn("font-mono font-medium", winRateColor)}>
              {formatPercentage(analytics.win_rate)}
            </div>
          </div>

          {/* Avg R */}
          <div>
            <div className="text-xs text-muted-foreground">Avg R</div>
            <div className={cn("font-mono font-medium", avgRColor)}>
              {formatRMultiple(analytics.average_r)}
            </div>
          </div>

          {/* Profit Factor */}
          <div>
            <div className="text-xs text-muted-foreground">PF</div>
            <div className={cn("font-mono font-medium", pfColor)}>
              {analytics.profit_factor >= 999999
                ? "N/A"
                : analytics.profit_factor.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Recent Trades Indicator */}
        {recentTrades.length > 0 && (
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Recent:</span>
              <div className="flex items-center gap-1">
                {recentTrades.map((trade, i) => (
                  <span
                    key={trade.id}
                    className={cn(
                      "text-xs font-medium",
                      trade.outcome === "win"
                        ? "text-green-400"
                        : trade.outcome === "loss"
                          ? "text-red-400"
                          : "text-gray-400"
                    )}
                    title={`${trade.symbol} ${trade.direction.toUpperCase()}: ${formatCurrency(trade.pnl)}`}
                  >
                    {trade.outcome === "win" ? "W" : trade.outcome === "loss" ? "L" : "B"}
                  </span>
                ))}
                <span className="text-xs text-muted-foreground ml-1">
                  ({analytics.total_trades} total)
                </span>
              </div>
            </div>

            {/* Streak indicator */}
            {detailedAnalytics.streaks.current !== 0 && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">Streak:</span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    detailedAnalytics.streaks.current > 0
                      ? "text-green-400"
                      : "text-red-400"
                  )}
                >
                  {detailedAnalytics.streaks.current > 0 ? "+" : ""}
                  {detailedAnalytics.streaks.current}
                  {detailedAnalytics.streaks.current > 0 ? " wins" : " losses"}
                </span>
              </div>
            )}
          </div>
        )}

        {/* View Full Journal Button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={onOpenDrawer}
        >
          View Full Journal
        </Button>
      </CardContent>
    </Card>
  );
}

function ChartIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}
