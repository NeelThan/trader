"use client";

/**
 * Strategy Panel Component
 *
 * Hierarchical sidebar panel for toggling visibility of strategy levels.
 * Structure: Timeframe → Strategy → Direction (Long/Short) → Ratios
 */

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Timeframe } from "@/lib/chart-constants";
import {
  type StrategySource,
  type VisibilityConfig,
  type TimeframeSettings,
  type TimeframeLevels,
  TIMEFRAME_COLORS,
  STRATEGY_COLORS,
  FIBONACCI_RATIOS,
  STRATEGY_DISPLAY_NAMES,
  DIRECTION_COLORS,
  ALL_TIMEFRAMES,
  ALL_STRATEGIES,
} from "@/lib/chart-pro/strategy-types";

type StrategyPanelProps = {
  visibilityConfig: VisibilityConfig;
  byTimeframe: TimeframeLevels[];
  loadingStates: Record<Timeframe, boolean>;
  onVisibilityChange: (config: VisibilityConfig) => void;
  onReset?: () => void;
};

/** Default strategies to enable when a timeframe is first enabled (ALL of them) */
const DEFAULT_ENABLED_STRATEGIES: StrategySource[] = ALL_STRATEGIES;

/**
 * Create a new timeframe config with default settings
 * Auto-enables all strategies for both long and short
 */
function createTimeframeConfig(timeframe: Timeframe): TimeframeSettings {
  return {
    timeframe,
    enabled: true,
    strategies: ALL_STRATEGIES.map((strategy) => {
      const shouldEnable = DEFAULT_ENABLED_STRATEGIES.includes(strategy);
      return {
        strategy,
        long: {
          enabled: shouldEnable,
          ratios: FIBONACCI_RATIOS[strategy].map((ratio) => ({
            ratio,
            visible: true,
          })),
        },
        short: {
          enabled: shouldEnable,
          ratios: FIBONACCI_RATIOS[strategy].map((ratio) => ({
            ratio,
            visible: true,
          })),
        },
      };
    }),
  };
}

/**
 * Enable default strategies for a timeframe config
 */
function enableDefaultStrategies(tf: TimeframeSettings): TimeframeSettings {
  return {
    ...tf,
    enabled: true,
    strategies: tf.strategies.map((strat) => {
      const shouldEnable = DEFAULT_ENABLED_STRATEGIES.includes(strat.strategy);
      if (!shouldEnable) return strat;

      // Only enable if not already configured (preserve user's ratio choices)
      const hasAnyEnabled = strat.long.enabled || strat.short.enabled;
      if (hasAnyEnabled) return strat;

      return {
        ...strat,
        long: { ...strat.long, enabled: true },
        short: { ...strat.short, enabled: true },
      };
    }),
  };
}

export function StrategyPanel({
  visibilityConfig,
  byTimeframe,
  loadingStates,
  onVisibilityChange,
  onReset,
}: StrategyPanelProps) {
  // Track which sections are expanded
  const [expandedTimeframes, setExpandedTimeframes] = useState<
    Record<Timeframe, boolean>
  >({} as Record<Timeframe, boolean>);
  const [expandedStrategies, setExpandedStrategies] = useState<
    Record<string, boolean>
  >({});

  // Toggle timeframe enabled state (immutable update)
  // When enabling, auto-enables default strategies (Retracement, Extension)
  const toggleTimeframe = (timeframe: Timeframe) => {
    const tfIndex = visibilityConfig.timeframes.findIndex(
      (tf) => tf.timeframe === timeframe
    );

    if (tfIndex >= 0) {
      const currentTf = visibilityConfig.timeframes[tfIndex];
      const isCurrentlyEnabled = currentTf.enabled;

      // Update existing timeframe
      const newTimeframes = visibilityConfig.timeframes.map((tf, idx) => {
        if (idx !== tfIndex) return tf;

        if (isCurrentlyEnabled) {
          // Disabling - just toggle enabled off
          return { ...tf, enabled: false };
        } else {
          // Enabling - enable default strategies too
          return enableDefaultStrategies(tf);
        }
      });
      onVisibilityChange({ timeframes: newTimeframes });
    } else {
      // Add new timeframe config (with defaults enabled)
      onVisibilityChange({
        timeframes: [...visibilityConfig.timeframes, createTimeframeConfig(timeframe)],
      });
    }
  };

  // Toggle strategy direction (immutable update)
  const toggleDirection = (
    timeframe: Timeframe,
    strategy: StrategySource,
    direction: "long" | "short"
  ) => {
    const newTimeframes = visibilityConfig.timeframes.map((tf) => {
      if (tf.timeframe !== timeframe) return tf;

      const newStrategies = tf.strategies.map((strat) => {
        if (strat.strategy !== strategy) return strat;

        return {
          ...strat,
          [direction]: {
            ...strat[direction],
            enabled: !strat[direction].enabled,
          },
        };
      });

      return { ...tf, strategies: newStrategies };
    });

    onVisibilityChange({ timeframes: newTimeframes });
  };

  // Toggle individual ratio visibility (immutable update)
  const toggleRatio = (
    timeframe: Timeframe,
    strategy: StrategySource,
    direction: "long" | "short",
    ratio: number
  ) => {
    const newTimeframes = visibilityConfig.timeframes.map((tf) => {
      if (tf.timeframe !== timeframe) return tf;

      const newStrategies = tf.strategies.map((strat) => {
        if (strat.strategy !== strategy) return strat;

        const newRatios = strat[direction].ratios.map((r) =>
          r.ratio === ratio ? { ...r, visible: !r.visible } : r
        );

        return {
          ...strat,
          [direction]: {
            ...strat[direction],
            ratios: newRatios,
          },
        };
      });

      return { ...tf, strategies: newStrategies };
    });

    onVisibilityChange({ timeframes: newTimeframes });
  };

  // Get level count for a timeframe
  const getTimeframeLevelCount = (tf: Timeframe): number => {
    const tfData = byTimeframe.find((t) => t.timeframe === tf);
    return tfData?.levels.length ?? 0;
  };

  // Get level count for a strategy within a timeframe
  const getStrategyLevelCount = (tf: Timeframe, strategy: StrategySource): number => {
    const tfData = byTimeframe.find((t) => t.timeframe === tf);
    return tfData?.levels.filter((l) => l.strategy === strategy).length ?? 0;
  };

  // Check if a timeframe is enabled
  const isTimeframeEnabled = (tf: Timeframe): boolean => {
    return visibilityConfig.timeframes.find((t) => t.timeframe === tf)?.enabled ?? false;
  };

  // Get direction settings for a strategy
  const getDirectionSettings = (
    tf: Timeframe,
    strategy: StrategySource,
    direction: "long" | "short"
  ) => {
    const tfConfig = visibilityConfig.timeframes.find((t) => t.timeframe === tf);
    const stratConfig = tfConfig?.strategies.find((s) => s.strategy === strategy);
    return stratConfig?.[direction];
  };

  // Format ratio for display
  const formatRatio = (strategy: StrategySource, ratio: number): string => {
    if (strategy === "RETRACEMENT") {
      return `${(ratio * 100).toFixed(1)}%`;
    }
    return ratio.toFixed(3);
  };

  // Count visible levels based on config
  const countVisibleLevels = (): number => {
    let count = 0;
    for (const tf of visibilityConfig.timeframes) {
      if (!tf.enabled) continue;
      for (const strat of tf.strategies) {
        if (strat.long.enabled) {
          count += strat.long.ratios.filter((r) => r.visible).length;
        }
        if (strat.short.enabled) {
          count += strat.short.ratios.filter((r) => r.visible).length;
        }
      }
    }
    return count;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Strategy Panel</h2>

      {/* Timeframes */}
      <div className="space-y-1">
        {ALL_TIMEFRAMES.map((tf) => {
          const isEnabled = isTimeframeEnabled(tf);
          const isLoading = loadingStates[tf];
          const levelCount = getTimeframeLevelCount(tf);
          const isExpanded = expandedTimeframes[tf] ?? false;
          const tfConfig = visibilityConfig.timeframes.find((t) => t.timeframe === tf);

          return (
            <Collapsible
              key={tf}
              open={isExpanded}
              onOpenChange={(open) =>
                setExpandedTimeframes((prev) => ({ ...prev, [tf]: open }))
              }
            >
              {/* Timeframe Header */}
              <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50">
                <Checkbox
                  id={`tf-${tf}`}
                  checked={isEnabled}
                  onCheckedChange={() => toggleTimeframe(tf)}
                />
                <CollapsibleTrigger className="flex-1 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: TIMEFRAME_COLORS[tf] }}
                  />
                  <Label
                    htmlFor={`tf-${tf}`}
                    className="text-sm cursor-pointer font-medium"
                  >
                    {tf}
                  </Label>
                  {isEnabled && (
                    <>
                      {isLoading ? (
                        <Skeleton className="h-4 w-6" />
                      ) : (
                        <Badge variant="secondary" className="text-xs h-5">
                          {levelCount}
                        </Badge>
                      )}
                    </>
                  )}
                  <div className="flex-1" />
                  {isEnabled && (
                    isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )
                  )}
                </CollapsibleTrigger>
              </div>

              {/* Timeframe Content - Strategies */}
              {isEnabled && (
                <CollapsibleContent>
                  <div className="ml-6 mt-1 space-y-1 border-l border-border pl-3">
                    {ALL_STRATEGIES.map((strategy) => {
                      const stratKey = `${tf}-${strategy}`;
                      const isStratExpanded = expandedStrategies[stratKey] ?? false;
                      const stratLevelCount = getStrategyLevelCount(tf, strategy);
                      const stratConfig = tfConfig?.strategies.find(
                        (s) => s.strategy === strategy
                      );
                      const hasAnyEnabled =
                        stratConfig?.long.enabled || stratConfig?.short.enabled;

                      return (
                        <Collapsible
                          key={stratKey}
                          open={isStratExpanded}
                          onOpenChange={(open) =>
                            setExpandedStrategies((prev) => ({
                              ...prev,
                              [stratKey]: open,
                            }))
                          }
                        >
                          {/* Strategy Header */}
                          <CollapsibleTrigger className="w-full flex items-center gap-2 py-1 px-2 rounded-md hover:bg-muted/30">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: STRATEGY_COLORS[strategy] }}
                            />
                            <span className="text-sm">
                              {STRATEGY_DISPLAY_NAMES[strategy]}
                            </span>
                            {hasAnyEnabled && stratLevelCount > 0 && (
                              <Badge
                                variant="outline"
                                className="text-xs h-4 px-1.5"
                              >
                                {stratLevelCount}
                              </Badge>
                            )}
                            <div className="flex-1" />
                            {isStratExpanded ? (
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            )}
                          </CollapsibleTrigger>

                          {/* Strategy Content - Directions */}
                          <CollapsibleContent>
                            <div className="ml-4 mt-1 space-y-2 border-l border-border/50 pl-3">
                              {/* Long Direction */}
                              <DirectionSection
                                direction="long"
                                strategy={strategy}
                                settings={getDirectionSettings(tf, strategy, "long")}
                                onToggleDirection={() =>
                                  toggleDirection(tf, strategy, "long")
                                }
                                onToggleRatio={(ratio) =>
                                  toggleRatio(tf, strategy, "long", ratio)
                                }
                                formatRatio={(ratio) => formatRatio(strategy, ratio)}
                              />

                              {/* Short Direction */}
                              <DirectionSection
                                direction="short"
                                strategy={strategy}
                                settings={getDirectionSettings(tf, strategy, "short")}
                                onToggleDirection={() =>
                                  toggleDirection(tf, strategy, "short")
                                }
                                onToggleRatio={(ratio) =>
                                  toggleRatio(tf, strategy, "short", ratio)
                                }
                                formatRatio={(ratio) => formatRatio(strategy, ratio)}
                              />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              )}
            </Collapsible>
          );
        })}
      </div>

      {/* Summary */}
      <div className="pt-3 border-t border-border space-y-3">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Active Timeframes:</span>
            <span className="font-medium text-foreground">
              {visibilityConfig.timeframes.filter((tf) => tf.enabled).length}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Visible Levels:</span>
            <span className="font-medium text-foreground">{countVisibleLevels()}</span>
          </div>
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="w-full text-xs py-1.5 px-2 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Reset to Defaults
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Direction Section Component
 * Displays long or short toggle with ratio checkboxes
 */
type DirectionSectionProps = {
  direction: "long" | "short";
  strategy: StrategySource;
  settings:
    | { enabled: boolean; ratios: { ratio: number; visible: boolean }[] }
    | undefined;
  onToggleDirection: () => void;
  onToggleRatio: (ratio: number) => void;
  formatRatio: (ratio: number) => string;
};

function DirectionSection({
  direction,
  settings,
  onToggleDirection,
  onToggleRatio,
  formatRatio,
}: DirectionSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isEnabled = settings?.enabled ?? false;
  const ratios = settings?.ratios ?? [];
  const visibleCount = ratios.filter((r) => r.visible).length;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="flex items-center gap-2 py-0.5">
        <Checkbox
          id={`dir-${direction}`}
          checked={isEnabled}
          onCheckedChange={onToggleDirection}
          className="h-3.5 w-3.5"
        />
        <CollapsibleTrigger className="flex items-center gap-2 flex-1">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: DIRECTION_COLORS[direction] }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: DIRECTION_COLORS[direction] }}
          >
            {direction === "long" ? "Long" : "Short"}
          </span>
          {isEnabled && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {visibleCount}/{ratios.length}
            </Badge>
          )}
          <div className="flex-1" />
          {isEnabled &&
            (isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            ))}
        </CollapsibleTrigger>
      </div>

      {isEnabled && (
        <CollapsibleContent>
          <div className="ml-5 mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
            {ratios.map((ratioConfig) => (
              <div
                key={ratioConfig.ratio}
                className="flex items-center gap-1.5 py-0.5"
              >
                <Checkbox
                  id={`ratio-${direction}-${ratioConfig.ratio}`}
                  checked={ratioConfig.visible}
                  onCheckedChange={() => onToggleRatio(ratioConfig.ratio)}
                  className="h-3 w-3"
                />
                <Label
                  htmlFor={`ratio-${direction}-${ratioConfig.ratio}`}
                  className="text-[11px] text-muted-foreground cursor-pointer"
                >
                  {formatRatio(ratioConfig.ratio)}
                </Label>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
