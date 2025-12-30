"use client";

import { Button } from "@/components/ui/button";
import { Timeframe, TIMEFRAME_CONFIG } from "@/lib/chart-constants";
import { ChartType } from "@/components/trading";
import { COLOR_SCHEMES, ColorScheme } from "@/hooks/use-settings";

type ChartControlsProps = {
  timeframe: Timeframe;
  chartType: ChartType;
  colorScheme: ColorScheme;
  onTimeframeChange: (timeframe: Timeframe) => void;
  onChartTypeChange: (chartType: ChartType) => void;
  onColorSchemeChange: (scheme: ColorScheme) => void;
};

export function ChartControls({
  timeframe,
  chartType,
  colorScheme,
  onTimeframeChange,
  onChartTypeChange,
  onColorSchemeChange,
}: ChartControlsProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Timeframe Selection */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Timeframe:</span>
        {(Object.keys(TIMEFRAME_CONFIG) as Timeframe[]).map((tf) => (
          <Button
            key={tf}
            variant={timeframe === tf ? "default" : "outline"}
            size="sm"
            onClick={() => onTimeframeChange(tf)}
          >
            {TIMEFRAME_CONFIG[tf].label}
          </Button>
        ))}
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Chart Type Selection */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Chart:</span>
        <Button
          variant={chartType === "candlestick" ? "default" : "outline"}
          size="sm"
          onClick={() => onChartTypeChange("candlestick")}
        >
          Candle
        </Button>
        <Button
          variant={chartType === "heikin-ashi" ? "default" : "outline"}
          size="sm"
          onClick={() => onChartTypeChange("heikin-ashi")}
        >
          Heikin Ashi
        </Button>
        <Button
          variant={chartType === "bar" ? "default" : "outline"}
          size="sm"
          onClick={() => onChartTypeChange("bar")}
        >
          Bar
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Color Scheme Selection */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground mr-2">Colors:</span>
        {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map((scheme) => (
          <Button
            key={scheme}
            variant={colorScheme === scheme ? "default" : "outline"}
            size="sm"
            onClick={() => onColorSchemeChange(scheme)}
            className="gap-1"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLOR_SCHEMES[scheme].up }}
            />
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLOR_SCHEMES[scheme].down }}
            />
          </Button>
        ))}
      </div>
    </div>
  );
}
