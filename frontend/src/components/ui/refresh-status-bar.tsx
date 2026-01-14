"use client";

/**
 * RefreshStatusBar - Visual feedback for data refresh operations.
 *
 * Shows:
 * - Countdown timer to next auto-refresh
 * - Last updated timestamp
 * - Refresh status indicator (idle/refreshing/success/error)
 * - Manual refresh button with animation
 */

import { useEffect, useState } from "react";
import { RefreshCw, Check, AlertTriangle, Clock, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type RefreshStatusBarProps = {
  /** Current countdown in seconds */
  countdown: number;
  /** Whether auto-refresh is enabled */
  autoRefreshEnabled: boolean;
  /** Last updated timestamp */
  lastUpdated: Date | null;
  /** Whether currently refreshing */
  isRefreshing: boolean;
  /** Whether data is cached */
  isCached?: boolean;
  /** Provider name (yahoo, simulated, etc.) */
  provider?: string | null;
  /** Whether backend is unavailable */
  isBackendUnavailable?: boolean;
  /** Callback to trigger manual refresh */
  onRefresh: () => void;
  /** Callback to toggle auto-refresh */
  onToggleAutoRefresh?: (enabled: boolean) => void;
  /** Optional compact mode */
  compact?: boolean;
  /** Optional className */
  className?: string;
};

/**
 * Format time ago for display
 */
function formatTimeAgo(date: Date | null): string {
  if (!date) return "Never";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Format countdown for display
 */
function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * Status icon based on current state
 */
function StatusIcon({
  isRefreshing,
  isBackendUnavailable,
  provider,
}: {
  isRefreshing: boolean;
  isBackendUnavailable: boolean;
  provider: string | null;
}) {
  if (isRefreshing) {
    return <RefreshCw className="h-3 w-3 animate-spin" />;
  }
  if (isBackendUnavailable) {
    return <WifiOff className="h-3 w-3" />;
  }
  if (provider === "simulated" || provider === "fallback") {
    return <AlertTriangle className="h-3 w-3" />;
  }
  return <Wifi className="h-3 w-3" />;
}

export function RefreshStatusBar({
  countdown,
  autoRefreshEnabled,
  lastUpdated,
  isRefreshing,
  isCached = false,
  provider = null,
  isBackendUnavailable = false,
  onRefresh,
  onToggleAutoRefresh,
  compact = false,
  className,
}: RefreshStatusBarProps) {
  // Track time ago updates
  const [, setTick] = useState(0);

  // Update time ago every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  // Determine status color
  const getStatusColor = () => {
    if (isRefreshing) return "text-blue-400";
    if (isBackendUnavailable) return "text-amber-400";
    if (isCached) return "text-zinc-400";
    return "text-green-400";
  };

  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn("h-7 px-2 gap-1.5", className)}
          >
            <RefreshCw
              className={cn("h-3 w-3", isRefreshing && "animate-spin")}
            />
            <span className="text-xs text-muted-foreground">
              {isRefreshing ? "..." : formatCountdown(countdown)}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <StatusIcon
                isRefreshing={isRefreshing}
                isBackendUnavailable={isBackendUnavailable}
                provider={provider}
              />
              <span>
                {isRefreshing
                  ? "Refreshing..."
                  : isBackendUnavailable
                    ? "Offline mode"
                    : provider
                      ? `via ${provider}`
                      : "Live data"}
              </span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Updated {formatTimeAgo(lastUpdated)}</span>
              </div>
            )}
            {autoRefreshEnabled && !isRefreshing && (
              <div className="text-muted-foreground">
                Next refresh in {formatCountdown(countdown)}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 text-xs bg-muted/50 px-2 py-1 rounded-md",
        className
      )}
    >
      {/* Status indicator */}
      <div className={cn("flex items-center gap-1.5", getStatusColor())}>
        <StatusIcon
          isRefreshing={isRefreshing}
          isBackendUnavailable={isBackendUnavailable}
          provider={provider}
        />
        <span className="hidden sm:inline">
          {isRefreshing
            ? "Refreshing..."
            : isBackendUnavailable
              ? "Offline"
              : isCached
                ? "Cached"
                : "Live"}
        </span>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="hidden sm:inline">Updated</span>
          <span>{formatTimeAgo(lastUpdated)}</span>
        </div>
      )}

      {/* Countdown badge */}
      {autoRefreshEnabled && !isRefreshing && (
        <Badge
          variant="outline"
          className={cn(
            "h-5 px-1.5 text-[10px] font-mono cursor-pointer",
            countdown <= 10 && "border-blue-500/50 text-blue-400"
          )}
          onClick={() => onToggleAutoRefresh?.(!autoRefreshEnabled)}
        >
          {formatCountdown(countdown)}
        </Badge>
      )}

      {/* Refresh button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="h-6 px-2 gap-1"
      >
        <RefreshCw
          className={cn("h-3 w-3", isRefreshing && "animate-spin")}
        />
        <span className="hidden sm:inline">Refresh</span>
      </Button>
    </div>
  );
}

/**
 * Minimal refresh indicator (just icon + countdown)
 */
export function RefreshIndicator({
  countdown,
  isRefreshing,
  onRefresh,
  className,
}: {
  countdown: number;
  isRefreshing: boolean;
  onRefresh: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors",
        isRefreshing && "text-blue-400",
        className
      )}
    >
      <RefreshCw
        className={cn("h-3 w-3", isRefreshing && "animate-spin")}
      />
      <span className="font-mono">{formatCountdown(countdown)}</span>
    </button>
  );
}

/**
 * Success flash indicator (shows briefly after refresh)
 */
export function RefreshSuccessFlash({
  show,
  className,
}: {
  show: boolean;
  className?: string;
}) {
  if (!show) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs text-green-400 animate-pulse",
        className
      )}
    >
      <Check className="h-3 w-3" />
      <span>Updated</span>
    </div>
  );
}
