"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Direction } from "./types";
import { formatPrice } from "./utils";

export type FibonacciLevel = {
  ratio: number;
  price: number;
  label?: string;
};

export type FibonacciLevelsProps = {
  levels: FibonacciLevel[];
  highPrice: number;
  lowPrice: number;
  direction?: Direction;
  currentPrice?: number;
  className?: string;
};

const RATIO_COLORS: Record<string, string> = {
  "0": "text-muted-foreground",
  "0.236": "text-muted-foreground",
  "0.382": "text-fibonacci-382",
  "0.5": "text-fibonacci-500",
  "0.618": "text-fibonacci-618",
  "0.786": "text-fibonacci-786",
  "1": "text-muted-foreground",
  "1.272": "text-fibonacci-618",
  "1.618": "text-fibonacci-786",
};

function getRatioColor(ratio: number): string {
  const key = ratio.toString();
  return RATIO_COLORS[key] || "text-foreground";
}

function formatRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

export function FibonacciLevels({
  levels,
  highPrice,
  lowPrice,
  direction = "buy",
  currentPrice,
  className,
}: FibonacciLevelsProps) {
  const sortedLevels = [...levels].sort((a, b) => {
    return direction === "buy" ? b.price - a.price : a.price - b.price;
  });

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-xs text-muted-foreground mb-2">
        <span>{direction === "buy" ? "BUY" : "SELL"} Setup</span>
        <span>
          {formatPrice(highPrice)} - {formatPrice(lowPrice)}
        </span>
      </div>
      <div className="space-y-1 font-mono text-sm">
        {sortedLevels.map((level) => {
          const isCurrentLevel =
            currentPrice !== undefined &&
            Math.abs(level.price - currentPrice) <
              Math.abs(highPrice - lowPrice) * 0.01;

          return (
            <div
              key={level.ratio}
              className={cn(
                "flex justify-between py-0.5 px-1 rounded",
                isCurrentLevel && "bg-accent"
              )}
            >
              <span className={getRatioColor(level.ratio)}>
                {level.label || formatRatio(level.ratio)}
              </span>
              <span className={cn(isCurrentLevel && "font-semibold")}>
                {formatPrice(level.price)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
