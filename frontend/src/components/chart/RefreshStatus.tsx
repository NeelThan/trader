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
  isRateLimited?: boolean;
  isUsingSimulatedData?: boolean;
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
  isRateLimited = false,
  isUsingSimulatedData = false,
  onToggleAutoRefresh,
  onRefreshNow,
}: RefreshStatusProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-card border flex-wrap">
      {/* Rate Limit Warning */}
      {isRateLimited && (
        <>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-amber-500/20 text-amber-400 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="font-medium">Yahoo Finance rate limited</span>
              <span className="text-amber-400/80 text-xs sm:text-sm">
                {countdown > 0
                  ? `• Retrying in ${formatCountdown(countdown)}`
                  : "• Click 'Try Live Data' to reconnect"
                }
              </span>
            </div>
          </div>
          <div className="w-px h-6 bg-border" />
        </>
      )}

      {/* Simulated Data Indicator (when not rate limited) */}
      {!isRateLimited && isUsingSimulatedData && (
        <>
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-sm">
            <span>Simulated Data</span>
          </div>
          <div className="w-px h-6 bg-border" />
        </>
      )}

      {/* Market Status Badge */}
      {marketStatus && !isRateLimited && (
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
          variant={isRateLimited ? "default" : "outline"}
          size="sm"
          onClick={onRefreshNow}
          disabled={isLoading}
          className={isRateLimited ? "bg-blue-600 hover:bg-blue-700" : ""}
        >
          {isLoading ? (
            <Spinner size="sm" />
          ) : isRateLimited ? (
            "Try Live Data"
          ) : (
            "Refresh Now"
          )}
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
