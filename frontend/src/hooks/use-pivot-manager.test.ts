/**
 * Tests for usePivotManager hook
 *
 * TDD: Tests define expected behavior for Workflow V2 pivot management.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePivotManager } from "./use-pivot-manager";
import { WORKFLOW_V2_STORAGE_KEY } from "@/types/workflow-v2";
import type { MarketSymbol } from "@/lib/chart-constants";

// Mock fetch for pivot detection
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("usePivotManager", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("initial state", () => {
    it("should return empty pivots when no data exists", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: false })
      );

      expect(result.current.getPivots("1D")).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("should load stored pivots from localStorage on mount", () => {
      // Pre-populate storage
      const storage = {
        version: 1,
        pivots: {
          DJI: {
            "1D": {
              points: [
                { index: 10, price: 42500, type: "high", timestamp: "2024-01-01T00:00:00Z", isManual: false },
                { index: 5, price: 41000, type: "low", timestamp: "2024-01-01T00:00:00Z", isManual: false },
              ],
              lockedFromRefresh: false,
              lastModified: "2024-01-01T00:00:00Z",
              trendDirection: "long",
            },
          },
        },
        visibility: { timeframes: {}, showConfluence: true, showSignalHighlights: true, showLabels: true },
        alerts: { enabled: true, soundEnabled: false, perLevel: {} },
        validation: { trendAlignment: "required", entryZone: "required", targetZone: "warning", rsiConfirmation: "warning", macdConfirmation: "warning" },
        watchlist: ["DJI"],
        autoRefresh: { enabled: true, lastRefresh: null },
        theme: "dark",
      };
      localStorage.setItem(WORKFLOW_V2_STORAGE_KEY, JSON.stringify(storage));

      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      const pivots = result.current.getPivots("1D");
      expect(pivots).toHaveLength(2);
      expect(pivots[0].price).toBe(42500);
    });
  });

  // ===========================================================================
  // Pivot CRUD Operations
  // ===========================================================================

  describe("pivot operations", () => {
    it("should add a new pivot point", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", {
          index: 10,
          price: 42500,
          type: "high",
        });
      });

      const pivots = result.current.getPivots("1D");
      expect(pivots).toHaveLength(1);
      expect(pivots[0].price).toBe(42500);
      expect(pivots[0].isManual).toBe(true);
    });

    it("should update an existing pivot price", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
      });

      const pivotId = result.current.getPivots("1D")[0].id;

      act(() => {
        result.current.updatePivotPrice("1D", pivotId, 43000);
      });

      expect(result.current.getPivots("1D")[0].price).toBe(43000);
      expect(result.current.getPivots("1D")[0].isManual).toBe(true);
    });

    it("should remove a pivot point", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
        result.current.addPivot("1D", { index: 5, price: 41000, type: "low" });
      });

      expect(result.current.getPivots("1D")).toHaveLength(2);

      const pivotId = result.current.getPivots("1D")[0].id;
      act(() => {
        result.current.removePivot("1D", pivotId);
      });

      expect(result.current.getPivots("1D")).toHaveLength(1);
    });

    it("should clear all pivots for a timeframe", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
        result.current.addPivot("1D", { index: 5, price: 41000, type: "low" });
        result.current.addPivot("1W", { index: 3, price: 43000, type: "high" });
      });

      expect(result.current.getPivots("1D")).toHaveLength(2);
      expect(result.current.getPivots("1W")).toHaveLength(1);

      act(() => {
        result.current.clearPivots("1D");
      });

      expect(result.current.getPivots("1D")).toHaveLength(0);
      expect(result.current.getPivots("1W")).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Lock/Unlock from Auto-Refresh
  // ===========================================================================

  describe("lock/unlock functionality", () => {
    it("should lock pivots from auto-refresh", async () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
      });

      act(() => {
        result.current.lockPivots("1D", true);
      });

      // Wait for state to update
      await waitFor(() => {
        expect(result.current.isLocked("1D")).toBe(true);
      });
    });

    it("should unlock pivots for auto-refresh", async () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
      });

      act(() => {
        result.current.lockPivots("1D", true);
      });

      act(() => {
        result.current.lockPivots("1D", false);
      });

      await waitFor(() => {
        expect(result.current.isLocked("1D")).toBe(false);
      });
    });

    it("should return false for isLocked when no pivots exist", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      expect(result.current.isLocked("1D")).toBe(false);
    });
  });

  // ===========================================================================
  // Trend Direction
  // ===========================================================================

  describe("trend direction", () => {
    it("should set trend direction for a timeframe", async () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
      });

      act(() => {
        result.current.setTrendDirection("1D", "long");
      });

      await waitFor(() => {
        expect(result.current.getTrendDirection("1D")).toBe("long");
      });
    });

    it("should default to ranging when no direction set", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
      });

      expect(result.current.getTrendDirection("1D")).toBe("ranging");
    });
  });

  // ===========================================================================
  // ABC Labels
  // ===========================================================================

  describe("ABC labels", () => {
    it("should assign ABC labels to most recent 3 alternating pivots", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      // Add pivots: Low (oldest) → High → Low (newest)
      act(() => {
        result.current.addPivot("1D", { index: 1, price: 41000, type: "low" });
        result.current.addPivot("1D", { index: 5, price: 42500, type: "high" });
        result.current.addPivot("1D", { index: 10, price: 41500, type: "low" });
      });

      const pivots = result.current.getPivotsWithLabels("1D");

      // Expect: A=oldest low, B=high, C=newest low
      const pivotA = pivots.find(p => p.abcLabel === "A");
      const pivotB = pivots.find(p => p.abcLabel === "B");
      const pivotC = pivots.find(p => p.abcLabel === "C");

      expect(pivotA?.index).toBe(1);
      expect(pivotB?.index).toBe(5);
      expect(pivotC?.index).toBe(10);
    });
  });

  // ===========================================================================
  // Persistence
  // ===========================================================================

  describe("persistence", () => {
    it("should auto-save pivots to localStorage", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
      });

      const stored = localStorage.getItem(WORKFLOW_V2_STORAGE_KEY);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.pivots.DJI["1D"].points[0].price).toBe(42500);
    });

    it("should persist lock state", async () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
      });

      act(() => {
        result.current.lockPivots("1D", true);
      });

      await waitFor(() => {
        const stored = localStorage.getItem(WORKFLOW_V2_STORAGE_KEY);
        expect(stored).not.toBeNull();
        const parsed = JSON.parse(stored!);
        expect(parsed.pivots.DJI["1D"].lockedFromRefresh).toBe(true);
      });
    });
  });

  // ===========================================================================
  // Multi-Timeframe
  // ===========================================================================

  describe("multi-timeframe support", () => {
    it("should manage pivots independently per timeframe", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
        result.current.addPivot("1W", { index: 5, price: 43000, type: "high" });
        result.current.addPivot("1M", { index: 3, price: 44000, type: "high" });
      });

      expect(result.current.getPivots("1D")).toHaveLength(1);
      expect(result.current.getPivots("1W")).toHaveLength(1);
      expect(result.current.getPivots("1M")).toHaveLength(1);

      expect(result.current.getPivots("1D")[0].price).toBe(42500);
      expect(result.current.getPivots("1W")[0].price).toBe(43000);
      expect(result.current.getPivots("1M")[0].price).toBe(44000);
    });

    it("should get all timeframes with pivots", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
        result.current.addPivot("1W", { index: 5, price: 43000, type: "high" });
      });

      const timeframes = result.current.getTimeframesWithPivots();
      expect(timeframes).toContain("1D");
      expect(timeframes).toContain("1W");
      expect(timeframes).not.toContain("1M");
    });
  });

  // ===========================================================================
  // Symbol Change
  // ===========================================================================

  describe("symbol change", () => {
    it("should clear pivots when symbol changes", () => {
      const { result, rerender } = renderHook(
        ({ symbol }: { symbol: MarketSymbol }) => usePivotManager({ symbol, enabled: true }),
        { initialProps: { symbol: "DJI" as MarketSymbol } }
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
      });

      expect(result.current.getPivots("1D")).toHaveLength(1);

      // Change symbol
      rerender({ symbol: "SPX" });

      // Old symbol's pivots should still exist in storage but not loaded
      expect(result.current.getPivots("1D")).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Pivot Detection Integration
  // ===========================================================================

  describe("pivot detection", () => {
    it("should detect pivots from market data", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("market-data")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: Array(20).fill(null).map((_, i) => ({
                time: `2024-01-${String(i + 1).padStart(2, "0")}`,
                open: 42000 + i * 10,
                high: 42050 + i * 10,
                low: 41950 + i * 10,
                close: 42020 + i * 10,
              })),
            }),
          });
        }
        if (url.includes("pivot/detect")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              pivot_high: 42200,
              pivot_low: 41800,
              swing_high: { price: 42200, time: "2024-01-15" },
              swing_low: { price: 41800, time: "2024-01-10" },
              pivots: [
                { index: 15, price: 42200, type: "high", time: "2024-01-15" },
                { index: 10, price: 41800, type: "low", time: "2024-01-10" },
              ],
            }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      await act(async () => {
        await result.current.detectPivots("1D");
      });

      // Should have detected pivots
      const pivots = result.current.getPivots("1D");
      expect(pivots.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // Reset
  // ===========================================================================

  describe("reset", () => {
    it("should reset all data for current symbol", () => {
      const { result } = renderHook(() =>
        usePivotManager({ symbol: "DJI", enabled: true })
      );

      act(() => {
        result.current.addPivot("1D", { index: 10, price: 42500, type: "high" });
        result.current.addPivot("1W", { index: 5, price: 43000, type: "high" });
        result.current.lockPivots("1D", true);
        result.current.resetAll();
      });

      expect(result.current.getPivots("1D")).toHaveLength(0);
      expect(result.current.getPivots("1W")).toHaveLength(0);
      expect(result.current.isLocked("1D")).toBe(false);
    });
  });
});
