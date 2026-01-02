"use client";

/**
 * PivotSettingsPanel - Per-timeframe pivot point management
 *
 * Features:
 * - Display pivot list with ABC labels
 * - Edit pivot prices inline
 * - Lock/unlock from auto-refresh
 * - Trend direction selection
 * - Detect and clear pivots
 * - Collapsible for space efficiency
 */

import { useState, useCallback } from "react";
import type { ManagedPivot } from "@/hooks/use-pivot-manager";
import type { Timeframe } from "@/lib/chart-constants";
import type { TradeDirection } from "@/types/workflow-v2";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Lock, Unlock, Trash2, RefreshCw, Loader2 } from "lucide-react";

export type PivotSettingsPanelProps = {
  /** Timeframe this panel controls */
  timeframe: Timeframe;
  /** Current pivots for display */
  pivots: ManagedPivot[];
  /** Pivots with ABC labels */
  pivotsWithLabels: ManagedPivot[];
  /** Whether pivots are locked from auto-refresh */
  isLocked: boolean;
  /** Current trend direction */
  trendDirection: TradeDirection | "ranging";
  /** Loading state */
  isLoading?: boolean;
  /** Callback when adding a pivot */
  onAddPivot: (pivot: { index: number; price: number; type: "high" | "low" }) => void;
  /** Callback when updating a pivot price */
  onUpdatePivotPrice: (pivotId: string, newPrice: number) => void;
  /** Callback when removing a pivot */
  onRemovePivot: (pivotId: string) => void;
  /** Callback when clearing all pivots */
  onClearPivots: () => void;
  /** Callback when lock state changes */
  onLockChange: (locked: boolean) => void;
  /** Callback when trend direction changes */
  onTrendDirectionChange: (direction: TradeDirection | "ranging") => void;
  /** Callback to detect pivots from market data */
  onDetectPivots: () => void;
  /** CSS class name */
  className?: string;
};

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  return price.toFixed(0);
}

/**
 * Get color for pivot type
 */
function getPivotColor(type: "high" | "low"): string {
  return type === "high" ? "text-green-400" : "text-red-400";
}

/**
 * Get label color for ABC
 */
function getLabelColor(label?: "A" | "B" | "C"): string {
  switch (label) {
    case "A":
      return "bg-blue-600";
    case "B":
      return "bg-purple-600";
    case "C":
      return "bg-amber-600";
    default:
      return "bg-zinc-600";
  }
}

export function PivotSettingsPanel({
  timeframe,
  pivots,
  pivotsWithLabels,
  isLocked,
  trendDirection,
  isLoading = false,
  onAddPivot,
  onUpdatePivotPrice,
  onRemovePivot,
  onClearPivots,
  onLockChange,
  onTrendDirectionChange,
  onDetectPivots,
  className,
}: PivotSettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [editingPivotId, setEditingPivotId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // Get pivot with labels for display
  const getPivotWithLabel = useCallback(
    (pivotId: string) => {
      return pivotsWithLabels.find((p) => p.id === pivotId);
    },
    [pivotsWithLabels]
  );

  // Handle price edit start
  const handleEditStart = useCallback((pivot: ManagedPivot) => {
    setEditingPivotId(pivot.id);
    setEditValue(formatPrice(pivot.price));
  }, []);

  // Handle price edit complete
  const handleEditComplete = useCallback(
    (pivotId: string) => {
      const newPrice = parseFloat(editValue);
      if (!isNaN(newPrice) && newPrice > 0) {
        onUpdatePivotPrice(pivotId, newPrice);
      }
      setEditingPivotId(null);
      setEditValue("");
    },
    [editValue, onUpdatePivotPrice]
  );

  // Toggle collapsed state
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div className={cn("bg-zinc-900 rounded-lg border border-zinc-800", className)}>
      {/* Header - Collapsible */}
      <button
        type="button"
        onClick={toggleExpanded}
        aria-label={timeframe}
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-800 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-400" />
          )}
          <span className="font-medium text-white">{timeframe}</span>
          <span className="text-xs text-zinc-500">
            {pivots.length} pivot{pivots.length !== 1 ? "s" : ""}
          </span>
        </div>
        {isLocked && <Lock className="w-4 h-4 text-amber-400" />}
      </button>

      {/* Content - Collapsible */}
      {isExpanded && (
        <div className="p-3 pt-0 space-y-3">
          {/* Controls Row */}
          <div className="flex items-center gap-3">
            {/* Lock Toggle */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isLocked}
                onChange={(e) => onLockChange(e.target.checked)}
                aria-label="Lock from refresh"
                className="rounded border-zinc-600 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900"
              />
              <span className="text-zinc-400 flex items-center gap-1">
                {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                Lock
              </span>
            </label>

            {/* Trend Direction */}
            <label className="flex items-center gap-2 text-sm">
              <span className="text-zinc-400">Trend:</span>
              <select
                value={trendDirection}
                onChange={(e) =>
                  onTrendDirectionChange(e.target.value as TradeDirection | "ranging")
                }
                aria-label="Trend direction"
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="ranging">Ranging</option>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDetectPivots}
              disabled={isLoading}
              aria-label="Detect pivots"
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" data-testid="loading-indicator" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Detect
            </button>
            <button
              type="button"
              onClick={onClearPivots}
              aria-label="Clear pivots"
              className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-white rounded transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear
            </button>
          </div>

          {/* Pivot List */}
          {pivots.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm py-4">
              No pivots detected. Click Detect or add manually.
            </div>
          ) : (
            <div className="space-y-1">
              {pivots.map((pivot) => {
                const withLabel = getPivotWithLabel(pivot.id);
                const isEditing = editingPivotId === pivot.id;

                return (
                  <div
                    key={pivot.id}
                    data-testid="pivot-row"
                    className="flex items-center gap-2 p-2 bg-zinc-800 rounded group"
                  >
                    {/* ABC Label */}
                    {withLabel?.abcLabel && (
                      <span
                        className={cn(
                          "w-5 h-5 flex items-center justify-center rounded text-xs font-bold text-white",
                          getLabelColor(withLabel.abcLabel)
                        )}
                      >
                        {withLabel.abcLabel}
                      </span>
                    )}

                    {/* Type indicator */}
                    <span className={cn("text-xs uppercase", getPivotColor(pivot.type))}>
                      {pivot.type === "high" ? "H" : "L"}
                    </span>

                    {/* Price - editable */}
                    {isEditing ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleEditComplete(pivot.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditComplete(pivot.id);
                          if (e.key === "Escape") setEditingPivotId(null);
                        }}
                        className="w-24 px-2 py-0.5 bg-zinc-700 border border-blue-500 rounded text-white text-sm"
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleEditStart(pivot)}
                        className="text-white hover:text-blue-400 transition-colors"
                      >
                        {formatPrice(pivot.price)}
                      </button>
                    )}

                    {/* Manual indicator */}
                    {pivot.isManual && (
                      <span className="text-[10px] text-amber-400 uppercase">M</span>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => onRemovePivot(pivot.id)}
                      aria-label="Remove pivot"
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-700 rounded transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PivotSettingsPanel;
