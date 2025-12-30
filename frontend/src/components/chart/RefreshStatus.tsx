"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { MarketStatus, Timeframe, TIMEFRAME_CONFIG } from "@/lib/chart-constants";
import { formatCountdown, formatRefreshInterval } from "@/lib/market-utils";
import { MarketStatusBadge } from "./MarketStatusBadge";

type RefreshStatusProps = {
  isLoading: boolean;
  autoRefreshEnabled: boolean;
  countdown: number;
  lastUpdated: Date | null;
  marketStatus: MarketStatus | null;
  timeframe: Timeframe;
  onToggleAutoRefresh: () => void;
  onRefreshNow: () => void;
};

export function RefreshStatus({
  isLoading,
  autoRefreshEnabled,
  countdown,
  lastUpdated,
  marketStatus,
  timeframe,
  onToggleAutoRefresh,
  onRefreshNow,
}: RefreshStatusProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-card border flex-wrap">
      {/* Market Status Badge */}
      {marketStatus && (
        <>
          <div className="flex items-center gap-2">
            <MarketStatusBadge status={marketStatus} />
          </div>
          <div className="w-px h-6 bg-border" />
        </>
      )}

      {/* Refresh Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant={autoRefreshEnabled ? "default" : "outline"}
          size="sm"
          onClick={onToggleAutoRefresh}
          className={autoRefreshEnabled ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {autoRefreshEnabled ? "Auto-Refresh On" : "Auto-Refresh Off"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefreshNow}
          disabled={isLoading}
        >
          {isLoading ? <Spinner size="sm" /> : "Refresh Now"}
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Status Info */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        {autoRefreshEnabled && countdown > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Next refresh:</span>
            <span className="font-mono text-foreground">
              {formatCountdown(countdown)}
            </span>
          </div>
        )}
        {lastUpdated && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Last updated:</span>
            <span className="font-mono text-foreground">
              {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Interval:</span>
          <span className="font-mono text-foreground">
            {formatRefreshInterval(TIMEFRAME_CONFIG[timeframe].refreshInterval)}
          </span>
        </div>
      </div>
    </div>
  );
}
