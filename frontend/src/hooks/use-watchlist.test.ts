/**
 * Tests for useWatchlist hook
 *
 * TDD: Tests define expected behavior for watchlist and multi-symbol scanning.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWatchlist } from "./use-watchlist";
import type { MarketSymbol } from "@/lib/chart-constants";

// Mock the useWorkflowV2Storage hook
const mockAddToWatchlist = vi.fn();
const mockRemoveFromWatchlist = vi.fn();
const mockSetWatchlist = vi.fn();

vi.mock("./use-workflow-v2-storage", () => ({
  useWorkflowV2Storage: () => ({
    storage: {
      watchlist: ["DJI", "SPX"] as MarketSymbol[],
    },
    addToWatchlist: mockAddToWatchlist,
    removeFromWatchlist: mockRemoveFromWatchlist,
    setWatchlist: mockSetWatchlist,
  }),
}));

// Mock the useTradeDiscovery hook
const mockOpportunities: Record<string, unknown[]> = {
  DJI: [
    {
      id: "dji-opp-1",
      symbol: "DJI",
      direction: "long",
      confidence: 85,
      higherTimeframe: "1D",
      lowerTimeframe: "4H",
    },
    {
      id: "dji-opp-2",
      symbol: "DJI",
      direction: "short",
      confidence: 70,
      higherTimeframe: "4H",
      lowerTimeframe: "1H",
    },
  ],
  SPX: [
    {
      id: "spx-opp-1",
      symbol: "SPX",
      direction: "long",
      confidence: 75,
      higherTimeframe: "1W",
      lowerTimeframe: "1D",
    },
  ],
  NDX: [],
};

vi.mock("./use-trade-discovery", () => ({
  useTradeDiscovery: vi.fn(({ symbol }: { symbol: string }) => ({
    opportunities: mockOpportunities[symbol] || [],
    isLoading: false,
    error: null,
  })),
}));

describe("useWatchlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Watchlist Management
  // ===========================================================================

  describe("watchlist management", () => {
    it("should return current watchlist", () => {
      const { result } = renderHook(() => useWatchlist());

      expect(result.current.watchlist).toEqual(["DJI", "SPX"]);
    });

    it("should add symbol to watchlist", () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.addSymbol("NDX");
      });

      expect(mockAddToWatchlist).toHaveBeenCalledWith("NDX");
    });

    it("should remove symbol from watchlist", () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.removeSymbol("SPX");
      });

      expect(mockRemoveFromWatchlist).toHaveBeenCalledWith("SPX");
    });

    it("should set entire watchlist", () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.setWatchlist(["NDX", "BTCUSD"]);
      });

      expect(mockSetWatchlist).toHaveBeenCalledWith(["NDX", "BTCUSD"]);
    });

    it("should return available symbols not in watchlist", () => {
      const { result } = renderHook(() => useWatchlist());

      // DJI and SPX are in watchlist, others should be available
      expect(result.current.availableSymbols).toContain("NDX");
      expect(result.current.availableSymbols).toContain("BTCUSD");
      expect(result.current.availableSymbols).not.toContain("DJI");
      expect(result.current.availableSymbols).not.toContain("SPX");
    });
  });

  // ===========================================================================
  // Cross-Symbol Scanning
  // ===========================================================================

  describe("cross-symbol scanning", () => {
    it("should aggregate opportunities from all watchlist symbols", async () => {
      const { result } = renderHook(() => useWatchlist());

      await waitFor(() => {
        // Should have opportunities from both DJI and SPX
        expect(result.current.allOpportunities.length).toBe(3);
      });
    });

    it("should include symbol in each opportunity", async () => {
      const { result } = renderHook(() => useWatchlist());

      await waitFor(() => {
        const djiOpps = result.current.allOpportunities.filter(
          (o) => o.symbol === "DJI"
        );
        expect(djiOpps.length).toBe(2);
      });
    });

    it("should sort opportunities by confidence", async () => {
      const { result } = renderHook(() => useWatchlist());

      await waitFor(() => {
        const confidences = result.current.allOpportunities.map(
          (o) => o.confidence
        );
        expect(confidences).toEqual([85, 75, 70]);
      });
    });

    it("should track loading state per symbol", () => {
      const { result } = renderHook(() => useWatchlist());

      expect(result.current.loadingSymbols).toBeDefined();
      expect(typeof result.current.isLoading).toBe("boolean");
    });
  });

  // ===========================================================================
  // Summary Statistics
  // ===========================================================================

  describe("summary statistics", () => {
    it("should count total opportunities", async () => {
      const { result } = renderHook(() => useWatchlist());

      await waitFor(() => {
        expect(result.current.summary.totalOpportunities).toBe(3);
      });
    });

    it("should count opportunities per symbol", async () => {
      const { result } = renderHook(() => useWatchlist());

      await waitFor(() => {
        expect(result.current.summary.bySymbol.DJI).toBe(2);
        expect(result.current.summary.bySymbol.SPX).toBe(1);
      });
    });

    it("should count opportunities by direction", async () => {
      const { result } = renderHook(() => useWatchlist());

      await waitFor(() => {
        expect(result.current.summary.longCount).toBe(2);
        expect(result.current.summary.shortCount).toBe(1);
      });
    });

    it("should find best opportunity", async () => {
      const { result } = renderHook(() => useWatchlist());

      await waitFor(() => {
        expect(result.current.summary.bestOpportunity?.id).toBe("dji-opp-1");
        expect(result.current.summary.bestOpportunity?.confidence).toBe(85);
      });
    });
  });

  // ===========================================================================
  // Symbol Selection
  // ===========================================================================

  describe("symbol selection", () => {
    it("should track active symbol", () => {
      const { result } = renderHook(() => useWatchlist());

      expect(result.current.activeSymbol).toBeDefined();
    });

    it("should allow setting active symbol", () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.setActiveSymbol("SPX");
      });

      expect(result.current.activeSymbol).toBe("SPX");
    });

    it("should return opportunities for active symbol only", async () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.setActiveSymbol("SPX");
      });

      await waitFor(() => {
        expect(result.current.activeOpportunities.length).toBe(1);
        expect(result.current.activeOpportunities[0].symbol).toBe("SPX");
      });
    });

    it("should default active symbol to first in watchlist", () => {
      const { result } = renderHook(() => useWatchlist());

      expect(result.current.activeSymbol).toBe("DJI");
    });
  });

  // ===========================================================================
  // Filtering
  // ===========================================================================

  describe("filtering", () => {
    it("should filter opportunities by direction", async () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.setFilter({ direction: "long" });
      });

      await waitFor(() => {
        expect(result.current.filteredOpportunities.length).toBe(2);
        expect(
          result.current.filteredOpportunities.every((o) => o.direction === "long")
        ).toBe(true);
      });
    });

    it("should filter opportunities by minimum confidence", async () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.setFilter({ minConfidence: 80 });
      });

      await waitFor(() => {
        expect(result.current.filteredOpportunities.length).toBe(1);
        expect(result.current.filteredOpportunities[0].confidence).toBe(85);
      });
    });

    it("should filter opportunities by symbol", async () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.setFilter({ symbols: ["SPX"] });
      });

      await waitFor(() => {
        expect(result.current.filteredOpportunities.length).toBe(1);
        expect(result.current.filteredOpportunities[0].symbol).toBe("SPX");
      });
    });

    it("should clear filters", async () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.setFilter({ direction: "long" });
      });

      act(() => {
        result.current.clearFilter();
      });

      await waitFor(() => {
        expect(result.current.filteredOpportunities.length).toBe(3);
      });
    });

    it("should combine multiple filters", async () => {
      const { result } = renderHook(() => useWatchlist());

      act(() => {
        result.current.setFilter({ direction: "long", minConfidence: 80 });
      });

      await waitFor(() => {
        expect(result.current.filteredOpportunities.length).toBe(1);
      });
    });
  });

  // ===========================================================================
  // Refresh
  // ===========================================================================

  describe("refresh", () => {
    it("should provide refresh function", () => {
      const { result } = renderHook(() => useWatchlist());

      expect(typeof result.current.refresh).toBe("function");
    });

    it("should track last refresh time", () => {
      const { result } = renderHook(() => useWatchlist());

      expect(result.current.lastRefresh).toBeDefined();
    });
  });
});
