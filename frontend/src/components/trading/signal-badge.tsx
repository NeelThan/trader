"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Direction, SignalType } from "./types";

export type SignalBadgeProps = {
  direction: Direction;
  type?: SignalType;
  strength?: number;
  className?: string;
};

const TYPE_LABELS: Record<SignalType, string> = {
  type1: "Type 1",
  type2: "Type 2",
  type3: "Type 3",
};

export function SignalBadge({
  direction,
  type,
  strength,
  className,
}: SignalBadgeProps) {
  const isBuy = direction === "buy";

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <Badge
        className={cn(
          "border-transparent font-semibold",
          isBuy
            ? "bg-buy text-buy-foreground hover:bg-buy/90"
            : "bg-sell text-sell-foreground hover:bg-sell/90"
        )}
      >
        {isBuy ? "BUY" : "SELL"}
      </Badge>
      {type && (
        <Badge variant="secondary" className="font-normal">
          {TYPE_LABELS[type]}
        </Badge>
      )}
      {strength !== undefined && (
        <span className="text-xs text-muted-foreground font-mono">
          {(strength * 100).toFixed(0)}%
        </span>
      )}
    </div>
  );
}
