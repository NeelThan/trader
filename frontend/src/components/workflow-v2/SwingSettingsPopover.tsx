"use client";

/**
 * SwingSettingsPopover
 *
 * Per-timeframe popover for configuring swing detection settings.
 * Matches the TimeframeSettingsPopover pattern for Fibonacci levels.
 * Click a timeframe button to configure that TF's swing detection.
 */

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RotateCcw, Activity, TrendingUp, TrendingDown } from "lucide-react";
import type { Timeframe } from "@/lib/chart-constants";
import { TIMEFRAME_COLORS } from "@/lib/chart-pro/strategy-types";
import type { PerTimeframeSwingSettings } from "@/hooks/use-persisted-swing-settings";
import { useState } from "react";

export type SwingSettingsPopoverProps = {
  /** The timeframe this popover configures */
  timeframe: Timeframe;
  /** Whether this timeframe is enabled for swing detection */
  isEnabled: boolean;
  /** Get settings for this timeframe */
  settings: PerTimeframeSwingSettings;
  /** Update lookback for this timeframe */
  onLookbackChange: (lookback: number) => void;
  /** Toggle enabled state for this timeframe */
  onToggleEnabled: () => void;
  /** Toggle showLines for this timeframe */
  onShowLinesChange: (showLines: boolean) => void;
  /** The button/trigger element */
  children: React.ReactNode;
};

/**
 * Lookback presets with descriptive names
 */
const LOOKBACK_PRESETS = [
  { value: 2, label: "Fast", description: "More signals, less confirmation" },
  { value: 3, label: "Quick", description: "Default for lower TFs" },
  { value: 5, label: "Standard", description: "Balanced detection" },
  { value: 8, label: "Relaxed", description: "Fewer, stronger pivots" },
  { value: 13, label: "Slow", description: "Major swings only" },
] as const;

export function SwingSettingsPopover({
  timeframe,
  isEnabled,
  settings,
  onLookbackChange,
  onToggleEnabled,
  onShowLinesChange,
  children,
}: SwingSettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const color = TIMEFRAME_COLORS[timeframe];
  const lookback = settings.settings.lookback;
  const showLines = settings.settings.showLines;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>

      <PopoverContent
        className="w-56 p-0"
        align="start"
        sideOffset={4}
      >
        {/* Header */}
        <div
          className="px-3 py-2 border-b flex items-center justify-between"
          style={{ backgroundColor: `${color}10` }}
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isEnabled}
              onCheckedChange={onToggleEnabled}
              className="h-4 w-4"
            />
            <Activity className="h-3.5 w-3.5" style={{ color }} />
            <span className="font-semibold text-sm" style={{ color }}>
              {timeframe} Swing
            </span>
          </div>
          {isEnabled && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              lookback={lookback}
            </Badge>
          )}
        </div>

        {!isEnabled ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <p>Click checkbox to enable</p>
            <p className="text-xs mt-1">swing detection for {timeframe}</p>
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {/* Lookback Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Lookback</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={2}
                    max={20}
                    value={lookback}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 2 && val <= 20) {
                        onLookbackChange(val);
                      }
                    }}
                    className="h-6 w-14 text-xs text-center"
                  />
                  <span className="text-[10px] text-muted-foreground">bars</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Bars to confirm a pivot point (2-20)
              </p>
            </div>

            {/* Lookback Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Presets</Label>
              <div className="flex flex-wrap gap-1">
                {LOOKBACK_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => onLookbackChange(preset.value)}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                      lookback === preset.value
                        ? "bg-primary/10 border-primary/30 text-primary font-medium"
                        : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50"
                    }`}
                    title={preset.description}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Show Lines Toggle */}
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id={`swing-lines-${timeframe}`}
                checked={showLines}
                onCheckedChange={(checked) => onShowLinesChange(checked === true)}
                className="h-3.5 w-3.5"
              />
              <Label
                htmlFor={`swing-lines-${timeframe}`}
                className="text-xs cursor-pointer"
              >
                Draw connecting lines
              </Label>
            </div>

            {/* Visual explanation */}
            <div className="pt-2 border-t text-[10px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span>HH = Higher High, HL = Higher Low</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span>LH = Lower High, LL = Lower Low</span>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
