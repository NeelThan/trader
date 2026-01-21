"use client";

/**
 * CascadePanel - Displays cascade effect analysis for early reversal detection.
 *
 * Shows the 6-stage cascade model where trend reversals "bubble up" from
 * lower to higher timeframes. Helps bi-directional traders catch reversals
 * early (Stage 2-3) rather than waiting for full confirmation (Stage 6).
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CascadeAnalysis, TimeframeTrendState } from "@/types/workflow-v2";
import { CASCADE_STAGE_CONFIG } from "@/types/workflow-v2";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { CASCADE_STAGES } from "@/lib/educational-content";

type CascadePanelProps = {
  /** Cascade analysis data */
  cascade: CascadeAnalysis | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error?: string | null;
  /** Chart colors for consistency */
  chartColors: { up: string; down: string };
};

/** Get stage-specific tooltip content */
function getStageTooltip(stage: number) {
  const stageKey = `stage${stage}` as keyof typeof CASCADE_STAGES;
  return CASCADE_STAGES[stageKey] || CASCADE_STAGES.stage1;
}

/**
 * Visual progress bar showing cascade stage (1-6).
 */
function CascadeStageBar({ stage }: { stage: number }) {
  const config = CASCADE_STAGE_CONFIG[stage] || CASCADE_STAGE_CONFIG[1];
  const stageTooltip = getStageTooltip(stage);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Reversal Progress</span>
        <span style={{ color: config.color }} className="font-medium flex items-center gap-1">
          Stage {stage}/6
          <InfoTooltip
            title={stageTooltip.title}
            content={stageTooltip.content}
            side="left"
            iconClassName="w-3 h-3 text-[8px]"
          />
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${(stage / 6) * 100}%`,
            backgroundColor: config.color,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Displays a single timeframe's trend state.
 */
function TimeframeStateRow({
  state,
  chartColors,
}: {
  state: TimeframeTrendState;
  chartColors: { up: string; down: string };
}) {
  const trendColor =
    state.trend === "bullish"
      ? chartColors.up
      : state.trend === "bearish"
        ? chartColors.down
        : "#9ca3af";

  return (
    <div
      className={cn(
        "flex items-center justify-between py-1.5 px-2 rounded text-xs",
        state.is_diverging ? "bg-amber-500/10" : "bg-muted/30"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium w-8">{state.timeframe}</span>
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0 capitalize"
          style={{ borderColor: trendColor, color: trendColor }}
        >
          {state.trend}
        </Badge>
        {state.swing_type && (
          <span className="text-muted-foreground">{state.swing_type}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {state.is_diverging && (
          <span className="flex items-center gap-1">
            <Badge
              variant="secondary"
              className="text-[10px] px-1 py-0 bg-amber-500/20 text-amber-400"
            >
              Diverging
            </Badge>
            <InfoTooltip
              title={CASCADE_STAGES.diverging.title}
              content={CASCADE_STAGES.diverging.content}
              side="left"
              iconClassName="w-3 h-3 text-[8px] text-amber-400"
            />
          </span>
        )}
        <span className="text-muted-foreground text-[10px]">
          {state.confidence}%
        </span>
      </div>
    </div>
  );
}

export function CascadePanel({
  cascade,
  isLoading,
  error,
  chartColors,
}: CascadePanelProps) {
  if (isLoading) {
    return (
      <Card className="shrink-0">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm">Cascade Effect</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0 space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-2 w-full" />
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shrink-0">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm">Cascade Effect</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="text-xs text-red-400 bg-red-500/10 rounded p-2">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!cascade) {
    return (
      <Card className="shrink-0">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm">Cascade Effect</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <div className="text-xs text-muted-foreground text-center py-4">
            No cascade data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const stageConfig =
    CASCADE_STAGE_CONFIG[cascade.stage] || CASCADE_STAGE_CONFIG[1];
  const dominantColor =
    cascade.dominant_trend === "bullish"
      ? chartColors.up
      : cascade.dominant_trend === "bearish"
        ? chartColors.down
        : "#9ca3af";

  return (
    <Card className="shrink-0">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            Cascade Effect
            <InfoTooltip
              title={CASCADE_STAGES.overview.title}
              content={CASCADE_STAGES.overview.content}
              side="right"
            />
          </span>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5"
            style={{
              borderColor: stageConfig.color,
              color: stageConfig.color,
              backgroundColor: stageConfig.bgColor,
            }}
          >
            {stageConfig.icon} {stageConfig.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 space-y-3">
        {/* Stage Progress Bar */}
        <CascadeStageBar stage={cascade.stage} />

        {/* Dominant Trend & Reversal Probability */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground flex items-center gap-1">
              Dominant:
              <InfoTooltip
                title={CASCADE_STAGES.dominantTrend.title}
                content={CASCADE_STAGES.dominantTrend.content}
                side="top"
                iconClassName="w-3 h-3 text-[8px]"
              />
            </span>
            <Badge
              variant="outline"
              className="capitalize text-[10px] px-1.5 py-0"
              style={{ borderColor: dominantColor, color: dominantColor }}
            >
              {cascade.dominant_trend}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground flex items-center gap-1">
              Rev. Prob:
              <InfoTooltip
                title={CASCADE_STAGES.reversalProbability.title}
                content={CASCADE_STAGES.reversalProbability.content}
                side="top"
                iconClassName="w-3 h-3 text-[8px]"
              />
            </span>
            <span
              className="font-medium"
              style={{ color: stageConfig.color }}
            >
              {cascade.reversal_probability}%
            </span>
          </div>
        </div>

        {/* Progression Description */}
        <div className="text-xs bg-muted/50 rounded p-2">
          <div className="text-muted-foreground mb-1">Status:</div>
          <div className="font-medium">{cascade.progression}</div>
        </div>

        {/* Actionable Insight */}
        <div
          className="text-xs rounded p-2"
          style={{ backgroundColor: stageConfig.bgColor }}
        >
          <div className="text-muted-foreground mb-1">Recommendation:</div>
          <div className="font-medium" style={{ color: stageConfig.color }}>
            {cascade.actionable_insight}
          </div>
        </div>

        {/* Timeframe States */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Timeframe Analysis</span>
            <span>
              {cascade.diverging_timeframes.length} diverging /{" "}
              {cascade.timeframe_states.length} total
            </span>
          </div>
          <div className="space-y-1 max-h-[180px] overflow-y-auto">
            {cascade.timeframe_states.map((state) => (
              <TimeframeStateRow
                key={state.timeframe}
                state={state}
                chartColors={chartColors}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
