/**
 * Sizing Panel Component
 *
 * Position sizing form with account settings, trade parameters,
 * and calculated values display.
 */

"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { SizingData } from "@/hooks/use-trade-execution";

export type SizingPanelProps = {
  opportunity: TradeOpportunity;
  sizing: SizingData;
  onUpdateSizing: (updates: Partial<SizingData>) => void;
  onBack: () => void;
  onProceed: () => void;
};

/**
 * Get recommendation badge styling
 */
function getRecommendationStyle(
  recommendation: SizingData["recommendation"]
): string {
  switch (recommendation) {
    case "excellent":
      return "bg-green-500 hover:bg-green-500";
    case "good":
      return "bg-blue-500 hover:bg-blue-500";
    case "marginal":
      return "bg-amber-500 hover:bg-amber-500";
    case "poor":
      return "bg-red-500 hover:bg-red-500";
  }
}

/**
 * Format recommendation label
 */
function formatRecommendation(
  recommendation: SizingData["recommendation"]
): string {
  return recommendation.charAt(0).toUpperCase() + recommendation.slice(1);
}

export function SizingPanel({
  opportunity,
  sizing,
  onUpdateSizing,
  onBack,
  onProceed,
}: SizingPanelProps) {
  const isLong = opportunity.direction === "long";
  const isHighRisk = sizing.riskPercentage > 3;

  const handleAccountBalanceChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onUpdateSizing({ accountBalance: num });
    }
  };

  const handleRiskPercentageChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      onUpdateSizing({ riskPercentage: num });
    }
  };

  const handleEntryChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onUpdateSizing({ entryPrice: num });
    }
  };

  const handleStopLossChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      onUpdateSizing({ stopLoss: num });
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">Position Sizing</h2>
      </div>

      {/* Opportunity Summary */}
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium">{opportunity.symbol}</span>
        <span
          className={cn(
            "font-semibold",
            isLong ? "text-green-400" : "text-red-400"
          )}
        >
          {opportunity.direction.toUpperCase()}
        </span>
      </div>

      {/* Account Settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Account Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="account-balance">Account Balance ($)</Label>
            <Input
              id="account-balance"
              type="number"
              value={sizing.accountBalance}
              onChange={(e) => handleAccountBalanceChange(e.target.value)}
              min={0}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="risk-percentage">Risk per Trade (%)</Label>
            <Input
              id="risk-percentage"
              type="number"
              value={sizing.riskPercentage}
              onChange={(e) => handleRiskPercentageChange(e.target.value)}
              min={0}
              max={100}
              step={0.1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Trade Parameters */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Trade Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="entry-price">Entry Price</Label>
            <Input
              id="entry-price"
              type="number"
              value={sizing.entryPrice}
              onChange={(e) => handleEntryChange(e.target.value)}
              min={0}
              step={0.01}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="stop-loss">Stop Loss</Label>
            <Input
              id="stop-loss"
              type="number"
              value={sizing.stopLoss}
              onChange={(e) => handleStopLossChange(e.target.value)}
              min={0}
              step={0.01}
            />
          </div>
          {sizing.targets.length > 0 && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">Targets</span>
              <div className="flex flex-wrap gap-2">
                {sizing.targets.map((target, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 text-sm bg-muted px-2 py-1 rounded"
                  >
                    <span className="text-muted-foreground">Target {index + 1}:</span>
                    <span>{target}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calculated Values */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Calculated Values</CardTitle>
            <Badge className={getRecommendationStyle(sizing.recommendation)}>
              {formatRecommendation(sizing.recommendation)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Position Size</span>
            <span className="font-medium">{sizing.positionSize.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Risk Amount</span>
            <span className="font-medium">${sizing.riskAmount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stop Distance</span>
            <span className="font-medium">{sizing.stopDistance}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">R:R Ratio</span>
            <span className="font-medium">{sizing.riskRewardRatio.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Warnings */}
      {isHighRisk && (
        <div className="text-sm text-amber-400 bg-amber-400/10 px-3 py-2 rounded">
          High risk: You are risking more than 3% of your account on this trade.
        </div>
      )}

      {/* Proceed Button */}
      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={onProceed}
          disabled={!sizing.isValid}
        >
          Proceed to Execution
        </Button>
        {!sizing.isValid && sizing.recommendation === "poor" && (
          <p className="text-sm text-muted-foreground text-center">
            R:R ratio must be at least 1.5 to proceed
          </p>
        )}
      </div>
    </div>
  );
}
