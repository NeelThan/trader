"use client";

/**
 * Reversal Time Panel Component
 *
 * Displays velocity metrics and time estimates to reach Fibonacci levels.
 * Shows:
 * - Current velocity gauge (price movement per bar)
 * - Direction indicator (up/down/sideways)
 * - Table of time estimates for each Fibonacci level
 */

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";
import type { VelocityMetrics, LevelTimeEstimate } from "@/hooks/use-reversal-time";

type ReversalTimePanelProps = {
  velocity: VelocityMetrics | null;
  estimates: LevelTimeEstimate[];
  currentPrice: number;
  isLoading?: boolean;
  error?: string | null;
};

// Get direction icon
function DirectionIcon({ direction }: { direction: string }) {
  switch (direction) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-400" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-400" />;
    default:
      return <Minus className="h-4 w-4 text-gray-400" />;
  }
}

// Get confidence color class
function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return "text-green-400";
  if (confidence >= 40) return "text-yellow-400";
  return "text-gray-400";
}

// Format estimated time for display
function formatEstimatedTime(isoTime: string | null): string {
  if (!isoTime) return "N/A";

  try {
    const date = new Date(isoTime);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 1) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `~${diffMins}m`;
      }
      return `~${diffHours}h`;
    }
    if (diffDays < 7) {
      return `~${diffDays}d`;
    }
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `~${weeks}w`;
    }
    const months = Math.floor(diffDays / 30);
    return `~${months}mo`;
  } catch {
    return "N/A";
  }
}

// Format price for display
function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return price.toFixed(4);
}

export function ReversalTimePanel({
  velocity,
  estimates,
  currentPrice,
  isLoading = false,
  error = null,
}: ReversalTimePanelProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-16 bg-muted/30 rounded-lg" />
        <div className="h-32 bg-muted/30 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (!velocity) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No velocity data available. Need more price bars.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Velocity Summary */}
      <div className="grid grid-cols-4 gap-3">
        {/* Direction */}
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">Direction</div>
          <div className="flex items-center gap-2">
            <DirectionIcon direction={velocity.direction} />
            <span className="text-sm font-medium capitalize">{velocity.direction}</span>
          </div>
        </div>

        {/* Price per Bar */}
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">$/Bar</div>
          <div
            className={`text-sm font-mono font-medium ${
              velocity.price_per_bar > 0
                ? "text-green-400"
                : velocity.price_per_bar < 0
                ? "text-red-400"
                : "text-gray-400"
            }`}
          >
            {velocity.price_per_bar >= 0 ? "+" : ""}
            {velocity.price_per_bar.toFixed(2)}
          </div>
        </div>

        {/* Bars per ATR */}
        <div className="p-3 rounded-lg bg-muted/30">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  Bars/ATR
                  <Info className="h-3 w-3 opacity-50" />
                </div>
                <div className="text-sm font-mono font-medium">
                  {velocity.bars_per_atr.toFixed(1)}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Bars needed to move 1 ATR</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Consistency */}
        <div className="p-3 rounded-lg bg-muted/30">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-help">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  Consistency
                  <Info className="h-3 w-3 opacity-50" />
                </div>
                <div className={`text-sm font-mono font-medium ${getConfidenceColor(velocity.consistency)}`}>
                  {velocity.consistency.toFixed(0)}%
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>How steady the price movement has been (0-100%)</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Time Estimates Table */}
      {estimates.length > 0 ? (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-24">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help flex items-center gap-1">
                        Level
                        <Info className="h-3 w-3 opacity-50" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p>Fibonacci level name. R = Retracement (pullback levels), E = Extension (target levels beyond the move).</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-24 text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help flex items-center justify-end gap-1">
                        Price
                        <Info className="h-3 w-3 opacity-50" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p>The exact price where this Fibonacci level sits. Green = above current price, Red = below.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-20 text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        Bars
                        <Info className="h-3 w-3 opacity-50" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p>Estimated number of price bars to reach this level based on current velocity. Lower = faster to reach.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-20 text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help flex items-center justify-center gap-1">
                        Est. Time
                        <Info className="h-3 w-3 opacity-50" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p>Approximate calendar time to reach this level. Based on your timeframe and bar estimates. ~d = days, ~h = hours, ~m = minutes.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-16 text-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help flex items-center justify-center gap-1">
                        Conf.
                        <Info className="h-3 w-3 opacity-50" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p>Confidence score (0-100%). Higher = more reliable estimate. Based on price consistency and distance. Green = high, Yellow = medium, Gray = low.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
                <TableHead className="w-16 text-right">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help flex items-center justify-end gap-1">
                        ATR
                        <Info className="h-3 w-3 opacity-50" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[220px]">
                      <p>Distance to level measured in ATR units (Average True Range). 1 ATR = typical daily/bar price range. Lower = closer target.</p>
                    </TooltipContent>
                  </Tooltip>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimates.map((estimate, idx) => {
                const isAbove = estimate.target_price > currentPrice;

                return (
                  <TableRow key={`${estimate.target_label}-${idx}`}>
                    <TableCell className="py-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${isAbove ? "border-green-500/50 text-green-400" : "border-red-500/50 text-red-400"}`}
                      >
                        {estimate.target_label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-xs">
                      {formatPrice(estimate.target_price)}
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <span className="text-xs font-mono">
                        {estimate.estimated_bars >= 500 ? "500+" : estimate.estimated_bars}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <span className="text-xs text-muted-foreground">
                        {formatEstimatedTime(estimate.estimated_time)}
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-center">
                      <span className={`text-xs font-mono ${getConfidenceColor(estimate.confidence)}`}>
                        {estimate.confidence.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="py-2 text-right">
                      <span className="text-xs font-mono text-muted-foreground">
                        {estimate.distance_atr.toFixed(1)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4">
          No Fibonacci levels provided for time estimation.
        </div>
      )}
    </div>
  );
}
