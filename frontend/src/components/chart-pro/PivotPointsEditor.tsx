"use client";

/**
 * Pivot Points Editor Component
 *
 * Displays detected pivot points in an editable table in chronological order.
 * Users can manually adjust pivot prices and see the changes
 * reflected on the chart in real-time.
 */

import { RotateCcw, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import type { Timeframe } from "@/lib/chart-constants";
import type { EditablePivot } from "@/hooks/use-editable-pivots";
import { TIMEFRAME_COLORS } from "@/lib/chart-pro/strategy-types";

export type PivotPointsEditorProps = {
  /** Current timeframe */
  timeframe: Timeframe;
  /** Editable pivot points */
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
  // Already a date string
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

export function PivotPointsEditor({
  timeframe,
  pivots,
  updatePivotPrice,
  resetPivot,
  resetAllPivots,
  hasModifications,
  modifiedCount,
  isLoading = false,
}: PivotPointsEditorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Sort pivots by time, most recent first
  const sortedPivots = useMemo(() => {
    return [...pivots].sort((a, b) => getTimestamp(b.time) - getTimestamp(a.time));
  }, [pivots]);

  return (
    <Card className="border-border">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="py-3 px-4">
          <CollapsibleTrigger className="flex items-center gap-2 w-full">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <CardTitle className="text-sm font-semibold flex-1 text-left flex items-center gap-2">
              Pivot Points
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: TIMEFRAME_COLORS[timeframe] }}
              />
              <span className="text-xs font-normal text-muted-foreground">
                {timeframe}
              </span>
              <Badge variant="secondary" className="text-xs h-5 ml-1">
                {pivots.length}
              </Badge>
              {hasModifications && (
                <Badge variant="outline" className="text-xs h-5 text-amber-500">
                  {modifiedCount} modified
                </Badge>
              )}
            </CardTitle>
            {hasModifications && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  resetAllPivots();
                }}
                className="h-6 px-2 text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset All
              </Button>
            )}
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 px-4 pb-4">
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                Loading pivot points...
              </div>
            ) : pivots.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No pivot points detected. Enable swing detection to see pivots.
              </div>
            ) : (
              <div className="border rounded-md max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs">
                      <TableHead className="h-7 py-1 px-2 w-10">Label</TableHead>
                      <TableHead className="h-7 py-1 px-2 w-14">Type</TableHead>
                      <TableHead className="h-7 py-1 px-2 w-24">Time</TableHead>
                      <TableHead className="h-7 py-1 px-2">Price</TableHead>
                      <TableHead className="h-7 py-1 px-2 w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedPivots.map((pivot) => (
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
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
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

  // Determine color based on pivot type
  const isHigh = pivot.type === "high";

  const handleBlur = () => {
    setIsFocused(false);
    const newPrice = parseFloat(editValue);
    if (!isNaN(newPrice) && newPrice > 0) {
      updatePivotPrice(pivot.id, newPrice);
    } else {
      // Reset to current value if invalid
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

  // Highlight ABC labeled pivots
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
            className="h-5 w-5 p-0 flex items-center justify-center text-xs font-bold bg-green-500/20 text-green-400 border-green-500/30"
          >
            {pivot.abcLabel}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="py-1 px-2">
        <div className="flex items-center gap-1.5">
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
      <TableCell className="py-1 px-2 text-muted-foreground">
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
            className={`h-6 w-24 text-xs px-1 ${
              pivot.isModified
                ? "border-amber-500/50 text-amber-600 dark:text-amber-400"
                : ""
            }`}
          />
          {pivot.isModified && (
            <span
              className="text-[9px] text-muted-foreground"
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
            className="h-5 w-5 p-0"
            title="Reset to original"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
