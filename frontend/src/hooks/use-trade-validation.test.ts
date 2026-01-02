/**
 * Tests for useTradeValidation hook
 *
 * TDD: Tests define expected behavior for trade validation in Workflow V2.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTradeValidation } from "./use-trade-validation";
import type { TradeOpportunity } from "./use-trade-discovery";

// Mock useMultiTFLevels
vi.mock("./use-multi-tf-levels", () => ({
  useMultiTFLevels: vi.fn(() => ({
    allLevels: [],
    isLoading: false,
    byTimeframe: [],
    uniqueLevels: [],
    loadingStates: {},
    errors: {},
    refresh: vi.fn(),
    toggleLevelVisibility: vi.fn(),
  })),
}));

import { useMultiTFLevels } from "./use-multi-tf-levels";

// Mock opportunity data
const createMockOpportunity = (
  overrides: Partial<TradeOpportunity> = {}
): TradeOpportunity => ({
  id: "test-opp-1",
  symbol: "DJI",
  higherTimeframe: "1D",
  lowerTimeframe: "4H",
  direction: "long",
  confidence: 75,
  tradingStyle: "swing",
  description: "Test opportunity",
  reasoning: "Test reasoning",
  isActive: true,
  entryZone: "support",
  signal: {
    id: "sig-1",
    type: "LONG",
    higherTF: "1D",
    lowerTF: "4H",
    confidence: 75,
    description: "Test signal",
    reasoning: "Test reasoning",
    isActive: true,
    tradingStyle: "swing",
    entryZone: "support",
  },
  higherTrend: {
    timeframe: "1D",
    direction: "bullish",
    confidence: 80,
    swingHigh: 42500,
    swingLow: 41800,
    rsi: { value: 55, signal: "neutral" },
    macd: { signal: "bullish" },
  },
  lowerTrend: {
    timeframe: "4H",
    direction: "bearish",
    confidence: 65,
    swingHigh: 42300,
    swingLow: 42000,
    rsi: { value: 35, signal: "bullish" },
    macd: { signal: "bearish" },
  },
  ...overrides,
});

// Mock levels
const createMockLevels = () => [
  {
    id: "1D-RET-long-0.618-42100",
    price: 42100,
    timeframe: "4H" as const,
    strategy: "RETRACEMENT" as const,
    type: "retracement" as const,
    direction: "long" as const,
    ratio: 0.618,
    label: "R61.8%",
    visible: true,
    heat: 50,
    pivotHigh: 42500,
    pivotLow: 41800,
  },
  {
    id: "1D-EXT-long-1.272-42700",
    price: 42700,
    timeframe: "1D" as const,
    strategy: "EXTENSION" as const,
    type: "extension" as const,
    direction: "long" as const,
    ratio: 1.272,
    label: "E127.2%",
    visible: true,
    heat: 30,
    pivotHigh: 42500,
    pivotLow: 41800,
  },
  {
    id: "1D-EXT-long-1.618-43000",
    price: 43000,
    timeframe: "1D" as const,
    strategy: "EXTENSION" as const,
    type: "extension" as const,
    direction: "long" as const,
    ratio: 1.618,
    label: "E161.8%",
    visible: true,
    heat: 20,
    pivotHigh: 42500,
    pivotLow: 41800,
  },
];

describe("useTradeValidation", () => {
  const mockUseMultiTFLevels = useMultiTFLevels as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMultiTFLevels.mockReturnValue({
      allLevels: [],
      isLoading: false,
      byTimeframe: [],
      uniqueLevels: [],
      loadingStates: {},
      errors: {},
      refresh: vi.fn(),
      toggleLevelVisibility: vi.fn(),
    });
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("initial state", () => {
    it("should return empty result when opportunity is null", () => {
      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: null,
          enabled: true,
        })
      );

      expect(result.current.result.checks).toEqual([]);
      expect(result.current.result.isValid).toBe(false);
      expect(result.current.result.passedCount).toBe(0);
      expect(result.current.result.totalCount).toBe(0);
    });

    it("should not fetch levels when disabled", () => {
      const opportunity = createMockOpportunity();

      renderHook(() =>
        useTradeValidation({
          opportunity,
          enabled: false,
        })
      );

      expect(mockUseMultiTFLevels).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );
    });

    it("should return loading state from useMultiTFLevels", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: true,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      expect(result.current.isLoading).toBe(true);
    });
  });

  // ===========================================================================
  // Validation Checks
  // ===========================================================================

  describe("validation checks", () => {
    it("should perform 5 validation checks", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      expect(result.current.result.checks).toHaveLength(5);
    });

    it("should include Trend Alignment check", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      const trendCheck = result.current.result.checks.find(
        (c) => c.name === "Trend Alignment"
      );
      expect(trendCheck).toBeDefined();
      expect(trendCheck?.passed).toBe(true);
    });

    it("should include Entry Zone check", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      const entryCheck = result.current.result.checks.find(
        (c) => c.name === "Entry Zone"
      );
      expect(entryCheck).toBeDefined();
    });

    it("should include Target Zones check", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      const targetCheck = result.current.result.checks.find(
        (c) => c.name === "Target Zones"
      );
      expect(targetCheck).toBeDefined();
    });

    it("should include RSI Confirmation check", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      const rsiCheck = result.current.result.checks.find(
        (c) => c.name === "RSI Confirmation"
      );
      expect(rsiCheck).toBeDefined();
    });

    it("should include MACD Confirmation check", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      const macdCheck = result.current.result.checks.find(
        (c) => c.name === "MACD Confirmation"
      );
      expect(macdCheck).toBeDefined();
    });
  });

  // ===========================================================================
  // Trend Alignment Logic
  // ===========================================================================

  describe("trend alignment validation", () => {
    it("should pass trend alignment when opportunity is active and confident", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            isActive: true,
            confidence: 70,
          }),
          enabled: true,
        })
      );

      const trendCheck = result.current.result.checks.find(
        (c) => c.name === "Trend Alignment"
      );
      expect(trendCheck?.passed).toBe(true);
    });

    it("should fail trend alignment when confidence is below 60", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            isActive: true,
            confidence: 55,
          }),
          enabled: true,
        })
      );

      const trendCheck = result.current.result.checks.find(
        (c) => c.name === "Trend Alignment"
      );
      expect(trendCheck?.passed).toBe(false);
    });

    it("should fail trend alignment when not active", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            isActive: false,
            confidence: 80,
          }),
          enabled: true,
        })
      );

      const trendCheck = result.current.result.checks.find(
        (c) => c.name === "Trend Alignment"
      );
      expect(trendCheck?.passed).toBe(false);
    });
  });

  // ===========================================================================
  // Entry Zone Logic
  // ===========================================================================

  describe("entry zone validation", () => {
    it("should pass when retracement levels exist for the direction", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({ direction: "long" }),
          enabled: true,
        })
      );

      const entryCheck = result.current.result.checks.find(
        (c) => c.name === "Entry Zone"
      );
      expect(entryCheck?.passed).toBe(true);
    });

    it("should fail when no retracement levels exist", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      const entryCheck = result.current.result.checks.find(
        (c) => c.name === "Entry Zone"
      );
      expect(entryCheck?.passed).toBe(false);
    });
  });

  // ===========================================================================
  // Target Zones Logic
  // ===========================================================================

  describe("target zones validation", () => {
    it("should pass when extension levels exist", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({ direction: "long" }),
          enabled: true,
        })
      );

      const targetCheck = result.current.result.checks.find(
        (c) => c.name === "Target Zones"
      );
      expect(targetCheck?.passed).toBe(true);
    });

    it("should fail when no extension levels exist", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [createMockLevels()[0]], // Only retracement, no extension
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      const targetCheck = result.current.result.checks.find(
        (c) => c.name === "Target Zones"
      );
      expect(targetCheck?.passed).toBe(false);
    });
  });

  // ===========================================================================
  // RSI Confirmation Logic
  // ===========================================================================

  describe("RSI confirmation validation", () => {
    it("should pass RSI check for long when RSI is bullish", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            direction: "long",
            lowerTrend: {
              timeframe: "4H",
              direction: "bearish",
              confidence: 65,
              swingHigh: 42300,
              swingLow: 42000,
              rsi: { value: 35, signal: "bullish" },
              macd: { signal: "bearish" },
            },
          }),
          enabled: true,
        })
      );

      const rsiCheck = result.current.result.checks.find(
        (c) => c.name === "RSI Confirmation"
      );
      expect(rsiCheck?.passed).toBe(true);
    });

    it("should pass RSI check for short when RSI is bearish", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            direction: "short",
            lowerTrend: {
              timeframe: "4H",
              direction: "bullish",
              confidence: 65,
              swingHigh: 42300,
              swingLow: 42000,
              rsi: { value: 75, signal: "bearish" },
              macd: { signal: "bullish" },
            },
          }),
          enabled: true,
        })
      );

      const rsiCheck = result.current.result.checks.find(
        (c) => c.name === "RSI Confirmation"
      );
      expect(rsiCheck?.passed).toBe(true);
    });

    it("should pass RSI check when signal is neutral", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            direction: "long",
            lowerTrend: {
              timeframe: "4H",
              direction: "bearish",
              confidence: 65,
              swingHigh: 42300,
              swingLow: 42000,
              rsi: { value: 50, signal: "neutral" },
              macd: { signal: "bearish" },
            },
          }),
          enabled: true,
        })
      );

      const rsiCheck = result.current.result.checks.find(
        (c) => c.name === "RSI Confirmation"
      );
      expect(rsiCheck?.passed).toBe(true);
    });
  });

  // ===========================================================================
  // MACD Confirmation Logic
  // ===========================================================================

  describe("MACD confirmation validation", () => {
    it("should pass MACD check for long when MACD is bullish", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            direction: "long",
            lowerTrend: {
              timeframe: "4H",
              direction: "bearish",
              confidence: 65,
              swingHigh: 42300,
              swingLow: 42000,
              rsi: { value: 50, signal: "neutral" },
              macd: { signal: "bullish" },
            },
          }),
          enabled: true,
        })
      );

      const macdCheck = result.current.result.checks.find(
        (c) => c.name === "MACD Confirmation"
      );
      expect(macdCheck?.passed).toBe(true);
    });

    it("should fail MACD check for long when MACD is bearish", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            direction: "long",
            lowerTrend: {
              timeframe: "4H",
              direction: "bearish",
              confidence: 65,
              swingHigh: 42300,
              swingLow: 42000,
              rsi: { value: 50, signal: "neutral" },
              macd: { signal: "bearish" },
            },
          }),
          enabled: true,
        })
      );

      const macdCheck = result.current.result.checks.find(
        (c) => c.name === "MACD Confirmation"
      );
      expect(macdCheck?.passed).toBe(false);
    });
  });

  // ===========================================================================
  // Overall Validation Result
  // ===========================================================================

  describe("overall validation result", () => {
    it("should calculate pass percentage correctly", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      const { passedCount, totalCount, passPercentage } = result.current.result;
      expect(passPercentage).toBe(Math.round((passedCount / totalCount) * 100));
    });

    it("should be valid when at least 60% of checks pass", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            isActive: true,
            confidence: 75,
            lowerTrend: {
              timeframe: "4H",
              direction: "bearish",
              confidence: 65,
              swingHigh: 42300,
              swingLow: 42000,
              rsi: { value: 35, signal: "bullish" },
              macd: { signal: "bullish" },
            },
          }),
          enabled: true,
        })
      );

      // With mock levels: Trend (pass), Entry (pass), Targets (pass), RSI (pass), MACD (pass) = 100%
      expect(result.current.result.passPercentage).toBeGreaterThanOrEqual(60);
      expect(result.current.result.isValid).toBe(true);
    });

    it("should be invalid when less than 60% of checks pass", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            isActive: false, // Fail trend
            confidence: 50, // Fail trend
            // No levels = fail entry + targets
            lowerTrend: {
              timeframe: "4H",
              direction: "bearish",
              confidence: 65,
              swingHigh: 42300,
              swingLow: 42000,
              rsi: { value: 75, signal: "bearish" }, // Wrong for long
              macd: { signal: "bearish" }, // Wrong for long
            },
          }),
          enabled: true,
        })
      );

      // All checks fail = 0%
      expect(result.current.result.passPercentage).toBeLessThan(60);
      expect(result.current.result.isValid).toBe(false);
    });
  });

  // ===========================================================================
  // Suggested Prices
  // ===========================================================================

  describe("suggested prices", () => {
    it("should suggest entry from first retracement level", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      expect(result.current.result.suggestedEntry).toBe(42100);
    });

    it("should suggest targets from extension levels", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: createMockLevels(),
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      expect(result.current.result.suggestedTargets).toContain(42700);
      expect(result.current.result.suggestedTargets).toContain(43000);
    });

    it("should return null for suggested entry when no levels", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity(),
          enabled: true,
        })
      );

      expect(result.current.result.suggestedEntry).toBeNull();
    });
  });

  // ===========================================================================
  // Check Status
  // ===========================================================================

  describe("check status", () => {
    it("should set status to passed when check passes", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            isActive: true,
            confidence: 75,
          }),
          enabled: true,
        })
      );

      const trendCheck = result.current.result.checks.find(
        (c) => c.name === "Trend Alignment"
      );
      expect(trendCheck?.status).toBe("passed");
    });

    it("should set status to failed when check fails", () => {
      mockUseMultiTFLevels.mockReturnValue({
        allLevels: [],
        isLoading: false,
        byTimeframe: [],
        uniqueLevels: [],
        loadingStates: {},
        errors: {},
        refresh: vi.fn(),
        toggleLevelVisibility: vi.fn(),
      });

      const { result } = renderHook(() =>
        useTradeValidation({
          opportunity: createMockOpportunity({
            isActive: false,
            confidence: 50,
          }),
          enabled: true,
        })
      );

      const trendCheck = result.current.result.checks.find(
        (c) => c.name === "Trend Alignment"
      );
      expect(trendCheck?.status).toBe("failed");
    });
  });
});
