"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TradeAction } from "@/lib/chart-constants";
import type { ChecklistItem, GoNoGoDecision } from "@/hooks/use-workflow-state";
import { useSettings } from "@/hooks/use-settings";

type PreTradeChecklistProps = {
  // Data props
  checklistItems: ChecklistItem[];
  goNoGo: GoNoGoDecision;
  onUpdateChecklist: (itemId: string, checked: boolean) => void;

  // Summary data
  symbol: string;
  tradeDirection: TradeAction;
  entryPrice: number;
  stopLoss: number;
  targets: number[];
  positionSize: number;
  riskRewardRatio: number;

  // Workflow integration
  onComplete?: () => void;
  workflowMode?: boolean;

  // Display customization
  compact?: boolean;
};

const CATEGORY_CONFIG: Record<ChecklistItem["category"], { label: string; color: string; icon: string }> = {
  trend: { label: "Trend Analysis", color: "#3b82f6", icon: "📈" },
  fibonacci: { label: "Fibonacci Levels", color: "#8b5cf6", icon: "📐" },
  signal: { label: "Signal Confirmation", color: "#22c55e", icon: "🎯" },
  risk: { label: "Risk Management", color: "#f59e0b", icon: "⚠️" },
  timing: { label: "Market Timing", color: "#06b6d4", icon: "⏰" },
};

export function PreTradeChecklist({
  checklistItems,
  goNoGo,
  onUpdateChecklist,
  symbol,
  tradeDirection,
  entryPrice,
  stopLoss,
  targets,
  positionSize,
  riskRewardRatio,
  onComplete,
  workflowMode = false,
  compact = false,
}: PreTradeChecklistProps) {
  // Get auto-validation setting
  const { settings } = useSettings();
  const autoValidationEnabled = settings.workflowAutoValidation;

  // Apply auto-validation setting to items
  const effectiveItems = useMemo(() => {
    if (autoValidationEnabled) {
      return checklistItems;
    }
    // When auto-validation is disabled, remove autoValidated flag from all items
    return checklistItems.map((item) => ({
      ...item,
      autoValidated: false,
    }));
  }, [checklistItems, autoValidationEnabled]);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    for (const item of effectiveItems) {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    }
    return groups;
  }, [effectiveItems]);

  // Calculate progress
  const progress = useMemo(() => {
    const required = effectiveItems.filter((i) => i.required);
    const requiredChecked = required.filter((i) => i.checked);
    const all = effectiveItems;
    const allChecked = all.filter((i) => i.checked);

    return {
      requiredTotal: required.length,
      requiredChecked: requiredChecked.length,
      allTotal: all.length,
      allChecked: allChecked.length,
      percentage: required.length > 0 ? (requiredChecked.length / required.length) * 100 : 0,
    };
  }, [checklistItems]);

  const canProceed = goNoGo === "GO";

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className={cn(
            goNoGo === "GO" ? "bg-green-500/20 text-green-400 border-green-500" :
            goNoGo === "NO_GO" ? "bg-red-500/20 text-red-400 border-red-500" :
            "bg-gray-500/20 text-gray-400 border-gray-500"
          )}
        >
          {goNoGo === "GO" ? "GO" : goNoGo === "NO_GO" ? "NO GO" : "PENDING"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {progress.requiredChecked}/{progress.requiredTotal} required
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trade Summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="text-sm font-medium mb-3">Trade Summary</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Symbol</div>
            <div className="font-medium">{symbol}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Direction</div>
            <Badge
              className={cn(
                tradeDirection === "GO_LONG" ? "bg-green-500/20 text-green-400" :
                tradeDirection === "GO_SHORT" ? "bg-red-500/20 text-red-400" :
                "bg-gray-500/20 text-gray-400"
              )}
            >
              {tradeDirection === "GO_LONG" ? "LONG" : tradeDirection === "GO_SHORT" ? "SHORT" : "N/A"}
            </Badge>
          </div>
          <div>
            <div className="text-muted-foreground">Entry</div>
            <div className="font-mono">{entryPrice.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Stop</div>
            <div className="font-mono text-red-400">{stopLoss.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Target 1</div>
            <div className="font-mono text-green-400">{targets[0]?.toFixed(2) || "N/A"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Position Size</div>
            <div className="font-mono">{positionSize}</div>
          </div>
          <div>
            <div className="text-muted-foreground">R:R</div>
            <div className={cn(
              "font-mono",
              riskRewardRatio >= 2 ? "text-green-400" :
              riskRewardRatio >= 1 ? "text-amber-400" :
              "text-red-400"
            )}>
              {riskRewardRatio.toFixed(1)}:1
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Required Items</span>
          <span className="font-medium">
            {progress.requiredChecked}/{progress.requiredTotal}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              progress.percentage === 100 ? "bg-green-500" : "bg-blue-500"
            )}
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* Checklist Items by Category */}
      <div className="space-y-4">
        {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
          const items = groupedItems[category];
          if (!items || items.length === 0) return null;

          const allChecked = items.every((i) => i.checked);
          const someChecked = items.some((i) => i.checked) && !allChecked;

          return (
            <div key={category} className="rounded-lg border border-border overflow-hidden">
              <div
                className="flex items-center gap-2 px-4 py-2 bg-muted/50"
                style={{ borderLeftWidth: 4, borderLeftColor: config.color }}
              >
                <span>{config.icon}</span>
                <span className="font-medium text-sm">{config.label}</span>
                {allChecked && (
                  <svg className="w-4 h-4 ml-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors",
                      item.autoValidated && "bg-muted/20"
                    )}
                  >
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={(checked) => onUpdateChecklist(item.id, checked as boolean)}
                      disabled={item.autoValidated}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className={cn(
                        "text-sm",
                        item.checked && "text-muted-foreground line-through"
                      )}>
                        {item.label}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {item.required && (
                          <Badge variant="outline" className="text-xs text-amber-400 border-amber-500">
                            Required
                          </Badge>
                        )}
                        {item.autoValidated && (
                          <Badge variant="outline" className="text-xs text-blue-400 border-blue-500">
                            Auto-validated
                          </Badge>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Go/No-Go Decision */}
      <div
        className={cn(
          "rounded-lg border-2 p-6 text-center",
          goNoGo === "GO" && "border-green-500 bg-green-500/10",
          goNoGo === "NO_GO" && "border-red-500 bg-red-500/10",
          goNoGo === "PENDING" && "border-gray-500 bg-gray-500/10"
        )}
      >
        <div
          className={cn(
            "text-4xl font-bold mb-2",
            goNoGo === "GO" && "text-green-400",
            goNoGo === "NO_GO" && "text-red-400",
            goNoGo === "PENDING" && "text-gray-400"
          )}
        >
          {goNoGo === "GO" ? "GO!" : goNoGo === "NO_GO" ? "NO GO" : "PENDING"}
        </div>
        <div className="text-sm text-muted-foreground">
          {goNoGo === "GO" && "All required conditions are met. Ready to execute trade."}
          {goNoGo === "NO_GO" && "Not all required conditions are met. Review the checklist above."}
          {goNoGo === "PENDING" && "Complete all required checklist items to make a decision."}
        </div>
      </div>

      {/* Continue */}
      {canProceed && workflowMode && onComplete && (
        <div className="flex justify-end">
          <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
            Execute Trade - Continue to Trade Management
          </Button>
        </div>
      )}
    </div>
  );
}
