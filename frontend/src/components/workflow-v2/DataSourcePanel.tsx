"use client";

/**
 * DataSourcePanel - Data source controls and status display
 *
 * Shows current data source status (live/cached/simulated) and allows
 * switching between modes. Also displays refresh countdown per timeframe.
 */

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Wifi,
  WifiOff,
  Database,
  RefreshCw,
  Save,
  Clock,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Timeframe, DataSource } from "@/lib/chart-constants";
import { TIMEFRAME_CONFIG } from "@/lib/chart-constants";

const STORAGE_KEY = "workflow-v2-simulated-data";

export type DataMode = "live" | "cached" | "simulated";

export type TimeframeRefreshStatus = {
  timeframe: Timeframe;
  lastUpdated: Date | null;
  countdown: number;
  isCached: boolean;
  isLoading: boolean;
};

export type DataSourcePanelProps = {
  /** Current data mode */
  dataMode: DataMode;
  /** Callback when data mode changes */
  onDataModeChange: (mode: DataMode) => void;
  /** Whether live data is being rate limited */
  isRateLimited?: boolean;
  /** Whether backend is unavailable */
  isBackendUnavailable?: boolean;
  /** Per-timeframe refresh status */
  timeframeStatus?: TimeframeRefreshStatus[];
  /** Callback to save current data as simulated */
  onSaveAsSimulated?: () => void;
  /** Whether there's simulated data available */
  hasSimulatedData?: boolean;
  /** Last time simulated data was saved */
  simulatedDataTimestamp?: Date | null;
};

/**
 * Format countdown seconds to readable string
 */
function formatCountdown(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

/**
 * Format date to readable string
 */
function formatTime(date: Date | null): string {
  if (!date) return "Never";
  return date.toLocaleTimeString();
}

/**
 * Get icon and color for data mode
 */
function getDataModeInfo(mode: DataMode, isRateLimited?: boolean, isBackendUnavailable?: boolean) {
  if (isBackendUnavailable) {
    return {
      icon: WifiOff,
      color: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      label: "Offline",
    };
  }

  if (isRateLimited) {
    return {
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
      label: "Rate Limited",
    };
  }

  switch (mode) {
    case "live":
      return {
        icon: Wifi,
        color: "text-green-400",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
        label: "Live",
      };
    case "cached":
      return {
        icon: Database,
        color: "text-blue-400",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/30",
        label: "Cached",
      };
    case "simulated":
      return {
        icon: RefreshCw,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        borderColor: "border-purple-500/30",
        label: "Simulated",
      };
  }
}

export function DataSourcePanel({
  dataMode,
  onDataModeChange,
  isRateLimited = false,
  isBackendUnavailable = false,
  timeframeStatus = [],
  onSaveAsSimulated,
  hasSimulatedData = false,
  simulatedDataTimestamp,
}: DataSourcePanelProps) {
  const modeInfo = getDataModeInfo(dataMode, isRateLimited, isBackendUnavailable);
  const Icon = modeInfo.icon;

  return (
    <div className="flex items-center gap-2">
      {/* Data Mode Dropdown */}
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
            <Icon className={cn("h-3 w-3", modeInfo.color)} />
            <span className={modeInfo.color}>{modeInfo.label}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Data Source</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDataModeChange("live")}
            className={dataMode === "live" ? "bg-accent" : ""}
          >
            <Wifi className="h-4 w-4 mr-2 text-green-400" />
            Live Data
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDataModeChange("cached")}
            className={dataMode === "cached" ? "bg-accent" : ""}
          >
            <Database className="h-4 w-4 mr-2 text-blue-400" />
            Cached Data
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDataModeChange("simulated")}
            disabled={!hasSimulatedData}
            className={dataMode === "simulated" ? "bg-accent" : ""}
          >
            <RefreshCw className="h-4 w-4 mr-2 text-purple-400" />
            Simulated Data
            {!hasSimulatedData && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                No data
              </span>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onSaveAsSimulated}
            disabled={dataMode === "simulated"}
          >
            <Save className="h-4 w-4 mr-2" />
            Save as Simulated
          </DropdownMenuItem>
          {simulatedDataTimestamp && (
            <div className="px-2 py-1 text-[10px] text-muted-foreground">
              Saved: {formatTime(simulatedDataTimestamp)}
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Refresh Status Popover */}
      {timeframeStatus.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-0">
            <div className="px-3 py-2 border-b">
              <h4 className="text-sm font-medium">Timeframe Refresh Status</h4>
            </div>
            <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
              {timeframeStatus.map((status) => (
                <TimeframeRefreshRow key={status.timeframe} status={status} />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

/**
 * Individual timeframe refresh status row
 */
function TimeframeRefreshRow({ status }: { status: TimeframeRefreshStatus }) {
  const config = TIMEFRAME_CONFIG[status.timeframe];

  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium w-8">{status.timeframe}</span>
        {status.isLoading && (
          <RefreshCw className="h-3 w-3 animate-spin text-blue-400" />
        )}
        {status.isCached && !status.isLoading && (
          <Database className="h-3 w-3 text-blue-400" />
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        {status.lastUpdated && (
          <span>{formatTime(status.lastUpdated)}</span>
        )}
        {status.countdown > 0 && (
          <Badge variant="outline" className="text-[10px] h-4 px-1">
            {formatCountdown(status.countdown)}
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * Compact data source indicator (for inline display)
 */
export function DataSourceIndicator({
  dataMode,
  isCached,
  isRateLimited,
  isBackendUnavailable,
  countdown,
  onClick,
}: {
  dataMode: DataMode;
  isCached?: boolean;
  isRateLimited?: boolean;
  isBackendUnavailable?: boolean;
  countdown?: number;
  onClick?: () => void;
}) {
  const modeInfo = getDataModeInfo(
    isCached ? "cached" : dataMode,
    isRateLimited,
    isBackendUnavailable
  );
  const Icon = modeInfo.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors",
        modeInfo.bgColor,
        "hover:opacity-80"
      )}
    >
      <Icon className={cn("h-3 w-3", modeInfo.color)} />
      <span className={modeInfo.color}>{modeInfo.label}</span>
      {countdown !== undefined && countdown > 0 && (
        <span className="text-muted-foreground ml-1">
          {formatCountdown(countdown)}
        </span>
      )}
    </button>
  );
}
