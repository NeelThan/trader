"use client";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type RiskRewardDisplayProps = {
  riskRewardRatio: number;
  potentialProfit: number;
  potentialLoss: number;
  isValidTrade: boolean;
  recommendation: string;
  accountRiskPercentage?: number;
  currency?: string;
  className?: string;
};

/**
 * A metric label with tooltip explanation.
 */
function MetricLabel({
  label,
  tooltip,
  className,
}: {
  label: string;
  tooltip: string;
  className?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("text-xs cursor-help inline-flex items-center gap-1", className)}>
          {label}
          <span className="opacity-50">(?)</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Displays risk/reward metrics with Go/No-Go recommendation.
 * Reusable component for showing trade quality assessment.
 */
export function RiskRewardDisplay({
  riskRewardRatio,
  potentialProfit,
  potentialLoss,
  isValidTrade,
  recommendation,
  accountRiskPercentage,
  currency = "$",
  className,
}: RiskRewardDisplayProps) {
  // Color based on R:R quality
  const getRatioColor = () => {
    if (riskRewardRatio >= 3) return "text-green-400";
    if (riskRewardRatio >= 2) return "text-emerald-400";
    if (riskRewardRatio >= 1) return "text-yellow-400";
    return "text-red-400";
  };

  const getGoNoGoColor = () => {
    return isValidTrade ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30";
  };

  const getGoNoGoTextColor = () => {
    return isValidTrade ? "text-green-400" : "text-red-400";
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* R:R Ratio Display */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-sm text-muted-foreground cursor-help inline-flex items-center gap-1">
                Risk : Reward
                <span className="text-muted-foreground/50">(?)</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-72">
              The ratio of potential reward to risk. A 2:1 ratio means you could gain $2 for every $1 risked. Higher is better. Aim for at least 2:1.
            </TooltipContent>
          </Tooltip>
          <span className={cn("text-2xl font-bold font-mono", getRatioColor())}>
            {riskRewardRatio > 0 ? `1 : ${riskRewardRatio.toFixed(2)}` : "—"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
            <MetricLabel
              label="Potential Loss"
              tooltip="The amount you will lose if your stop loss is hit. This equals your Risk Amount from Account Settings."
              className="text-red-400"
            />
            <div className="font-mono font-medium text-red-400">
              -{currency}{potentialLoss.toFixed(2)}
            </div>
          </div>
          <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
            <MetricLabel
              label="Potential Profit"
              tooltip="The amount you will gain if your target is hit. Calculated as: Position Size × (Target - Entry)."
              className="text-green-400"
            />
            <div className="font-mono font-medium text-green-400">
              +{currency}{potentialProfit.toFixed(2)}
            </div>
          </div>
        </div>

        {accountRiskPercentage !== undefined && (
          <div className="mt-3 pt-3 border-t text-sm">
            <div className="flex justify-between">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground cursor-help inline-flex items-center gap-1">
                    Account Risk
                    <span className="text-muted-foreground/50">(?)</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-64">
                  Percentage of your account balance at risk on this trade. Most traders keep this under 1-2% per trade to protect their account.
                </TooltipContent>
              </Tooltip>
              <span className={cn(
                "font-mono font-medium",
                accountRiskPercentage > 5 ? "text-red-400" :
                accountRiskPercentage > 2 ? "text-yellow-400" :
                "text-muted-foreground"
              )}>
                {accountRiskPercentage.toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Go/No-Go Recommendation */}
      <div className={cn("rounded-lg border p-4", getGoNoGoColor())}>
        <div className="flex items-center gap-2 mb-2">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isValidTrade ? "bg-green-400" : "bg-red-400"
          )} />
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("font-semibold cursor-help inline-flex items-center gap-1", getGoNoGoTextColor())}>
                {isValidTrade ? "GO - Valid Trade Setup" : "NO-GO - Trade Not Recommended"}
                <span className="opacity-50">(?)</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-72">
              Trade recommendation based on R:R ratio and account risk. GO means the setup meets minimum criteria. NO-GO means the risk/reward is unfavorable or account risk is too high.
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-sm text-muted-foreground">
          {recommendation || "Enter trade parameters to see recommendation"}
        </p>
      </div>
    </div>
  );
}
