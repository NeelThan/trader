/**
 * Tests for useWorkflowV2Storage hook
 *
 * TDD: These tests define the expected behavior before implementation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkflowV2Storage } from "./use-workflow-v2-storage";
import {
  WORKFLOW_V2_STORAGE_KEY,
  DEFAULT_WORKFLOW_V2_STORAGE,
  DEFAULT_VISIBILITY_SETTINGS,
  DEFAULT_VALIDATION_SETTINGS,
  DEFAULT_ALERT_SETTINGS,
  type WorkflowV2Storage,
  type StoredPivotPoint,
} from "@/types/workflow-v2";

describe("useWorkflowV2Storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("initial state", () => {
    it("should return default storage when localStorage is empty", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      expect(result.current.storage).toEqual(DEFAULT_WORKFLOW_V2_STORAGE);
    });

    it("should restore storage from localStorage on mount", () => {
      const customStorage: WorkflowV2Storage = {
        ...DEFAULT_WORKFLOW_V2_STORAGE,
        theme: "light",
        watchlist: ["DJI", "SPX"],
      };
      localStorage.setItem(WORKFLOW_V2_STORAGE_KEY, JSON.stringify(customStorage));

      const { result } = renderHook(() => useWorkflowV2Storage());

      expect(result.current.storage.theme).toBe("light");
      expect(result.current.storage.watchlist).toEqual(["DJI", "SPX"]);
    });

    it("should handle corrupted localStorage gracefully", () => {
      localStorage.setItem(WORKFLOW_V2_STORAGE_KEY, "invalid json{{{");

      const { result } = renderHook(() => useWorkflowV2Storage());

      expect(result.current.storage).toEqual(DEFAULT_WORKFLOW_V2_STORAGE);
    });
  });

  // ===========================================================================
  // Pivot Point Management
  // ===========================================================================

  describe("pivot point management", () => {
    it("should get empty pivots for symbol without data", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      const pivots = result.current.getPivots("DJI", "1D");

      expect(pivots).toBeNull();
    });

    it("should set pivots for a symbol and timeframe", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      const points: StoredPivotPoint[] = [
        { index: 10, price: 42500, type: "high", timestamp: "2024-01-01T00:00:00Z", isManual: false },
        { index: 5, price: 41000, type: "low", timestamp: "2024-01-01T00:00:00Z", isManual: false },
      ];

      act(() => {
        result.current.setPivots("DJI", "1D", points);
      });

      const storedPivots = result.current.getPivots("DJI", "1D");
      expect(storedPivots?.points).toHaveLength(2);
      expect(storedPivots?.points[0].price).toBe(42500);
    });

    it("should update existing pivots without losing other timeframes", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      const dailyPivots: StoredPivotPoint[] = [
        { index: 10, price: 42500, type: "high", timestamp: "2024-01-01T00:00:00Z", isManual: false },
      ];
      const weeklyPivots: StoredPivotPoint[] = [
        { index: 5, price: 43000, type: "high", timestamp: "2024-01-01T00:00:00Z", isManual: false },
      ];

      act(() => {
        result.current.setPivots("DJI", "1D", dailyPivots);
        result.current.setPivots("DJI", "1W", weeklyPivots);
      });

      expect(result.current.getPivots("DJI", "1D")?.points[0].price).toBe(42500);
      expect(result.current.getPivots("DJI", "1W")?.points[0].price).toBe(43000);
    });

    it("should lock pivots from auto-refresh", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      const points: StoredPivotPoint[] = [
        { index: 10, price: 42500, type: "high", timestamp: "2024-01-01T00:00:00Z", isManual: true },
      ];

      act(() => {
        result.current.setPivots("DJI", "1D", points);
        result.current.lockPivots("DJI", "1D", true);
      });

      expect(result.current.getPivots("DJI", "1D")?.lockedFromRefresh).toBe(true);
    });

    it("should unlock pivots for auto-refresh", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      const points: StoredPivotPoint[] = [
        { index: 10, price: 42500, type: "high", timestamp: "2024-01-01T00:00:00Z", isManual: true },
      ];

      act(() => {
        result.current.setPivots("DJI", "1D", points);
        result.current.lockPivots("DJI", "1D", true);
        result.current.lockPivots("DJI", "1D", false);
      });

      expect(result.current.getPivots("DJI", "1D")?.lockedFromRefresh).toBe(false);
    });

    it("should clear pivots for a specific symbol and timeframe", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      const points: StoredPivotPoint[] = [
        { index: 10, price: 42500, type: "high", timestamp: "2024-01-01T00:00:00Z", isManual: false },
      ];

      act(() => {
        result.current.setPivots("DJI", "1D", points);
        result.current.setPivots("DJI", "1W", points);
        result.current.clearPivots("DJI", "1D");
      });

      expect(result.current.getPivots("DJI", "1D")).toBeNull();
      expect(result.current.getPivots("DJI", "1W")).not.toBeNull();
    });

    it("should set trend direction for a timeframe", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      const points: StoredPivotPoint[] = [
        { index: 10, price: 42500, type: "high", timestamp: "2024-01-01T00:00:00Z", isManual: false },
      ];

      act(() => {
        result.current.setPivots("DJI", "1D", points, "long");
      });

      expect(result.current.getPivots("DJI", "1D")?.trendDirection).toBe("long");
    });
  });

  // ===========================================================================
  // Visibility Settings
  // ===========================================================================

  describe("visibility settings", () => {
    it("should return default visibility settings", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      expect(result.current.storage.visibility).toEqual(DEFAULT_VISIBILITY_SETTINGS);
    });

    it("should toggle timeframe visibility", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setTimeframeVisibility("1M", false);
      });

      expect(result.current.storage.visibility.timeframes["1M"]).toBe(false);
      expect(result.current.storage.visibility.timeframes["1W"]).toBe(true);
    });

    it("should toggle confluence visibility", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setConfluenceVisibility(false);
      });

      expect(result.current.storage.visibility.showConfluence).toBe(false);
    });

    it("should toggle signal highlights", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setSignalHighlights(false);
      });

      expect(result.current.storage.visibility.showSignalHighlights).toBe(false);
    });

    it("should toggle labels visibility", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setLabelsVisibility(false);
      });

      expect(result.current.storage.visibility.showLabels).toBe(false);
    });
  });

  // ===========================================================================
  // Validation Settings
  // ===========================================================================

  describe("validation settings", () => {
    it("should return default validation settings", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      expect(result.current.storage.validation).toEqual(DEFAULT_VALIDATION_SETTINGS);
    });

    it("should update validation check mode", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setValidationMode("rsiConfirmation", "ignored");
      });

      expect(result.current.storage.validation.rsiConfirmation).toBe("ignored");
      expect(result.current.storage.validation.trendAlignment).toBe("required");
    });
  });

  // ===========================================================================
  // Alert Settings
  // ===========================================================================

  describe("alert settings", () => {
    it("should return default alert settings", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      expect(result.current.storage.alerts).toEqual(DEFAULT_ALERT_SETTINGS);
    });

    it("should toggle alerts enabled", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setAlertsEnabled(false);
      });

      expect(result.current.storage.alerts.enabled).toBe(false);
    });

    it("should toggle sound enabled", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setSoundEnabled(true);
      });

      expect(result.current.storage.alerts.soundEnabled).toBe(true);
    });

    it("should toggle per-level alerts", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setLevelAlert("level-1", true);
        result.current.setLevelAlert("level-2", false);
      });

      expect(result.current.storage.alerts.perLevel["level-1"]).toBe(true);
      expect(result.current.storage.alerts.perLevel["level-2"]).toBe(false);
    });
  });

  // ===========================================================================
  // Watchlist
  // ===========================================================================

  describe("watchlist", () => {
    it("should return default watchlist", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      expect(result.current.storage.watchlist).toEqual(["DJI"]);
    });

    it("should add symbol to watchlist", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.addToWatchlist("SPX");
      });

      expect(result.current.storage.watchlist).toContain("DJI");
      expect(result.current.storage.watchlist).toContain("SPX");
    });

    it("should not add duplicate symbols", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.addToWatchlist("DJI");
      });

      expect(result.current.storage.watchlist).toEqual(["DJI"]);
    });

    it("should remove symbol from watchlist", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.addToWatchlist("SPX");
        result.current.removeFromWatchlist("DJI");
      });

      expect(result.current.storage.watchlist).toEqual(["SPX"]);
    });

    it("should set entire watchlist", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setWatchlist(["NDX", "BTCUSD", "GOLD"]);
      });

      expect(result.current.storage.watchlist).toEqual(["NDX", "BTCUSD", "GOLD"]);
    });
  });

  // ===========================================================================
  // Auto-Refresh Settings
  // ===========================================================================

  describe("auto-refresh settings", () => {
    it("should return default auto-refresh settings", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      expect(result.current.storage.autoRefresh.enabled).toBe(true);
      expect(result.current.storage.autoRefresh.lastRefresh).toBeNull();
    });

    it("should toggle auto-refresh", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setAutoRefreshEnabled(false);
      });

      expect(result.current.storage.autoRefresh.enabled).toBe(false);
    });

    it("should update last refresh timestamp", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());
      const now = new Date().toISOString();

      act(() => {
        result.current.updateLastRefresh(now);
      });

      expect(result.current.storage.autoRefresh.lastRefresh).toBe(now);
    });
  });

  // ===========================================================================
  // Theme
  // ===========================================================================

  describe("theme", () => {
    it("should return default theme", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      expect(result.current.storage.theme).toBe("dark");
    });

    it("should toggle theme", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.storage.theme).toBe("light");
    });
  });

  // ===========================================================================
  // Persistence
  // ===========================================================================

  describe("persistence", () => {
    it("should persist changes to localStorage", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setTheme("light");
      });

      const stored = localStorage.getItem(WORKFLOW_V2_STORAGE_KEY);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.theme).toBe("light");
    });

    it("should persist pivot changes to localStorage", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      const points: StoredPivotPoint[] = [
        { index: 10, price: 42500, type: "high", timestamp: "2024-01-01T00:00:00Z", isManual: false },
      ];

      act(() => {
        result.current.setPivots("DJI", "1D", points);
      });

      const stored = localStorage.getItem(WORKFLOW_V2_STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed.pivots.DJI["1D"].points[0].price).toBe(42500);
    });

    it("should maintain version for migrations", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      const stored = localStorage.getItem(WORKFLOW_V2_STORAGE_KEY);
      const parsed = JSON.parse(stored!);
      expect(parsed.version).toBe(1);
    });
  });

  // ===========================================================================
  // Reset
  // ===========================================================================

  describe("reset", () => {
    it("should reset storage to defaults", () => {
      const { result } = renderHook(() => useWorkflowV2Storage());

      act(() => {
        result.current.setTheme("light");
        result.current.addToWatchlist("SPX");
        result.current.resetStorage();
      });

      expect(result.current.storage).toEqual(DEFAULT_WORKFLOW_V2_STORAGE);
    });
  });
});
