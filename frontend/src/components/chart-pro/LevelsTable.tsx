"use client";

/**
 * Levels Table Component
 *
 * Displays all visible strategy levels in a sortable, filterable table.
 * Syncs with StrategyPanel visibility configuration.
 */

import React, { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, EyeOff, ChevronDown, ChevronRight, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Timeframe } from "@/lib/chart-constants";
import {
  type StrategyLevel,
  type StrategySource,
  type LevelDirection,
  type VisibilityConfig,
  isLevelVisible,
  TIMEFRAME_COLORS,
  STRATEGY_COLORS,
  DIRECTION_COLORS,
  STRATEGY_DISPLAY_NAMES,
} from "@/lib/chart-pro/strategy-types";

type SortField = "timeframe" | "strategy" | "direction" | "ratio" | "price" | "heat";
type SortDirection = "asc" | "desc";

type LevelsTableProps = {
  levels: StrategyLevel[];
  visibilityConfig: VisibilityConfig;
  onToggleLevelVisibility?: (level: StrategyLevel) => void;
  onLevelClick?: (level: StrategyLevel) => void;
};

// Timeframe sort order (higher timeframes first)
const TIMEFRAME_ORDER: Record<Timeframe, number> = {
  "1M": 0,
  "1W": 1,
  "1D": 2,
  "4H": 3,
  "1H": 4,
  "15m": 5,
  "5m": 6,
  "3m": 7,
  "1m": 8,
};

// Heat score explanation for tooltip
const HEAT_EXPLANATION = `Heat Score (0-100) measures confluence:

• 0-20: Low - Few nearby levels
• 20-40: Moderate - Some clustering
• 40-60: Medium - Notable confluence
• 60-80: High - Strong confluence zone
• 80-100: Very High - Major confluence area

Higher heat = more levels clustered at similar prices,
indicating stronger support/resistance.`;

// Format price for display
function formatCalcPrice(price: number | undefined): string {
  if (price === undefined) return "N/A";
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toFixed(4);
}

// ABC label type for correlation with chart
type ABCLabel = "A" | "B" | "C";

// Input with optional ABC label
type CalcInput = {
  label: string;
  value: string;
  abcLabel?: ABCLabel;
};

// Get calculation details based on strategy
function getCalculationDetails(level: StrategyLevel): {
  formula: string;
  inputs: CalcInput[];
  calculation: string;
} {
  const dir = level.direction === "long" ? "buy" : "sell";
  const high = level.pivotHigh;
  const low = level.pivotLow;
  const a = level.pointA;
  const b = level.pointB;
  const c = level.pointC;

  switch (level.strategy) {
    case "RETRACEMENT": {
      if (high !== undefined && low !== undefined) {
        const range = high - low;
        return {
          formula: dir === "buy"
            ? `Price = High - (Range × ${level.ratio})`
            : `Price = Low + (Range × ${level.ratio})`,
          inputs: [
            { label: "Pivot High", value: formatCalcPrice(high) },
            { label: "Pivot Low", value: formatCalcPrice(low) },
            { label: "Range", value: formatCalcPrice(range) },
          ],
          calculation: dir === "buy"
            ? `${formatCalcPrice(high)} - (${formatCalcPrice(range)} × ${level.ratio}) = ${formatCalcPrice(level.price)}`
            : `${formatCalcPrice(low)} + (${formatCalcPrice(range)} × ${level.ratio}) = ${formatCalcPrice(level.price)}`,
        };
      }
      return {
        formula: "Retracement calculation",
        inputs: [],
        calculation: `Result: ${formatCalcPrice(level.price)}`,
      };
    }
    case "EXTENSION": {
      if (high !== undefined && low !== undefined) {
        const range = high - low;
        return {
          formula: dir === "buy"
            ? `Price = Low - (Range × ${level.ratio})`
            : `Price = High + (Range × ${level.ratio})`,
          inputs: [
            { label: "Pivot High", value: formatCalcPrice(high) },
            { label: "Pivot Low", value: formatCalcPrice(low) },
            { label: "Range", value: formatCalcPrice(range) },
          ],
          calculation: dir === "buy"
            ? `${formatCalcPrice(low)} - (${formatCalcPrice(range)} × ${level.ratio}) = ${formatCalcPrice(level.price)}`
            : `${formatCalcPrice(high)} + (${formatCalcPrice(range)} × ${level.ratio}) = ${formatCalcPrice(level.price)}`,
        };
      }
      return {
        formula: "Extension calculation",
        inputs: [],
        calculation: `Result: ${formatCalcPrice(level.price)}`,
      };
    }
    case "PROJECTION": {
      if (a !== undefined && b !== undefined && c !== undefined) {
        const swing = Math.abs(a - b);
        return {
          formula: dir === "buy"
            ? `Price = C - (|A-B| × ${level.ratio})`
            : `Price = C + (|A-B| × ${level.ratio})`,
          inputs: [
            { label: "Point A", value: formatCalcPrice(a), abcLabel: "A" as const },
            { label: "Point B", value: formatCalcPrice(b), abcLabel: "B" as const },
            { label: "Point C", value: formatCalcPrice(c), abcLabel: "C" as const },
            { label: "|A-B|", value: formatCalcPrice(swing) },
          ],
          calculation: dir === "buy"
            ? `${formatCalcPrice(c)} - (${formatCalcPrice(swing)} × ${level.ratio}) = ${formatCalcPrice(level.price)}`
            : `${formatCalcPrice(c)} + (${formatCalcPrice(swing)} × ${level.ratio}) = ${formatCalcPrice(level.price)}`,
        };
      }
      return {
        formula: "Projection calculation",
        inputs: [],
        calculation: `Result: ${formatCalcPrice(level.price)}`,
      };
    }
    case "EXPANSION": {
      if (a !== undefined && b !== undefined) {
        const swing = Math.abs(a - b);
        return {
          formula: dir === "buy"
            ? `Price = B + (|A-B| × ${level.ratio})`
            : `Price = B - (|A-B| × ${level.ratio})`,
          inputs: [
            { label: "Point A", value: formatCalcPrice(a), abcLabel: "A" as const },
            { label: "Point B", value: formatCalcPrice(b), abcLabel: "B" as const },
            { label: "|A-B|", value: formatCalcPrice(swing) },
          ],
          calculation: dir === "buy"
            ? `${formatCalcPrice(b)} + (${formatCalcPrice(swing)} × ${level.ratio}) = ${formatCalcPrice(level.price)}`
            : `${formatCalcPrice(b)} - (${formatCalcPrice(swing)} × ${level.ratio}) = ${formatCalcPrice(level.price)}`,
        };
      }
      return {
        formula: "Expansion calculation",
        inputs: [],
        calculation: `Result: ${formatCalcPrice(level.price)}`,
      };
    }
    default:
      return {
        formula: "N/A",
        inputs: [],
        calculation: `Result: ${formatCalcPrice(level.price)}`,
      };
  }
}

export function LevelsTable({
  levels,
  visibilityConfig,
  onToggleLevelVisibility,
  onLevelClick,
}: LevelsTableProps) {
  // Sorting state
  const [sortField, setSortField] = useState<SortField>("heat");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Filter state
  const [filterTimeframe, setFilterTimeframe] = useState<Timeframe | "all">("all");
  const [filterStrategy, setFilterStrategy] = useState<StrategySource | "all">("all");
  const [filterDirection, setFilterDirection] = useState<LevelDirection | "all">("all");

  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpanded = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle sort
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Get sort icon
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  // Filter and sort levels
  const filteredAndSortedLevels = useMemo(() => {
    // Start with visible levels only
    let result = levels.filter((level) => isLevelVisible(level, visibilityConfig));

    // Apply filters
    if (filterTimeframe !== "all") {
      result = result.filter((l) => l.timeframe === filterTimeframe);
    }
    if (filterStrategy !== "all") {
      result = result.filter((l) => l.strategy === filterStrategy);
    }
    if (filterDirection !== "all") {
      result = result.filter((l) => l.direction === filterDirection);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "timeframe":
          comparison = TIMEFRAME_ORDER[a.timeframe] - TIMEFRAME_ORDER[b.timeframe];
          break;
        case "strategy":
          comparison = a.strategy.localeCompare(b.strategy);
          break;
        case "direction":
          comparison = a.direction.localeCompare(b.direction);
          break;
        case "ratio":
          comparison = a.ratio - b.ratio;
          break;
        case "price":
          comparison = a.price - b.price;
          break;
        case "heat":
          comparison = a.heat - b.heat;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [
    levels,
    visibilityConfig,
    filterTimeframe,
    filterStrategy,
    filterDirection,
    sortField,
    sortDirection,
  ]);

  // Get unique values for filters
  const visibleLevels = levels.filter((l) => isLevelVisible(l, visibilityConfig));
  const uniqueTimeframes = [...new Set(visibleLevels.map((l) => l.timeframe))];
  const uniqueStrategies = [...new Set(visibleLevels.map((l) => l.strategy))];

  // Get heat color
  const getHeatColor = (heat: number): string => {
    if (heat >= 80) return "bg-red-500/20 text-red-400 border-red-500/50";
    if (heat >= 60) return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    if (heat >= 40) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    if (heat >= 20) return "bg-green-500/20 text-green-400 border-green-500/50";
    return "bg-muted/50 text-muted-foreground border-muted";
  };

  // Format price
  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    return price.toFixed(4);
  };

  if (visibleLevels.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        No levels selected. Enable timeframes and strategies in the panel above.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Timeframe:</span>
          <Select
            value={filterTimeframe}
            onValueChange={(v) => setFilterTimeframe(v as Timeframe | "all")}
          >
            <SelectTrigger className="h-7 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {uniqueTimeframes.map((tf) => (
                <SelectItem key={tf} value={tf}>
                  {tf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Strategy:</span>
          <Select
            value={filterStrategy}
            onValueChange={(v) => setFilterStrategy(v as StrategySource | "all")}
          >
            <SelectTrigger className="h-7 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {uniqueStrategies.map((s) => (
                <SelectItem key={s} value={s}>
                  {STRATEGY_DISPLAY_NAMES[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Direction:</span>
          <Select
            value={filterDirection}
            onValueChange={(v) => setFilterDirection(v as LevelDirection | "all")}
          >
            <SelectTrigger className="h-7 w-20 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1" />

        <Badge variant="outline" className="text-xs">
          {filteredAndSortedLevels.length} / {visibleLevels.length} levels
        </Badge>
      </div>

      {/* Table */}
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-16">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1 -ml-1 font-medium"
                  onClick={() => toggleSort("timeframe")}
                >
                  TF
                  {getSortIcon("timeframe")}
                </Button>
              </TableHead>
              <TableHead className="w-24">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1 -ml-1 font-medium"
                  onClick={() => toggleSort("strategy")}
                >
                  Strategy
                  {getSortIcon("strategy")}
                </Button>
              </TableHead>
              <TableHead className="w-16">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1 -ml-1 font-medium"
                  onClick={() => toggleSort("direction")}
                >
                  Dir
                  {getSortIcon("direction")}
                </Button>
              </TableHead>
              <TableHead className="w-20">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1 -ml-1 font-medium"
                  onClick={() => toggleSort("ratio")}
                >
                  Ratio
                  {getSortIcon("ratio")}
                </Button>
              </TableHead>
              <TableHead className="w-24 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1 -mr-1 font-medium float-right"
                  onClick={() => toggleSort("price")}
                >
                  Price
                  {getSortIcon("price")}
                </Button>
              </TableHead>
              <TableHead className="w-16">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-1 -ml-1 font-medium"
                      onClick={() => toggleSort("heat")}
                    >
                      Heat
                      <Info className="h-3 w-3 ml-1 opacity-50" />
                      {getSortIcon("heat")}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs whitespace-pre-line text-xs">
                    {HEAT_EXPLANATION}
                  </TooltipContent>
                </Tooltip>
              </TableHead>
              {onToggleLevelVisibility && <TableHead className="w-10" />}
              {/* Expand column */}
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedLevels.map((level) => {
              const isExpanded = expandedRows.has(level.id);
              const colSpan = 6 + (onToggleLevelVisibility ? 1 : 0) + 1; // +1 for expand column

              return (
                <React.Fragment key={level.id}>
                  <TableRow
                    className={`cursor-pointer ${
                      onLevelClick ? "hover:bg-muted/50" : ""
                    } ${isExpanded ? "bg-muted/30" : ""}`}
                    onClick={() => onLevelClick?.(level)}
                  >
                    {/* Timeframe */}
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: TIMEFRAME_COLORS[level.timeframe] }}
                        />
                        <span className="text-xs font-medium">{level.timeframe}</span>
                      </div>
                    </TableCell>

                    {/* Strategy */}
                    <TableCell className="py-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: STRATEGY_COLORS[level.strategy] }}
                        />
                        <span className="text-xs">
                          {STRATEGY_DISPLAY_NAMES[level.strategy]}
                        </span>
                      </div>
                    </TableCell>

                    {/* Direction */}
                    <TableCell className="py-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 h-5"
                        style={{
                          borderColor: DIRECTION_COLORS[level.direction],
                          color: DIRECTION_COLORS[level.direction],
                        }}
                      >
                        {level.direction === "long" ? "L" : "S"}
                      </Badge>
                    </TableCell>

                    {/* Ratio / Label */}
                    <TableCell className="py-2">
                      <span className="text-xs text-muted-foreground">{level.label}</span>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="py-2 text-right">
                      <span className="text-xs font-mono">{formatPrice(level.price)}</span>
                    </TableCell>

                    {/* Heat */}
                    <TableCell className="py-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 h-5 ${getHeatColor(level.heat)}`}
                      >
                        {level.heat}
                      </Badge>
                    </TableCell>

                    {/* Toggle visibility */}
                    {onToggleLevelVisibility && (
                      <TableCell className="py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleLevelVisibility(level);
                          }}
                        >
                          {level.visible ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-muted-foreground" />
                          )}
                        </Button>
                      </TableCell>
                    )}

                    {/* Expand button */}
                    <TableCell className="py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowExpanded(level.id);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3" />
                        ) : (
                          <ChevronRight className="h-3 w-3" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>

                  {/* Expanded calculation details */}
                  {isExpanded && (() => {
                    const calcDetails = getCalculationDetails(level);
                    return (
                      <TableRow key={`${level.id}-details`} className="bg-muted/20">
                        <TableCell colSpan={colSpan} className="py-3 px-4">
                          <div className="space-y-3 text-xs">
                            <div className="font-medium text-muted-foreground">Calculation Details</div>

                            {/* Basic info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <span className="text-muted-foreground">Strategy:</span>{" "}
                                <span className="font-mono">{STRATEGY_DISPLAY_NAMES[level.strategy]}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Direction:</span>{" "}
                                <span className="font-mono">{level.direction === "long" ? "Buy" : "Sell"}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Ratio:</span>{" "}
                                <span className="font-mono">{(level.ratio * 100).toFixed(1)}%</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Timeframe:</span>{" "}
                                <span className="font-mono">{level.timeframe}</span>
                              </div>
                            </div>

                            {/* Input values */}
                            {calcDetails.inputs.length > 0 && (
                              <div className="pt-2 border-t border-muted">
                                <div className="text-muted-foreground mb-2">Input Values:</div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/30 p-2 rounded">
                                  {calcDetails.inputs.map((input) => (
                                    <div key={input.label} className="flex items-center gap-1.5">
                                      {input.abcLabel && (
                                        <Badge
                                          variant="secondary"
                                          className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold bg-green-500/20 text-green-400 border-green-500/30"
                                        >
                                          {input.abcLabel}
                                        </Badge>
                                      )}
                                      <span className="text-muted-foreground">{input.label}:</span>{" "}
                                      <span className="font-mono font-medium">{input.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Formula */}
                            <div className="pt-2 border-t border-muted">
                              <span className="text-muted-foreground">Formula:</span>{" "}
                              <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                                {calcDetails.formula}
                              </code>
                            </div>

                            {/* Full calculation */}
                            <div>
                              <span className="text-muted-foreground">Calculation:</span>{" "}
                              <code className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-xs font-mono text-blue-400">
                                {calcDetails.calculation}
                              </code>
                            </div>

                            {/* Heat score */}
                            <div className="pt-2 border-t border-muted text-muted-foreground">
                              <span className="font-medium">Heat Score: {level.heat}</span>
                              {" - "}
                              {level.heat >= 80 ? "Very High confluence zone" :
                               level.heat >= 60 ? "High confluence zone" :
                               level.heat >= 40 ? "Medium confluence" :
                               level.heat >= 20 ? "Moderate clustering" :
                               "Low confluence"}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })()}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
