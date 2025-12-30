"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignalBadge } from "./signal-badge";
import { Direction, SignalType, PatternType, PatternStatus } from "./types";
import { formatPrice } from "./utils";

export type PatternCardProps = {
  pattern: PatternType;
  symbol: string;
  timeframe: string;
  direction: Direction;
  signalType?: SignalType;
  status?: PatternStatus;
  completionLevel?: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  strength?: number;
  className?: string;
  children?: React.ReactNode;
};

const PATTERN_NAMES: Record<PatternType, string> = {
  gartley: "Gartley",
  bat: "Bat",
  butterfly: "Butterfly",
  crab: "Crab",
  shark: "Shark",
  cypher: "Cypher",
};

const STATUS_VARIANTS: Record<PatternStatus, string> = {
  forming: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  complete: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  triggered: "bg-green-500/20 text-green-600 dark:text-green-400",
  expired: "bg-muted text-muted-foreground",
};

export function PatternCard({
  pattern,
  symbol,
  timeframe,
  direction,
  signalType,
  status = "forming",
  completionLevel,
  entryPrice,
  stopLoss,
  takeProfit,
  strength,
  className,
  children,
}: PatternCardProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>{PATTERN_NAMES[pattern]} Pattern</span>
          <SignalBadge
            direction={direction}
            type={signalType}
            strength={strength}
          />
        </CardTitle>
        <CardDescription>
          {symbol} - {timeframe}
          {completionLevel !== undefined &&
            ` - ${(completionLevel * 100).toFixed(1)}% retracement`}
        </CardDescription>
        <CardAction>
          <Badge className={cn("border-transparent", STATUS_VARIANTS[status])}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        {(entryPrice !== undefined ||
          stopLoss !== undefined ||
          takeProfit !== undefined) && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            {entryPrice !== undefined && (
              <div>
                <span className="text-muted-foreground block">Entry</span>
                <span className="font-mono font-medium">
                  {formatPrice(entryPrice)}
                </span>
              </div>
            )}
            {stopLoss !== undefined && (
              <div>
                <span className="text-muted-foreground block">Stop Loss</span>
                <span className="font-mono font-medium text-sell">
                  {formatPrice(stopLoss)}
                </span>
              </div>
            )}
            {takeProfit !== undefined && (
              <div>
                <span className="text-muted-foreground block">Take Profit</span>
                <span className="font-mono font-medium text-buy">
                  {formatPrice(takeProfit)}
                </span>
              </div>
            )}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
