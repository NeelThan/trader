"use client";

import { cn } from "@/lib/utils";
import { formatPrice } from "./utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type PositionSizeResultProps = {
  positionSize: number;
  riskAmount: number;
  distanceToStop: number;
  entryPrice: number;
  currency?: string;
  className?: string;
};

/**
 * A metric label with tooltip explanation.
 */
function MetricLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="text-muted-foreground text-xs cursor-help inline-flex items-center gap-1">
          {label}
          <span className="text-muted-foreground/50">(?)</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Displays the calculated position size and related metrics.
 * Reusable component that can be embedded anywhere position sizing info is needed.
 */
export function PositionSizeResult({
  positionSize,
  riskAmount,
  distanceToStop,
  entryPrice,
  currency = "$",
  className,
}: PositionSizeResultProps) {
  const totalValue = positionSize * entryPrice;

  return (
    <div className={cn("rounded-lg border bg-card p-4", className)}>
      <div className="space-y-3">
        {/* Main Result */}
        <div className="text-center pb-3 border-b">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-sm text-muted-foreground cursor-help inline-flex items-center gap-1">
                Position Size
                <span className="text-muted-foreground/50">(?)</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-72">
              The number of shares/units to buy or sell. Calculated as: Risk Amount ÷ Stop Distance. This ensures you risk exactly your defined amount.
            </TooltipContent>
          </Tooltip>
          <div className="text-3xl font-bold font-mono text-blue-400">
            {positionSize > 0 ? positionSize.toFixed(2) : "—"}
          </div>
          <div className="text-xs text-muted-foreground">units/shares</div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <MetricLabel
              label="Risk Amount"
              tooltip="The maximum amount you will lose if your stop loss is hit. This is the amount you defined in Account Settings."
            />
            <div className="font-mono font-medium">
              {currency}{riskAmount.toFixed(2)}
            </div>
          </div>
          <div>
            <MetricLabel
              label="Stop Distance"
              tooltip="The price difference between your entry and stop loss. This determines how many shares you can buy with your risk amount."
            />
            <div className="font-mono font-medium">
              {formatPrice(distanceToStop)}
            </div>
          </div>
          <div>
            <MetricLabel
              label="Total Position Value"
              tooltip="The total capital needed to take this trade (Position Size × Entry Price). This is your market exposure, not your risk."
            />
            <div className="font-mono font-medium">
              {currency}{totalValue.toFixed(2)}
            </div>
          </div>
          <div>
            <MetricLabel
              label="Entry Price"
              tooltip="The price at which you plan to enter the trade."
            />
            <div className="font-mono font-medium">
              {formatPrice(entryPrice)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
