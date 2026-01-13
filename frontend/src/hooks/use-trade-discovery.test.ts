/**
 * Tests for useTradeDiscovery hook
 *
 * Tests trade opportunity discovery and aggregation.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTradeDiscovery, categorizeTradeFromTrends, detectTrendPhaseFromTrend } from "./use-trade-discovery";
import * as trendAlignmentModule from "./use-trend-alignment";
import * as signalSuggestionsModule from "./use-signal-suggestions";
import type { TimeframeTrend } from "./use-trend-alignment";
import type { SignalSuggestion } from "./use-signal-suggestions";
import type { TradeCategory, TrendPhase } from "@/types/workflow-v2";

// Mock the dependent hooks
vi.mock("./use-trend-alignment");
vi.mock("./use-signal-suggestions");

// Helper to create trend data
const createTrend = (
  timeframe: string,
  trend: "bullish" | "bearish" | "neutral" = "neutral",
  error: string | null = null
): TimeframeTrend => ({
  timeframe: timeframe as TimeframeTrend["timeframe"],
  trend: trend === "neutral" ? "ranging" : trend,
  confidence: 50,
  swing: { signal: "neutral" as const },
  rsi: { signal: "neutral" as const, value: 50 },
  macd: { signal: "neutral" as const, value: 0 },
  isLoading: false,
  error,
});

// Helper to create signal suggestion
const createSignal = (
  id: string,
  type: "LONG" | "SHORT" | "WAIT",
  higherTF: string,
  lowerTF: string,
  options: Partial<SignalSuggestion> = {}
): SignalSuggestion => ({
  id,
  type,
  higherTF: higherTF as SignalSuggestion["higherTF"],
  lowerTF: lowerTF as SignalSuggestion["lowerTF"],
  pairName: `${higherTF} → ${lowerTF}`,
  confidence: options.confidence ?? 75,
  description: options.description ?? `${type} signal`,
  reasoning: options.reasoning ?? "Test reasoning",
  isActive: options.isActive ?? true,
  tradingStyle: options.tradingStyle ?? "swing",
  entryZone: options.entryZone ?? "support",
  ...options,
});

describe("useTradeDiscovery", () => {
  const mockRefresh = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockReset();

    // Default mock implementations
    vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
      trends: [],
      overall: {
        direction: "ranging" as const,
        strength: "weak" as const,
        bullishCount: 0,
        bearishCount: 0,
        rangingCount: 0,
        description: "Neutral market",
      },
      isLoading: false,
      refresh: mockRefresh,
    });

    vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
      signals: [],
      activeSignals: [],
      longCount: 0,
      shortCount: 0,
      waitCount: 0,
    });
  });

  // ===========================================================================
  // Basic Functionality
  // ===========================================================================

  describe("basic functionality", () => {
    it("should return empty opportunities when no signals", () => {
      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.opportunities).toEqual([]);
      expect(result.current.activeOpportunities).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.hasError).toBe(false);
    });

    it("should convert LONG signals to opportunities", () => {
      const trends = [createTrend("1D", "bullish"), createTrend("4H", "neutral")];
      const signals = [createSignal("sig-1", "LONG", "1D", "4H")];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 1,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.opportunities).toHaveLength(1);
      expect(result.current.opportunities[0]).toMatchObject({
        id: "sig-1",
        symbol: "DJI",
        higherTimeframe: "1D",
        lowerTimeframe: "4H",
        direction: "long",
        confidence: 75,
        isActive: true,
      });
    });

    it("should convert SHORT signals to opportunities", () => {
      const trends = [createTrend("1D", "bearish"), createTrend("4H", "bearish")];
      const signals = [createSignal("sig-2", "SHORT", "1D", "4H")];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bearish" as const,
          strength: "strong" as const,
          bullishCount: 0,
          bearishCount: 2,
          rangingCount: 0,
          description: "Bearish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 0,
        shortCount: 1,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "SPX" })
      );

      expect(result.current.opportunities).toHaveLength(1);
      expect(result.current.opportunities[0].direction).toBe("short");
      expect(result.current.opportunities[0].symbol).toBe("SPX");
    });

    it("should exclude WAIT signals", () => {
      const trends = [createTrend("1D"), createTrend("4H")];
      const signals = [createSignal("sig-wait", "WAIT", "1D", "4H")];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "ranging" as const,
          strength: "weak" as const,
          bullishCount: 0,
          bearishCount: 0,
          rangingCount: 2,
          description: "Ranging market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 0,
        shortCount: 0,
        waitCount: 1,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.opportunities).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Sorting and Filtering
  // ===========================================================================

  describe("sorting and filtering", () => {
    it("should sort active opportunities first", () => {
      const trends = [createTrend("1D"), createTrend("4H"), createTrend("1H")];
      const signals = [
        createSignal("inactive", "LONG", "1D", "4H", { isActive: false, confidence: 90 }),
        createSignal("active", "LONG", "4H", "1H", { isActive: true, confidence: 60 }),
      ];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 2,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      // Active should come first despite lower confidence
      expect(result.current.opportunities[0].id).toBe("active");
      expect(result.current.opportunities[1].id).toBe("inactive");
    });

    it("should sort by confidence within active/inactive groups", () => {
      const trends = [
        createTrend("1D"),
        createTrend("4H"),
        createTrend("1H"),
        createTrend("15m"),
      ];
      const signals = [
        createSignal("low", "LONG", "1D", "4H", { isActive: true, confidence: 50 }),
        createSignal("high", "LONG", "4H", "1H", { isActive: true, confidence: 90 }),
        createSignal("medium", "LONG", "1H", "15m", { isActive: true, confidence: 70 }),
      ];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 3,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.opportunities[0].id).toBe("high");
      expect(result.current.opportunities[1].id).toBe("medium");
      expect(result.current.opportunities[2].id).toBe("low");
    });

    it("should filter active opportunities correctly", () => {
      const trends = [createTrend("1D"), createTrend("4H")];
      const signals = [
        createSignal("active1", "LONG", "1D", "4H", { isActive: true }),
        createSignal("inactive1", "SHORT", "1D", "4H", { isActive: false }),
        createSignal("active2", "LONG", "1D", "4H", { isActive: true }),
      ];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 2,
        shortCount: 1,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.opportunities).toHaveLength(3);
      expect(result.current.activeOpportunities).toHaveLength(2);
      expect(
        result.current.activeOpportunities.every((o) => o.isActive)
      ).toBe(true);
    });
  });

  // ===========================================================================
  // Trend Integration
  // ===========================================================================

  describe("trend integration", () => {
    it("should attach trend data to opportunities", () => {
      const trends = [
        createTrend("1D", "bullish"),
        createTrend("4H", "neutral"),
      ];
      const signals = [createSignal("sig-1", "LONG", "1D", "4H")];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 1,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      const opp = result.current.opportunities[0];
      expect(opp.higherTrend).toBeDefined();
      expect(opp.higherTrend?.trend).toBe("bullish");
      expect(opp.lowerTrend).toBeDefined();
      expect(opp.lowerTrend?.trend).toBe("ranging"); // "neutral" maps to "ranging"
    });

    it("should handle missing trend data gracefully", () => {
      const trends = [createTrend("1D", "bullish")]; // Missing 4H trend
      const signals = [createSignal("sig-1", "LONG", "1D", "4H")];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 1,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      const opp = result.current.opportunities[0];
      expect(opp.higherTrend).toBeDefined();
      expect(opp.lowerTrend).toBeUndefined();
    });

    it("should expose trends from the hook", () => {
      const trends = [
        createTrend("1D", "bullish"),
        createTrend("4H", "bearish"),
        createTrend("1H", "neutral"),
      ];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "ranging" as const,
          strength: "weak" as const,
          bullishCount: 0,
          bearishCount: 0,
          rangingCount: 2,
          description: "Ranging market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals: [],
        activeSignals: [],
        longCount: 0,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.trends).toHaveLength(3);
      expect(result.current.trends[0].trend).toBe("bullish");
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe("error handling", () => {
    it("should report errors from trend fetching", () => {
      const trends = [
        createTrend("1D", "bullish", null),
        createTrend("4H", "neutral", "API error for 4H"),
        createTrend("1H", "neutral", "Network timeout for 1H"),
      ];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "ranging" as const,
          strength: "weak" as const,
          bullishCount: 0,
          bearishCount: 0,
          rangingCount: 2,
          description: "Ranging market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals: [],
        activeSignals: [],
        longCount: 0,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.hasError).toBe(true);
      expect(result.current.errors).toHaveLength(2);
      expect(result.current.errors).toEqual([
        { timeframe: "4H", error: "API error for 4H" },
        { timeframe: "1H", error: "Network timeout for 1H" },
      ]);
    });

    it("should report no errors when all trends succeed", () => {
      const trends = [
        createTrend("1D", "bullish", null),
        createTrend("4H", "neutral", null),
      ];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals: [],
        activeSignals: [],
        longCount: 0,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.hasError).toBe(false);
      expect(result.current.errors).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe("loading state", () => {
    it("should reflect loading state from trend alignment", () => {
      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends: [],
        overall: {
          direction: "ranging" as const,
          strength: "weak" as const,
          bullishCount: 0,
          bearishCount: 0,
          rangingCount: 2,
          description: "Ranging market",
        },
        isLoading: true,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals: [],
        activeSignals: [],
        longCount: 0,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.isLoading).toBe(true);
    });

    it("should not be loading when trend alignment completes", () => {
      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends: [createTrend("1D")],
        overall: {
          direction: "ranging" as const,
          strength: "weak" as const,
          bullishCount: 0,
          bearishCount: 0,
          rangingCount: 2,
          description: "Ranging market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals: [],
        activeSignals: [],
        longCount: 0,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  // ===========================================================================
  // Refresh Function
  // ===========================================================================

  describe("refresh function", () => {
    it("should expose refresh function from trend alignment", () => {
      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends: [],
        overall: {
          direction: "ranging" as const,
          strength: "weak" as const,
          bullishCount: 0,
          bearishCount: 0,
          rangingCount: 2,
          description: "Ranging market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals: [],
        activeSignals: [],
        longCount: 0,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      result.current.refresh();

      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Symbol Changes
  // ===========================================================================

  describe("symbol changes", () => {
    it("should include symbol in opportunities", () => {
      const trends = [createTrend("1D"), createTrend("4H")];
      const signals = [createSignal("sig-1", "LONG", "1D", "4H")];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 1,
        shortCount: 0,
        waitCount: 0,
      });

      // Test with different symbols
      const { result: result1 } = renderHook(() =>
        useTradeDiscovery({ symbol: "BTCUSD" })
      );

      expect(result1.current.opportunities[0].symbol).toBe("BTCUSD");

      const { result: result2 } = renderHook(() =>
        useTradeDiscovery({ symbol: "EURUSD" })
      );

      expect(result2.current.opportunities[0].symbol).toBe("EURUSD");
    });
  });

  // ===========================================================================
  // Trading Style Mapping
  // ===========================================================================

  describe("trading style mapping", () => {
    it("should map trading styles correctly", () => {
      const trends = [createTrend("1M"), createTrend("1W"), createTrend("1D"), createTrend("4H")];
      const signals = [
        createSignal("position", "LONG", "1M", "1W", { tradingStyle: "position" }),
        createSignal("swing", "LONG", "1W", "1D", { tradingStyle: "swing" }),
        createSignal("intraday", "LONG", "1D", "4H", { tradingStyle: "intraday" }),
      ];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 3,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      const styles = result.current.opportunities.map((o) => o.tradingStyle);
      expect(styles).toContain("position");
      expect(styles).toContain("swing");
      expect(styles).toContain("intraday");
    });
  });

  // ===========================================================================
  // Entry Zone Mapping
  // ===========================================================================

  describe("entry zone mapping", () => {
    it("should preserve entry zone from signals", () => {
      const trends = [createTrend("1D"), createTrend("4H")];
      const signals = [
        createSignal("support", "LONG", "1D", "4H", { entryZone: "support" }),
        createSignal("resistance", "SHORT", "1D", "4H", { entryZone: "resistance" }),
      ];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "ranging" as const,
          strength: "weak" as const,
          bullishCount: 0,
          bearishCount: 0,
          rangingCount: 2,
          description: "Ranging market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 1,
        shortCount: 1,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      const supportOpp = result.current.opportunities.find(
        (o) => o.id === "support"
      );
      const resistanceOpp = result.current.opportunities.find(
        (o) => o.id === "resistance"
      );

      expect(supportOpp?.entryZone).toBe("support");
      expect(resistanceOpp?.entryZone).toBe("resistance");
    });
  });

  // ===========================================================================
  // Trade Category Assignment
  // ===========================================================================

  describe("trade category assignment", () => {
    it("should assign with_trend category when trading with higher TF trend", () => {
      const trends = [
        createTrend("1D", "bullish"),
        createTrend("4H", "bullish"),
      ];
      const signals = [createSignal("sig-1", "LONG", "1D", "4H")];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 1,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.opportunities[0].category).toBe("with_trend");
    });

    it("should assign counter_trend category when trading against higher TF with high confidence", () => {
      const trends = [
        createTrend("1D", "bearish"),
        createTrend("4H", "bullish"),
      ];
      // High confidence signal against the higher TF trend
      const signals = [createSignal("sig-1", "LONG", "1D", "4H", { confidence: 80 })];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bearish" as const,
          strength: "strong" as const,
          bullishCount: 0,
          bearishCount: 2,
          rangingCount: 0,
          description: "Bearish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 1,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.opportunities[0].category).toBe("counter_trend");
    });

    it("should assign reversal_attempt category when trading against higher TF with low confidence", () => {
      const trends = [
        createTrend("1D", "bearish"),
        createTrend("4H", "neutral"),
      ];
      // Low confidence signal against the higher TF trend
      const signals = [createSignal("sig-1", "LONG", "1D", "4H", { confidence: 50 })];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bearish" as const,
          strength: "strong" as const,
          bullishCount: 0,
          bearishCount: 2,
          rangingCount: 0,
          description: "Bearish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 1,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.opportunities[0].category).toBe("reversal_attempt");
    });

    it("should assign with_trend for short trades in bearish higher TF", () => {
      const trends = [
        createTrend("1D", "bearish"),
        createTrend("4H", "bearish"),
      ];
      const signals = [createSignal("sig-1", "SHORT", "1D", "4H")];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bearish" as const,
          strength: "strong" as const,
          bullishCount: 0,
          bearishCount: 2,
          rangingCount: 0,
          description: "Bearish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 0,
        shortCount: 1,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.opportunities[0].category).toBe("with_trend");
    });
  });

  // ===========================================================================
  // Trend Phase Detection
  // ===========================================================================

  describe("trend phase detection", () => {
    it("should detect impulse phase when trending strongly with aligned indicators", () => {
      // Phase is detected from lower TF (4H - entry timeframe)
      const trends = [
        createTrend("1D", "bullish"),
        {
          ...createTrend("4H", "bullish"),
          trend: "bullish" as const,
          confidence: 80,
          swing: { signal: "bullish" as const },
          rsi: { signal: "bullish" as const, value: 65 },
          macd: { signal: "bullish" as const, value: 10 },
        },
      ];
      const signals = [createSignal("sig-1", "LONG", "1D", "4H")];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 1,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.opportunities[0].trendPhase).toBe("impulse");
    });

    it("should detect correction phase when momentum diverges from trend", () => {
      // Phase is detected from lower TF (4H - entry timeframe)
      const trends = [
        createTrend("1D", "bullish"),
        {
          ...createTrend("4H", "bullish"),
          trend: "bullish" as const,
          confidence: 60,
          swing: { signal: "bullish" as const },
          rsi: { signal: "bearish" as const, value: 40 },
          macd: { signal: "bearish" as const, value: -5 },
        },
      ];
      const signals = [createSignal("sig-1", "LONG", "1D", "4H")];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "bullish" as const,
          strength: "strong" as const,
          bullishCount: 2,
          bearishCount: 0,
          rangingCount: 0,
          description: "Bullish market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 1,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      expect(result.current.opportunities[0].trendPhase).toBe("correction");
    });

    it("should default to continuation phase for neutral conditions", () => {
      const trends = [
        createTrend("1D", "neutral"),
        createTrend("4H", "neutral"),
      ];
      const signals = [createSignal("sig-1", "LONG", "1D", "4H")];

      vi.mocked(trendAlignmentModule.useTrendAlignment).mockReturnValue({
        trends,
        overall: {
          direction: "ranging" as const,
          strength: "weak" as const,
          bullishCount: 0,
          bearishCount: 0,
          rangingCount: 2,
          description: "Ranging market",
        },
        isLoading: false,
        refresh: mockRefresh,
      });

      vi.mocked(signalSuggestionsModule.useSignalSuggestions).mockReturnValue({
        signals,
        activeSignals: signals.filter(s => s.isActive),
        longCount: 1,
        shortCount: 0,
        waitCount: 0,
      });

      const { result } = renderHook(() =>
        useTradeDiscovery({ symbol: "DJI" })
      );

      // Neutral defaults to continuation
      expect(result.current.opportunities[0].trendPhase).toBe("continuation");
    });
  });
});

// ===========================================================================
// Helper Function Tests
// ===========================================================================

describe("categorizeTradeFromTrends", () => {
  it("should return with_trend for aligned long trade", () => {
    const result = categorizeTradeFromTrends("bullish", "bullish", "long", 75);
    expect(result).toBe("with_trend");
  });

  it("should return with_trend for aligned short trade", () => {
    const result = categorizeTradeFromTrends("bearish", "bearish", "short", 75);
    expect(result).toBe("with_trend");
  });

  it("should return counter_trend for high confidence against trend", () => {
    const result = categorizeTradeFromTrends("bearish", "bullish", "long", 75);
    expect(result).toBe("counter_trend");
  });

  it("should return reversal_attempt for low confidence against trend", () => {
    const result = categorizeTradeFromTrends("bearish", "ranging", "long", 50);
    expect(result).toBe("reversal_attempt");
  });

  it("should handle ranging higher TF as with_trend", () => {
    const result = categorizeTradeFromTrends("ranging", "bullish", "long", 75);
    expect(result).toBe("with_trend");
  });
});

describe("detectTrendPhaseFromTrend", () => {
  const baseTrend: TimeframeTrend = {
    timeframe: "1D",
    trend: "bullish",
    confidence: 50,
    swing: { signal: "neutral" },
    rsi: { signal: "neutral" },
    macd: { signal: "neutral" },
    isLoading: false,
    error: null,
  };

  it("should return impulse for high confidence with aligned indicators", () => {
    const trend: TimeframeTrend = {
      ...baseTrend,
      confidence: 80,
      swing: { signal: "bullish" },
      rsi: { signal: "bullish", value: 65 },
      macd: { signal: "bullish", value: 10 },
    };
    const result = detectTrendPhaseFromTrend(trend);
    expect(result).toBe("impulse");
  });

  it("should return correction when momentum diverges from swing trend", () => {
    const trend: TimeframeTrend = {
      ...baseTrend,
      trend: "bullish",
      confidence: 60,
      swing: { signal: "bullish" },
      rsi: { signal: "bearish", value: 40 },
      macd: { signal: "bearish", value: -5 },
    };
    const result = detectTrendPhaseFromTrend(trend);
    expect(result).toBe("correction");
  });

  it("should return exhaustion for low confidence in trending market", () => {
    const trend: TimeframeTrend = {
      ...baseTrend,
      trend: "bullish",
      confidence: 30,
      swing: { signal: "neutral" },
      rsi: { signal: "bearish", value: 35 },
      macd: { signal: "bearish", value: -2 },
    };
    const result = detectTrendPhaseFromTrend(trend);
    expect(result).toBe("exhaustion");
  });

  it("should return continuation as default", () => {
    const trend: TimeframeTrend = {
      ...baseTrend,
      trend: "ranging",
      confidence: 50,
    };
    const result = detectTrendPhaseFromTrend(trend);
    expect(result).toBe("continuation");
  });
});
