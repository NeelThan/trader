"use client";

/**
 * Swing Pivot Panel Component
 *
 * Unified panel combining swing detection settings and pivot points
 * per timeframe. Each timeframe is collapsible, showing:
 * - Enabled toggle, lookback, show lines settings
 * - Pivot points table (for the current chart timeframe)
 */

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Activity,
  RotateCcw,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Timeframe } from "@/lib/chart-constants";
import { TIMEFRAME_COLORS, ALL_TIMEFRAMES } from "@/lib/chart-pro/strategy-types";
import type {
  SwingSettingsConfig,
  PerTimeframeSwingSettings,
} from "@/hooks/use-persisted-swing-settings";
import type { EditablePivot } from "@/hooks/use-editable-pivots";

export type SwingPivotPanelProps = {
  /** Current timeframe being viewed on chart */
  currentTimeframe: Timeframe;
  /** Full swing settings configuration */
  swingConfig: SwingSettingsConfig;
  /** Get settings for a specific timeframe */
  getTimeframeSettings: (tf: Timeframe) => PerTimeframeSwingSettings;
  /** Update lookback for a timeframe */
  updateTimeframeLookback: (tf: Timeframe, lookback: number) => void;
  /** Toggle enabled state for a timeframe */
  updateTimeframeEnabled: (tf: Timeframe, enabled: boolean) => void;
  /** Toggle showLines for a timeframe */
  updateTimeframeShowLines: (tf: Timeframe, showLines: boolean) => void;
  /** Reset all settings to defaults */
  resetToDefaults: () => void;
  /** Whether settings have loaded from storage */
  isLoaded: boolean;
  /** Editable pivot points for current timeframe */
  pivots: EditablePivot[];
  /** Update a pivot's price */
  updatePivotPrice: (id: string, newPrice: number) => void;
  /** Reset a single pivot */
  resetPivot: (id: string) => void;
  /** Reset all pivots */
  resetAllPivots: () => void;
  /** Whether any pivots are modified */
  hasModifications: boolean;
  /** Count of modified pivots */
  modifiedCount: number;
  /** Whether swing detection is loading */
  isLoading?: boolean;
};

/**
 * Get numeric timestamp from pivot time
 */
function getTimestamp(time: string | number): number {
  return typeof time === "string" ? new Date(time).getTime() : time;
}

/**
 * Format time for display
 */
function formatTime(time: string | number): string {
  if (typeof time === "number") {
    return new Date(time * 1000).toLocaleDateString();
  }
  if (time.includes("T")) {
    return new Date(time).toLocaleDateString();
  }
  return time;
}

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toFixed(2);
  }
  if (price >= 1) {
    return price.toFixed(4);
  }
  return price.toFixed(6);
}

export function SwingPivotPanel({
  currentTimeframe,
  getTimeframeSettings,
  updateTimeframeLookback,
  updateTimeframeEnabled,
  updateTimeframeShowLines,
  resetToDefaults,
  isLoaded,
  pivots,
  updatePivotPrice,
  resetPivot,
  resetAllPivots,
  hasModifications,
  modifiedCount,
  isLoading = false,
}: SwingPivotPanelProps) {
  // Track which timeframe is expanded (default to current)
  const [expandedTimeframe, setExpandedTimeframe] = useState<Timeframe | null>(
    currentTimeframe
  );

  // Count enabled timeframes
  const enabledCount = ALL_TIMEFRAMES.filter(
    (tf) => getTimeframeSettings(tf).enabled
  ).length;

  // Sort pivots by time, most recent first
  const sortedPivots = useMemo(() => {
    return [...pivots].sort((a, b) => getTimestamp(b.time) - getTimestamp(a.time));
  }, [pivots]);

  if (!isLoaded) {
    return (
      <Card className="border-border">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Swing Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <div className="text-xs text-muted-foreground">Loading settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Swing Detection
            {enabledCount > 0 && (
              <Badge variant="secondary" className="text-xs h-5">
                {enabledCount} active
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            className="h-6 px-2 text-xs text-muted-foreground"
          >
            Reset All
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-4 pb-4 space-y-1">
        {ALL_TIMEFRAMES.map((tf) => {
          const settings = getTimeframeSettings(tf);
          const isExpanded = expandedTimeframe === tf;
          const isCurrent = tf === currentTimeframe;
          const pivotCount = isCurrent ? pivots.length : 0;

          return (
            <TimeframeSection
              key={tf}
              timeframe={tf}
              settings={settings}
              isExpanded={isExpanded}
              isCurrent={isCurrent}
              pivotCount={pivotCount}
              onToggleExpanded={() =>
                setExpandedTimeframe(isExpanded ? null : tf)
              }
              onEnabledChange={(enabled) => updateTimeframeEnabled(tf, enabled)}
              onLookbackChange={(lookback) => updateTimeframeLookback(tf, lookback)}
              onShowLinesChange={(showLines) => updateTimeframeShowLines(tf, showLines)}
              // Pivot props (only applicable for current timeframe)
              pivots={isCurrent ? sortedPivots : []}
              updatePivotPrice={updatePivotPrice}
              resetPivot={resetPivot}
              resetAllPivots={resetAllPivots}
              hasModifications={isCurrent && hasModifications}
              modifiedCount={isCurrent ? modifiedCount : 0}
              isLoading={isCurrent && isLoading}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Individual timeframe section with settings and pivots
 */
type TimeframeSectionProps = {
  timeframe: Timeframe;
  settings: PerTimeframeSwingSettings;
  isExpanded: boolean;
  isCurrent: boolean;
  pivotCount: number;
  onToggleExpanded: () => void;
  onEnabledChange: (enabled: boolean) => void;
  onLookbackChange: (lookback: number) => void;
  onShowLinesChange: (showLines: boolean) => void;
  // Pivot props
  pivots: EditablePivot[];
  updatePivotPrice: (id: string, newPrice: number) => void;
  resetPivot: (id: string) => void;
  resetAllPivots: () => void;
  hasModifications: boolean;
  modifiedCount: number;
  isLoading: boolean;
};

function TimeframeSection({
  timeframe,
  settings,
  isExpanded,
  isCurrent,
  pivotCount,
  onToggleExpanded,
  onEnabledChange,
  onLookbackChange,
  onShowLinesChange,
  pivots,
  updatePivotPrice,
  resetPivot,
  resetAllPivots,
  hasModifications,
  modifiedCount,
  isLoading,
}: TimeframeSectionProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      {/* Header row */}
      <div
        className={`flex items-center gap-2 py-2 px-2 rounded-md transition-colors ${
          isExpanded ? "bg-muted/50" : "hover:bg-muted/30"
        }`}
      >
        {/* Enable checkbox */}
        <Checkbox
          checked={settings.enabled}
          onCheckedChange={(checked) => onEnabledChange(checked === true)}
          className="h-4 w-4"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Collapsible trigger */}
        <CollapsibleTrigger className="flex items-center gap-2 flex-1">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: TIMEFRAME_COLORS[timeframe] }}
          />
          <span className="text-sm font-medium">{timeframe}</span>

          {isCurrent && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-primary/50 text-primary">
              viewing
            </Badge>
          )}

          {settings.enabled && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              lb={settings.settings.lookback}
            </Badge>
          )}

          {isCurrent && settings.enabled && pivotCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {pivotCount} pivots
            </Badge>
          )}

          {hasModifications && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-amber-500 border-amber-500/30">
              {modifiedCount} modified
            </Badge>
          )}
        </CollapsibleTrigger>
      </div>

      {/* Expanded content */}
      <CollapsibleContent>
        <div className="ml-6 pl-4 border-l-2 border-border/50 space-y-3 py-2">
          {/* Settings row */}
          {settings.enabled && (
            <div className="flex items-center gap-4 flex-wrap">
              {/* Lookback */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Lookback:</Label>
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={settings.settings.lookback}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      onLookbackChange(val);
                    }
                  }}
                  className="h-6 w-14 text-xs"
                />
              </div>

              {/* Show lines */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={settings.settings.showLines}
                  onCheckedChange={(checked) => onShowLinesChange(checked === true)}
                  className="h-3.5 w-3.5"
                />
                <Label className="text-xs cursor-pointer">Show lines</Label>
              </div>

              {/* Reset pivots button */}
              {hasModifications && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetAllPivots}
                  className="h-6 px-2 text-xs ml-auto"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reset Pivots
                </Button>
              )}
            </div>
          )}

          {!settings.enabled && (
            <div className="text-xs text-muted-foreground py-1">
              Enable swing detection to see pivot points
            </div>
          )}

          {/* Pivot points table (only for current timeframe when enabled) */}
          {isCurrent && settings.enabled && (
            <div className="pt-2">
              {isLoading ? (
                <div className="text-xs text-muted-foreground py-2 text-center">
                  Loading pivot points...
                </div>
              ) : pivots.length === 0 ? (
                <div className="text-xs text-muted-foreground py-2 text-center">
                  No pivot points detected
                </div>
              ) : (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="h-6 py-1 px-2 w-10">Label</TableHead>
                        <TableHead className="h-6 py-1 px-2 w-12">Type</TableHead>
                        <TableHead className="h-6 py-1 px-2 w-20">Time</TableHead>
                        <TableHead className="h-6 py-1 px-2">Price</TableHead>
                        <TableHead className="h-6 py-1 px-2 w-8"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pivots.map((pivot) => (
                        <PivotRow
                          key={pivot.id}
                          pivot={pivot}
                          updatePivotPrice={updatePivotPrice}
                          resetPivot={resetPivot}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}

          {/* Message for non-current timeframes */}
          {!isCurrent && settings.enabled && (
            <div className="text-xs text-muted-foreground py-1">
              Switch chart to {timeframe} to see pivot points
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Individual pivot row with editable price
 */
type PivotRowProps = {
  pivot: EditablePivot;
  updatePivotPrice: (id: string, newPrice: number) => void;
  resetPivot: (id: string) => void;
};

function PivotRow({ pivot, updatePivotPrice, resetPivot }: PivotRowProps) {
  const [editValue, setEditValue] = useState<string>(formatPrice(pivot.price));
  const [isFocused, setIsFocused] = useState(false);

  const isHigh = pivot.type === "high";

  const handleBlur = () => {
    setIsFocused(false);
    const newPrice = parseFloat(editValue);
    if (!isNaN(newPrice) && newPrice > 0) {
      updatePivotPrice(pivot.id, newPrice);
    } else {
      setEditValue(formatPrice(pivot.price));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === "Escape") {
      setEditValue(formatPrice(pivot.price));
      (e.target as HTMLInputElement).blur();
    }
  };

  const hasAbcLabel = !!pivot.abcLabel;
  const bgClass = hasAbcLabel
    ? "bg-green-500/10"
    : pivot.isModified
      ? isHigh
        ? "bg-green-500/10"
        : "bg-red-500/10"
      : "";

  return (
    <TableRow className={`text-xs ${bgClass}`}>
      <TableCell className="py-1 px-2">
        {pivot.abcLabel ? (
          <Badge
            variant="secondary"
            className="h-4 w-4 p-0 flex items-center justify-center text-[10px] font-bold bg-green-500/20 text-green-400 border-green-500/30"
          >
            {pivot.abcLabel}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="py-1 px-2">
        <div className="flex items-center gap-1">
          {isHigh ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span className={isHigh ? "text-green-500" : "text-red-500"}>
            {isHigh ? "H" : "L"}
          </span>
        </div>
      </TableCell>
      <TableCell className="py-1 px-2 text-muted-foreground text-[10px]">
        {formatTime(pivot.time)}
      </TableCell>
      <TableCell className="py-1 px-2">
        <div className="flex items-center gap-1">
          <Input
            type="text"
            value={isFocused ? editValue : formatPrice(pivot.price)}
            onChange={(e) => setEditValue(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setEditValue(formatPrice(pivot.price));
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`h-5 w-20 text-[10px] px-1 ${
              pivot.isModified
                ? "border-amber-500/50 text-amber-600 dark:text-amber-400"
                : ""
            }`}
          />
          {pivot.isModified && (
            <span
              className="text-[8px] text-muted-foreground"
              title={`Original: ${formatPrice(pivot.originalPrice)}`}
            >
              ({formatPrice(pivot.originalPrice)})
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="py-1 px-2">
        {pivot.isModified && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => resetPivot(pivot.id)}
            className="h-4 w-4 p-0"
            title="Reset to original"
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
