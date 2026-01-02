/**
 * Tests for useTradeManagement hook
 *
 * TDD: Tests define expected behavior for trade management.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useTradeManagement,
  type TradeStatus,
  type TradeLogEntry,
} from "./use-trade-management";
import type { TradeOpportunity } from "./use-trade-discovery";
import type { SizingData } from "./use-trade-execution";

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

// Mock sizing data
const createMockSizing = (overrides: Partial<SizingData> = {}): SizingData => ({
  accountBalance: 10000,
  riskPercentage: 2,
  entryPrice: 100,
  stopLoss: 95,
  targets: [110, 120],
  positionSize: 40,
  riskAmount: 200,
  riskRewardRatio: 2,
  stopDistance: 5,
  recommendation: "good",
  isValid: true,
  ...overrides,
});

describe("useTradeManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("initial state", () => {
    it("should start with pending status", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      expect(result.current.status).toBe("pending");
    });

    it("should have zero P&L initially", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      expect(result.current.currentPnL).toBe(0);
    });

    it("should have empty trade log initially", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      expect(result.current.tradeLog).toHaveLength(0);
    });

    it("should not have free trade active initially", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      expect(result.current.freeTradeActive).toBe(false);
    });

    it("should not have trailing stop enabled initially", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      expect(result.current.trailingEnabled).toBe(false);
    });

    it("should use entry price as current price initially", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({ entryPrice: 100 }),
        })
      );

      expect(result.current.currentPrice).toBe(100);
    });
  });

  // ===========================================================================
  // Trade Activation
  // ===========================================================================

  describe("activateTrade", () => {
    it("should change status to active", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
      });

      expect(result.current.status).toBe("active");
    });

    it("should add entry log", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
      });

      expect(result.current.tradeLog).toHaveLength(1);
      expect(result.current.tradeLog[0].action).toBe("entry");
    });

    it("should not activate if already active", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.activateTrade();
      });

      expect(result.current.tradeLog).toHaveLength(1);
    });
  });

  // ===========================================================================
  // Price Updates
  // ===========================================================================

  describe("updateCurrentPrice", () => {
    it("should update current price", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({ entryPrice: 100 }),
        })
      );

      act(() => {
        result.current.updateCurrentPrice(105);
      });

      expect(result.current.currentPrice).toBe(105);
    });

    it("should calculate P&L for long position", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({ entryPrice: 100, positionSize: 10 }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(105);
      });

      // P&L = (105 - 100) * 10 = 50
      expect(result.current.currentPnL).toBe(50);
    });

    it("should calculate P&L for short position", () => {
      const shortOpportunity = { ...mockOpportunity, direction: "short" as const };
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: shortOpportunity,
          sizing: createMockSizing({ entryPrice: 100, positionSize: 10 }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(95);
      });

      // P&L = (100 - 95) * 10 = 50
      expect(result.current.currentPnL).toBe(50);
    });

    it("should show negative P&L when losing", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({ entryPrice: 100, positionSize: 10 }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(95);
      });

      // P&L = (95 - 100) * 10 = -50
      expect(result.current.currentPnL).toBe(-50);
    });

    it("should not calculate P&L when pending", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({ entryPrice: 100, positionSize: 10 }),
        })
      );

      act(() => {
        result.current.updateCurrentPrice(105);
      });

      expect(result.current.currentPnL).toBe(0);
    });
  });

  // ===========================================================================
  // Move to Breakeven
  // ===========================================================================

  describe("moveToBreakeven", () => {
    it("should set free trade active", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.moveToBreakeven();
      });

      expect(result.current.freeTradeActive).toBe(true);
    });

    it("should change status to at_breakeven", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.moveToBreakeven();
      });

      expect(result.current.status).toBe("at_breakeven");
    });

    it("should add log entry", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.moveToBreakeven();
      });

      const breakevenEntry = result.current.tradeLog.find(
        (e) => e.note.includes("breakeven")
      );
      expect(breakevenEntry).toBeDefined();
    });

    it("should not work when pending", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.moveToBreakeven();
      });

      expect(result.current.freeTradeActive).toBe(false);
    });
  });

  // ===========================================================================
  // Trailing Stop
  // ===========================================================================

  describe("enableTrailingStop", () => {
    it("should enable trailing", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.enableTrailingStop();
      });

      expect(result.current.trailingEnabled).toBe(true);
    });

    it("should change status to trailing", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.enableTrailingStop();
      });

      expect(result.current.status).toBe("trailing");
    });

    it("should set trailing stop price", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({ entryPrice: 100, stopLoss: 95 }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(110);
        result.current.enableTrailingStop();
      });

      expect(result.current.trailingStopPrice).toBeGreaterThan(95);
    });

    it("should add log entry", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.enableTrailingStop();
      });

      const trailingEntry = result.current.tradeLog.find(
        (e) => e.note.includes("trailing") || e.note.includes("Trailing")
      );
      expect(trailingEntry).toBeDefined();
    });
  });

  // ===========================================================================
  // Close Trade
  // ===========================================================================

  describe("closeTrade", () => {
    it("should change status to closed", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.closeTrade("Manual exit");
      });

      expect(result.current.status).toBe("closed");
    });

    it("should add exit log entry", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.closeTrade("Taking profit");
      });

      const exitEntry = result.current.tradeLog.find((e) => e.action === "exit");
      expect(exitEntry).toBeDefined();
      expect(exitEntry?.note).toContain("Taking profit");
    });

    it("should preserve final P&L", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({ entryPrice: 100, positionSize: 10 }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(110);
        result.current.closeTrade("Taking profit");
      });

      expect(result.current.currentPnL).toBe(100);
    });

    it("should not close when pending", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.closeTrade("Test");
      });

      expect(result.current.status).toBe("pending");
    });
  });

  // ===========================================================================
  // Add Note
  // ===========================================================================

  describe("addNote", () => {
    it("should add note to trade log", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.addNote("Price action looks strong");
      });

      const noteEntry = result.current.tradeLog.find(
        (e) => e.note === "Price action looks strong"
      );
      expect(noteEntry).toBeDefined();
    });

    it("should include timestamp", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.addNote("Test note");
      });

      expect(result.current.tradeLog[1].timestamp).toBeDefined();
    });

    it("should not add empty notes", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing(),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.addNote("");
        result.current.addNote("   ");
      });

      expect(result.current.tradeLog).toHaveLength(1); // Only the entry log
    });
  });

  // ===========================================================================
  // Calculated Values
  // ===========================================================================

  describe("calculated values", () => {
    it("should calculate R-multiple", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({
            entryPrice: 100,
            stopLoss: 95,
            positionSize: 10,
          }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(110);
      });

      // Risk per unit = 5, P&L per unit = 10
      // R-Multiple = 10 / 5 = 2
      expect(result.current.rMultiple).toBe(2);
    });

    it("should calculate P&L percentage", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({
            entryPrice: 100,
            positionSize: 10,
          }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(110);
      });

      // P&L = 100, Entry value = 1000
      // Percentage = 10%
      expect(result.current.pnlPercent).toBe(10);
    });

    it("should return effective stop price", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({
            entryPrice: 100,
            stopLoss: 95,
          }),
        })
      );

      expect(result.current.effectiveStopPrice).toBe(95);

      act(() => {
        result.current.activateTrade();
        result.current.moveToBreakeven();
      });

      // After breakeven, stop is at entry
      expect(result.current.effectiveStopPrice).toBe(100);
    });
  });

  // ===========================================================================
  // Target Hit Detection
  // ===========================================================================

  describe("target detection", () => {
    it("should detect target hit for long", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({
            entryPrice: 100,
            targets: [110, 120],
          }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(110);
      });

      const targetEntry = result.current.tradeLog.find(
        (e) => e.action === "target_hit"
      );
      expect(targetEntry).toBeDefined();
    });

    it("should detect target hit for short", () => {
      const shortOpportunity = { ...mockOpportunity, direction: "short" as const };
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: shortOpportunity,
          sizing: createMockSizing({
            entryPrice: 100,
            targets: [90, 80],
          }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(90);
      });

      const targetEntry = result.current.tradeLog.find(
        (e) => e.action === "target_hit"
      );
      expect(targetEntry).toBeDefined();
    });
  });

  // ===========================================================================
  // Stop Hit Detection
  // ===========================================================================

  describe("stop detection", () => {
    it("should detect stop hit for long", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({
            entryPrice: 100,
            stopLoss: 95,
          }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(95);
      });

      expect(result.current.status).toBe("closed");
      const exitEntry = result.current.tradeLog.find(
        (e) => e.note.includes("Stop")
      );
      expect(exitEntry).toBeDefined();
    });

    it("should detect stop hit for short", () => {
      const shortOpportunity = { ...mockOpportunity, direction: "short" as const };
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: shortOpportunity,
          sizing: createMockSizing({
            entryPrice: 100,
            stopLoss: 105,
          }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(105);
      });

      expect(result.current.status).toBe("closed");
    });

    it("should use breakeven price when active", () => {
      const { result } = renderHook(() =>
        useTradeManagement({
          opportunity: mockOpportunity,
          sizing: createMockSizing({
            entryPrice: 100,
            stopLoss: 95,
          }),
        })
      );

      act(() => {
        result.current.activateTrade();
        result.current.updateCurrentPrice(110);
        result.current.moveToBreakeven();
        result.current.updateCurrentPrice(100);
      });

      // Should be closed at breakeven
      expect(result.current.status).toBe("closed");
    });
  });
});
