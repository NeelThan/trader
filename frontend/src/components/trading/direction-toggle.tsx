"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Direction } from "./types";

export type DirectionToggleProps = {
  value: Direction;
  onChange: (direction: Direction) => void;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  sm: "h-8 text-xs",
  default: "h-10 text-sm",
  lg: "h-12 text-base",
};

export function DirectionToggle({
  value,
  onChange,
  disabled = false,
  size = "default",
  className,
}: DirectionToggleProps) {
  return (
    <div
      className={cn(
        "inline-flex rounded-lg border bg-muted p-1",
        SIZE_CLASSES[size],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <button
        type="button"
        onClick={() => !disabled && onChange("buy")}
        disabled={disabled}
        className={cn(
          "flex-1 px-4 rounded-md font-semibold transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          value === "buy"
            ? "bg-buy text-buy-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        BUY
      </button>
      <button
        type="button"
        onClick={() => !disabled && onChange("sell")}
        disabled={disabled}
        className={cn(
          "flex-1 px-4 rounded-md font-semibold transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          value === "sell"
            ? "bg-sell text-sell-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        SELL
      </button>
    </div>
  );
}
