"use client";

/**
 * OpportunitiesPanel - Scanner panel for multi-symbol trade opportunities
 *
 * Displays opportunities found by scanning multiple symbols across timeframe pairs.
 * Used in the opportunities scanner workflow.
 */

import {
  TrendingUp,
  TrendingDown,
  Clock,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Timer,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TradeOpportunity, TradeCategory } from "@/types/workflow-v2";

type OpportunitiesPanelProps = {
  /** List of opportunities found */
  opportunities: TradeOpportunity[];
  /** Symbols that were scanned */
  symbolsScanned: string[];
  /** Time taken to scan in milliseconds */
  scanTimeMs: number | null;
  /** Whether scanning is in progress */
  isLoading: boolean;
  /** Error message if scan failed */
  error: string | null;
  /** Callback when refresh/scan is requested */
  onRefresh: () => void;
  /** Callback when an opportunity is selected */
  onSelectOpportunity: (opportunity: TradeOpportunity) => void;
};

/**
 * Get badge styling for trade category
 */
function getCategoryBadgeProps(category: TradeCategory) {
  switch (category) {
    case "with_trend":
      return {
        icon: ShieldCheck,
        label: "With Trend",
        className: "border-green-500/50 text-green-400",
      };
    case "counter_trend":
      return {
        icon: Shield,
        label: "Counter",
        className: "border-amber-500/50 text-amber-400",
      };
    case "reversal_attempt":
      return {
        icon: ShieldAlert,
        label: "Reversal",
        className: "border-red-500/50 text-red-400",
      };
  }
}

type OpportunityCardProps = {
  opportunity: TradeOpportunity;
  onSelect: () => void;
};

function OpportunityCard({ opportunity, onSelect }: OpportunityCardProps) {
  const isLong = opportunity.direction === "long";
  const Icon = isLong ? TrendingUp : TrendingDown;
  const isConfirmed = opportunity.is_confirmed !== false; // Default to confirmed if not set

  // Use dashed border for potential (unconfirmed) opportunities
  const borderStyle = isConfirmed ? "border-solid" : "border-dashed";
  const opacityClass = isConfirmed ? "" : "opacity-75";
  const bgClass = isLong
    ? "bg-green-500/10 border-green-500/30"
    : "bg-red-500/10 border-red-500/30";

  const categoryProps = getCategoryBadgeProps(opportunity.category);
  const CategoryIcon = categoryProps.icon;

  return (
    <div
      className={`cursor-pointer rounded-lg border p-4 transition-all hover:scale-[1.02] ${borderStyle} ${opacityClass} ${bgClass}`}
      onClick={onSelect}
    >
      {/* Header with symbol and direction */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{opportunity.symbol}</span>
          <Icon className={`w-4 h-4 ${isLong ? "text-green-400" : "text-red-400"}`} />
          <span className={`text-sm font-medium ${isLong ? "text-green-400" : "text-red-400"}`}>
            {opportunity.direction.toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium text-muted-foreground">
          {opportunity.confidence}%
        </span>
      </div>

      {/* Timeframes */}
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="secondary" className="text-xs">
          {opportunity.higher_timeframe}
        </Badge>
        <span className="text-muted-foreground">→</span>
        <Badge variant="secondary" className="text-xs">
          {opportunity.lower_timeframe}
        </Badge>
      </div>

      {/* Category and Phase badges */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${categoryProps.className}`}>
          <CategoryIcon className="w-3 h-3 mr-0.5" />
          {categoryProps.label}
        </Badge>
        <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground">
          {opportunity.phase}
        </Badge>
        {!isConfirmed && (
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-amber-500/50 text-amber-400">
            <Timer className="w-3 h-3 mr-0.5" />
            Pending
          </Badge>
        )}
      </div>

      {/* Description or Awaiting Confirmation message */}
      {!isConfirmed && opportunity.awaiting_confirmation ? (
        <p className="text-xs text-amber-400/80 italic">
          {opportunity.awaiting_confirmation}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {opportunity.description}
        </p>
      )}
    </div>
  );
}

export function OpportunitiesPanel({
  opportunities,
  symbolsScanned,
  scanTimeMs,
  isLoading,
  error,
  onRefresh,
  onSelectOpportunity,
}: OpportunitiesPanelProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Scanning opportunities...</span>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full animate-pulse" />
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-medium text-red-300">{error}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={onRefresh}
                className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (opportunities.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Opportunities</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Scan
          </Button>
        </div>
        <Card className="bg-muted/20">
          <CardContent className="py-8 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No opportunities found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Scanned {symbolsScanned.length} symbols
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Opportunities found
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Opportunities</h2>
          <Badge variant="secondary">{opportunities.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {scanTimeMs !== null && (
            <span className="text-xs text-muted-foreground">{scanTimeMs}ms</span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={onRefresh}
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Opportunity cards */}
      <div className="space-y-3">
        {opportunities.map((opportunity, idx) => (
          <OpportunityCard
            key={`${opportunity.symbol}-${opportunity.higher_timeframe}-${idx}`}
            opportunity={opportunity}
            onSelect={() => onSelectOpportunity(opportunity)}
          />
        ))}
      </div>
    </div>
  );
}
