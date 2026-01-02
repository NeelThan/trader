"use client";

/**
 * Signal Suggestions Panel
 *
 * Displays actionable trade signals based on trend alignment across timeframes.
 * Shows relevant Fibonacci levels for each signal's timeframe pair.
 * Users can filter by signal type (Long, Short, Wait).
 */

import { TrendingUp, TrendingDown, Pause, Target, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SignalSuggestion, SignalFilters } from "@/hooks/use-signal-suggestions";
import type { StrategyLevel } from "@/lib/chart-pro/strategy-types";
import type { Timeframe } from "@/lib/chart-constants";

/**
 * Filtered levels for a signal showing entry zones and targets
 */
export type SignalLevels = {
  /** Retracement levels for entry (from lower timeframe) */
  entryLevels: StrategyLevel[];
  /** Extension levels for targets (from higher timeframe) */
  targetLevels: StrategyLevel[];
};

export type SignalSuggestionsPanelProps = {
  signals: SignalSuggestion[];
  filters: SignalFilters;
  onFiltersChange: (filters: SignalFilters) => void;
  longCount: number;
  shortCount: number;
  waitCount: number;
  chartColors: { up: string; down: string };
  /** All Fibonacci levels from multi-TF analysis */
  allLevels?: StrategyLevel[];
};

/**
 * Get levels relevant to a specific signal
 * - Entry levels: Retracements from lower TF matching signal direction
 * - Target levels: Extensions from higher TF matching signal direction
 */
function getSignalLevels(
  signal: SignalSuggestion,
  allLevels: StrategyLevel[]
): SignalLevels {
  const direction = signal.type === "LONG" ? "long" : signal.type === "SHORT" ? "short" : null;

  if (!direction || allLevels.length === 0) {
    return { entryLevels: [], targetLevels: [] };
  }

  // Entry levels: Retracements from lower timeframe
  const entryLevels = allLevels.filter(
    (level) =>
      level.timeframe === signal.lowerTF &&
      level.strategy === "RETRACEMENT" &&
      level.direction === direction
  );

  // Target levels: Extensions from higher timeframe
  const targetLevels = allLevels.filter(
    (level) =>
      level.timeframe === signal.higherTF &&
      level.strategy === "EXTENSION" &&
      level.direction === direction
  );

  return { entryLevels, targetLevels };
}

/**
 * Format price for display
 */
function formatPrice(price: number): string {
  if (price >= 1000) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

/**
 * Get icon and styling for signal type
 */
function getSignalDisplay(
  type: SignalSuggestion["type"],
  chartColors: { up: string; down: string }
) {
  switch (type) {
    case "LONG":
      return {
        icon: TrendingUp,
        color: chartColors.up,
        bgClass: "bg-green-500/10 border-green-500/30",
        label: "GO LONG",
      };
    case "SHORT":
      return {
        icon: TrendingDown,
        color: chartColors.down,
        bgClass: "bg-red-500/10 border-red-500/30",
        label: "GO SHORT",
      };
    case "WAIT":
      return {
        icon: Pause,
        color: "#9ca3af",
        bgClass: "bg-gray-500/10 border-gray-500/30",
        label: "WAIT",
      };
  }
}

/**
 * Entry Zone Icon Component
 */
function EntryZoneIcon({ zone }: { zone: SignalSuggestion["entryZone"] }) {
  const iconClass = "w-3.5 h-3.5 text-muted-foreground";
  switch (zone) {
    case "support":
      return <ArrowUpCircle className={iconClass} />;
    case "resistance":
      return <ArrowDownCircle className={iconClass} />;
    case "range":
      return <Target className={iconClass} />;
  }
}

/**
 * Level Row Component for displaying a single Fibonacci level
 */
function LevelRow({
  level,
  type,
  chartColors,
}: {
  level: StrategyLevel;
  type: "entry" | "target";
  chartColors: { up: string; down: string };
}) {
  const color = level.direction === "long" ? chartColors.up : chartColors.down;
  const bgColor = type === "entry" ? "bg-blue-500/10" : "bg-amber-500/10";

  return (
    <div className={`flex items-center justify-between py-1 px-2 rounded ${bgColor}`}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-8">{level.label}</span>
        <span className="text-xs font-mono font-medium" style={{ color }}>
          {formatPrice(level.price)}
        </span>
      </div>
      {level.heat > 0 && (
        <Badge variant="outline" className="text-[9px] h-3.5 px-1 opacity-70">
          {level.heat}%
        </Badge>
      )}
    </div>
  );
}

/**
 * Signal Card Component
 */
function SignalCard({
  signal,
  chartColors,
  signalLevels,
}: {
  signal: SignalSuggestion;
  chartColors: { up: string; down: string };
  signalLevels: SignalLevels;
}) {
  const display = getSignalDisplay(signal.type, chartColors);
  const Icon = display.icon;

  const hasLevels = signalLevels.entryLevels.length > 0 || signalLevels.targetLevels.length > 0;

  return (
    <div
      className={`p-3 rounded-lg border ${display.bgClass} ${
        signal.isActive ? "ring-1 ring-offset-1 ring-offset-background" : "opacity-70"
      }`}
      style={{
        ...(signal.isActive && { "--tw-ring-color": display.color } as React.CSSProperties),
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color: display.color }} />
          <span className="text-sm font-semibold" style={{ color: display.color }}>
            {display.label}
          </span>
          {signal.isActive && (
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/50 text-amber-400">
              ACTIVE
            </Badge>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>{signal.confidence}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Confidence based on indicator alignment
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Timeframe Pair */}
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="secondary" className="text-xs">
          {signal.pairName}
        </Badge>
        <span className="text-xs text-muted-foreground capitalize">
          {signal.tradingStyle}
        </span>
      </div>

      {/* Description */}
      <p className="text-sm font-medium mb-1">{signal.description}</p>
      <p className="text-xs text-muted-foreground mb-2">{signal.reasoning}</p>

      {/* Fibonacci Levels */}
      {hasLevels && signal.type !== "WAIT" && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          {/* Entry Levels */}
          {signalLevels.entryLevels.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowUpCircle className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                  Entry Zones ({signal.lowerTF})
                </span>
              </div>
              <div className="space-y-0.5">
                {signalLevels.entryLevels.slice(0, 3).map((level) => (
                  <LevelRow
                    key={level.id}
                    level={level}
                    type="entry"
                    chartColors={chartColors}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Target Levels */}
          {signalLevels.targetLevels.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                  Targets ({signal.higherTF})
                </span>
              </div>
              <div className="space-y-0.5">
                {signalLevels.targetLevels.slice(0, 3).map((level) => (
                  <LevelRow
                    key={level.id}
                    level={level}
                    type="target"
                    chartColors={chartColors}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Entry Zone (shown when no specific levels) */}
      {!hasLevels && (
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <EntryZoneIcon zone={signal.entryZone} />
          <span className="text-xs text-muted-foreground">
            Watch {signal.entryZone} levels for entry
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Main Signal Suggestions Panel
 */
export function SignalSuggestionsPanel({
  signals,
  filters,
  onFiltersChange,
  longCount,
  shortCount,
  waitCount,
  chartColors,
  allLevels = [],
}: SignalSuggestionsPanelProps) {
  // Separate active and inactive signals
  const activeSignals = signals.filter((s) => s.isActive);
  const inactiveSignals = signals.filter((s) => !s.isActive);

  return (
    <div className="space-y-4">
      {/* Filter Toggles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-long"
              checked={filters.showLong}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, showLong: checked === true })
              }
            />
            <Label
              htmlFor="show-long"
              className="text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" style={{ color: chartColors.up }} />
              Long ({longCount})
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="show-short"
              checked={filters.showShort}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, showShort: checked === true })
              }
            />
            <Label
              htmlFor="show-short"
              className="text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <TrendingDown className="w-3.5 h-3.5" style={{ color: chartColors.down }} />
              Short ({shortCount})
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="show-wait"
              checked={filters.showWait}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, showWait: checked === true })
              }
            />
            <Label
              htmlFor="show-wait"
              className="text-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5 text-gray-400" />
              Wait ({waitCount})
            </Label>
          </div>
        </div>
      </div>

      {/* Active Signals */}
      {activeSignals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Active Setups
          </h4>
          <div className="space-y-2">
            {activeSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                chartColors={chartColors}
                signalLevels={getSignalLevels(signal, allLevels)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Inactive/Waiting Signals */}
      {inactiveSignals.length > 0 && filters.showWait && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Waiting for Setup
          </h4>
          <div className="space-y-2">
            {inactiveSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                chartColors={chartColors}
                signalLevels={getSignalLevels(signal, allLevels)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Signals Message */}
      {signals.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No signals available</p>
          <p className="text-xs">Waiting for trend data...</p>
        </div>
      )}

      {/* Legend */}
      <div className="pt-2 border-t text-[10px] text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3" style={{ color: chartColors.up }} />
          <span>LONG: Higher TF bullish + Lower TF bearish (buy pullback)</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="w-3 h-3" style={{ color: chartColors.down }} />
          <span>SHORT: Higher TF bearish + Lower TF bullish (sell rally)</span>
        </div>
        <div className="flex items-center gap-2">
          <Pause className="w-3 h-3 text-gray-400" />
          <span>WAIT: Same direction - wait for counter-trend move</span>
        </div>
      </div>
    </div>
  );
}
