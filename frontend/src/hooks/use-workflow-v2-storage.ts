/**
 * Workflow V2 Storage Hook
 *
 * Manages localStorage persistence for Workflow V2 settings and data.
 * Includes pivot points, visibility settings, validation config, and more.
 */

import { useState, useCallback, useEffect } from "react";
import type { Timeframe, MarketSymbol } from "@/lib/chart-constants";
import {
  WORKFLOW_V2_STORAGE_KEY,
  DEFAULT_WORKFLOW_V2_STORAGE,
  type WorkflowV2Storage,
  type StoredPivotPoint,
  type TimeframePivotData,
  type ValidationCheckMode,
  type TradeDirection,
} from "@/types/workflow-v2";

/**
 * Load storage from localStorage with error handling.
 */
function loadStorage(): WorkflowV2Storage {
  try {
    const stored = localStorage.getItem(WORKFLOW_V2_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_WORKFLOW_V2_STORAGE;
    }
    const parsed = JSON.parse(stored) as WorkflowV2Storage;
    return { ...DEFAULT_WORKFLOW_V2_STORAGE, ...parsed };
  } catch {
    return DEFAULT_WORKFLOW_V2_STORAGE;
  }
}

/**
 * Save storage to localStorage.
 */
function saveStorage(storage: WorkflowV2Storage): void {
  try {
    localStorage.setItem(WORKFLOW_V2_STORAGE_KEY, JSON.stringify(storage));
  } catch {
    console.error("Failed to save Workflow V2 storage");
  }
}

/**
 * Hook return type.
 */
export type UseWorkflowV2StorageResult = {
  /** Current storage state */
  storage: WorkflowV2Storage;

  // Pivot management
  getPivots: (symbol: MarketSymbol, timeframe: Timeframe) => TimeframePivotData | null;
  setPivots: (
    symbol: MarketSymbol,
    timeframe: Timeframe,
    points: StoredPivotPoint[],
    trendDirection?: TradeDirection | "ranging"
  ) => void;
  lockPivots: (symbol: MarketSymbol, timeframe: Timeframe, locked: boolean) => void;
  clearPivots: (symbol: MarketSymbol, timeframe: Timeframe) => void;

  // Visibility settings
  setTimeframeVisibility: (timeframe: Timeframe, visible: boolean) => void;
  setConfluenceVisibility: (visible: boolean) => void;
  setSignalHighlights: (visible: boolean) => void;
  setLabelsVisibility: (visible: boolean) => void;

  // Validation settings
  setValidationMode: (
    check: keyof WorkflowV2Storage["validation"],
    mode: ValidationCheckMode
  ) => void;

  // Alert settings
  setAlertsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setLevelAlert: (levelId: string, enabled: boolean) => void;

  // Watchlist
  addToWatchlist: (symbol: MarketSymbol) => void;
  removeFromWatchlist: (symbol: MarketSymbol) => void;
  setWatchlist: (symbols: MarketSymbol[]) => void;

  // Auto-refresh
  setAutoRefreshEnabled: (enabled: boolean) => void;
  updateLastRefresh: (timestamp: string) => void;

  // Theme
  setTheme: (theme: "dark" | "light") => void;

  // Reset
  resetStorage: () => void;
};

/**
 * Hook to manage Workflow V2 localStorage persistence.
 */
export function useWorkflowV2Storage(): UseWorkflowV2StorageResult {
  const [storage, setStorage] = useState<WorkflowV2Storage>(loadStorage);

  // Persist to localStorage whenever storage changes
  useEffect(() => {
    saveStorage(storage);
  }, [storage]);

  // ===========================================================================
  // Pivot Management
  // ===========================================================================

  const getPivots = useCallback(
    (symbol: MarketSymbol, timeframe: Timeframe): TimeframePivotData | null => {
      return storage.pivots[symbol]?.[timeframe] ?? null;
    },
    [storage.pivots]
  );

  const setPivots = useCallback(
    (
      symbol: MarketSymbol,
      timeframe: Timeframe,
      points: StoredPivotPoint[],
      trendDirection: TradeDirection | "ranging" = "ranging"
    ) => {
      setStorage((prev) => {
        const symbolPivots = prev.pivots[symbol] ?? {};
        const existingData = symbolPivots[timeframe];

        const newData: TimeframePivotData = {
          points,
          lockedFromRefresh: existingData?.lockedFromRefresh ?? false,
          lastModified: new Date().toISOString(),
          trendDirection,
        };

        return {
          ...prev,
          pivots: {
            ...prev.pivots,
            [symbol]: {
              ...symbolPivots,
              [timeframe]: newData,
            },
          },
        };
      });
    },
    []
  );

  const lockPivots = useCallback(
    (symbol: MarketSymbol, timeframe: Timeframe, locked: boolean) => {
      setStorage((prev) => {
        const symbolPivots = prev.pivots[symbol];
        const existing = symbolPivots?.[timeframe];

        if (!existing) return prev;

        return {
          ...prev,
          pivots: {
            ...prev.pivots,
            [symbol]: {
              ...symbolPivots,
              [timeframe]: {
                ...existing,
                lockedFromRefresh: locked,
              },
            },
          },
        };
      });
    },
    []
  );

  const clearPivots = useCallback((symbol: MarketSymbol, timeframe: Timeframe) => {
    setStorage((prev) => {
      const symbolPivots = prev.pivots[symbol];
      if (!symbolPivots) return prev;

      const { [timeframe]: _removed, ...remaining } = symbolPivots;

      return {
        ...prev,
        pivots: {
          ...prev.pivots,
          [symbol]: remaining,
        },
      };
    });
  }, []);

  // ===========================================================================
  // Visibility Settings
  // ===========================================================================

  const setTimeframeVisibility = useCallback((timeframe: Timeframe, visible: boolean) => {
    setStorage((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        timeframes: {
          ...prev.visibility.timeframes,
          [timeframe]: visible,
        },
      },
    }));
  }, []);

  const setConfluenceVisibility = useCallback((visible: boolean) => {
    setStorage((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        showConfluence: visible,
      },
    }));
  }, []);

  const setSignalHighlights = useCallback((visible: boolean) => {
    setStorage((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        showSignalHighlights: visible,
      },
    }));
  }, []);

  const setLabelsVisibility = useCallback((visible: boolean) => {
    setStorage((prev) => ({
      ...prev,
      visibility: {
        ...prev.visibility,
        showLabels: visible,
      },
    }));
  }, []);

  // ===========================================================================
  // Validation Settings
  // ===========================================================================

  const setValidationMode = useCallback(
    (check: keyof WorkflowV2Storage["validation"], mode: ValidationCheckMode) => {
      setStorage((prev) => ({
        ...prev,
        validation: {
          ...prev.validation,
          [check]: mode,
        },
      }));
    },
    []
  );

  // ===========================================================================
  // Alert Settings
  // ===========================================================================

  const setAlertsEnabled = useCallback((enabled: boolean) => {
    setStorage((prev) => ({
      ...prev,
      alerts: {
        ...prev.alerts,
        enabled,
      },
    }));
  }, []);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setStorage((prev) => ({
      ...prev,
      alerts: {
        ...prev.alerts,
        soundEnabled: enabled,
      },
    }));
  }, []);

  const setLevelAlert = useCallback((levelId: string, enabled: boolean) => {
    setStorage((prev) => ({
      ...prev,
      alerts: {
        ...prev.alerts,
        perLevel: {
          ...prev.alerts.perLevel,
          [levelId]: enabled,
        },
      },
    }));
  }, []);

  // ===========================================================================
  // Watchlist
  // ===========================================================================

  const addToWatchlist = useCallback((symbol: MarketSymbol) => {
    setStorage((prev) => {
      if (prev.watchlist.includes(symbol)) {
        return prev;
      }
      return {
        ...prev,
        watchlist: [...prev.watchlist, symbol],
      };
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol: MarketSymbol) => {
    setStorage((prev) => ({
      ...prev,
      watchlist: prev.watchlist.filter((s) => s !== symbol),
    }));
  }, []);

  const setWatchlist = useCallback((symbols: MarketSymbol[]) => {
    setStorage((prev) => ({
      ...prev,
      watchlist: symbols,
    }));
  }, []);

  // ===========================================================================
  // Auto-Refresh
  // ===========================================================================

  const setAutoRefreshEnabled = useCallback((enabled: boolean) => {
    setStorage((prev) => ({
      ...prev,
      autoRefresh: {
        ...prev.autoRefresh,
        enabled,
      },
    }));
  }, []);

  const updateLastRefresh = useCallback((timestamp: string) => {
    setStorage((prev) => ({
      ...prev,
      autoRefresh: {
        ...prev.autoRefresh,
        lastRefresh: timestamp,
      },
    }));
  }, []);

  // ===========================================================================
  // Theme
  // ===========================================================================

  const setTheme = useCallback((theme: "dark" | "light") => {
    setStorage((prev) => ({
      ...prev,
      theme,
    }));
  }, []);

  // ===========================================================================
  // Reset
  // ===========================================================================

  const resetStorage = useCallback(() => {
    setStorage(DEFAULT_WORKFLOW_V2_STORAGE);
  }, []);

  return {
    storage,
    getPivots,
    setPivots,
    lockPivots,
    clearPivots,
    setTimeframeVisibility,
    setConfluenceVisibility,
    setSignalHighlights,
    setLabelsVisibility,
    setValidationMode,
    setAlertsEnabled,
    setSoundEnabled,
    setLevelAlert,
    addToWatchlist,
    removeFromWatchlist,
    setWatchlist,
    setAutoRefreshEnabled,
    updateLastRefresh,
    setTheme,
    resetStorage,
  };
}
