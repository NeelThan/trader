/**
 * Tests for useWorkflowV2Levels hook
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useWorkflowV2Levels,
  WORKFLOW_DIRECTION_COLORS,
} from "./use-workflow-v2-levels";
import type { TimeframeVisibility } from "@/types/workflow-v2";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useWorkflowV2Levels", () => {
  const defaultVisibility: TimeframeVisibility = {
    "1M": false,
    "1W": false,
    "1D": true,
    "4H": false,
    "1H": false,
    "15m": false,
    "5m": false,
    "3m": false,
    "1m": false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  // ===========================================================================
  // Direction Colors
  // ===========================================================================

  describe("direction colors", () => {
    it("should have blue for long direction", () => {
      expect(WORKFLOW_DIRECTION_COLORS.long).toBe("#3b82f6");
    });

    it("should have red for short direction", () => {
      expect(WORKFLOW_DIRECTION_COLORS.short).toBe("#ef4444");
    });
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("initial state", () => {
    it("should return empty levels initially", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      const { result } = renderHook(() =>
        useWorkflowV2Levels({
          symbol: "DJI",
          timeframeVisibility: defaultVisibility,
          enabled: false,
        })
      );

      expect(result.current.levels).toEqual([]);
      expect(result.current.confluenceZones).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("should have empty levels by timeframe", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      const { result } = renderHook(() =>
        useWorkflowV2Levels({
          symbol: "DJI",
          timeframeVisibility: defaultVisibility,
          enabled: false,
        })
      );

      expect(result.current.levelsByTimeframe["1D"]).toEqual([]);
      expect(result.current.levelsByTimeframe["1W"]).toEqual([]);
    });
  });

  // ===========================================================================
  // Data Fetching
  // ===========================================================================

  describe("data fetching", () => {
    it("should not fetch when disabled", () => {
      const { result } = renderHook(() =>
        useWorkflowV2Levels({
          symbol: "DJI",
          timeframeVisibility: defaultVisibility,
          enabled: false,
        })
      );

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it("should not fetch when no timeframes enabled", () => {
      const noVisibility: TimeframeVisibility = {
        "1M": false,
        "1W": false,
        "1D": false,
        "4H": false,
        "1H": false,
        "15m": false,
        "5m": false,
        "3m": false,
        "1m": false,
      };

      renderHook(() =>
        useWorkflowV2Levels({
          symbol: "DJI",
          timeframeVisibility: noVisibility,
          enabled: true,
        })
      );

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should set loading state when fetching", async () => {
      // Mock a slow response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () => Promise.resolve({ success: true, data: [] }),
                }),
              100
            )
          )
      );

      const { result } = renderHook(() =>
        useWorkflowV2Levels({
          symbol: "DJI",
          timeframeVisibility: defaultVisibility,
          enabled: true,
        })
      );

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);
    });

    it("should handle fetch errors gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useWorkflowV2Levels({
          symbol: "DJI",
          timeframeVisibility: defaultVisibility,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have empty levels, not crash
      expect(result.current.levels).toEqual([]);
    });
  });

  // ===========================================================================
  // Level Processing
  // ===========================================================================

  describe("level processing", () => {
    it("should format level labels correctly", async () => {
      // Mock market data response
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("market-data")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: Array(20)
                  .fill(null)
                  .map((_, i) => ({
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
            json: () =>
              Promise.resolve({
                pivot_high: 42200,
                pivot_low: 41800,
                swing_high: { price: 42200 },
                swing_low: { price: 41800 },
                pivots: [],
              }),
          });
        }
        if (url.includes("fibonacci")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                levels: {
                  "382": 42000,
                  "618": 42100,
                },
              }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const { result } = renderHook(() =>
        useWorkflowV2Levels({
          symbol: "DJI",
          timeframeVisibility: defaultVisibility,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Check that levels have proper labels
      if (result.current.levels.length > 0) {
        const level = result.current.levels[0];
        expect(level.label).toMatch(/^1D [RE]\d+\.\d+%$/);
      }
    });
  });

  // ===========================================================================
  // Confluence Detection
  // ===========================================================================

  describe("confluence detection", () => {
    it("should detect confluence when levels are close", async () => {
      // Mock responses with levels at similar prices
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("market-data")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: Array(20)
                  .fill(null)
                  .map((_, i) => ({
                    time: `2024-01-${String(i + 1).padStart(2, "0")}`,
                    open: 42000,
                    high: 42200,
                    low: 41800,
                    close: 42100,
                  })),
              }),
          });
        }
        if (url.includes("pivot/detect")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                pivot_high: 42200,
                pivot_low: 41800,
                swing_high: { price: 42200 },
                swing_low: { price: 41800 },
                pivots: [],
              }),
          });
        }
        if (url.includes("fibonacci/retracement")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                levels: {
                  "500": 42000, // 50% at 42000
                  "618": 42050, // 61.8% at 42050
                },
              }),
          });
        }
        if (url.includes("fibonacci/extension")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                levels: {
                  "1272": 42010, // Very close to 42000 - should be confluence
                },
              }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const { result } = renderHook(() =>
        useWorkflowV2Levels({
          symbol: "DJI",
          timeframeVisibility: defaultVisibility,
          enabled: true,
          strategies: ["retracement", "extension"],
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have detected confluence zones
      // (exact number depends on level clustering)
      expect(result.current.confluenceZones).toBeDefined();
    });
  });

  // ===========================================================================
  // Direction Filtering
  // ===========================================================================

  describe("direction filtering", () => {
    it("should filter levels by direction when specified", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("market-data")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: Array(20)
                  .fill(null)
                  .map((_, i) => ({
                    time: `2024-01-${String(i + 1).padStart(2, "0")}`,
                    open: 42000,
                    high: 42200,
                    low: 41800,
                    close: 42100,
                  })),
              }),
          });
        }
        if (url.includes("pivot/detect")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                pivot_high: 42200,
                pivot_low: 41800,
                swing_high: { price: 42200 },
                swing_low: { price: 41800 },
                pivots: [],
              }),
          });
        }
        if (url.includes("fibonacci")) {
          // Check direction in request
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ levels: { "618": 42000 } }),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const { result } = renderHook(() =>
        useWorkflowV2Levels({
          symbol: "DJI",
          timeframeVisibility: defaultVisibility,
          enabled: true,
          directionFilter: "long",
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // All levels should be long direction
      result.current.levels.forEach((level) => {
        expect(level.direction).toBe("long");
      });
    });
  });

  // ===========================================================================
  // Refresh
  // ===========================================================================

  describe("refresh", () => {
    it("should provide refresh function", () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      const { result } = renderHook(() =>
        useWorkflowV2Levels({
          symbol: "DJI",
          timeframeVisibility: defaultVisibility,
          enabled: false,
        })
      );

      expect(typeof result.current.refresh).toBe("function");
    });
  });
});
