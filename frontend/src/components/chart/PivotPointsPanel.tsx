"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PivotPoint } from "@/lib/chart-constants";
import { formatDisplayPrice } from "@/lib/market-utils";

type PivotPointsPanelProps = {
  pivotPoints: PivotPoint[];
  high: number;
  low: number;
  showPivots: boolean;
  showPivotLines: boolean;
  useManualPivots: boolean;
  manualHigh: string;
  manualLow: string;
  onTogglePivots: () => void;
  onTogglePivotLines: () => void;
  onToggleManualPivots: () => void;
  onManualHighChange: (value: string) => void;
  onManualLowChange: (value: string) => void;
  onApplyDetectedPivots: () => void;
};

export function PivotPointsPanel({
  pivotPoints,
  high,
  low,
  showPivots,
  showPivotLines,
  useManualPivots,
  manualHigh,
  manualLow,
  onTogglePivots,
  onTogglePivotLines,
  onToggleManualPivots,
  onManualHighChange,
  onManualLowChange,
  onApplyDetectedPivots,
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
