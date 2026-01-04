"use client";

/**
 * SwingSettingsPopover
 *
 * Compact popover for configuring swing detection (HH/HL/LH/LL markers).
 * Combines the visibility toggle with per-timeframe settings.
 * Click to open popover, toggle to enable/disable swing markers.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, RotateCcw, Activity } from "lucide-react";
import type { Timeframe } from "@/lib/chart-constants";
import { TIMEFRAME_COLORS, ALL_TIMEFRAMES } from "@/lib/chart-pro/strategy-types";
import type { PerTimeframeSwingSettings } from "@/hooks/use-persisted-swing-settings";
import { cn } from "@/lib/utils";

export type SwingSettingsPopoverProps = {
  /** Whether swing markers are visible on chart */
  isVisible: boolean;
  /** Toggle visibility */
  onToggleVisibility: () => void;
  /** Current timeframe being viewed */
  currentTimeframe: Timeframe;
  /** Get settings for a specific timeframe */
  getTimeframeSettings: (tf: Timeframe) => PerTimeframeSwingSettings;
  /** Update lookback for a timeframe */
  updateTimeframeLookback: (tf: Timeframe, lookback: number) => void;
  /** Toggle enabled state for a timeframe */
  updateTimeframeEnabled: (tf: Timeframe, enabled: boolean) => void;
  /** Toggle showLines for a timeframe */
  updateTimeframeShowLines: (tf: Timeframe, showLines: boolean) => void;
  /** Reset all settings to defaults */
  resetToDefaults: () => void;
  /** Whether settings have loaded */
  isLoaded: boolean;
  /** Optional: Number of swing markers currently displayed */
  markerCount?: number;
  /** Optional: Whether user has modified any pivots */
  hasModifiedPivots?: boolean;
};

export function SwingSettingsPopover({
  isVisible,
  onToggleVisibility,
  currentTimeframe,
  getTimeframeSettings,
  updateTimeframeLookback,
  updateTimeframeEnabled,
  updateTimeframeShowLines,
  resetToDefaults,
  isLoaded,
  markerCount = 0,
  hasModifiedPivots = false,
}: SwingSettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showOtherTimeframes, setShowOtherTimeframes] = useState(false);

  // Get current timeframe settings
  const currentSettings = getTimeframeSettings(currentTimeframe);

  // Count enabled timeframes
  const enabledCount = ALL_TIMEFRAMES.filter(
    (tf) => getTimeframeSettings(tf).enabled
  ).length;

  // Other timeframes (not current)
  const otherTimeframes = ALL_TIMEFRAMES.filter((tf) => tf !== currentTimeframe);

  // Button color based on state
  const getButtonVariant = () => {
    if (!isVisible) return "outline";
    if (hasModifiedPivots) return "default";
    return "secondary";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={getButtonVariant()}
          size="sm"
          className={cn(
            "h-7 px-2 text-xs gap-1",
            isVisible && "bg-blue-500/20 border-blue-500/50 text-blue-400",
            hasModifiedPivots && "bg-amber-500/20 border-amber-500/50 text-amber-400"
          )}
        >
          <Activity className="h-3 w-3" />
          <span className="hidden sm:inline">Swing</span>
          {isVisible && markerCount > 0 && (
            <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
              {markerCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-64 p-0"
        align="start"
        sideOffset={4}
      >
        {/* Header with global toggle */}
        <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Swing Detection</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={isVisible}
              onCheckedChange={onToggleVisibility}
              className="h-4 w-7"
            />
          </div>
        </div>

        {!isLoaded ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading settings...
          </div>
        ) : !isVisible ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Toggle switch to show HH/HL/LH/LL markers
          </div>
        ) : (
          <div className="p-2 space-y-3 max-h-[350px] overflow-y-auto">
            {/* Current Timeframe Settings */}
            <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: TIMEFRAME_COLORS[currentTimeframe] }}
                />
                <span className="text-sm font-medium">{currentTimeframe}</span>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                  current
                </Badge>
              </div>

              {/* Enable toggle for this TF */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="swing-tf-enabled"
                  checked={currentSettings.enabled}
                  onCheckedChange={(checked) =>
                    updateTimeframeEnabled(currentTimeframe, checked === true)
                  }
                  className="h-3.5 w-3.5"
                />
                <Label
                  htmlFor="swing-tf-enabled"
                  className="text-xs cursor-pointer"
                >
                  Detect swings on {currentTimeframe}
                </Label>
              </div>

              {currentSettings.enabled && (
                <>
                  {/* Lookback input */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-16">Lookback:</Label>
                    <Input
                      type="number"
                      min={2}
                      max={20}
                      value={currentSettings.settings.lookback}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (!isNaN(val) && val >= 2 && val <= 20) {
                          updateTimeframeLookback(currentTimeframe, val);
                        }
                      }}
                      className="h-6 w-14 text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground">
                      bars
                    </span>
                  </div>

                  {/* Show lines toggle */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="swing-show-lines"
                      checked={currentSettings.settings.showLines}
                      onCheckedChange={(checked) =>
                        updateTimeframeShowLines(currentTimeframe, checked === true)
                      }
                      className="h-3.5 w-3.5"
                    />
                    <Label
                      htmlFor="swing-show-lines"
                      className="text-xs cursor-pointer"
                    >
                      Draw connecting lines
                    </Label>
                  </div>
                </>
              )}
            </div>

            {/* Other Timeframes (collapsible) */}
            <Collapsible open={showOtherTimeframes} onOpenChange={setShowOtherTimeframes}>
              <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1">
                {showOtherTimeframes ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <span>Other Timeframes</span>
                {enabledCount > 1 && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-auto">
                    {enabledCount - (currentSettings.enabled ? 1 : 0)} enabled
                  </Badge>
                )}
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-1 space-y-0.5">
                  {otherTimeframes.map((tf) => {
                    const settings = getTimeframeSettings(tf);
                    return (
                      <TimeframeRow
                        key={tf}
                        timeframe={tf}
                        settings={settings}
                        onEnabledChange={(enabled) => updateTimeframeEnabled(tf, enabled)}
                        onLookbackChange={(lookback) => updateTimeframeLookback(tf, lookback)}
                        onShowLinesChange={(showLines) => updateTimeframeShowLines(tf, showLines)}
                      />
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Footer */}
        {isLoaded && isVisible && (
          <div className="px-2 py-1.5 border-t bg-muted/20 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              Lookback: bars to confirm pivot
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * Compact timeframe row for other timeframes
 */
type TimeframeRowProps = {
  timeframe: Timeframe;
  settings: PerTimeframeSwingSettings;
  onEnabledChange: (enabled: boolean) => void;
  onLookbackChange: (lookback: number) => void;
  onShowLinesChange: (showLines: boolean) => void;
};

function TimeframeRow({
  timeframe,
  settings,
  onEnabledChange,
  onLookbackChange,
  onShowLinesChange,
}: TimeframeRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div className="flex items-center gap-2 py-1 px-1.5 rounded hover:bg-muted/30">
        <Checkbox
          checked={settings.enabled}
          onCheckedChange={(checked) => onEnabledChange(checked === true)}
          className="h-3 w-3"
        />
        <CollapsibleTrigger className="flex items-center gap-1.5 flex-1 text-left">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: TIMEFRAME_COLORS[timeframe] }}
          />
          <span className="text-[11px]">{timeframe}</span>
          {settings.enabled && (
            <Badge variant="outline" className="text-[9px] h-3.5 px-1 py-0">
              lookback={settings.settings.lookback}
            </Badge>
          )}
          {settings.enabled && (
            <div className="ml-auto">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          )}
        </CollapsibleTrigger>
      </div>

      {settings.enabled && (
        <CollapsibleContent>
          <div className="ml-5 pl-2 border-l border-border/50 space-y-1.5 py-1">
            {/* Lookback */}
            <div className="flex items-center gap-1.5">
              <Label className="text-[10px] w-14">Lookback:</Label>
              <Input
                type="number"
                min={2}
                max={20}
                value={settings.settings.lookback}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 2 && val <= 20) {
                    onLookbackChange(val);
                  }
                }}
                className="h-5 w-12 text-[10px]"
              />
            </div>

            {/* Show lines */}
            <div className="flex items-center gap-1.5">
              <Checkbox
                checked={settings.settings.showLines}
                onCheckedChange={(checked) => onShowLinesChange(checked === true)}
                className="h-2.5 w-2.5"
              />
              <Label className="text-[10px] cursor-pointer">Lines</Label>
            </div>
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
