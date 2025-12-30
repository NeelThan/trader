"use client";

import { useState, useCallback } from "react";

export type ChartSettings = {
  // Chart display
  chartType: "candlestick" | "bar" | "heikin-ashi";
  theme: "light" | "dark";

  // Default market and timeframe
  defaultSymbol: "DJI" | "SPX" | "NDX" | "BTCUSD" | "EURUSD" | "GOLD";
  defaultTimeframe: "1m" | "15m" | "1H" | "4H" | "1D" | "1W" | "1M";

  // Pivot points
  showPivots: boolean;
  showPivotLines: boolean;

  // Fibonacci visibility
  fibRetracement: boolean;
  fibExtension: boolean;
  fibExpansion: boolean;
  fibProjection: boolean;
};

const DEFAULT_SETTINGS: ChartSettings = {
  chartType: "candlestick",
  theme: "dark",
  defaultSymbol: "DJI",
  defaultTimeframe: "1D",
  showPivots: true,
  showPivotLines: true,
  fibRetracement: true,
  fibExtension: true,
  fibExpansion: true,
  fibProjection: true,
};

const SETTINGS_KEY = "trader-chart-settings";

// Load settings from localStorage (runs once during initialization)
function loadStoredSettings(): ChartSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ChartSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return DEFAULT_SETTINGS;
}

export function useSettings() {
  // Use lazy initialization to load from localStorage
  const [settings, setSettingsState] = useState<ChartSettings>(loadStoredSettings);
  // isLoaded is always true after hydration since we use lazy init
  const [isLoaded] = useState(true);

  // Save settings to localStorage
  const setSettings = useCallback((newSettings: Partial<ChartSettings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save settings:", error);
      }
      return updated;
    });
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (error) {
      console.error("Failed to reset settings:", error);
    }
  }, []);

  return {
    settings,
    setSettings,
    resetSettings,
    isLoaded,
    defaults: DEFAULT_SETTINGS,
  };
}
