"use client";

/**
 * DiscoveryPanel - Shows all trade opportunities
 *
 * Displays opportunities across ALL timeframes, not locked to style.
 * User clicks an opportunity to enter validation phase.
 */

import { TrendingUp, TrendingDown, Zap, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";

type DiscoveryPanelProps = {
  opportunities: TradeOpportunity[];
  isLoading: boolean;
  onSelectOpportunity: (opportunity: TradeOpportunity) => void;
};

type OpportunityCardProps = {
  opportunity: TradeOpportunity;
  onSelect: () => void;
};

function OpportunityCard({ opportunity, onSelect }: OpportunityCardProps) {
  const isLong = opportunity.direction === "long";
  const Icon = isLong ? TrendingUp : TrendingDown;
  const color = isLong ? "#22c55e" : "#ef4444";
  const bgClass = isLong ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30";

  return (
    <Card
      className={`cursor-pointer transition-all hover:scale-[1.02] ${bgClass} ${
        opportunity.isActive ? "ring-1 ring-offset-1 ring-offset-background" : "opacity-70"
      }`}
      style={{ ...(opportunity.isActive && { "--tw-ring-color": color } as React.CSSProperties) }}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" style={{ color }} />
            <span className="font-semibold" style={{ color }}>
              {opportunity.direction.toUpperCase()}
            </span>
            {opportunity.isActive && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-amber-500/50 text-amber-400">
                <Zap className="w-3 h-3 mr-0.5" />
                ACTIVE
              </Badge>
            )}
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {opportunity.confidence}%
          </span>
        </div>

        {/* Timeframes */}
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">
            {opportunity.higherTimeframe} → {opportunity.lowerTimeframe}
          </Badge>
          <span className="text-xs text-muted-foreground capitalize">
            {opportunity.tradingStyle}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm font-medium mb-1">{opportunity.description}</p>
        <p className="text-xs text-muted-foreground line-clamp-2">{opportunity.reasoning}</p>

        {/* Action */}
        <div className="flex justify-end mt-3">
          <Button size="sm" variant="ghost" className="text-xs">
            Evaluate →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DiscoveryPanel({
  opportunities,
  isLoading,
  onSelectOpportunity,
}: DiscoveryPanelProps) {
  const activeOpportunities = opportunities.filter((o) => o.isActive);
  const waitingOpportunities = opportunities.filter((o) => !o.isActive);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Scanning timeframes...</span>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <Card className="bg-muted/20">
        <CardContent className="py-8 text-center">
          <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No opportunities found</p>
          <p className="text-xs text-muted-foreground mt-1">
            Waiting for trend alignment...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trade Opportunities</h2>
        <Badge variant="secondary">
          {activeOpportunities.length} active
        </Badge>
      </div>

      {/* Active Opportunities */}
      {activeOpportunities.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Ready to Trade
          </h3>
          {activeOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onSelect={() => onSelectOpportunity(opportunity)}
            />
          ))}
        </div>
      )}

      {/* Waiting Opportunities */}
      {waitingOpportunities.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Developing
          </h3>
          {waitingOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              onSelect={() => onSelectOpportunity(opportunity)}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="pt-4 border-t text-[10px] text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-3 h-3 text-green-400" />
          <span>LONG: Higher TF bullish + Lower TF counter-trend</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="w-3 h-3 text-red-400" />
          <span>SHORT: Higher TF bearish + Lower TF counter-trend</span>
        </div>
      </div>
    </div>
  );
}
