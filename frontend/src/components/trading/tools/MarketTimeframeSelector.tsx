"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MarketSymbol,
  Timeframe,
  TradingStyle,
  MARKET_CONFIG,
  TIMEFRAME_CONFIG,
  TIMEFRAME_PAIR_PRESETS,
  TRADING_STYLE_CONFIG,
} from "@/lib/chart-constants";

type MarketTimeframeSelectorProps = {
  // Data props
  symbol: MarketSymbol;
  higherTimeframe: Timeframe;
  lowerTimeframe: Timeframe;
  tradingStyle: TradingStyle;
  onChange: (updates: {
    symbol?: MarketSymbol;
    higherTimeframe?: Timeframe;
    lowerTimeframe?: Timeframe;
    tradingStyle?: TradingStyle;
  }) => void;

  // Workflow integration
  onComplete?: () => void;
  workflowMode?: boolean;

  // Display customization
  compact?: boolean;
  showPresets?: boolean;
};

export function MarketTimeframeSelector({
  symbol,
  higherTimeframe,
  lowerTimeframe,
  tradingStyle,
  onChange,
  onComplete,
  workflowMode = false,
  compact = false,
  showPresets = true,
}: MarketTimeframeSelectorProps) {
  const handlePresetSelect = useCallback(
    (presetId: string) => {
      const preset = TIMEFRAME_PAIR_PRESETS.find((p) => p.id === presetId);
      if (preset) {
        onChange({
          higherTimeframe: preset.higherTF,
          lowerTimeframe: preset.lowerTF,
          tradingStyle: preset.tradingStyle,
        });
      }
    },
    [onChange]
  );

  const getCurrentPreset = () => {
    return TIMEFRAME_PAIR_PRESETS.find(
      (p) =>
        p.higherTF === higherTimeframe &&
        p.lowerTF === lowerTimeframe &&
        p.tradingStyle === tradingStyle
    );
  };

  const allSymbols = Object.keys(MARKET_CONFIG) as MarketSymbol[];
  const allTimeframes = Object.keys(TIMEFRAME_CONFIG) as Timeframe[];
  const allStyles = Object.keys(TRADING_STYLE_CONFIG) as TradingStyle[];

  const currentPreset = getCurrentPreset();

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Select value={symbol} onValueChange={(v) => onChange({ symbol: v as MarketSymbol })}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allSymbols.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Select value={higherTimeframe} onValueChange={(v) => onChange({ higherTimeframe: v as Timeframe })}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allTimeframes.map((tf) => (
                <SelectItem key={tf} value={tf}>
                  {tf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">/</span>
          <Select value={lowerTimeframe} onValueChange={(v) => onChange({ lowerTimeframe: v as Timeframe })}>
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allTimeframes.map((tf) => (
                <SelectItem key={tf} value={tf}>
                  {tf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {workflowMode && onComplete && (
          <Button size="sm" onClick={onComplete}>
            Continue
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Market Symbol</Label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {allSymbols.map((s) => (
            <Button
              key={s}
              variant={symbol === s ? "default" : "outline"}
              size="sm"
              onClick={() => onChange({ symbol: s })}
              className="h-auto py-2"
            >
              <div className="text-center">
                <div className="font-semibold">{s}</div>
                <div className="text-[10px] opacity-70 truncate">{MARKET_CONFIG[s].name}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Trading Style */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Trading Style</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {allStyles.map((style) => {
            const config = TRADING_STYLE_CONFIG[style];
            return (
              <Button
                key={style}
                variant={tradingStyle === style ? "default" : "outline"}
                size="sm"
                onClick={() => onChange({ tradingStyle: style })}
                className="h-auto py-2"
                style={{
                  borderColor: tradingStyle === style ? config.color : undefined,
                  backgroundColor: tradingStyle === style ? `${config.color}20` : undefined,
                }}
              >
                <div className="text-center">
                  <div className="font-semibold">{config.label}</div>
                  <div className="text-[10px] opacity-70">{config.description}</div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Timeframe Pair Selection */}
      {showPresets && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Timeframe Pair Presets</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TIMEFRAME_PAIR_PRESETS.filter((p) => p.tradingStyle === tradingStyle).map((preset) => (
              <Button
                key={preset.id}
                variant={currentPreset?.id === preset.id ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetSelect(preset.id)}
                className="h-auto py-2"
              >
                <div className="text-center">
                  <div className="font-semibold">{preset.name}</div>
                  <div className="text-[10px] opacity-70">
                    {preset.higherTF} / {preset.lowerTF}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Timeframe Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Timeframes</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Higher Timeframe (Trend)</Label>
            <Select value={higherTimeframe} onValueChange={(v) => onChange({ higherTimeframe: v as Timeframe })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allTimeframes.map((tf) => (
                  <SelectItem key={tf} value={tf}>
                    {tf} - {TIMEFRAME_CONFIG[tf].description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Lower Timeframe (Entry)</Label>
            <Select value={lowerTimeframe} onValueChange={(v) => onChange({ lowerTimeframe: v as Timeframe })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allTimeframes.map((tf) => (
                  <SelectItem key={tf} value={tf}>
                    {tf} - {TIMEFRAME_CONFIG[tf].description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Selected Configuration</div>
            <div className="text-xs text-muted-foreground mt-1">
              {MARKET_CONFIG[symbol].name} on {higherTimeframe} / {lowerTimeframe} ({TRADING_STYLE_CONFIG[tradingStyle].label})
            </div>
          </div>
          {workflowMode && onComplete && (
            <Button onClick={onComplete}>
              Continue to Trend Analysis
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
