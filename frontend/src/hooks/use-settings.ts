"use client";

import { useCallback, useSyncExternalStore } from "react";

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

// Storage event listeners for cross-tab sync
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Also listen for storage events from other tabs
  const handleStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY) {
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(): ChartSettings {
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

function getServerSnapshot(): ChartSettings {
  return DEFAULT_SETTINGS;
}

export function useSettings() {
  // Use useSyncExternalStore for proper hydration handling
  // Server returns defaults, client reads from localStorage
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Save settings to localStorage and notify listeners
  const setSettings = useCallback((newSettings: Partial<ChartSettings>) => {
    try {
      const current = getSnapshot();
      const updated = { ...current, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      notifyListeners();
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      notifyListeners();
    } catch (error) {
      console.error("Failed to reset settings:", error);
    }
  }, []);

  return {
    settings,
    setSettings,
    resetSettings,
    defaults: DEFAULT_SETTINGS,
  };
}
