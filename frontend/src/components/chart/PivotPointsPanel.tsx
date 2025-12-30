"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PivotPoint } from "@/lib/chart-constants";
import { formatDisplayPrice } from "@/lib/market-utils";
import type { PivotConfig } from "@/hooks/use-pivot-analysis";

type PivotPointsPanelProps = {
  pivotPoints: PivotPoint[];
  high: number;
  low: number;
  showPivots: boolean;
  showPivotLines: boolean;
  useManualPivots: boolean;
  manualHigh: string;
  manualLow: string;
  pivotConfig: PivotConfig;
  onTogglePivots: () => void;
  onTogglePivotLines: () => void;
  onToggleManualPivots: () => void;
  onManualHighChange: (value: string) => void;
  onManualLowChange: (value: string) => void;
  onApplyDetectedPivots: () => void;
  onPivotConfigChange: (config: Partial<PivotConfig>) => void;
};

/**
 * A label with tooltip explanation.
 */
function ConfigLabel({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Label className="text-xs cursor-help inline-flex items-center gap-1">
          {label}
          <span className="text-muted-foreground/50">(?)</span>
        </Label>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-64">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export function PivotPointsPanel({
  pivotPoints,
  high,
  low,
  showPivots,
  showPivotLines,
  useManualPivots,
  manualHigh,
  manualLow,
  pivotConfig,
  onTogglePivots,
  onTogglePivotLines,
  onToggleManualPivots,
  onManualHighChange,
  onManualLowChange,
  onApplyDetectedPivots,
  onPivotConfigChange,
}: PivotPointsPanelProps) {
  const highCount = pivotPoints.filter((p) => p.type === "high").length;
  const lowCount = pivotPoints.filter((p) => p.type === "low").length;

  return (
    <div className="p-4 rounded-lg bg-card border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Pivot Points</h3>
        <div className="flex gap-2">
          <Button
            variant={showPivots ? "default" : "outline"}
            size="sm"
            onClick={onTogglePivots}
          >
            {showPivots ? "Hide Pivots" : "Show Pivots"}
          </Button>
          <Button
            variant={showPivotLines ? "default" : "outline"}
            size="sm"
            onClick={onTogglePivotLines}
            className={showPivotLines ? "bg-amber-600 hover:bg-amber-700" : ""}
          >
            {showPivotLines ? "Hide Lines" : "Show Lines"}
          </Button>
          <Button
            variant={useManualPivots ? "default" : "outline"}
            size="sm"
            onClick={onToggleManualPivots}
          >
            {useManualPivots ? "Auto Detect" : "Manual Override"}
          </Button>
        </div>
      </div>

      {/* Pivot Configuration */}
      <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/50">
        <div className="space-y-1">
          <ConfigLabel
            label="Lookback"
            tooltip="Number of bars on each side required to confirm a pivot point. Higher = fewer, more significant pivots. Lower = more pivots detected."
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={pivotConfig.lookback}
              onChange={(e) => onPivotConfigChange({ lookback: parseInt(e.target.value) || 5 })}
              className="h-8 font-mono text-sm"
              min={1}
              max={20}
            />
            <span className="text-xs text-muted-foreground">bars</span>
          </div>
        </div>
        <div className="space-y-1">
          <ConfigLabel
            label="Count"
            tooltip="Number of pivot points to display on the chart. Only the most recent pivots are shown."
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={pivotConfig.count}
              onChange={(e) => onPivotConfigChange({ count: parseInt(e.target.value) || 5 })}
              className="h-8 font-mono text-sm"
              min={1}
              max={20}
            />
            <span className="text-xs text-muted-foreground">pivots</span>
          </div>
        </div>
        <div className="space-y-1">
          <ConfigLabel
            label="Offset"
            tooltip="Skip the last N bars before detecting pivots. Use this to ignore unconfirmed recent price action. Set to 0 to include all bars."
          />
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={pivotConfig.offset}
              onChange={(e) => onPivotConfigChange({ offset: parseInt(e.target.value) || 0 })}
              className="h-8 font-mono text-sm"
              min={0}
              max={50}
            />
            <span className="text-xs text-muted-foreground">bars</span>
          </div>
        </div>
      </div>

      {useManualPivots ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="manualHigh">Swing High Price</Label>
            <Input
              id="manualHigh"
              type="number"
              value={manualHigh}
              onChange={(e) => onManualHighChange(e.target.value)}
              placeholder={high.toFixed(2)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="manualLow">Swing Low Price</Label>
            <Input
              id="manualLow"
              type="number"
              value={manualLow}
              onChange={(e) => onManualLowChange(e.target.value)}
              placeholder={low.toFixed(2)}
              className="font-mono"
            />
          </div>
          <div className="col-span-2">
            <Button variant="outline" size="sm" onClick={onApplyDetectedPivots}>
              Use Detected Values
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          <p>
            Detected {highCount} swing highs and {lowCount} swing lows
          </p>
          <p className="mt-1">
            Using: High{" "}
            <span className="font-mono text-foreground">
              {formatDisplayPrice(high)}
            </span>{" "}
            | Low{" "}
            <span className="font-mono text-foreground">
              {formatDisplayPrice(low)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
