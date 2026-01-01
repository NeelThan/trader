"use client";

/**
 * Hook for managing data mode (live vs simulated/cached).
 *
 * Provides:
 * - Toggle between live API data and cached/simulated data
 * - Persists preference to localStorage
 * - Cache status and management functions
 */

import { useState, useEffect, useCallback } from "react";
import {
  getCacheMetadata,
  getAvailableCachedData,
  getCacheSize,
  formatCacheSize,
  clearAllCachedData,
  type CacheMetadata,
} from "@/lib/market-data-cache";

export type DataMode = "live" | "simulated";

export type UseDataModeReturn = {
  /** Current data mode */
  mode: DataMode;
  /** Switch to live mode */
  setLiveMode: () => void;
  /** Switch to simulated/cached mode */
  setSimulatedMode: () => void;
  /** Toggle between modes */
  toggleMode: () => void;
  /** Whether currently in simulated mode */
  isSimulated: boolean;
  /** Cache metadata */
  cacheMetadata: CacheMetadata;
  /** Available cached data entries */
  availableData: ReturnType<typeof getAvailableCachedData>;
  /** Total cache size formatted */
  cacheSizeFormatted: string;
  /** Clear all cached data */
  clearCache: () => void;
  /** Refresh cache info */
  refreshCacheInfo: () => void;
};

const STORAGE_KEY = "chart-pro-data-mode";

export function useDataMode(): UseDataModeReturn {
  const [mode, setMode] = useState<DataMode>("live");
  const [cacheMetadata, setCacheMetadata] = useState<CacheMetadata>({
    entries: [],
    lastUpdated: new Date().toISOString(),
  });
  const [availableData, setAvailableData] = useState<
    ReturnType<typeof getAvailableCachedData>
  >([]);
  const [cacheSize, setCacheSize] = useState(0);

  // Refresh cache information
  const refreshCacheInfo = useCallback(() => {
    setCacheMetadata(getCacheMetadata());
    setAvailableData(getAvailableCachedData());
    setCacheSize(getCacheSize());
  }, []);

  // Load saved mode and cache info on mount (intentional hydration from storage)
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "simulated" || saved === "live") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional hydration from localStorage
        setMode(saved);
      }
    } catch {
      // Ignore errors
    }

    // Load cache info
    refreshCacheInfo();
  }, [refreshCacheInfo]);

  // Save mode preference
  const saveMode = useCallback((newMode: DataMode) => {
    setMode(newMode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, newMode);
      } catch {
        // Ignore errors
      }
    }
  }, []);

  const setLiveMode = useCallback(() => saveMode("live"), [saveMode]);
  const setSimulatedMode = useCallback(() => saveMode("simulated"), [saveMode]);
  const toggleMode = useCallback(
    () => saveMode(mode === "live" ? "simulated" : "live"),
    [mode, saveMode]
  );

  const clearCache = useCallback(() => {
    clearAllCachedData();
    refreshCacheInfo();
  }, [refreshCacheInfo]);

  return {
    mode,
    setLiveMode,
    setSimulatedMode,
    toggleMode,
    isSimulated: mode === "simulated",
    cacheMetadata,
    availableData,
    cacheSizeFormatted: formatCacheSize(cacheSize),
    clearCache,
    refreshCacheInfo,
  };
}
