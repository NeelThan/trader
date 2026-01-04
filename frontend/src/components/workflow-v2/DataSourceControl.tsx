"use client";

/**
 * DataSourceControl - Unified data source and refresh control
 *
 * Combines mode selection (Live/Cached/Simulated) with refresh status
 * and controls into a single compact component.
 *
 * Shows:
 * - Current mode with status indicator
 * - Countdown to next refresh (when in Live mode)
 * - Last updated time
 * - Refresh button
 * - Mode selection dropdown
 * - Save as Simulated option
 */

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  Save,
  Clock,
  ChevronDown,
  Beaker,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DataMode = "live" | "cached" | "simulated";

export type DataSourceControlProps = {
  /** Current data mode (user's choice) */
  dataMode: DataMode;
  /** Callback when data mode changes */
  onDataModeChange: (mode: DataMode) => void;
  /** Current countdown in seconds */
  countdown: number;
  /** Last updated timestamp */
  lastUpdated: Date | null;
  /** Whether currently refreshing */
  isRefreshing: boolean;
  /** Whether the last fetch returned cached data (fallback) */
  isCached?: boolean;
  /** Callback to trigger manual refresh */
  onRefresh: () => void;
  /** Whether live data is being rate limited */
  isRateLimited?: boolean;
  /** Whether backend is unavailable */
  isBackendUnavailable?: boolean;
  /** Callback to save current data as simulated */
  onSaveAsSimulated?: () => void;
  /** Whether there's simulated data available */
  hasSimulatedData?: boolean;
  /** Last time simulated data was saved */
  simulatedDataTimestamp?: Date | null;
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
 * Format date to readable string
 */
function formatTime(date: Date | null): string {
  if (!date) return "Never";
  return date.toLocaleTimeString();
}

/**
 * Get icon and styling for data mode
 *
 * @param mode - User's selected mode (live/cached/simulated)
 * @param isCached - Whether the actual data came from cache (fallback)
 * @param isRateLimited - Whether we're being rate limited
 * @param isBackendUnavailable - Whether backend is down
 */
function getModeInfo(
  mode: DataMode,
  isCached?: boolean,
  isRateLimited?: boolean,
  isBackendUnavailable?: boolean
) {
  if (isBackendUnavailable) {
    return {
      icon: WifiOff,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      label: "Offline",
      description: "Backend unavailable",
      isFallback: true,
    };
  }

  if (isRateLimited) {
    return {
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
      label: "Rate Limited",
      description: "Too many requests, using cached data",
      isFallback: true,
    };
  }

  switch (mode) {
    case "live":
      // In Live mode, show fallback indicator if data came from cache
      if (isCached) {
        return {
          icon: Database,
          color: "text-amber-400",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          label: "Live",
          sublabel: "fallback",
          description: "Live feed unavailable, using cached data",
          isFallback: true,
        };
      }
      return {
        icon: Wifi,
        color: "text-green-400",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
        label: "Live",
        description: "Auto-refresh enabled, receiving fresh data",
        isFallback: false,
      };
    case "cached":
      return {
        icon: Database,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        label: "Cached",
        description: "Using cached data, no auto-refresh",
        isFallback: false,
      };
    case "simulated":
      return {
        icon: Beaker,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        label: "Simulated",
        description: "Using saved test data",
        isFallback: false,
      };
  }
}

export function DataSourceControl({
  dataMode,
  onDataModeChange,
  countdown,
  lastUpdated,
  isRefreshing,
  isCached = false,
  onRefresh,
  isRateLimited = false,
  isBackendUnavailable = false,
  onSaveAsSimulated,
  hasSimulatedData = false,
  simulatedDataTimestamp,
  className,
}: DataSourceControlProps) {
  // Track time ago updates
  const [, setTick] = useState(0);

  // Update time ago every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  const modeInfo = getModeInfo(dataMode, isCached, isRateLimited, isBackendUnavailable);
  const Icon = modeInfo.icon;
  const showCountdown = dataMode === "live" && !isRefreshing && countdown > 0;
  const sublabel = "sublabel" in modeInfo ? modeInfo.sublabel : undefined;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {/* Mode dropdown with integrated status */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-7 px-2 text-xs gap-1.5",
              modeInfo.bgColor,
              modeInfo.borderColor
            )}
          >
            {isRefreshing ? (
              <RefreshCw className={cn("h-3 w-3 animate-spin", modeInfo.color)} />
            ) : (
              <Icon className={cn("h-3 w-3", modeInfo.color)} />
            )}
            <span className={cn(modeInfo.color, "hidden sm:inline")}>
              {isRefreshing ? "Refreshing" : modeInfo.label}
              {sublabel && (
                <span className="text-[10px] ml-1 opacity-75">({sublabel})</span>
              )}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>Data Source</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Live mode */}
          <DropdownMenuItem
            onClick={() => onDataModeChange("live")}
            className={dataMode === "live" ? "bg-accent" : ""}
          >
            <Wifi className="h-4 w-4 mr-2 text-green-400" />
            <div className="flex flex-col">
              <span>Live</span>
              <span className="text-[10px] text-muted-foreground">Auto-refresh enabled</span>
            </div>
          </DropdownMenuItem>

          {/* Cached mode */}
          <DropdownMenuItem
            onClick={() => onDataModeChange("cached")}
            className={dataMode === "cached" ? "bg-accent" : ""}
          >
            <Database className="h-4 w-4 mr-2 text-blue-400" />
            <div className="flex flex-col">
              <span>Cached</span>
              <span className="text-[10px] text-muted-foreground">Manual refresh only</span>
            </div>
          </DropdownMenuItem>

          {/* Simulated mode */}
          <DropdownMenuItem
            onClick={() => onDataModeChange("simulated")}
            disabled={!hasSimulatedData}
            className={dataMode === "simulated" ? "bg-accent" : ""}
          >
            <Beaker className="h-4 w-4 mr-2 text-purple-400" />
            <div className="flex flex-col">
              <span>Simulated</span>
              <span className="text-[10px] text-muted-foreground">
                {hasSimulatedData ? "Use saved test data" : "No saved data"}
              </span>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Save as Simulated */}
          <DropdownMenuItem
            onClick={onSaveAsSimulated}
            disabled={dataMode === "simulated" || isRefreshing}
          >
            <Save className="h-4 w-4 mr-2" />
            <div className="flex flex-col">
              <span>Save as Simulated</span>
              {simulatedDataTimestamp && (
                <span className="text-[10px] text-muted-foreground">
                  Last saved: {formatTime(simulatedDataTimestamp)}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Countdown badge (only in live mode) */}
      {showCountdown && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "h-6 px-1.5 text-[10px] font-mono cursor-default",
                  countdown <= 10 && "border-blue-500/50 text-blue-400"
                )}
              >
                {formatCountdown(countdown)}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Next refresh in {formatCountdown(countdown)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Last updated (with tooltip for full details) */}
      {lastUpdated && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[10px] text-muted-foreground hidden md:inline cursor-default">
                {formatTimeAgo(lastUpdated)}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Last updated: {formatTime(lastUpdated)}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Refresh button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isRefreshing || dataMode === "simulated"}
              className="h-7 w-7 p-0"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {dataMode === "simulated"
              ? "Cannot refresh simulated data"
              : isRefreshing
                ? "Refreshing..."
                : "Refresh now"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
