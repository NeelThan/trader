/**
 * Tests for useTradeExecution hook
 *
 * TDD: Tests define expected behavior for trade execution.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useTradeExecution,
  type SizingData,
  type UseTradeExecutionResult,
} from "./use-trade-execution";
import type { TradeOpportunity } from "./use-trade-discovery";
import type { ValidationResult, ValidationCheck } from "./use-trade-validation";

// Mock the API
vi.mock("@/lib/api", () => ({
  createJournalEntry: vi.fn(),
}));

import { createJournalEntry } from "@/lib/api";

// Mock opportunity
const mockOpportunity: TradeOpportunity = {
  id: "test-opp-1",
  symbol: "DJI",
  higherTimeframe: "1D",
  lowerTimeframe: "4H",
  direction: "long",
  confidence: 75,
  tradingStyle: "swing",
  description: "Buy the pullback to Fib support",
  reasoning: "Higher TF bullish, lower TF pullback",
  isActive: true,
  entryZone: "support",
  signal: {
    id: "sig-1",
    type: "LONG",
    higherTF: "1D",
    lowerTF: "4H",
    pairName: "1D → 4H",
    confidence: 75,
    description: "Test signal",
    reasoning: "Test reasoning",
    isActive: true,
    tradingStyle: "swing",
    entryZone: "support",
  },
  higherTrend: undefined,
  lowerTrend: undefined,
};

// Mock validation result
const createMockValidation = (
  overrides: Partial<ValidationResult> = {}
): ValidationResult => ({
  checks: [] as ValidationCheck[],
  passedCount: 4,
  totalCount: 5,
  isValid: true,
  passPercentage: 80,
  entryLevels: [],
  targetLevels: [],
  suggestedEntry: 42100,
  suggestedStop: 41800,
  suggestedTargets: [42700, 43000],
  ...overrides,
});

const mockCreateJournalEntry = createJournalEntry as ReturnType<typeof vi.fn>;

describe("useTradeExecution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateJournalEntry.mockResolvedValue({ id: "journal-1" });
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("initial state", () => {
    it("should return sizing data", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      expect(result.current.sizing).toBeDefined();
      expect(result.current.sizing).toHaveProperty("accountBalance");
      expect(result.current.sizing).toHaveProperty("riskPercentage");
      expect(result.current.sizing).toHaveProperty("entryPrice");
      expect(result.current.sizing).toHaveProperty("stopLoss");
      expect(result.current.sizing).toHaveProperty("positionSize");
    });

    it("should use suggested entry from validation", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({ suggestedEntry: 42100 }),
          enabled: true,
        })
      );

      expect(result.current.sizing.entryPrice).toBe(42100);
    });

    it("should use suggested stop from validation", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({ suggestedStop: 41800 }),
          enabled: true,
        })
      );

      expect(result.current.sizing.stopLoss).toBe(41800);
    });

    it("should use suggested targets from validation", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({ suggestedTargets: [42700, 43000] }),
          enabled: true,
        })
      );

      expect(result.current.sizing.targets).toEqual([42700, 43000]);
    });

    it("should default account balance to 10000", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      expect(result.current.sizing.accountBalance).toBe(10000);
    });

    it("should default risk percentage to 2", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      expect(result.current.sizing.riskPercentage).toBe(2);
    });

    it("should not be executing initially", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      expect(result.current.isExecuting).toBe(false);
    });

    it("should have no error initially", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Position Size Calculation
  // ===========================================================================

  describe("position size calculation", () => {
    it("should calculate position size from risk", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
          }),
          enabled: true,
        })
      );

      // Account: 10000, Risk: 2% = $200
      // Stop distance: 100 - 95 = 5
      // Position size: 200 / 5 = 40
      expect(result.current.sizing.positionSize).toBe(40);
    });

    it("should calculate risk amount", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      // Account: 10000, Risk: 2% = $200
      expect(result.current.sizing.riskAmount).toBe(200);
    });

    it("should calculate stop distance", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 42100,
            suggestedStop: 41800,
          }),
          enabled: true,
        })
      );

      expect(result.current.sizing.stopDistance).toBe(300);
    });

    it("should handle zero stop distance", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 100, // Same as entry
          }),
          enabled: true,
        })
      );

      expect(result.current.sizing.positionSize).toBe(0);
      expect(result.current.sizing.stopDistance).toBe(0);
    });
  });

  // ===========================================================================
  // Risk/Reward Calculation
  // ===========================================================================

  describe("risk reward calculation", () => {
    it("should calculate R:R ratio for long trades", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [115], // Target 15 above entry
          }),
          enabled: true,
        })
      );

      // Stop distance: 5, Target distance: 15
      // R:R = 15 / 5 = 3
      expect(result.current.sizing.riskRewardRatio).toBe(3);
    });

    it("should calculate R:R ratio for short trades", () => {
      const shortOpportunity = { ...mockOpportunity, direction: "short" as const };
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: shortOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 105,
            suggestedTargets: [85], // Target 15 below entry
          }),
          enabled: true,
        })
      );

      // Stop distance: 5, Target distance: 15
      // R:R = 15 / 5 = 3
      expect(result.current.sizing.riskRewardRatio).toBe(3);
    });

    it("should return 0 when no targets", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedTargets: [],
          }),
          enabled: true,
        })
      );

      expect(result.current.sizing.riskRewardRatio).toBe(0);
    });

    it("should use first target for R:R", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110, 120, 130], // Multiple targets
          }),
          enabled: true,
        })
      );

      // Uses first target (110): distance = 10, stop = 5, R:R = 2
      expect(result.current.sizing.riskRewardRatio).toBe(2);
    });
  });

  // ===========================================================================
  // Recommendation
  // ===========================================================================

  describe("recommendation", () => {
    it("should return excellent for R:R >= 3", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [115], // R:R = 3
          }),
          enabled: true,
        })
      );

      expect(result.current.sizing.recommendation).toBe("excellent");
    });

    it("should return good for R:R >= 2", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110], // R:R = 2
          }),
          enabled: true,
        })
      );

      expect(result.current.sizing.recommendation).toBe("good");
    });

    it("should return marginal for R:R >= 1.5", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [107.5], // R:R = 1.5
          }),
          enabled: true,
        })
      );

      expect(result.current.sizing.recommendation).toBe("marginal");
    });

    it("should return poor for R:R < 1.5", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [105], // R:R = 1
          }),
          enabled: true,
        })
      );

      expect(result.current.sizing.recommendation).toBe("poor");
    });
  });

  // ===========================================================================
  // Validity
  // ===========================================================================

  describe("validity", () => {
    it("should be valid when position size > 0 and R:R >= 1.5", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110], // R:R = 2
          }),
          enabled: true,
        })
      );

      expect(result.current.sizing.isValid).toBe(true);
    });

    it("should be invalid when position size is 0", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 100, // Same as entry
            suggestedTargets: [110],
          }),
          enabled: true,
        })
      );

      expect(result.current.sizing.isValid).toBe(false);
    });

    it("should be invalid when R:R < 1.5", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [105], // R:R = 1
          }),
          enabled: true,
        })
      );

      expect(result.current.sizing.isValid).toBe(false);
    });

    it("should be invalid when no targets", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [],
          }),
          enabled: true,
        })
      );

      expect(result.current.sizing.isValid).toBe(false);
    });
  });

  // ===========================================================================
  // Update Sizing
  // ===========================================================================

  describe("updateSizing", () => {
    it("should update account balance", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      act(() => {
        result.current.updateSizing({ accountBalance: 25000 });
      });

      expect(result.current.sizing.accountBalance).toBe(25000);
    });

    it("should update risk percentage", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      act(() => {
        result.current.updateSizing({ riskPercentage: 1 });
      });

      expect(result.current.sizing.riskPercentage).toBe(1);
    });

    it("should update entry price", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      act(() => {
        result.current.updateSizing({ entryPrice: 42200 });
      });

      expect(result.current.sizing.entryPrice).toBe(42200);
    });

    it("should update stop loss", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      act(() => {
        result.current.updateSizing({ stopLoss: 41700 });
      });

      expect(result.current.sizing.stopLoss).toBe(41700);
    });

    it("should update targets", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      act(() => {
        result.current.updateSizing({ targets: [43000, 43500] });
      });

      expect(result.current.sizing.targets).toEqual([43000, 43500]);
    });

    it("should recalculate position size when risk changes", () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
          }),
          enabled: true,
        })
      );

      const initialSize = result.current.sizing.positionSize;

      act(() => {
        result.current.updateSizing({ riskPercentage: 4 }); // Double the risk
      });

      expect(result.current.sizing.positionSize).toBe(initialSize * 2);
    });
  });

  // ===========================================================================
  // Trade Execution
  // ===========================================================================

  describe("execute", () => {
    it("should create journal entry on execute", async () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110],
          }),
          enabled: true,
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(mockCreateJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: "DJI",
          direction: "long",
          entry_price: 100,
          stop_loss: 95,
          targets: [110],
        })
      );
    });

    it("should include position size in journal entry", async () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110],
          }),
          enabled: true,
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(mockCreateJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          position_size: expect.any(Number),
        })
      );
    });

    it("should include timeframe in journal entry", async () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110],
          }),
          enabled: true,
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(mockCreateJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          timeframe: "4H",
        })
      );
    });

    it("should include notes with opportunity description", async () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110],
          }),
          enabled: true,
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(mockCreateJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: expect.stringContaining("Buy the pullback to Fib support"),
        })
      );
    });

    it("should return true on successful execution", async () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110],
          }),
          enabled: true,
        })
      );

      let success = false;
      await act(async () => {
        success = await result.current.execute();
      });

      expect(success).toBe(true);
    });

    it("should set isExecuting during execution", async () => {
      mockCreateJournalEntry.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: "1" }), 100))
      );

      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110],
          }),
          enabled: true,
        })
      );

      expect(result.current.isExecuting).toBe(false);

      act(() => {
        result.current.execute();
      });

      expect(result.current.isExecuting).toBe(true);

      await waitFor(() => {
        expect(result.current.isExecuting).toBe(false);
      });
    });
  });

  // ===========================================================================
  // Execution Errors
  // ===========================================================================

  describe("execution errors", () => {
    it("should not execute without opportunity", async () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: null,
          validation: createMockValidation(),
          enabled: true,
        })
      );

      let success = false;
      await act(async () => {
        success = await result.current.execute();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe("Invalid trade parameters");
      expect(mockCreateJournalEntry).not.toHaveBeenCalled();
    });

    it("should not execute with invalid sizing", async () => {
      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 100, // Invalid - same as entry
            suggestedTargets: [110],
          }),
          enabled: true,
        })
      );

      let success = false;
      await act(async () => {
        success = await result.current.execute();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe("Invalid trade parameters");
    });

    it("should handle API errors", async () => {
      mockCreateJournalEntry.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110],
          }),
          enabled: true,
        })
      );

      let success = false;
      await act(async () => {
        success = await result.current.execute();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe("Network error");
    });

    it("should handle non-Error exceptions", async () => {
      mockCreateJournalEntry.mockRejectedValue("Unknown error");

      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110],
          }),
          enabled: true,
        })
      );

      let success = false;
      await act(async () => {
        success = await result.current.execute();
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe("Failed to execute trade");
    });

    it("should clear error on new execution attempt", async () => {
      mockCreateJournalEntry.mockRejectedValueOnce(new Error("First error"));
      mockCreateJournalEntry.mockResolvedValueOnce({ id: "1" });

      const { result } = renderHook(() =>
        useTradeExecution({
          opportunity: mockOpportunity,
          validation: createMockValidation({
            suggestedEntry: 100,
            suggestedStop: 95,
            suggestedTargets: [110],
          }),
          enabled: true,
        })
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBe("First error");

      await act(async () => {
        await result.current.execute();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
