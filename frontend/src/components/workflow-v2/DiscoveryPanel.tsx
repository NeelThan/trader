"use client";

/**
 * DiscoveryPanel - Shows all trade opportunities
 *
 * Displays opportunities across ALL timeframes, not locked to style.
 * User clicks an opportunity to enter validation phase.
 */

import { TrendingUp, TrendingDown, Zap, Clock, FlaskConical, AlertTriangle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";

type DiscoveryPanelProps = {
  opportunities: TradeOpportunity[];
  isLoading: boolean;
  /** Has any errors fetching trend data */
  hasError?: boolean;
  /** Error messages by timeframe */
  errors?: { timeframe: Timeframe; error: string }[];
  /** Refresh callback */
  onRefresh?: () => void;
  onSelectOpportunity: (opportunity: TradeOpportunity) => void;
  /** Current symbol for test trades */
  symbol?: MarketSymbol;
};

/**
 * Create a mock trade opportunity for testing the validation flow
 */
function createTestOpportunity(symbol: MarketSymbol, direction: "long" | "short"): TradeOpportunity {
  const isLong = direction === "long";
  const id = `test-${direction}-${Date.now()}`;

  return {
    id,
    symbol,
    higherTimeframe: "1D",
    lowerTimeframe: "4H",
    direction,
    confidence: 78,
    tradingStyle: "swing",
    description: isLong
      ? "Test: Daily bullish trend with 4H pullback"
      : "Test: Daily bearish trend with 4H rally",
    reasoning: isLong
      ? "Higher timeframe shows bullish structure (HH, HL). Lower timeframe is pulling back to key Fibonacci retracement level (61.8%). RSI showing oversold on 4H."
      : "Higher timeframe shows bearish structure (LH, LL). Lower timeframe is rallying to key Fibonacci retracement level (50%). RSI showing overbought on 4H.",
    isActive: true,
    entryZone: isLong ? "support" : "resistance",
    signal: {
      id,
      type: isLong ? "LONG" : "SHORT",
      higherTF: "1D",
      lowerTF: "4H",
      pairName: "Daily/4H",
      tradingStyle: "swing",
      description: isLong ? "Buy pullback on 4H" : "Sell rally on 4H",
      reasoning: isLong
        ? "1D is bullish, 4H showing bearish pullback. Look for support levels."
        : "1D is bearish, 4H showing bullish rally. Look for resistance levels.",
      confidence: 78,
      entryZone: isLong ? "support" : "resistance",
      isActive: true,
    },
    higherTrend: {
      timeframe: "1D",
      trend: isLong ? "bullish" : "bearish",
      confidence: 80,
      swing: { signal: isLong ? "bullish" : "bearish" },
      rsi: { signal: isLong ? "bullish" : "bearish", value: isLong ? 55 : 45 },
      macd: { signal: isLong ? "bullish" : "bearish" },
      isLoading: false,
      error: null,
    },
    lowerTrend: {
      timeframe: "4H",
      trend: isLong ? "bearish" : "bullish", // Counter-trend for entry
      confidence: 65,
      swing: { signal: isLong ? "bearish" : "bullish" },
      rsi: { signal: isLong ? "bearish" : "bullish", value: isLong ? 35 : 65 },
      macd: { signal: isLong ? "bearish" : "bullish" },
      isLoading: false,
      error: null,
    },
  };
}

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
  hasError = false,
  errors = [],
  onRefresh,
  onSelectOpportunity,
  symbol = "DJI",
}: DiscoveryPanelProps) {
  const activeOpportunities = opportunities.filter((o) => o.isActive);
  const waitingOpportunities = opportunities.filter((o) => !o.isActive);

  // Test trade handlers
  const handleTestLong = () => {
    const testOpportunity = createTestOpportunity(symbol, "long");
    onSelectOpportunity(testOpportunity);
  };

  const handleTestShort = () => {
    const testOpportunity = createTestOpportunity(symbol, "short");
    onSelectOpportunity(testOpportunity);
  };

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

  // Show error banner if any timeframes failed
  const ErrorBanner = hasError ? (
    <Card className="bg-amber-500/10 border-amber-500/30">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-medium text-amber-300">
              Some data unavailable
            </span>
          </div>
          {onRefresh && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefresh}
              className="h-6 px-2 text-xs text-amber-400 hover:text-amber-300"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
        {errors.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            Failed: {errors.map((e) => e.timeframe).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  ) : null;

  if (opportunities.length === 0) {
    return (
      <div className="space-y-4">
        {ErrorBanner}
        <Card className="bg-muted/20">
          <CardContent className="py-8 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">No opportunities found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Waiting for trend alignment...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Banner (if any timeframes failed) */}
      {ErrorBanner}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trade Opportunities</h2>
        <Badge variant="secondary">
          {activeOpportunities.length} active
        </Badge>
      </div>

      {/* Test Trade Buttons - for testing validation flow */}
      <Card className="bg-purple-500/10 border-purple-500/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-300">Test Mode</span>
          </div>
          <p className="text-[10px] text-muted-foreground mb-2">
            Simulate a trade to test the validation and sizing flow
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestLong}
              className="flex-1 text-xs border-green-500/50 text-green-400 hover:bg-green-500/20"
            >
              <TrendingUp className="w-3 h-3 mr-1" />
              Test LONG
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestShort}
              className="flex-1 text-xs border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              <TrendingDown className="w-3 h-3 mr-1" />
              Test SHORT
            </Button>
          </div>
        </CardContent>
      </Card>

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
