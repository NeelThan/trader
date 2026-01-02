"use client";

/**
 * ValidationPanel - Trade validation checklist
 *
 * Shows validation checks for the selected opportunity.
 * Must pass validation to proceed to position sizing.
 */

import { CheckCircle, XCircle, Loader2, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { ValidationResult, ValidationCheck } from "@/hooks/use-trade-validation";

type ValidationPanelProps = {
  opportunity: TradeOpportunity;
  validation: ValidationResult;
  isLoading: boolean;
  onBack: () => void;
  onProceed: () => void;
};

function CheckItem({ check }: { check: ValidationCheck }) {
  const Icon = check.passed ? CheckCircle : XCircle;
  const iconColor = check.passed ? "text-green-400" : "text-red-400";

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{check.name}</span>
          {check.details && (
            <InfoTooltip content={check.details} side="right" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">{check.explanation}</p>
      </div>
    </div>
  );
}

export function ValidationPanel({
  opportunity,
  validation,
  isLoading,
  onBack,
  onProceed,
}: ValidationPanelProps) {
  const isLong = opportunity.direction === "long";
  const directionColor = isLong ? "text-green-400" : "text-red-400";

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Validating trade...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <h2 className="text-lg font-semibold">Validation</h2>
        <div className="w-16" /> {/* Spacer for alignment */}
      </div>

      {/* Opportunity Summary */}
      <Card className={isLong ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <span className={`text-lg font-semibold ${directionColor}`}>
              {opportunity.direction.toUpperCase()}
            </span>
            <Badge variant="secondary">
              {opportunity.higherTimeframe} → {opportunity.lowerTimeframe}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {opportunity.description}
          </p>
        </CardContent>
      </Card>

      {/* Validation Progress */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span>Validation Score</span>
            <span className={validation.isValid ? "text-green-400" : "text-amber-400"}>
              {validation.passedCount}/{validation.totalCount} passed
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={validation.passPercentage} className="h-2 mb-2" />
          <div className="flex items-center gap-2">
            {validation.isValid ? (
              <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Ready to Trade
              </Badge>
            ) : (
              <Badge variant="default" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Needs Improvement
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Validation Checks */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {validation.checks.map((check, index) => (
            <CheckItem key={index} check={check} />
          ))}
        </CardContent>
      </Card>

      {/* Suggested Levels */}
      {(validation.suggestedEntry || validation.suggestedTargets.length > 0) && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Suggested Levels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {validation.suggestedEntry && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Entry</span>
                <span className="font-mono">{validation.suggestedEntry.toFixed(2)}</span>
              </div>
            )}
            {validation.suggestedStop && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stop Loss</span>
                <span className="font-mono text-red-400">{validation.suggestedStop.toFixed(2)}</span>
              </div>
            )}
            {validation.suggestedTargets.map((target, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-muted-foreground">Target {i + 1}</span>
                <span className="font-mono text-green-400">{target.toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      <Button
        className="w-full"
        size="lg"
        onClick={onProceed}
        disabled={!validation.isValid}
      >
        <span>Proceed to Position Sizing</span>
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      {!validation.isValid && (
        <p className="text-xs text-center text-muted-foreground">
          At least 60% of checks must pass to proceed
        </p>
      )}
    </div>
  );
}
