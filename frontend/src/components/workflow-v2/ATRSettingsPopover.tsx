"use client";

/**
 * ATRSettingsPopover
 *
 * Popover for configuring ATR indicator settings.
 * Includes quick-select buttons for common periods and a manual input.
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
import { Activity } from "lucide-react";
import { useState } from "react";

export type ATRSettingsPopoverProps = {
  /** Current ATR period */
  period: number;
  /** Whether ATR pane is enabled */
  isEnabled: boolean;
  /** Callback when period changes */
  onPeriodChange: (period: number) => void;
  /** Callback to toggle ATR pane visibility */
  onToggleEnabled: () => void;
  /** The button/trigger element */
  children: React.ReactNode;
};

/**
 * ATR period presets with descriptions
 */
const ATR_PERIOD_PRESETS = [
  { value: 7, label: "7", description: "Short-term volatility" },
  { value: 10, label: "10", description: "Quick response" },
  { value: 14, label: "14", description: "Standard (Wilder's default)" },
  { value: 20, label: "20", description: "Smoother, less noise" },
  { value: 21, label: "21", description: "Monthly trading days" },
] as const;

export function ATRSettingsPopover({
  period,
  isEnabled,
  onPeriodChange,
  onToggleEnabled,
  children,
}: ATRSettingsPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(period.toString());

  // Update input when period changes from outside
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setInputValue(period.toString());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 2 && num <= 50) {
      onPeriodChange(num);
    }
  };

  const handleInputBlur = () => {
    // Reset to current period if invalid
    const num = parseInt(inputValue, 10);
    if (isNaN(num) || num < 2 || num > 50) {
      setInputValue(period.toString());
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>

      <PopoverContent
        className="w-56 p-0"
        align="start"
        sideOffset={4}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b flex items-center justify-between bg-blue-500/10">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isEnabled}
              onCheckedChange={onToggleEnabled}
              className="h-4 w-4"
            />
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            <span className="font-semibold text-sm text-blue-400">
              ATR Indicator
            </span>
          </div>
          {isEnabled && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {period}
            </Badge>
          )}
        </div>

        {!isEnabled ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <p>Click checkbox to enable</p>
            <p className="text-xs mt-1">ATR indicator on chart</p>
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {/* Period Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Period</Label>
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={2}
                    max={50}
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    className="h-6 w-14 text-xs text-center"
                  />
                  <span className="text-[10px] text-muted-foreground">bars</span>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Number of bars for ATR calculation (2-50)
              </p>
            </div>

            {/* Period Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quick Select</Label>
              <div className="flex flex-wrap gap-1">
                {ATR_PERIOD_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => {
                      onPeriodChange(preset.value);
                      setInputValue(preset.value.toString());
                    }}
                    className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                      period === preset.value
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

            {/* Info section */}
            <div className="pt-2 border-t text-[10px] text-muted-foreground space-y-1.5">
              <p className="font-medium text-foreground/70">ATR Guidelines:</p>
              <ul className="space-y-0.5 pl-2">
                <li>- <span className="text-blue-400">1x ATR</span>: Tight stop (aggressive)</li>
                <li>- <span className="text-blue-400">1.5x ATR</span>: Standard stop</li>
                <li>- <span className="text-blue-400">2x ATR</span>: Wide stop (conservative)</li>
              </ul>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
