"use client";

import { useState } from "react";
import { useSettings, ChartSettings, COLOR_SCHEMES, ColorScheme } from "@/hooks/use-settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type OptionConfig<T extends string> = {
  value: T;
  label: string;
};

const CHART_TYPES: OptionConfig<ChartSettings["chartType"]>[] = [
  { value: "candlestick", label: "Candlestick" },
  { value: "heikin-ashi", label: "Heikin Ashi" },
  { value: "bar", label: "Bar (OHLC)" },
];

const THEMES: OptionConfig<ChartSettings["theme"]>[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

const SYMBOLS: OptionConfig<ChartSettings["defaultSymbol"]>[] = [
  { value: "DJI", label: "Dow Jones (DJI)" },
  { value: "SPX", label: "S&P 500 (SPX)" },
  { value: "NDX", label: "Nasdaq 100 (NDX)" },
  { value: "BTCUSD", label: "Bitcoin (BTCUSD)" },
  { value: "EURUSD", label: "EUR/USD" },
  { value: "GOLD", label: "Gold" },
];

const TIMEFRAMES: OptionConfig<ChartSettings["defaultTimeframe"]>[] = [
  { value: "1m", label: "1 Minute" },
  { value: "15m", label: "15 Minutes" },
  { value: "1H", label: "1 Hour" },
  { value: "4H", label: "4 Hours" },
  { value: "1D", label: "Daily" },
  { value: "1W", label: "Weekly" },
  { value: "1M", label: "Monthly" },
];

function SettingSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="p-4 rounded-lg bg-card border space-y-4">
      <h3 className="font-semibold text-lg">{title}</h3>
      {children}
    </div>
  );
}

function ToggleSetting({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Button
        variant={checked ? "default" : "outline"}
        size="sm"
        onClick={() => onChange(!checked)}
        className={checked ? "bg-green-600 hover:bg-green-700" : ""}
      >
        {checked ? "On" : "Off"}
      </Button>
    </div>
  );
}

function SelectSetting<T extends string>({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: T;
  options: OptionConfig<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, setSettings, resetSettings } = useSettings();
  const [pageTheme, setPageTheme] = useState<"dark" | "light">("dark");

  return (
    <div className={pageTheme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Chart Settings</h1>
              <p className="text-muted-foreground">
                Configure default chart behavior
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/chart">
                <Button variant="outline" size="sm">
                  Back to Chart
                </Button>
              </Link>
              <Link href="/trend-analysis">
                <Button variant="outline" size="sm">
                  Trend Analysis
                </Button>
              </Link>
              <Link href="/position-sizing">
                <Button variant="outline" size="sm">
                  Position Size
                </Button>
              </Link>
              {process.env.NODE_ENV === "development" && (
                <Link href="/dev/components">
                  <Button variant="outline" size="sm">
                    Components
                  </Button>
                </Link>
              )}
              <ThemeToggle
                theme={pageTheme}
                onToggle={() => setPageTheme(pageTheme === "dark" ? "light" : "dark")}
              />
            </div>
          </div>

          {/* Chart Display */}
          <SettingSection title="Chart Display">
            <SelectSetting
              label="Default Chart Type"
              description="The chart style shown when you first open the chart"
              value={settings.chartType}
              options={CHART_TYPES}
              onChange={(value) => setSettings({ chartType: value })}
            />

            <SelectSetting
              label="Theme"
              description="Color theme for the chart"
              value={settings.theme}
              options={THEMES}
              onChange={(value) => setSettings({ theme: value })}
            />

            <div className="space-y-2">
              <div>
                <Label className="text-sm font-medium">Bar Colors</Label>
                <p className="text-xs text-muted-foreground">
                  Color scheme for candlesticks and bars (up / down)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COLOR_SCHEMES) as ColorScheme[]).map((scheme) => (
                  <Button
                    key={scheme}
                    variant={settings.colorScheme === scheme ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSettings({ colorScheme: scheme })}
                    className="gap-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLOR_SCHEMES[scheme].up }}
                    />
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLOR_SCHEMES[scheme].down }}
                    />
                    <span>{COLOR_SCHEMES[scheme].label}</span>
                  </Button>
                ))}
              </div>
            </div>
          </SettingSection>

          {/* Default Market */}
          <SettingSection title="Default Market">
            <SelectSetting
              label="Symbol"
              description="The market shown when you first open the chart"
              value={settings.defaultSymbol}
              options={SYMBOLS}
              onChange={(value) => setSettings({ defaultSymbol: value })}
            />

            <SelectSetting
              label="Timeframe"
              description="The default timeframe"
              value={settings.defaultTimeframe}
              options={TIMEFRAMES}
              onChange={(value) => setSettings({ defaultTimeframe: value })}
            />
          </SettingSection>

          {/* Pivot Points */}
          <SettingSection title="Pivot Points">
            <ToggleSetting
              label="Show Pivot Points"
              description="Display swing high/low markers on the chart"
              checked={settings.showPivots}
              onChange={(checked) => setSettings({ showPivots: checked })}
            />

            <ToggleSetting
              label="Show Pivot Lines"
              description="Draw lines connecting pivot points"
              checked={settings.showPivotLines}
              onChange={(checked) => setSettings({ showPivotLines: checked })}
            />

            <div className="pt-2 border-t space-y-4">
              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">Lookback Period</Label>
                  <p className="text-xs text-muted-foreground">
                    Bars on each side to confirm a pivot (higher = fewer, more significant pivots)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.pivotLookback}
                    onChange={(e) => setSettings({ pivotLookback: parseInt(e.target.value) || 5 })}
                    className="w-20 h-9 rounded-md border bg-background px-3 font-mono text-sm"
                    min={1}
                    max={20}
                  />
                  <span className="text-sm text-muted-foreground">bars</span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">Pivot Count</Label>
                  <p className="text-xs text-muted-foreground">
                    Number of recent pivots to display on chart
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.pivotCount}
                    onChange={(e) => setSettings({ pivotCount: parseInt(e.target.value) || 5 })}
                    className="w-20 h-9 rounded-md border bg-background px-3 font-mono text-sm"
                    min={1}
                    max={20}
                  />
                  <span className="text-sm text-muted-foreground">pivots</span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-sm font-medium">Start Offset</Label>
                  <p className="text-xs text-muted-foreground">
                    Skip last N bars before detecting pivots (0 = include all)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.pivotOffset}
                    onChange={(e) => setSettings({ pivotOffset: parseInt(e.target.value) || 0 })}
                    className="w-20 h-9 rounded-md border bg-background px-3 font-mono text-sm"
                    min={0}
                    max={50}
                  />
                  <span className="text-sm text-muted-foreground">bars</span>
                </div>
              </div>
            </div>
          </SettingSection>

          {/* Fibonacci */}
          <SettingSection title="Fibonacci Levels">
            <ToggleSetting
              label="Retracement"
              description="Show Fibonacci retracement levels"
              checked={settings.fibRetracement}
              onChange={(checked) => setSettings({ fibRetracement: checked })}
            />

            <ToggleSetting
              label="Extension"
              description="Show Fibonacci extension levels"
              checked={settings.fibExtension}
              onChange={(checked) => setSettings({ fibExtension: checked })}
            />

            <ToggleSetting
              label="Expansion"
              description="Show Fibonacci expansion levels"
              checked={settings.fibExpansion}
              onChange={(checked) => setSettings({ fibExpansion: checked })}
            />

            <ToggleSetting
              label="Projection"
              description="Show Fibonacci projection levels (A-B-C pattern)"
              checked={settings.fibProjection}
              onChange={(checked) => setSettings({ fibProjection: checked })}
            />
          </SettingSection>

          {/* Workflow */}
          <SettingSection title="Workflow">
            <ToggleSetting
              label="Auto-Validate Checklist Items"
              description="Automatically check items based on workflow state (disable for testing)"
              checked={settings.workflowAutoValidation}
              onChange={(checked) => setSettings({ workflowAutoValidation: checked })}
            />
          </SettingSection>

          {/* Trend Indicators */}
          <SettingSection title="Trend Indicators">
            <p className="text-xs text-muted-foreground pb-2">
              Configure which indicators are used for multi-timeframe trend analysis.
              Multiple indicators provide confirmation through weighted consensus.
            </p>

            {/* Pivot-based */}
            <ToggleSetting
              label="Pivot Point Analysis"
              description="Use HH/HL/LH/LL pivot patterns to determine trend direction"
              checked={settings.trendUsePivots}
              onChange={(checked) => setSettings({ trendUsePivots: checked })}
            />

            {/* Moving Averages */}
            <div className="pt-2 border-t">
              <ToggleSetting
                label="Moving Average Crossover"
                description="Use fast/slow SMA crossover for trend confirmation"
                checked={settings.trendUseMA}
                onChange={(checked) => setSettings({ trendUseMA: checked })}
              />
              {settings.trendUseMA && (
                <div className="ml-4 mt-2 space-y-3 pb-2">
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Fast MA</Label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={settings.trendMAFast}
                          onChange={(e) => setSettings({ trendMAFast: parseInt(e.target.value) || 20 })}
                          className="w-16 h-8 rounded-md border bg-background px-2 font-mono text-sm"
                          min={5}
                          max={50}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Slow MA</Label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={settings.trendMASlow}
                          onChange={(e) => setSettings({ trendMASlow: parseInt(e.target.value) || 50 })}
                          className="w-16 h-8 rounded-md border bg-background px-2 font-mono text-sm"
                          min={10}
                          max={200}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bullish when fast MA &gt; slow MA, bearish when fast MA &lt; slow MA
                  </p>
                </div>
              )}
            </div>

            {/* RSI */}
            <div className="pt-2 border-t">
              <ToggleSetting
                label="RSI (Relative Strength Index)"
                description="Use RSI to confirm trend momentum"
                checked={settings.trendUseRSI}
                onChange={(checked) => setSettings({ trendUseRSI: checked })}
              />
              {settings.trendUseRSI && (
                <div className="ml-4 mt-2 space-y-3 pb-2">
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Period</Label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={settings.trendRSIPeriod}
                          onChange={(e) => setSettings({ trendRSIPeriod: parseInt(e.target.value) || 14 })}
                          className="w-16 h-8 rounded-md border bg-background px-2 font-mono text-sm"
                          min={5}
                          max={50}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Threshold</Label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={settings.trendRSIThreshold}
                          onChange={(e) => setSettings({ trendRSIThreshold: parseInt(e.target.value) || 50 })}
                          className="w-16 h-8 rounded-md border bg-background px-2 font-mono text-sm"
                          min={30}
                          max={70}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bullish when RSI &gt; threshold, bearish when RSI &lt; threshold
                  </p>
                </div>
              )}
            </div>

            {/* ADX */}
            <div className="pt-2 border-t">
              <ToggleSetting
                label="ADX (Average Directional Index)"
                description="Use ADX for trend strength and direction"
                checked={settings.trendUseADX}
                onChange={(checked) => setSettings({ trendUseADX: checked })}
              />
              {settings.trendUseADX && (
                <div className="ml-4 mt-2 space-y-3 pb-2">
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Period</Label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={settings.trendADXPeriod}
                          onChange={(e) => setSettings({ trendADXPeriod: parseInt(e.target.value) || 14 })}
                          className="w-16 h-8 rounded-md border bg-background px-2 font-mono text-sm"
                          min={5}
                          max={50}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Threshold</Label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={settings.trendADXThreshold}
                          onChange={(e) => setSettings({ trendADXThreshold: parseInt(e.target.value) || 25 })}
                          className="w-16 h-8 rounded-md border bg-background px-2 font-mono text-sm"
                          min={15}
                          max={50}
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ADX &gt; threshold indicates trending market. +DI &gt; -DI = bullish, -DI &gt; +DI = bearish
                  </p>
                </div>
              )}
            </div>
          </SettingSection>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={resetSettings}>
              Reset to Defaults
            </Button>
            <Link href="/chart">
              <Button>Apply & Go to Chart</Button>
            </Link>
          </div>

          {/* Info */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-muted-foreground">
              Settings are saved automatically and will be applied the next time
              you open the chart. Changes take effect immediately when you
              navigate to the chart page.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
