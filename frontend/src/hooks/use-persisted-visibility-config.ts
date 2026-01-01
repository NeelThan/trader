"use client";

/**
 * Hook for persisting visibility configuration to localStorage.
 *
 * Saves and restores the Chart Pro visibility settings so they
 * persist across page navigations and browser sessions.
 */

import { useState, useEffect, useCallback } from "react";
import {
  type VisibilityConfig,
  createDefaultVisibilityConfig,
  ALL_TIMEFRAMES,
  ALL_STRATEGIES,
} from "@/lib/chart-pro/strategy-types";

// Version the storage key so we can invalidate old configs when structure changes
// v3: Added PROJECTION and EXPANSION strategies
// v4: Fixed ratios to match backend (removed 0, 0.236, 1.0 from retracement, etc.)
const STORAGE_VERSION = 4;
const STORAGE_KEY = `chart-pro-visibility-config-v${STORAGE_VERSION}`;

/**
 * Validate that a config object has the expected structure
 */
function isValidConfig(config: unknown): config is VisibilityConfig {
  if (!config || typeof config !== "object") return false;
  const c = config as Record<string, unknown>;
  if (!Array.isArray(c.timeframes)) return false;

  // Basic validation of timeframe structure
  for (const tf of c.timeframes as unknown[]) {
    if (!tf || typeof tf !== "object") return false;
    const tfObj = tf as Record<string, unknown>;
    if (typeof tfObj.timeframe !== "string") return false;
    if (typeof tfObj.enabled !== "boolean") return false;
    if (!Array.isArray(tfObj.strategies)) return false;
  }

  return true;
}

/**
 * Load config from localStorage
 */
function loadFromStorage(): VisibilityConfig | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!isValidConfig(parsed)) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Save config to localStorage
 */
function saveToStorage(config: VisibilityConfig): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

/**
 * Clear old storage keys
 */
function clearOldStorage(): void {
  if (typeof window === "undefined") return;

  try {
    // Remove old unversioned key and previous versions
    localStorage.removeItem("chart-pro-visibility-config");
    localStorage.removeItem("chart-pro-visibility-config-v1");
    localStorage.removeItem("chart-pro-visibility-config-v2");
  } catch {
    // Ignore errors
  }
}

export type UsePersistedVisibilityConfigReturn = {
  visibilityConfig: VisibilityConfig;
  setVisibilityConfig: (config: VisibilityConfig) => void;
  resetToDefaults: () => void;
  isLoaded: boolean;
};

/**
 * Hook that provides visibility config with localStorage persistence
 */
export function usePersistedVisibilityConfig(): UsePersistedVisibilityConfigReturn {
  // Start with default config
  const [visibilityConfig, setVisibilityConfigState] = useState<VisibilityConfig>(() =>
    createDefaultVisibilityConfig(ALL_TIMEFRAMES, ALL_STRATEGIES)
  );
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount (intentional setState in effect for hydration)
  useEffect(() => {
    // Clear old storage keys on first load
    clearOldStorage();

    const stored = loadFromStorage();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional hydration from storage
      setVisibilityConfigState(stored);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever config changes (after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(visibilityConfig);
    }
  }, [visibilityConfig, isLoaded]);

  // Wrapped setter that saves to storage
  const setVisibilityConfig = useCallback((config: VisibilityConfig) => {
    setVisibilityConfigState(config);
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaults = createDefaultVisibilityConfig(ALL_TIMEFRAMES, ALL_STRATEGIES);
    setVisibilityConfigState(defaults);
  }, []);

  return {
    visibilityConfig,
    setVisibilityConfig,
    resetToDefaults,
    isLoaded,
  };
}
