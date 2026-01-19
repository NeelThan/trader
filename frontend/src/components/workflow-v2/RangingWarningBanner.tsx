"use client";

/**
 * RangingWarningBanner - Displays a warning when market is ranging
 *
 * Fibonacci levels are less reliable in ranging markets where price
 * is moving sideways. This component displays a clear warning to
 * the user when the backend detects ranging conditions.
 */

import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export type RangingWarningBannerProps = {
  /** Warning message from backend */
  warning: string;
  /** Whether the warning can be dismissed */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Variant: inline (smaller) or banner (full width) */
  variant?: "inline" | "banner";
};

export function RangingWarningBanner({
  warning,
  dismissible = true,
  onDismiss,
  className,
  variant = "banner",
}: RangingWarningBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded text-xs",
          "bg-amber-500/10 border border-amber-500/30 text-amber-400",
          className
        )}
      >
        <AlertTriangle size={12} className="shrink-0" />
        <span className="flex-1 min-w-0 truncate">{warning}</span>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="p-0.5 hover:bg-amber-500/20 rounded transition-colors"
            aria-label="Dismiss warning"
          >
            <X size={10} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg",
        "bg-amber-500/10 border border-amber-500/30",
        className
      )}
      role="alert"
    >
      <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-400 mb-1">
          Ranging Market Detected
        </p>
        <p className="text-xs text-amber-300/80">{warning}</p>
      </div>
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-amber-500/20 rounded transition-colors text-amber-400"
          aria-label="Dismiss warning"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Compact ranging indicator for use in timeframe cells
 */
export function RangingIndicator({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md";
}) {
  const iconSize = size === "sm" ? 10 : 14;

  return (
    <div
      className={cn(
        "flex items-center gap-1 text-amber-400",
        size === "sm" ? "text-[10px]" : "text-xs",
        className
      )}
      title="Ranging market - Fibonacci less reliable"
    >
      <AlertTriangle size={iconSize} />
      <span>Ranging</span>
    </div>
  );
}
