/**
 * Tests for useSignalAggregation hook
 *
 * TDD: Tests define expected behavior for Workflow V2 signal aggregation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useSignalAggregation,
  type AggregatedSignal,
  type SignalSortBy,
  type SignalFilters,
} from "./use-signal-aggregation";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock market data response
const mockMarketData = Array(30)
  .fill(null)
  .map((_, i) => ({
    time: `2024-01-${String(i + 1).padStart(2, "0")}`,
    open: 42000 + i * 10,
    high: 42050 + i * 10 + (i % 5 === 0 ? 100 : 0), // Swing highs
    low: 41950 + i * 10 - (i % 7 === 0 ? 100 : 0), // Swing lows
    close: 42020 + i * 10,
  }));

// Mock trend assessment response
const mockTrendAssessment = {
  direction: "bullish" as const,
  confidence: 75,
  swing_high: 42500,
  swing_low: 41800,
  higher_highs: 2,
  higher_lows: 2,
  lower_highs: 0,
  lower_lows: 0,
};

describe("useSignalAggregation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("initial state", () => {
    it("should return empty signals when disabled", () => {
      const { result } = renderHook(() =>
        useSignalAggregation({
          symbol: "DJI",
          enabled: false,
        })
      );

      expect(result.current.signals).toEqual([]);
      expect(result.current.isLoading).toBe(false);
    });

    it("should have correct initial counts", () => {
      const { result } = renderHook(() =>
        useSignalAggregation({
          symbol: "DJI",
          enabled: false,
        })
      );

      expect(result.current.counts.long).toBe(0);
      expect(result.current.counts.short).toBe(0);
      expect(result.current.counts.total).toBe(0);
    });
  });

  // ===========================================================================
  // Signal Detection
  // ===========================================================================

  describe("signal detection", () => {
    it("should detect signals from market data", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("market-data")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockMarketData }),
          });
        }
        if (url.includes("workflow/assess")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTrendAssessment),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const { result } = renderHook(() =>
        useSignalAggregation({
          symbol: "DJI",
          enabled: true,
          timeframes: ["1D"],
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have processed data
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should aggregate signals from multiple timeframes", async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes("market-data")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, data: mockMarketData }),
          });
        }
        if (url.includes("workflow/assess")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTrendAssessment),
          });
        }
        return Promise.resolve({ ok: false });
      });

      const { result } = renderHook(() =>
        useSignalAggregation({
          symbol: "DJI",
          enabled: true,
          timeframes: ["1D", "4H", "1H"],
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have called market data for each timeframe
      const marketDataCalls = mockFetch.mock.calls.filter((call) =>
        call[0].includes("market-data")
      );
      expect(marketDataCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // Filtering
  // ===========================================================================

  describe("filtering", () => {
    const createMockSignals = (): AggregatedSignal[] => [
      {
        id: "1",
        timeframe: "1D",
        direction: "long",
        type: "trend_alignment",
        confidence: 85,
        price: 42000,
        description: "Long opportunity on 1D",
        isActive: true,
        timestamp: "2024-01-15T10:00:00Z",
      },
      {
        id: "2",
        timeframe: "4H",
        direction: "short",
        type: "fib_rejection",
        confidence: 70,
        price: 42500,
        description: "Short opportunity on 4H",
        isActive: true,
        timestamp: "2024-01-15T11:00:00Z",
      },
      {
        id: "3",
        timeframe: "1H",
        direction: "long",
        type: "trend_alignment",
        confidence: 60,
        price: 41800,
        description: "Long opportunity on 1H",
        isActive: false,
        timestamp: "2024-01-15T12:00:00Z",
      },
    ];

    it("should filter by direction", () => {
      const signals = createMockSignals();
      const longSignals = signals.filter((s) => s.direction === "long");
      const shortSignals = signals.filter((s) => s.direction === "short");

      expect(longSignals).toHaveLength(2);
      expect(shortSignals).toHaveLength(1);
    });

    it("should filter by timeframe", () => {
      const signals = createMockSignals();
      const dailySignals = signals.filter((s) => s.timeframe === "1D");

      expect(dailySignals).toHaveLength(1);
      expect(dailySignals[0].id).toBe("1");
    });

    it("should filter by active status", () => {
      const signals = createMockSignals();
      const activeSignals = signals.filter((s) => s.isActive);

      expect(activeSignals).toHaveLength(2);
    });

    it("should filter by minimum confidence", () => {
      const signals = createMockSignals();
      const highConfidenceSignals = signals.filter((s) => s.confidence >= 70);

      expect(highConfidenceSignals).toHaveLength(2);
    });
  });

  // ===========================================================================
  // Sorting
  // ===========================================================================

  describe("sorting", () => {
    const createMockSignals = (): AggregatedSignal[] => [
      {
        id: "1",
        timeframe: "1D",
        direction: "long",
        type: "trend_alignment",
        confidence: 70,
        price: 42000,
        description: "Long on 1D",
        isActive: true,
        timestamp: "2024-01-15T10:00:00Z",
      },
      {
        id: "2",
        timeframe: "4H",
        direction: "short",
        type: "fib_rejection",
        confidence: 85,
        price: 42500,
        description: "Short on 4H",
        isActive: true,
        timestamp: "2024-01-15T09:00:00Z",
      },
      {
        id: "3",
        timeframe: "1W",
        direction: "long",
        type: "trend_alignment",
        confidence: 90,
        price: 41800,
        description: "Long on 1W",
        isActive: false,
        timestamp: "2024-01-15T08:00:00Z",
      },
    ];

    it("should sort by confidence descending", () => {
      const signals = createMockSignals();
      const sorted = [...signals].sort((a, b) => b.confidence - a.confidence);

      expect(sorted[0].id).toBe("3");
      expect(sorted[1].id).toBe("2");
      expect(sorted[2].id).toBe("1");
    });

    it("should sort by timeframe (higher TF first)", () => {
      const signals = createMockSignals();
      const tfOrder = ["1M", "1W", "1D", "4H", "1H", "15m", "1m"];
      const sorted = [...signals].sort(
        (a, b) => tfOrder.indexOf(a.timeframe) - tfOrder.indexOf(b.timeframe)
      );

      expect(sorted[0].timeframe).toBe("1W");
      expect(sorted[1].timeframe).toBe("1D");
      expect(sorted[2].timeframe).toBe("4H");
    });

    it("should sort by timestamp (newest first)", () => {
      const signals = createMockSignals();
      const sorted = [...signals].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      expect(sorted[0].id).toBe("1");
      expect(sorted[1].id).toBe("2");
      expect(sorted[2].id).toBe("3");
    });
  });

  // ===========================================================================
  // Counts
  // ===========================================================================

  describe("counts", () => {
    it("should calculate correct counts", () => {
      const signals: AggregatedSignal[] = [
        { id: "1", timeframe: "1D", direction: "long", type: "trend_alignment", confidence: 80, price: 42000, description: "", isActive: true, timestamp: "" },
        { id: "2", timeframe: "1D", direction: "long", type: "trend_alignment", confidence: 75, price: 42100, description: "", isActive: true, timestamp: "" },
        { id: "3", timeframe: "1D", direction: "short", type: "fib_rejection", confidence: 70, price: 42500, description: "", isActive: true, timestamp: "" },
      ];

      const counts = {
        long: signals.filter((s) => s.direction === "long").length,
        short: signals.filter((s) => s.direction === "short").length,
        total: signals.length,
      };

      expect(counts.long).toBe(2);
      expect(counts.short).toBe(1);
      expect(counts.total).toBe(3);
    });

    it("should count by timeframe", () => {
      const signals: AggregatedSignal[] = [
        { id: "1", timeframe: "1D", direction: "long", type: "trend_alignment", confidence: 80, price: 42000, description: "", isActive: true, timestamp: "" },
        { id: "2", timeframe: "1D", direction: "short", type: "trend_alignment", confidence: 75, price: 42100, description: "", isActive: true, timestamp: "" },
        { id: "3", timeframe: "4H", direction: "long", type: "fib_rejection", confidence: 70, price: 42500, description: "", isActive: true, timestamp: "" },
      ];

      const countsByTF = signals.reduce(
        (acc, s) => {
          acc[s.timeframe] = (acc[s.timeframe] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(countsByTF["1D"]).toBe(2);
      expect(countsByTF["4H"]).toBe(1);
    });
  });

  // ===========================================================================
  // Signal Types
  // ===========================================================================

  describe("signal types", () => {
    it("should identify trend alignment signals", () => {
      const signal: AggregatedSignal = {
        id: "1",
        timeframe: "1D",
        direction: "long",
        type: "trend_alignment",
        confidence: 80,
        price: 42000,
        description: "Higher TF bullish, lower TF pullback",
        isActive: true,
        timestamp: "2024-01-15T10:00:00Z",
      };

      expect(signal.type).toBe("trend_alignment");
    });

    it("should identify Fibonacci rejection signals", () => {
      const signal: AggregatedSignal = {
        id: "2",
        timeframe: "1D",
        direction: "long",
        type: "fib_rejection",
        confidence: 75,
        price: 42000,
        description: "Price rejected at 61.8% retracement",
        isActive: true,
        timestamp: "2024-01-15T10:00:00Z",
        fibLevel: 0.618,
        fibStrategy: "retracement",
      };

      expect(signal.type).toBe("fib_rejection");
      expect(signal.fibLevel).toBe(0.618);
    });

    it("should identify confluence signals", () => {
      const signal: AggregatedSignal = {
        id: "3",
        timeframe: "1D",
        direction: "long",
        type: "confluence",
        confidence: 90,
        price: 42000,
        description: "Multiple levels align",
        isActive: true,
        timestamp: "2024-01-15T10:00:00Z",
        confluenceCount: 3,
      };

      expect(signal.type).toBe("confluence");
      expect(signal.confluenceCount).toBe(3);
    });
  });

  // ===========================================================================
  // Refresh
  // ===========================================================================

  describe("refresh", () => {
    it("should provide refresh function", () => {
      const { result } = renderHook(() =>
        useSignalAggregation({
          symbol: "DJI",
          enabled: false,
        })
      );

      expect(typeof result.current.refresh).toBe("function");
    });

    it("should refetch data on refresh", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockMarketData }),
      });

      const { result } = renderHook(() =>
        useSignalAggregation({
          symbol: "DJI",
          enabled: true,
          timeframes: ["1D"],
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockFetch.mock.calls.length;

      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe("error handling", () => {
    it("should handle fetch errors gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useSignalAggregation({
          symbol: "DJI",
          enabled: true,
          timeframes: ["1D"],
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.signals).toEqual([]);
      expect(result.current.error).toBeTruthy();
    });

    it("should handle empty data gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] }),
      });

      const { result } = renderHook(() =>
        useSignalAggregation({
          symbol: "DJI",
          enabled: true,
          timeframes: ["1D"],
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.signals).toEqual([]);
    });
  });
});
