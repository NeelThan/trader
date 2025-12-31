"use client";

/**
 * Hook for managing position sizing settings (account settings, risk preferences).
 *
 * NOTE: Position sizing CALCULATIONS have been moved to the backend.
 * Use `usePositionSizingAPI` hook for actual position size calculations.
 * This hook only manages user preferences/settings stored in localStorage.
 */

import { useCallback, useSyncExternalStore } from "react";

export type PositionSizingSettings = {
  // Account settings
  accountBalance: number;
  riskPercentage: number; // Risk per trade as % of account (e.g., 1 = 1%)
  riskCapital: number; // Fixed risk amount in currency
  usePercentageRisk: boolean; // true = use percentage, false = use fixed amount

  // Trade parameters (saved as defaults)
  defaultEntryPrice: number;
  defaultStopLossPrice: number;
  defaultTargetPrice: number;

  // Display preferences
  showRiskRewardRatio: boolean;
  showAccountImpact: boolean;
};

const DEFAULT_SETTINGS: PositionSizingSettings = {
  accountBalance: 10000,
  riskPercentage: 1,
  riskCapital: 100,
  usePercentageRisk: true,
  defaultEntryPrice: 0,
  defaultStopLossPrice: 0,
  defaultTargetPrice: 0,
  showRiskRewardRatio: true,
  showAccountImpact: true,
};

const SETTINGS_KEY = "trader-position-sizing";

// Storage event listeners for cross-tab sync
const listeners = new Set<() => void>();

// Cache for getSnapshot to avoid infinite loops
let cachedSettings: PositionSizingSettings = DEFAULT_SETTINGS;
let cachedRawValue: string | null = null;

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Also listen for storage events from other tabs
  const handleStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY) {
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
  cachedRawValue = null;
  listeners.forEach((listener) => listener());
}

function getSnapshot(): PositionSizingSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored === cachedRawValue) {
      return cachedSettings;
    }
    cachedRawValue = stored;
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<PositionSizingSettings>;
      cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      cachedSettings = DEFAULT_SETTINGS;
    }
    return cachedSettings;
  } catch (error) {
    console.error("Failed to load position sizing settings:", error);
    return cachedSettings;
  }
}

function getServerSnapshot(): PositionSizingSettings {
  return DEFAULT_SETTINGS;
}

export function usePositionSizing() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSettings = useCallback((newSettings: Partial<PositionSizingSettings>) => {
    try {
      const current = getSnapshot();
      const updated = { ...current, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      notifyListeners();
    } catch (error) {
      console.error("Failed to save position sizing settings:", error);
    }
  }, []);

  const resetSettings = useCallback(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      notifyListeners();
    } catch (error) {
      console.error("Failed to reset position sizing settings:", error);
    }
  }, []);

  // Calculate risk capital based on settings
  const getRiskCapital = useCallback((): number => {
    if (settings.usePercentageRisk) {
      return (settings.accountBalance * settings.riskPercentage) / 100;
    }
    return settings.riskCapital;
  }, [settings]);

  return {
    settings,
    setSettings,
    resetSettings,
    getRiskCapital,
    defaults: DEFAULT_SETTINGS,
  };
}

export { DEFAULT_SETTINGS as DEFAULT_POSITION_SIZING_SETTINGS };
