"use client";

/**
 * SignalsPanel - Display aggregated trading signals
 *
 * Features:
 * - Shows signals organized by timeframe, direction, or quality
 * - Filter controls for direction, timeframe, active status
 * - Sorting options
 * - Click to select for validation
 * - Collapsible for space efficiency
 */

import { useState, useCallback } from "react";
import type {
  AggregatedSignal,
  SignalCounts,
  SignalFilters,
  SignalSortBy,
} from "@/hooks/use-signal-aggregation";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Layers,
  Target,
  AlertCircle,
} from "lucide-react";

export type SignalsPanelProps = {
  /** Signals to display */
  signals: AggregatedSignal[];
  /** Signal counts */
  counts: SignalCounts;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Callback when signal is selected */
  onSignalSelect: (signal: AggregatedSignal) => void;
  /** Callback when filters change */
  onFilterChange: (filters: SignalFilters) => void;
  /** Callback when sort changes */
  onSortChange: (sortBy: SignalSortBy) => void;
  /** Callback to refresh signals */
  onRefresh: () => void;
  /** CSS class name */
  className?: string;
};

/**
 * Format confidence as percentage
 */
function formatConfidence(confidence: number): string {
  return `${confidence}%`;
}

/**
 * Get signal type icon
 */
function getSignalTypeIcon(type: AggregatedSignal["type"]) {
  switch (type) {
    case "trend_alignment":
      return <TrendingUp className="w-3 h-3" />;
    case "fib_rejection":
      return <Target className="w-3 h-3" />;
    case "confluence":
      return <Layers className="w-3 h-3" />;
  }
}

/**
 * Get direction color classes
 */
function getDirectionClasses(direction: "long" | "short"): string {
  return direction === "long"
    ? "bg-blue-600 text-white"
    : "bg-red-600 text-white";
}

/**
 * Get active border class
 */
function getActiveBorderClass(isActive: boolean, direction: "long" | "short"): string {
  if (!isActive) return "border-zinc-700";
  return direction === "long" ? "border-blue-500" : "border-red-500";
}

export function SignalsPanel({
  signals,
  counts,
  isLoading,
  error,
  onSignalSelect,
  onFilterChange,
  onSortChange,
  onRefresh,
  className,
}: SignalsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<"all" | "long" | "short">("all");
  const [sortBy, setSortBy] = useState<SignalSortBy>("confidence");
  const [activeOnly, setActiveOnly] = useState(false);

  // Handle direction filter change
  const handleDirectionChange = useCallback(
    (value: string) => {
      const direction = value as "all" | "long" | "short";
      setDirectionFilter(direction);
      onFilterChange({
        direction: direction === "all" ? null : direction,
        activeOnly,
      });
    },
    [activeOnly, onFilterChange]
  );

  // Handle active only toggle
  const handleActiveOnlyChange = useCallback(
    (checked: boolean) => {
      setActiveOnly(checked);
      onFilterChange({
        direction: directionFilter === "all" ? null : directionFilter,
        activeOnly: checked,
      });
    },
    [directionFilter, onFilterChange]
  );

  // Handle sort change
  const handleSortChange = useCallback(
    (value: string) => {
      const sort = value as SignalSortBy;
      setSortBy(sort);
      onSortChange(sort);
    },
    [onSortChange]
  );

  // Toggle expanded state
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div className={cn("bg-zinc-900 rounded-lg border border-zinc-800", className)}>
      {/* Header */}
      <button
        type="button"
        onClick={toggleExpanded}
        aria-label="Signals"
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-800 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
          <span className="font-medium text-white">Signals</span>
          <span className="px-1.5 py-0.5 text-xs bg-zinc-700 rounded text-white">
            {counts.total}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-blue-400">{counts.long} Long</span>
          <span className="text-red-400">{counts.short} Short</span>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-3">
          {/* Controls Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Direction Filter */}
            <label className="flex items-center gap-1 text-xs">
              <select
                value={directionFilter}
                onChange={(e) => handleDirectionChange(e.target.value)}
                aria-label="Direction filter"
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </label>

            {/* Timeframe Filter Button */}
            <button
              type="button"
              aria-label="Timeframe filter"
              className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded hover:bg-zinc-700 text-white"
            >
              Timeframe
            </button>

            {/* Active Only Toggle */}
            <label className="flex items-center gap-1 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => handleActiveOnlyChange(e.target.checked)}
                aria-label="Active only"
                className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
              />
              <span className="text-zinc-400">Active</span>
            </label>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Sort */}
            <label className="flex items-center gap-1 text-xs">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                aria-label="Sort by"
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-xs focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="confidence">Confidence</option>
                <option value="timeframe">Timeframe</option>
                <option value="timestamp">Newest</option>
                <option value="price">Price</option>
              </select>
            </label>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              aria-label="Refresh signals"
              className="p-1 hover:bg-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" data-testid="loading-indicator" />
              ) : (
                <RefreshCw className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          </div>

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-sm text-red-400">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && signals.length === 0 && (
            <div className="flex items-center justify-center py-8" data-testid="loading-indicator">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && signals.length === 0 && !error && (
            <div className="text-center py-8 text-zinc-500 text-sm">
              No signals detected. Try adjusting filters or refresh.
            </div>
          )}

          {/* Signal List */}
          {signals.length > 0 && (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {signals.map((signal) => (
                <button
                  key={signal.id}
                  type="button"
                  onClick={() => onSignalSelect(signal)}
                  data-testid="signal-card"
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors",
                    getActiveBorderClass(signal.isActive, signal.direction),
                    "bg-zinc-800 hover:bg-zinc-750"
                  )}
                >
                  {/* Header Row */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {/* Direction Badge */}
                      <span
                        className={cn(
                          "px-2 py-0.5 text-xs font-medium rounded uppercase",
                          getDirectionClasses(signal.direction)
                        )}
                      >
                        {signal.direction}
                      </span>
                      {/* Timeframe */}
                      <span className="text-xs text-zinc-400 font-mono">
                        {signal.timeframe}
                      </span>
                      {/* Signal Type Icon */}
                      <span className="text-zinc-500">
                        {getSignalTypeIcon(signal.type)}
                      </span>
                    </div>
                    {/* Confidence */}
                    <span
                      className={cn(
                        "text-sm font-medium",
                        signal.confidence >= 80
                          ? "text-green-400"
                          : signal.confidence >= 60
                          ? "text-amber-400"
                          : "text-zinc-400"
                      )}
                    >
                      {formatConfidence(signal.confidence)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-zinc-300 mb-1">
                    {signal.description}
                  </p>

                  {/* Extra Info */}
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    {/* Price */}
                    <span className="font-mono">
                      {signal.price.toFixed(0)}
                    </span>
                    {/* Fib Level */}
                    {signal.fibLevel && (
                      <span className="text-blue-400">
                        {(signal.fibLevel * 100).toFixed(1)}%
                      </span>
                    )}
                    {/* Confluence Count */}
                    {signal.confluenceCount && (
                      <span className="text-purple-400">
                        {signal.confluenceCount} levels
                      </span>
                    )}
                    {/* Active Indicator */}
                    {!signal.isActive && (
                      <span className="text-zinc-600">Waiting</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SignalsPanel;
