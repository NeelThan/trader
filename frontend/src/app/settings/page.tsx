"use client";

import { useState } from "react";
import { useSettings, ChartSettings } from "@/hooks/use-settings";
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
  const { settings, setSettings, resetSettings, isLoaded } = useSettings();
  const [pageTheme, setPageTheme] = useState<"dark" | "light">("dark");

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading settings...</p>
      </div>
    );
  }

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
