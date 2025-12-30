"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ColorScheme = "green-red" | "blue-red" | "blue-orange" | "teal-pink";

export type ChartSettings = {
  // Chart display
  chartType: "candlestick" | "bar" | "heikin-ashi";
  theme: "light" | "dark";
  colorScheme: ColorScheme;

  // Default market and timeframe
  defaultSymbol: "DJI" | "SPX" | "NDX" | "BTCUSD" | "EURUSD" | "GOLD";
  defaultTimeframe: "1m" | "15m" | "1H" | "4H" | "1D" | "1W" | "1M";

  // Pivot points
  showPivots: boolean;
  showPivotLines: boolean;
  pivotLookback: number; // Bars on each side to confirm a pivot (default: 5)
  pivotCount: number; // Number of pivots to display (default: 5)
  pivotOffset: number; // Skip last N bars before detection (default: 0)

  // Fibonacci visibility
  fibRetracement: boolean;
  fibExtension: boolean;
  fibExpansion: boolean;
  fibProjection: boolean;
};

// Color scheme definitions
export const COLOR_SCHEMES: Record<ColorScheme, { up: string; down: string; label: string }> = {
  "green-red": { up: "#22c55e", down: "#ef4444", label: "Green / Red" },
  "blue-red": { up: "#3b82f6", down: "#ef4444", label: "Blue / Red" },
  "blue-orange": { up: "#3b82f6", down: "#f97316", label: "Blue / Orange" },
  "teal-pink": { up: "#14b8a6", down: "#ec4899", label: "Teal / Pink" },
};

const DEFAULT_SETTINGS: ChartSettings = {
  chartType: "candlestick",
  theme: "dark",
  colorScheme: "blue-red",
  defaultSymbol: "DJI",
  defaultTimeframe: "1D",
  showPivots: true,
  showPivotLines: true,
  pivotLookback: 5,
  pivotCount: 5,
  pivotOffset: 0,
  fibRetracement: true,
  fibExtension: true,
  fibExpansion: true,
  fibProjection: true,
};

const SETTINGS_KEY = "trader-chart-settings";

// Storage event listeners for cross-tab sync
const listeners = new Set<() => void>();

// Cache for getSnapshot to avoid infinite loops
let cachedSettings: ChartSettings = DEFAULT_SETTINGS;
let cachedRawValue: string | null = null;

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Also listen for storage events from other tabs
  const handleStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY) {
      // Invalidate cache
      cachedRawValue = null;
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
  // Invalidate cache before notifying
  cachedRawValue = null;
  listeners.forEach((listener) => listener());
}

function getSnapshot(): ChartSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    // Return cached value if storage hasn't changed
    if (stored === cachedRawValue) {
      return cachedSettings;
    }
    // Update cache
    cachedRawValue = stored;
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ChartSettings>;
      cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      cachedSettings = DEFAULT_SETTINGS;
    }
    return cachedSettings;
  } catch (error) {
    console.error("Failed to load settings:", error);
    return cachedSettings;
  }
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

// Export DEFAULT_SETTINGS for use in other components
export { DEFAULT_SETTINGS };
