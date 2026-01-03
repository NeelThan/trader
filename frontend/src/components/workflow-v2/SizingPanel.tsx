/**
 * Sizing Panel Component
 *
 * Position sizing form with account settings, trade parameters,
 * and calculated values display.
 */

"use client";

import { ArrowLeft, Lightbulb, X, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { SizingData, CapturedValidation } from "@/hooks/use-trade-execution";
import type { ValidationResult } from "@/hooks/use-trade-validation";

export type SizingPanelProps = {
  opportunity: TradeOpportunity;
  sizing: SizingData;
  validation: ValidationResult;
  /** Captured validation values (persisted across phase changes) */
  capturedValidation: CapturedValidation;
  /** Whether there are captured suggested values available */
  hasCapturedSuggestions: boolean;
  onUpdateSizing: (updates: Partial<SizingData>) => void;
  onRestoreSuggested: () => void;
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
  validation,
  capturedValidation,
  hasCapturedSuggestions,
  onUpdateSizing,
  onRestoreSuggested,
  onBack,
  onProceed,
}: SizingPanelProps) {
  const isLong = opportunity.direction === "long";
  const isHighRisk = sizing.riskPercentage > 3;
  const [newTarget, setNewTarget] = useState("");

  // Direction validation: stop must be on correct side of entry
  const isStopOnWrongSide =
    sizing.entryPrice > 0 &&
    sizing.stopLoss > 0 &&
    (isLong ? sizing.stopLoss >= sizing.entryPrice : sizing.stopLoss <= sizing.entryPrice);

  // Use captured validation values (they persist when validation is disabled)
  const suggestedEntry = capturedValidation.entry ?? validation.suggestedEntry;
  const suggestedStop = capturedValidation.stop ?? validation.suggestedStop;
  const suggestedTargets = capturedValidation.targets.length > 0
    ? capturedValidation.targets
    : validation.suggestedTargets;

  // Check if using suggested values
  const isUsingSuggestedEntry =
    suggestedEntry !== null &&
    Math.abs(sizing.entryPrice - suggestedEntry) < 0.01;
  const isUsingSuggestedStop =
    suggestedStop !== null &&
    Math.abs(sizing.stopLoss - suggestedStop) < 0.01;

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

  const handleAddTarget = () => {
    const num = parseFloat(newTarget);
    if (!isNaN(num) && num > 0) {
      const updatedTargets = [...sizing.targets, num].sort((a, b) =>
        isLong ? a - b : b - a
      );
      onUpdateSizing({ targets: updatedTargets });
      setNewTarget("");
    }
  };

  const handleRemoveTarget = (index: number) => {
    const updatedTargets = sizing.targets.filter((_, i) => i !== index);
    onUpdateSizing({ targets: updatedTargets });
  };

  const handleUpdateTarget = (index: number, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      const updatedTargets = [...sizing.targets];
      updatedTargets[index] = num;
      onUpdateSizing({ targets: updatedTargets.sort((a, b) => (isLong ? a - b : b - a)) });
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Trade Parameters</CardTitle>
            {hasCapturedSuggestions && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRestoreSuggested}
                className="h-7 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Use Suggested
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Entry Price */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="entry-price">Entry Price</Label>
              {isUsingSuggestedEntry && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-blue-400 border-blue-400/50">
                  <Lightbulb className="w-2.5 h-2.5 mr-0.5" />
                  From Validation
                </Badge>
              )}
            </div>
            <Input
              id="entry-price"
              type="number"
              value={sizing.entryPrice || ""}
              onChange={(e) => handleEntryChange(e.target.value)}
              min={0}
              step={0.01}
              placeholder={suggestedEntry?.toFixed(2) ?? "Enter price"}
            />
            {validation.entryLevels.length > 0 && !isUsingSuggestedEntry && (
              <p className="text-[10px] text-muted-foreground">
                Suggested: {validation.entryLevels[0]?.label} at {validation.entryLevels[0]?.price.toFixed(2)}
              </p>
            )}
          </div>

          {/* Stop Loss */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="stop-loss">Stop Loss</Label>
              {isUsingSuggestedStop && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-blue-400 border-blue-400/50">
                  <Lightbulb className="w-2.5 h-2.5 mr-0.5" />
                  From Validation
                </Badge>
              )}
            </div>
            <Input
              id="stop-loss"
              type="number"
              value={sizing.stopLoss || ""}
              onChange={(e) => handleStopLossChange(e.target.value)}
              min={0}
              step={0.01}
              placeholder={suggestedStop?.toFixed(2) ?? "Enter stop"}
            />
          </div>

          {/* Targets - Editable */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Targets</Label>
              {suggestedTargets.length > 0 && sizing.targets.length === suggestedTargets.length && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-blue-400 border-blue-400/50">
                  <Lightbulb className="w-2.5 h-2.5 mr-0.5" />
                  From Validation
                </Badge>
              )}
            </div>

            {/* Existing targets - editable */}
            {sizing.targets.map((target, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-8">T{index + 1}</span>
                <Input
                  type="number"
                  value={target}
                  onChange={(e) => handleUpdateTarget(index, e.target.value)}
                  min={0}
                  step={0.01}
                  className="flex-1 h-8"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-red-400"
                  onClick={() => handleRemoveTarget(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}

            {/* Add new target */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-8">Add</span>
              <Input
                type="number"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                placeholder="New target price"
                min={0}
                step={0.01}
                className="flex-1 h-8"
                onKeyDown={(e) => e.key === "Enter" && handleAddTarget()}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-green-400"
                onClick={handleAddTarget}
                disabled={!newTarget}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Suggested targets hint */}
            {suggestedTargets.length > 0 && sizing.targets.length === 0 && (
              <p className="text-[10px] text-muted-foreground">
                Suggested targets: {suggestedTargets.slice(0, 3).map(t => t.toFixed(2)).join(", ")}
              </p>
            )}
          </div>
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

      {/* Warnings and Errors */}
      <div className="space-y-2">
        {isStopOnWrongSide && (
          <div className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded border border-red-400/30">
            Stop loss must be {isLong ? "below" : "above"} entry for {isLong ? "long" : "short"} trades.
          </div>
        )}
        {sizing.guardrailWarnings.map((warning, index) => (
          <div key={index} className="text-sm text-blue-400 bg-blue-400/10 px-3 py-2 rounded border border-blue-400/30">
            {warning}
          </div>
        ))}
        {isHighRisk && (
          <div className="text-sm text-amber-400 bg-amber-400/10 px-3 py-2 rounded">
            High risk: You are risking more than 3% of your account on this trade.
          </div>
        )}
        {sizing.recommendation === "poor" && sizing.riskRewardRatio > 0 && (
          <div className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded">
            Low R:R ratio ({sizing.riskRewardRatio.toFixed(2)}). Consider adjusting targets or stop loss.
          </div>
        )}
        {sizing.targets.length === 0 && (
          <div className="text-sm text-amber-400 bg-amber-400/10 px-3 py-2 rounded">
            No targets set. Consider adding at least one profit target.
          </div>
        )}
      </div>

      {/* Proceed Button */}
      <div className="space-y-2">
        <Button
          className="w-full"
          onClick={onProceed}
          disabled={sizing.entryPrice <= 0 || sizing.stopLoss <= 0 || isStopOnWrongSide}
        >
          Proceed to Execution
        </Button>
        {(sizing.entryPrice <= 0 || sizing.stopLoss <= 0) && (
          <p className="text-sm text-muted-foreground text-center">
            Set entry price and stop loss to proceed
          </p>
        )}
        {isStopOnWrongSide && (
          <p className="text-sm text-muted-foreground text-center">
            Fix stop loss position to proceed
          </p>
        )}
      </div>
    </div>
  );
}
