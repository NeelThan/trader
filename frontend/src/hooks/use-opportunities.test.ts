/**
 * Tests for useOpportunities hook
 *
 * TDD: Tests define expected behavior for the opportunities scanning hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useOpportunities } from "./use-opportunities";
import type { MarketSymbol } from "@/lib/chart-constants";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useOpportunities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Basic Functionality
  // ===========================================================================

  describe("basic functionality", () => {
    it("should return initial loading state", () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() =>
        useOpportunities({
          symbols: ["DJI"],
          enabled: true,
        })
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.opportunities).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it("should fetch opportunities on mount when enabled", async () => {
      const mockResponse = {
        symbols_scanned: ["DJI"],
        opportunities: [
          {
            symbol: "DJI",
            higher_timeframe: "1D",
            lower_timeframe: "4H",
            direction: "long",
            confidence: 75,
            category: "with_trend",
            phase: "correction",
            description: "Buy pullback in 1D uptrend",
          },
        ],
        scan_time_ms: 150,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() =>
        useOpportunities({
          symbols: ["DJI"],
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.opportunities).toHaveLength(1);
      expect(result.current.opportunities[0].symbol).toBe("DJI");
      expect(result.current.opportunities[0].direction).toBe("long");
      expect(result.current.scanTimeMs).toBe(150);
    });

    it("should not fetch when disabled", () => {
      const { result } = renderHook(() =>
        useOpportunities({
          symbols: ["DJI"],
          enabled: false,
        })
      );

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.opportunities).toEqual([]);
    });
  });

  // ===========================================================================
  // Multiple Symbols
  // ===========================================================================

  describe("multiple symbols", () => {
    it("should scan multiple symbols", async () => {
      const mockResponse = {
        symbols_scanned: ["DJI", "SPX", "NDX"],
        opportunities: [
          {
            symbol: "DJI",
            higher_timeframe: "1D",
            lower_timeframe: "4H",
            direction: "long",
            confidence: 75,
            category: "with_trend",
            phase: "correction",
            description: "Buy pullback",
          },
          {
            symbol: "SPX",
            higher_timeframe: "1D",
            lower_timeframe: "4H",
            direction: "short",
            confidence: 80,
            category: "with_trend",
            phase: "impulse",
            description: "Sell breakdown",
          },
        ],
        scan_time_ms: 300,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() =>
        useOpportunities({
          symbols: ["DJI", "SPX", "NDX"],
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.symbolsScanned).toEqual(["DJI", "SPX", "NDX"]);
      expect(result.current.opportunities).toHaveLength(2);
    });

    it("should pass symbols as comma-separated query param", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            symbols_scanned: ["DJI", "SPX"],
            opportunities: [],
            scan_time_ms: 100,
          }),
      });

      renderHook(() =>
        useOpportunities({
          symbols: ["DJI", "SPX"],
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("symbols=DJI%2CSPX");
    });
  });

  // ===========================================================================
  // Timeframe Pairs
  // ===========================================================================

  describe("timeframe pairs", () => {
    it("should use default timeframe pair when not specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            symbols_scanned: ["DJI"],
            opportunities: [],
            scan_time_ms: 100,
          }),
      });

      renderHook(() =>
        useOpportunities({
          symbols: ["DJI"],
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("timeframe_pairs=1D%3A4H");
    });

    it("should use custom timeframe pairs when specified", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            symbols_scanned: ["DJI"],
            opportunities: [],
            scan_time_ms: 100,
          }),
      });

      renderHook(() =>
        useOpportunities({
          symbols: ["DJI"],
          timeframePairs: [
            { higher: "1W", lower: "1D" },
            { higher: "1D", lower: "4H" },
          ],
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain("timeframe_pairs=1W%3A1D%2C1D%3A4H");
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe("error handling", () => {
    it("should handle fetch errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() =>
        useOpportunities({
          symbols: ["DJI"],
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
      expect(result.current.opportunities).toEqual([]);
    });

    it("should handle non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const { result } = renderHook(() =>
        useOpportunities({
          symbols: ["DJI"],
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toContain("500");
      expect(result.current.opportunities).toEqual([]);
    });
  });

  // ===========================================================================
  // Refresh Functionality
  // ===========================================================================

  describe("refresh functionality", () => {
    it("should provide refresh function", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            symbols_scanned: ["DJI"],
            opportunities: [],
            scan_time_ms: 100,
          }),
      });

      const { result } = renderHook(() =>
        useOpportunities({
          symbols: ["DJI"],
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refresh).toBe("function");

      // Call refresh
      act(() => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ===========================================================================
  // Re-fetch on Symbol Change
  // ===========================================================================

  describe("re-fetch on changes", () => {
    it("should re-fetch when symbols change", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            symbols_scanned: ["DJI"],
            opportunities: [],
            scan_time_ms: 100,
          }),
      });

      const { result, rerender } = renderHook(
        ({ symbols }: { symbols: MarketSymbol[] }) =>
          useOpportunities({
            symbols,
            enabled: true,
          }),
        { initialProps: { symbols: ["DJI"] as MarketSymbol[] } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Change symbols
      rerender({ symbols: ["DJI", "SPX"] as MarketSymbol[] });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });
});
