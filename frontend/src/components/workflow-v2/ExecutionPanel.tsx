/**
 * Execution Panel Component
 *
 * Final confirmation and execution of a trade.
 * Shows trade summary and handles execution with journal logging.
 */

"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { SizingData } from "@/hooks/use-trade-execution";
import type { ValidationResult } from "@/hooks/use-trade-validation";

export type ExecutionPanelProps = {
  opportunity: TradeOpportunity;
  sizing: SizingData;
  /** Optional validation result for display */
  validation?: ValidationResult;
  onBack: () => void;
  onExecute: () => Promise<boolean>;
  /** Called when execution completes successfully */
  onComplete?: () => void;
  isExecuting: boolean;
  /** Error message from execution attempt */
  error?: string | null;
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

/**
 * Format price to 2 decimal places
 */
function formatPrice(price: number): string {
  return price.toFixed(2);
}

export function ExecutionPanel({
  opportunity,
  sizing,
  onBack,
  onExecute,
  onComplete,
  isExecuting,
  error,
}: ExecutionPanelProps) {
  const isLong = opportunity.direction === "long";

  const handleExecute = async () => {
    const success = await onExecute();
    if (success && onComplete) {
      onComplete();
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          disabled={isExecuting}
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">Execute Trade</h2>
      </div>

      {/* Trade Summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Trade Summary</CardTitle>
            <Badge className={getRecommendationStyle(sizing.recommendation)}>
              {formatRecommendation(sizing.recommendation)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{opportunity.symbol}</span>
            <span
              className={cn(
                "font-semibold",
                isLong ? "text-green-400" : "text-red-400"
              )}
            >
              {opportunity.direction.toUpperCase()}
            </span>
            <span className="text-muted-foreground">{opportunity.lowerTimeframe}</span>
          </div>
        </CardContent>
      </Card>

      {/* Trade Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Trade Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Entry</span>
            <span className="font-medium">{formatPrice(sizing.entryPrice)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stop Loss</span>
            <span className="font-medium text-red-400">
              {formatPrice(sizing.stopLoss)}
            </span>
          </div>
          {sizing.targets.map((target, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target {index + 1}</span>
              <span className="font-medium text-green-400">
                {formatPrice(target)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Position Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Position Details</CardTitle>
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
            <span className="text-muted-foreground">R:R Ratio</span>
            <span className="font-medium">{sizing.riskRewardRatio.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Paper Trading Notice */}
      <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded">
        Paper Trading Mode: This trade will be recorded in your journal for tracking
        and learning purposes. No real money is at risk.
      </div>

      {/* Error Display */}
      {error && (
        <div role="alert" className="text-sm text-red-400 bg-red-400/10 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* Confirmation Text */}
      <p className="text-sm text-muted-foreground text-center">
        Please confirm all details above before executing this trade.
      </p>

      {/* Execute Button */}
      <Button
        className="w-full"
        onClick={handleExecute}
        disabled={isExecuting}
      >
        {isExecuting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Executing...
          </>
        ) : (
          "Execute Trade"
        )}
      </Button>
    </div>
  );
}
