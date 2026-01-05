"use client";

/**
 * TimeframeSettingsPopover
 *
 * Compact popover for configuring Fibonacci strategy visibility per timeframe.
 * Shows strategies (Retracement, Extension, Projection, Expansion) with ratio toggles.
 * Supports smart defaults based on timeframe (higher TF = fewer levels).
 */

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Sparkles, RotateCcw } from "lucide-react";
import type { Timeframe } from "@/lib/chart-constants";
import {
  type VisibilityConfig,
  type StrategySource,
  type TimeframeSettings,
  FIBONACCI_RATIOS,
  TIMEFRAME_COLORS,
  STRATEGY_COLORS,
  STRATEGY_DISPLAY_NAMES,
  DIRECTION_COLORS,
  ALL_STRATEGIES,
} from "@/lib/chart-pro/strategy-types";
import { cn } from "@/lib/utils";
import { useState } from "react";

/**
 * Smart defaults based on timeframe.
 * Higher timeframes use fewer levels to reduce noise.
 */
const SMART_DEFAULTS: Record<Timeframe, {
  strategies: StrategySource[];
  ratios: Partial<Record<StrategySource, number[]>>;
}> = {
  // Higher timeframes: Focus on key levels only
  "1M": {
    strategies: ["RETRACEMENT", "EXTENSION"],
    ratios: {
      RETRACEMENT: [0.5, 0.618],
      EXTENSION: [1.618],
    },
  },
  "1W": {
    strategies: ["RETRACEMENT", "EXTENSION"],
    ratios: {
      RETRACEMENT: [0.382, 0.5, 0.618],
      EXTENSION: [1.272, 1.618],
    },
  },
  // Medium timeframes: Balanced approach
  "1D": {
    strategies: ["RETRACEMENT", "EXTENSION", "PROJECTION"],
    ratios: {
      RETRACEMENT: [0.382, 0.5, 0.618, 0.786],
      EXTENSION: [1.272, 1.618, 2.618],
      PROJECTION: [1.0, 1.272],
    },
  },
  "4H": {
    strategies: ["RETRACEMENT", "EXTENSION", "PROJECTION"],
    ratios: {
      RETRACEMENT: [0.382, 0.5, 0.618, 0.786],
      EXTENSION: [1.272, 1.618, 2.618],
      PROJECTION: [0.786, 1.0, 1.272, 1.618],
    },
  },
  // Lower timeframes: All levels for precision
  "1H": {
    strategies: ["RETRACEMENT", "EXTENSION", "PROJECTION", "EXPANSION"],
    ratios: {
      RETRACEMENT: [0.382, 0.5, 0.618, 0.786],
      EXTENSION: [1.272, 1.618, 2.618],
      PROJECTION: [0.618, 0.786, 1.0, 1.272, 1.618],
      EXPANSION: [0.618, 1.0, 1.618],
    },
  },
  "15m": {
    strategies: ["RETRACEMENT", "EXTENSION", "PROJECTION", "EXPANSION"],
    ratios: {}, // All ratios enabled
  },
  "1m": {
    strategies: ["RETRACEMENT", "EXTENSION", "PROJECTION", "EXPANSION"],
    ratios: {}, // All ratios enabled
  },
};

/**
 * Pivot data for smart direction detection.
 * Contains B and C pivot values to determine BUY/SELL setup.
 */
export type PivotData = {
  pivotHigh: number | null;
  pivotLow: number | null;
  pointA?: number;
  pointB?: number;
  pointC?: number;
};

/**
 * Determine the recommended direction for a strategy based on pivot relationships.
 *
 * Per docs/references/fibonacci_conditions.md:
 * - Retracement/Extension: B < C → BUY (long), B > C → SELL (short)
 * - Expansion: B > C → BUY (long), B < C → SELL (short) [opposite!]
 * - Projection: A > B → BUY (long), A < B → SELL (short)
 */
function getRecommendedDirection(
  strategy: StrategySource,
  pivotData: PivotData | undefined
): "long" | "short" | null {
  if (!pivotData) return null;

  const { pivotHigh, pivotLow, pointA, pointB, pointC } = pivotData;

  // For projection, we need A and B
  if (strategy === "PROJECTION") {
    if (pointA !== undefined && pointB !== undefined) {
      // A > B → BUY (long), A < B → SELL (short)
      return pointA > pointB ? "long" : "short";
    }
    return null;
  }

  // For other strategies, we need B (high) and C (low) or vice versa
  // Since we track pivotHigh and pivotLow as the most recent swing points,
  // we need to determine which is C (most recent) based on the swing pattern.
  // If pointB and pointC are available, use those directly
  if (pointB !== undefined && pointC !== undefined) {
    const bGreaterThanC = pointB > pointC;

    if (strategy === "EXPANSION") {
      // Expansion: B > C → BUY (long), B < C → SELL (short)
      return bGreaterThanC ? "long" : "short";
    } else {
      // Retracement/Extension: B < C → BUY (long), B > C → SELL (short)
      return bGreaterThanC ? "short" : "long";
    }
  }

  // Fallback: if we only have pivotHigh/pivotLow, we can't determine direction
  // without knowing which one is the most recent (C)
  return null;
}

type TimeframeSettingsPopoverProps = {
  timeframe: Timeframe;
  isEnabled: boolean;
  visibilityConfig: VisibilityConfig;
  onVisibilityChange: (config: VisibilityConfig) => void;
  onToggleTimeframe: () => void;
  pivotData?: PivotData;
  children: React.ReactNode;
};

const EPSILON = 0.0001;

function ratioEquals(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

export function TimeframeSettingsPopover({
  timeframe,
  isEnabled,
  visibilityConfig,
  onVisibilityChange,
  onToggleTimeframe,
  pivotData,
  children,
}: TimeframeSettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedStrategies, setExpandedStrategies] = useState<Record<string, boolean>>({});

  const tfConfig = useMemo(() => {
    return visibilityConfig.timeframes.find(tf => tf.timeframe === timeframe);
  }, [visibilityConfig, timeframe]);

  // Get recommended directions for all strategies based on pivot data
  const recommendedDirections = useMemo(() => {
    const result: Record<StrategySource, "long" | "short" | null> = {
      RETRACEMENT: getRecommendedDirection("RETRACEMENT", pivotData),
      EXTENSION: getRecommendedDirection("EXTENSION", pivotData),
      PROJECTION: getRecommendedDirection("PROJECTION", pivotData),
      EXPANSION: getRecommendedDirection("EXPANSION", pivotData),
      HARMONIC: null,
      SIGNAL: null,
    };
    return result;
  }, [pivotData]);

  // Check if pivot data is available for smart detection
  const hasPivotData = pivotData?.pointB !== undefined && pivotData?.pointC !== undefined;

  // Count enabled ratios
  const enabledCount = useMemo(() => {
    if (!tfConfig || !tfConfig.enabled) return 0;
    let count = 0;
    for (const strat of tfConfig.strategies) {
      if (strat.long.enabled) count += strat.long.ratios.filter(r => r.visible).length;
      if (strat.short.enabled) count += strat.short.ratios.filter(r => r.visible).length;
    }
    return count;
  }, [tfConfig]);

  // Toggle a strategy direction
  const toggleDirection = (strategy: StrategySource, direction: "long" | "short") => {
    const newTimeframes = visibilityConfig.timeframes.map(tf => {
      if (tf.timeframe !== timeframe) return tf;

      return {
        ...tf,
        strategies: tf.strategies.map(strat => {
          if (strat.strategy !== strategy) return strat;

          const currentDir = strat[direction];
          const allRatiosVisible = currentDir.ratios.every(r => r.visible);
          const shouldEnableAll = !currentDir.enabled || !allRatiosVisible;

          return {
            ...strat,
            [direction]: {
              enabled: shouldEnableAll,
              ratios: currentDir.ratios.map(r => ({ ...r, visible: shouldEnableAll })),
            },
          };
        }),
      };
    });

    onVisibilityChange({ timeframes: newTimeframes });
  };

  // Toggle individual ratio
  const toggleRatio = (
    strategy: StrategySource,
    direction: "long" | "short",
    ratio: number
  ) => {
    const newTimeframes = visibilityConfig.timeframes.map(tf => {
      if (tf.timeframe !== timeframe) return tf;

      return {
        ...tf,
        strategies: tf.strategies.map(strat => {
          if (strat.strategy !== strategy) return strat;

          const newRatios = strat[direction].ratios.map(r =>
            ratioEquals(r.ratio, ratio) ? { ...r, visible: !r.visible } : r
          );

          // If any ratio is now visible, enable the direction
          const anyVisible = newRatios.some(r => r.visible);

          return {
            ...strat,
            [direction]: {
              ...strat[direction],
              enabled: anyVisible,
              ratios: newRatios,
            },
          };
        }),
      };
    });

    onVisibilityChange({ timeframes: newTimeframes });
  };

  // Apply smart defaults for this timeframe
  // Uses pivot data to determine which direction (long/short) makes sense
  const applySmartDefaults = () => {
    const defaults = SMART_DEFAULTS[timeframe];

    const newTimeframes = visibilityConfig.timeframes.map(tf => {
      if (tf.timeframe !== timeframe) return tf;

      return {
        ...tf,
        enabled: true,
        strategies: tf.strategies.map(strat => {
          const isEnabledStrategy = defaults.strategies.includes(strat.strategy);
          const defaultRatios = defaults.ratios[strat.strategy];

          // If no specific ratios defined, enable all
          const shouldUseAllRatios = !defaultRatios || defaultRatios.length === 0;

          const newRatios = FIBONACCI_RATIOS[strat.strategy].map(ratio => ({
            ratio,
            visible: shouldUseAllRatios || defaultRatios!.some(dr => ratioEquals(dr, ratio)),
          }));

          const anyVisible = newRatios.some(r => r.visible);

          // Get recommended direction based on pivot data (B vs C relationship)
          const recommendedDir = getRecommendedDirection(strat.strategy, pivotData);

          // If we have pivot data, only enable the recommended direction
          // If no pivot data, enable both (fallback to old behavior)
          const enableLong = recommendedDir === null || recommendedDir === "long";
          const enableShort = recommendedDir === null || recommendedDir === "short";

          return {
            ...strat,
            long: {
              enabled: isEnabledStrategy && anyVisible && enableLong,
              ratios: newRatios,
            },
            short: {
              enabled: isEnabledStrategy && anyVisible && enableShort,
              ratios: newRatios,
            },
          };
        }),
      };
    });

    onVisibilityChange({ timeframes: newTimeframes });
  };

  // Enable all ratios for this timeframe
  const enableAll = () => {
    const newTimeframes = visibilityConfig.timeframes.map(tf => {
      if (tf.timeframe !== timeframe) return tf;

      return {
        ...tf,
        enabled: true,
        strategies: tf.strategies.map(strat => ({
          ...strat,
          long: {
            enabled: true,
            ratios: strat.long.ratios.map(r => ({ ...r, visible: true })),
          },
          short: {
            enabled: true,
            ratios: strat.short.ratios.map(r => ({ ...r, visible: true })),
          },
        })),
      };
    });

    onVisibilityChange({ timeframes: newTimeframes });
  };

  // Reset this timeframe (disable all)
  const resetTimeframe = () => {
    const newTimeframes = visibilityConfig.timeframes.map(tf => {
      if (tf.timeframe !== timeframe) return tf;

      return {
        ...tf,
        enabled: false,
        strategies: tf.strategies.map(strat => ({
          ...strat,
          long: {
            enabled: false,
            ratios: strat.long.ratios.map(r => ({ ...r, visible: false })),
          },
          short: {
            enabled: false,
            ratios: strat.short.ratios.map(r => ({ ...r, visible: false })),
          },
        })),
      };
    });

    onVisibilityChange({ timeframes: newTimeframes });
  };

  // Format ratio for display
  const formatRatio = (strategy: StrategySource, ratio: number): string => {
    if (strategy === "RETRACEMENT") {
      return `${(ratio * 100).toFixed(1)}%`;
    }
    return ratio.toFixed(3);
  };

  // Get direction settings
  const getDirectionSettings = (strategy: StrategySource, direction: "long" | "short") => {
    const stratConfig = tfConfig?.strategies.find(s => s.strategy === strategy);
    return stratConfig?.[direction];
  };

  const color = TIMEFRAME_COLORS[timeframe];

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        sideOffset={4}
      >
        {/* Header */}
        <div
          className="px-3 py-2 border-b flex items-center justify-between"
          style={{ backgroundColor: `${color}10` }}
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isEnabled}
              onCheckedChange={onToggleTimeframe}
              className="h-4 w-4"
            />
            <span className="font-semibold" style={{ color }}>
              {timeframe}
            </span>
            {isEnabled && enabledCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {enabledCount} levels
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={applySmartDefaults}
              title="Apply smart defaults for this timeframe"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Smart
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={enableAll}
              title="Enable all levels"
            >
              All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
              onClick={resetTimeframe}
              title="Reset (disable all levels)"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Strategies */}
        {isEnabled && (
          <div className="p-2 max-h-[400px] overflow-y-auto space-y-1">
            {ALL_STRATEGIES.map(strategy => {
              const stratKey = `${timeframe}-${strategy}`;
              const isExpanded = expandedStrategies[stratKey] ?? false;
              const longSettings = getDirectionSettings(strategy, "long");
              const shortSettings = getDirectionSettings(strategy, "short");
              const longCount = longSettings?.ratios.filter(r => r.visible).length ?? 0;
              const shortCount = shortSettings?.ratios.filter(r => r.visible).length ?? 0;
              const totalCount = (longSettings?.enabled ? longCount : 0) + (shortSettings?.enabled ? shortCount : 0);

              return (
                <Collapsible
                  key={stratKey}
                  open={isExpanded}
                  onOpenChange={open => setExpandedStrategies(prev => ({ ...prev, [stratKey]: open }))}
                >
                  <CollapsibleTrigger className="w-full flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: STRATEGY_COLORS[strategy] }}
                    />
                    <span className="text-xs font-medium flex-1 text-left">
                      {STRATEGY_DISPLAY_NAMES[strategy]}
                    </span>
                    {totalCount > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {totalCount}
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="ml-4 mt-1 space-y-2 border-l border-border/50 pl-2">
                      {/* Long Direction */}
                      <DirectionSection
                        direction="long"
                        strategy={strategy}
                        settings={longSettings}
                        onToggleDirection={() => toggleDirection(strategy, "long")}
                        onToggleRatio={(ratio) => toggleRatio(strategy, "long", ratio)}
                        formatRatio={(ratio) => formatRatio(strategy, ratio)}
                        isRecommended={recommendedDirections[strategy] === "long"}
                      />

                      {/* Short Direction */}
                      <DirectionSection
                        direction="short"
                        strategy={strategy}
                        settings={shortSettings}
                        onToggleDirection={() => toggleDirection(strategy, "short")}
                        onToggleRatio={(ratio) => toggleRatio(strategy, "short", ratio)}
                        formatRatio={(ratio) => formatRatio(strategy, ratio)}
                        isRecommended={recommendedDirections[strategy] === "short"}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Disabled state */}
        {!isEnabled && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Click the checkbox to enable this timeframe
          </div>
        )}

        {/* Footer with smart defaults hint */}
        <div className="px-3 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground">
          <Sparkles className="h-3 w-3 inline mr-1" />
          {hasPivotData ? (
            <>Smart uses pivot B vs C to show only relevant directions</>
          ) : (
            <>Smart defaults use fewer levels on higher timeframes</>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Direction Section Component (Long/Short with ratios)
 */
type DirectionSectionProps = {
  direction: "long" | "short";
  strategy: StrategySource;
  settings: { enabled: boolean; ratios: { ratio: number; visible: boolean }[] } | undefined;
  onToggleDirection: () => void;
  onToggleRatio: (ratio: number) => void;
  formatRatio: (ratio: number) => string;
  /** Whether this direction is recommended based on pivot B vs C relationship */
  isRecommended?: boolean;
};

function DirectionSection({
  direction,
  settings,
  onToggleDirection,
  onToggleRatio,
  formatRatio,
  isRecommended,
}: DirectionSectionProps) {
  const isEnabled = settings?.enabled ?? false;
  const ratios = settings?.ratios ?? [];
  const visibleCount = ratios.filter(r => r.visible).length;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isEnabled}
          onCheckedChange={onToggleDirection}
          className="h-3 w-3"
        />
        <span
          className="text-[11px] font-medium"
          style={{ color: DIRECTION_COLORS[direction] }}
        >
          {direction === "long" ? "Long" : "Short"}
        </span>
        {isRecommended && (
          <Badge
            variant="outline"
            className="text-[9px] h-4 px-1 border-amber-500/50 text-amber-600 bg-amber-500/10"
            title={`Recommended based on pivot B ${direction === "long" ? "<" : ">"} C relationship`}
          >
            <Sparkles className="h-2.5 w-2.5 mr-0.5" />
            rec
          </Badge>
        )}
        {isEnabled && (
          <span className="text-[10px] text-muted-foreground">
            ({visibleCount}/{ratios.length})
          </span>
        )}
      </div>

      {isEnabled && (
        <div className="ml-5 flex flex-wrap gap-1">
          {ratios.map(ratioConfig => (
            <button
              key={ratioConfig.ratio}
              onClick={() => onToggleRatio(ratioConfig.ratio)}
              className={cn(
                "px-1.5 py-0.5 text-[10px] rounded border transition-colors",
                ratioConfig.visible
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
              )}
            >
              {formatRatio(ratioConfig.ratio)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
