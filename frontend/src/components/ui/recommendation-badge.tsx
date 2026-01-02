"use client";

import { cn } from "@/lib/utils";

type RecommendationLevel = "excellent" | "good" | "marginal" | "poor";

type RecommendationBadgeProps = {
  level: RecommendationLevel;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const RECOMMENDATION_CONFIG: Record<
  RecommendationLevel,
  { label: string; color: string; bgColor: string; description: string }
> = {
  excellent: {
    label: "EXCELLENT",
    color: "text-green-400",
    bgColor: "bg-green-500/20 border-green-500/50",
    description: "Strong setup with favorable risk-reward",
  },
  good: {
    label: "GOOD",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20 border-blue-500/50",
    description: "Solid setup meeting minimum criteria",
  },
  marginal: {
    label: "MARGINAL",
    color: "text-amber-400",
    bgColor: "bg-amber-500/20 border-amber-500/50",
    description: "Borderline setup, consider adjustments",
  },
  poor: {
    label: "POOR",
    color: "text-red-400",
    bgColor: "bg-red-500/20 border-red-500/50",
    description: "Unfavorable setup, reconsider entry",
  },
};

const SIZE_CLASSES = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-3 py-1",
  lg: "text-base px-4 py-1.5",
};

export function RecommendationBadge({
  level,
  showLabel = true,
  size = "md",
  className,
}: RecommendationBadgeProps) {
  const config = RECOMMENDATION_CONFIG[level];

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        "font-semibold rounded-full border",
        config.color,
        config.bgColor,
        SIZE_CLASSES[size],
        className
      )}
      title={config.description}
    >
      {showLabel ? config.label : level.charAt(0).toUpperCase()}
    </span>
  );
}

type RecommendationIndicatorProps = {
  level: RecommendationLevel;
  showDescription?: boolean;
  className?: string;
};

export function RecommendationIndicator({
  level,
  showDescription = true,
  className,
}: RecommendationIndicatorProps) {
  const config = RECOMMENDATION_CONFIG[level];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <RecommendationBadge level={level} />
      {showDescription && (
        <span className="text-sm text-muted-foreground">
          {config.description}
        </span>
      )}
    </div>
  );
}

export { RECOMMENDATION_CONFIG };
export type { RecommendationLevel };
