"use client";

/**
 * Hook for persisting swing detection settings to localStorage.
 *
 * Saves and restores per-timeframe swing detection settings (lookback, showLines)
 * so they persist across page navigations and browser sessions.
 *
 * Each timeframe can have its own lookback value (2-20 bars) for pivot detection.
 */

import { useState, useEffect, useCallback } from "react";
import type { Timeframe } from "@/lib/chart-constants";

// All available timeframes
const ALL_TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "5m", "3m", "1m"];

/**
 * Settings for swing detection on a single timeframe
 */
export type SwingSettings = {
  /** Number of bars to look back for pivot confirmation (2-20) */
  lookback: number;
  /** Whether to draw lines connecting pivot points */
  showLines: boolean;
};

/**
 * Per-timeframe swing settings
 */
export type PerTimeframeSwingSettings = {
  timeframe: Timeframe;
  enabled: boolean;
  settings: SwingSettings;
};

/**
 * Complete swing settings configuration
 */
export type SwingSettingsConfig = {
  timeframes: PerTimeframeSwingSettings[];
};

// Version the storage key so we can invalidate old configs when structure changes
const STORAGE_VERSION = 1;
const STORAGE_KEY = `chart-pro-swing-settings-v${STORAGE_VERSION}`;

// Default swing settings
const DEFAULT_SWING_SETTINGS: SwingSettings = {
  lookback: 5,
  showLines: true,
};

/**
 * Create default swing settings config for all timeframes
 */
function createDefaultSwingConfig(): SwingSettingsConfig {
  return {
    timeframes: ALL_TIMEFRAMES.map((tf) => ({
      timeframe: tf,
      enabled: tf === "1D", // Only 1D enabled by default
      settings: { ...DEFAULT_SWING_SETTINGS },
    })),
  };
}

/**
 * Validate that a config object has the expected structure
 */
function isValidConfig(config: unknown): config is SwingSettingsConfig {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  if (!Array.isArray(c.timeframes)) return false;

  for (const tf of c.timeframes as unknown[]) {
    if (!tf || typeof tf !== "object") return false;
    const tfObj = tf as Record<string, unknown>;
    if (typeof tfObj.timeframe !== "string") return false;
    if (typeof tfObj.enabled !== "boolean") return false;
    if (!tfObj.settings || typeof tfObj.settings !== "object") return false;

    const settings = tfObj.settings as Record<string, unknown>;
    if (typeof settings.lookback !== "number") return false;
    if (typeof settings.showLines !== "boolean") return false;
  }

  return true;
}

/**
 * Validate and clamp lookback value to valid range
 */
function clampLookback(value: number): number {
  return Math.min(20, Math.max(2, Math.round(value)));
}

/**
 * Load config from localStorage
 */
function loadFromStorage(): SwingSettingsConfig | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!isValidConfig(parsed)) return null;

    // Ensure lookback values are in valid range
    parsed.timeframes = parsed.timeframes.map((tf) => ({
      ...tf,
      settings: {
        ...tf.settings,
        lookback: clampLookback(tf.settings.lookback),
      },
    }));

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save config to localStorage
 */
function saveToStorage(config: SwingSettingsConfig): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

export type UsePersistedSwingSettingsReturn = {
  swingConfig: SwingSettingsConfig;
  setSwingConfig: (config: SwingSettingsConfig) => void;
  getTimeframeSettings: (tf: Timeframe) => PerTimeframeSwingSettings;
  updateTimeframeLookback: (tf: Timeframe, lookback: number) => void;
  updateTimeframeEnabled: (tf: Timeframe, enabled: boolean) => void;
  updateTimeframeShowLines: (tf: Timeframe, showLines: boolean) => void;
  resetToDefaults: () => void;
  isLoaded: boolean;
};

/**
 * Hook that provides swing settings config with localStorage persistence
 */
export function usePersistedSwingSettings(): UsePersistedSwingSettingsReturn {
  // Start with default config
  const [swingConfig, setSwingConfigState] = useState<SwingSettingsConfig>(
    createDefaultSwingConfig
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored) {
      // Merge with defaults to ensure all timeframes exist
      const defaults = createDefaultSwingConfig();
      const merged: SwingSettingsConfig = {
        timeframes: defaults.timeframes.map((defaultTf) => {
          const storedTf = stored.timeframes.find(
            (s) => s.timeframe === defaultTf.timeframe
          );
          return storedTf ?? defaultTf;
        }),
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional hydration from storage
      setSwingConfigState(merged);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever config changes (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(swingConfig);
    }
  }, [swingConfig, isLoaded]);

  // Wrapped setter
  const setSwingConfig = useCallback((config: SwingSettingsConfig) => {
    setSwingConfigState(config);
  }, []);

  // Get settings for a specific timeframe
  const getTimeframeSettings = useCallback(
    (tf: Timeframe): PerTimeframeSwingSettings => {
      const found = swingConfig.timeframes.find((t) => t.timeframe === tf);
      return (
        found ?? {
          timeframe: tf,
          enabled: false,
          settings: { ...DEFAULT_SWING_SETTINGS },
        }
      );
    },
    [swingConfig]
  );

  // Update lookback for a specific timeframe
  const updateTimeframeLookback = useCallback(
    (tf: Timeframe, lookback: number) => {
      setSwingConfigState((prev) => ({
        timeframes: prev.timeframes.map((t) =>
          t.timeframe === tf
            ? {
                ...t,
                settings: { ...t.settings, lookback: clampLookback(lookback) },
              }
            : t
        ),
      }));
    },
    []
  );

  // Update enabled state for a specific timeframe
  const updateTimeframeEnabled = useCallback(
    (tf: Timeframe, enabled: boolean) => {
      setSwingConfigState((prev) => ({
        timeframes: prev.timeframes.map((t) =>
          t.timeframe === tf ? { ...t, enabled } : t
        ),
      }));
    },
    []
  );

  // Update showLines for a specific timeframe
  const updateTimeframeShowLines = useCallback(
    (tf: Timeframe, showLines: boolean) => {
      setSwingConfigState((prev) => ({
        timeframes: prev.timeframes.map((t) =>
          t.timeframe === tf
            ? { ...t, settings: { ...t.settings, showLines } }
            : t
        ),
      }));
    },
    []
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSwingConfigState(createDefaultSwingConfig());
  }, []);

  return {
    swingConfig,
    setSwingConfig,
    getTimeframeSettings,
    updateTimeframeLookback,
    updateTimeframeEnabled,
    updateTimeframeShowLines,
    resetToDefaults,
    isLoaded,
  };
}
