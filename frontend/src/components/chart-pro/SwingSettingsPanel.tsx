"use client";

/**
 * Swing Settings Panel Component
 *
 * Provides UI for configuring per-timeframe swing detection settings.
 * Includes lookback parameter (2-20 bars) and show lines toggle.
 */

import { ChevronDown, ChevronRight, Activity } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Timeframe } from "@/lib/chart-constants";
import { TIMEFRAME_COLORS, ALL_TIMEFRAMES } from "@/lib/chart-pro/strategy-types";
import type {
  SwingSettingsConfig,
  PerTimeframeSwingSettings,
} from "@/hooks/use-persisted-swing-settings";

export type SwingSettingsPanelProps = {
  /** Current timeframe being viewed on chart */
  currentTimeframe: Timeframe;
  /** Full swing settings configuration */
  swingConfig: SwingSettingsConfig;
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
  /** Whether settings have loaded from storage */
  isLoaded: boolean;
};

export function SwingSettingsPanel({
  currentTimeframe,
  getTimeframeSettings,
  updateTimeframeLookback,
  updateTimeframeEnabled,
  updateTimeframeShowLines,
  resetToDefaults,
  isLoaded,
}: SwingSettingsPanelProps) {
  const [showOtherTimeframes, setShowOtherTimeframes] = useState(false);

  // Get current timeframe settings
  const currentSettings = getTimeframeSettings(currentTimeframe);

  // Count enabled timeframes
  const enabledCount = ALL_TIMEFRAMES.filter(
    (tf) => getTimeframeSettings(tf).enabled
  ).length;

  // Other timeframes (not current)
  const otherTimeframes = ALL_TIMEFRAMES.filter((tf) => tf !== currentTimeframe);

  if (!isLoaded) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Swing Detection</h3>
        </div>
        <div className="text-xs text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Swing Detection</h3>
        {enabledCount > 0 && (
          <Badge variant="secondary" className="text-xs h-5">
            {enabledCount} active
          </Badge>
        )}
      </div>

      {/* Current Timeframe Settings (always visible) */}
      <div className="rounded-md border border-border bg-muted/30 p-3 space-y-3">
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

        {/* Enable toggle */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="swing-enabled-current"
            checked={currentSettings.enabled}
            onCheckedChange={(checked) =>
              updateTimeframeEnabled(currentTimeframe, checked === true)
            }
          />
          <Label
            htmlFor="swing-enabled-current"
            className="text-sm cursor-pointer"
          >
            Enable swing detection
          </Label>
        </div>

        {currentSettings.enabled && (
          <>
            {/* Lookback input */}
            <div className="flex items-center gap-3">
              <Label htmlFor="lookback-current" className="text-xs w-16">
                Lookback:
              </Label>
              <Input
                id="lookback-current"
                type="number"
                min={2}
                max={20}
                value={currentSettings.settings.lookback}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    updateTimeframeLookback(currentTimeframe, val);
                  }
                }}
                className="h-7 w-16 text-xs"
              />
              <span className="text-xs text-muted-foreground">bars (2-20)</span>
            </div>

            {/* Show lines toggle */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-lines-current"
                checked={currentSettings.settings.showLines}
                onCheckedChange={(checked) =>
                  updateTimeframeShowLines(currentTimeframe, checked === true)
                }
              />
              <Label
                htmlFor="show-lines-current"
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
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
          {showOtherTimeframes ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span>Other Timeframes</span>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-2 space-y-1">
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

      {/* Reset button */}
      <button
        onClick={resetToDefaults}
        className="w-full text-xs py-1.5 px-2 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        Reset to Defaults
      </button>
    </div>
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
      <div className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/30">
        <Checkbox
          checked={settings.enabled}
          onCheckedChange={(checked) => onEnabledChange(checked === true)}
          className="h-3.5 w-3.5"
        />
        <CollapsibleTrigger className="flex items-center gap-2 flex-1">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: TIMEFRAME_COLORS[timeframe] }}
          />
          <span className="text-xs">{timeframe}</span>
          {settings.enabled && (
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              lb={settings.settings.lookback}
            </Badge>
          )}
          <div className="flex-1" />
          {settings.enabled &&
            (isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            ))}
        </CollapsibleTrigger>
      </div>

      {settings.enabled && (
        <CollapsibleContent>
          <div className="ml-6 pl-3 border-l border-border/50 space-y-2 py-1">
            {/* Lookback */}
            <div className="flex items-center gap-2">
              <Label className="text-[10px] w-14">Lookback:</Label>
              <Input
                type="number"
                min={2}
                max={20}
                value={settings.settings.lookback}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) {
                    onLookbackChange(val);
                  }
                }}
                className="h-6 w-14 text-[10px]"
              />
            </div>

            {/* Show lines */}
            <div className="flex items-center gap-2">
              <Checkbox
                checked={settings.settings.showLines}
                onCheckedChange={(checked) => onShowLinesChange(checked === true)}
                className="h-3 w-3"
              />
              <Label className="text-[10px] cursor-pointer">Show lines</Label>
            </div>
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}
