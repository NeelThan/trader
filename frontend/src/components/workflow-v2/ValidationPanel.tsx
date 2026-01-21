"use client";

/**
 * ValidationPanel - Trade validation checklist
 *
 * Shows validation checks for the selected opportunity.
 * Must pass validation to proceed to position sizing.
 */

import { useState } from "react";
import { CheckCircle, XCircle, Loader2, ArrowLeft, ArrowRight, AlertTriangle, Flame, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { ValidationResult, ValidationCheck, ATRInfo } from "@/hooks/use-trade-validation";
import type { ConfluenceScore } from "@/types/workflow-v2";
import { CONFLUENCE_CONTENT, VALIDATION_CHECKS, ATR_CONTENT } from "@/lib/educational-content";

type ValidationPanelProps = {
  opportunity: TradeOpportunity;
  validation: ValidationResult;
  isLoading: boolean;
  onBack: () => void;
  onProceed: () => void;
  atrPeriod: number;
  onAtrPeriodChange: (period: number) => void;
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

/** Get color class based on confluence interpretation */
function getConfluenceColor(interpretation: string): string {
  switch (interpretation) {
    case "major": return "text-purple-400 bg-purple-500/20 border-purple-500/30";
    case "significant": return "text-amber-400 bg-amber-500/20 border-amber-500/30";
    case "important": return "text-blue-400 bg-blue-500/20 border-blue-500/30";
    default: return "text-slate-400 bg-slate-500/20 border-slate-500/30";
  }
}

/** Get flame icons based on confluence score */
function ConfluenceFlames({ score }: { score: number }) {
  const flames = Math.min(Math.max(1, Math.ceil(score / 2)), 5);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: flames }).map((_, i) => (
        <Flame
          key={i}
          className={`w-3 h-3 ${
            score >= 7 ? "text-purple-400" :
            score >= 5 ? "text-amber-400" :
            score >= 3 ? "text-blue-400" :
            "text-slate-400"
          }`}
        />
      ))}
    </div>
  );
}

/** Confluence score display component */
function ConfluenceDisplay({ confluenceScore }: { confluenceScore: ConfluenceScore }) {
  const { total, breakdown, interpretation } = confluenceScore;
  const colorClass = getConfluenceColor(interpretation);

  const breakdownItems = [
    { label: "Base Fib Level", value: breakdown.baseFibLevel, max: 1 },
    { label: "Same TF Confluence", value: breakdown.sameTFConfluence, max: 3 },
    { label: "Higher TF Confluence", value: breakdown.higherTFConfluence, max: 6 },
    { label: "Cross-Tool", value: breakdown.crossToolConfluence, max: 2 },
    { label: "Psychological Level", value: breakdown.psychologicalLevel, max: 1 },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>Confluence Score</span>
            <InfoTooltip
              title={CONFLUENCE_CONTENT.title}
              content={
                <div className="space-y-2">
                  <p>{CONFLUENCE_CONTENT.description}</p>
                  <div className="text-xs space-y-1">
                    {CONFLUENCE_CONTENT.factors.map((f) => (
                      <div key={f.label} className="flex justify-between">
                        <span>{f.label}</span>
                        <span className="font-mono text-primary">{f.points}</span>
                      </div>
                    ))}
                  </div>
                </div>
              }
              side="right"
            />
          </div>
          <Badge variant="outline" className={colorClass}>
            <ConfluenceFlames score={total} />
            <span className="ml-1.5 font-semibold">{total}</span>
            <span className="ml-1 text-[10px] uppercase">{interpretation}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {breakdownItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-mono">+{item.value}</span>
            </div>
          ))}
          {breakdownItems.length === 0 && (
            <p className="text-xs text-muted-foreground">No confluence factors detected</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Get color class based on volatility level */
function getVolatilityColor(level: string): string {
  switch (level) {
    case "extreme": return "text-red-400 bg-red-500/20 border-red-500/30";
    case "high": return "text-amber-400 bg-amber-500/20 border-amber-500/30";
    case "normal": return "text-blue-400 bg-blue-500/20 border-blue-500/30";
    case "low": return "text-slate-400 bg-slate-500/20 border-slate-500/30";
    default: return "text-slate-400 bg-slate-500/20 border-slate-500/30";
  }
}

/** Common ATR period options */
const ATR_PERIOD_OPTIONS = [7, 10, 14, 20, 21];

/** ATR info display component */
function ATRInfoDisplay({
  atrInfo,
  period,
  onPeriodChange,
  timeframe,
}: {
  atrInfo: ATRInfo;
  period: number;
  onPeriodChange: (period: number) => void;
  timeframe: string;
}) {
  const [inputValue, setInputValue] = useState(period.toString());
  const colorClass = getVolatilityColor(atrInfo.volatilityLevel);

  // Sync input when period changes from quick-select
  const handleQuickSelect = (p: number) => {
    onPeriodChange(p);
    setInputValue(p.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 2 && num <= 50) {
      onPeriodChange(num);
    }
  };

  const handleInputBlur = () => {
    // Reset to current period if invalid
    const num = parseInt(inputValue, 10);
    if (isNaN(num) || num < 2 || num > 50) {
      setInputValue(period.toString());
    }
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>Volatility (ATR)</span>
            <InfoTooltip
              title={ATR_CONTENT.title}
              content={
                <div className="space-y-2">
                  <p>{ATR_CONTENT.description}</p>
                  <p className="text-xs">{ATR_CONTENT.usage.stopPlacement}</p>
                  <p className="text-xs text-muted-foreground">{ATR_CONTENT.period}</p>
                </div>
              }
              side="right"
            />
          </div>
          <Badge variant="outline" className={colorClass}>
            <span className="font-semibold">{atrInfo.atrPercent.toFixed(2)}%</span>
            <span className="ml-1 text-[10px] uppercase">{atrInfo.volatilityLevel}</span>
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {/* Period selector with quick-select and manual input */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Period:</span>
              <div className="flex gap-1">
                {ATR_PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleQuickSelect(p)}
                    className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                      period === p
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min={2}
                max={50}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="h-5 w-12 text-xs text-center px-1"
                title="Custom period (2-50)"
              />
            </div>
            <span className="text-muted-foreground text-[10px]">{timeframe}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">ATR({period}) Value</span>
            <span className="font-mono">{atrInfo.atr.toFixed(2)}</span>
          </div>
          <div className="border-t border-border/50 pt-2">
            <p className="text-xs text-muted-foreground mb-1.5">ATR-Based Stop Distances:</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-1.5 bg-muted/50 rounded">
                <p className="text-muted-foreground">1x ATR</p>
                <p className="font-mono font-medium">{atrInfo.suggestedStop1x.toFixed(2)}</p>
              </div>
              <div className="text-center p-1.5 bg-muted/50 rounded border border-blue-500/30">
                <p className="text-muted-foreground">1.5x ATR</p>
                <p className="font-mono font-medium text-blue-400">{atrInfo.suggestedStop1_5x.toFixed(2)}</p>
              </div>
              <div className="text-center p-1.5 bg-muted/50 rounded">
                <p className="text-muted-foreground">2x ATR</p>
                <p className="font-mono font-medium">{atrInfo.suggestedStop2x.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1">{atrInfo.interpretation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ValidationPanel({
  opportunity,
  validation,
  isLoading,
  onBack,
  onProceed,
  atrPeriod,
  onAtrPeriodChange,
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
            <div className="flex items-center gap-2">
              <span>Validation Score</span>
              <InfoTooltip
                title={VALIDATION_CHECKS.passThreshold.title}
                content={VALIDATION_CHECKS.passThreshold.content}
                side="right"
              />
            </div>
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

      {/* Ranging Market Warning */}
      {validation.isRanging && validation.rangingWarning && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">Ranging Market Detected</p>
                <p className="text-xs text-muted-foreground mt-0.5">{validation.rangingWarning}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confluence Score */}
      {validation.confluenceScore && validation.confluenceScore.total > 0 && (
        <ConfluenceDisplay confluenceScore={validation.confluenceScore} />
      )}

      {/* ATR Volatility Info */}
      {validation.atrInfo && (
        <ATRInfoDisplay
          atrInfo={validation.atrInfo}
          period={atrPeriod}
          onPeriodChange={onAtrPeriodChange}
          timeframe={opportunity.lowerTimeframe}
        />
      )}

      {/* Validation Checks */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <span>Checklist</span>
            <InfoTooltip
              content="Each check validates a key aspect of the trade setup. Green checks passed, red checks failed."
              side="right"
            />
          </CardTitle>
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
