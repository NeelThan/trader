/**
 * Tests for useWorkflowV2State hook
 *
 * Tests workflow state persistence and phase transitions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWorkflowV2State } from "./use-workflow-v2-state";
import type { TradeOpportunity } from "./use-trade-discovery";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

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

describe("useWorkflowV2State", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("initial state", () => {
    it("should start with default values", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      // Wait for restoration to complete
      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      expect(result.current.symbol).toBe("DJI");
      expect(result.current.timeframe).toBe("1D");
      expect(result.current.phase).toBe("discover");
      expect(result.current.opportunity).toBeNull();
      expect(result.current.journalEntryId).toBeNull();
      expect(result.current.accountSettings).toEqual({
        accountBalance: 10000,
        riskPercentage: 2,
      });
      expect(result.current.sizingOverrides).toEqual({});
    });

    it("should restore persisted state on mount", async () => {
      const persistedState = {
        symbol: "SPX",
        timeframe: "4H",
        phase: "validate",
        opportunity: mockOpportunity,
        journalEntryId: null,
        accountSettings: {
          accountBalance: 25000,
          riskPercentage: 1.5,
        },
        sizingOverrides: { entryPrice: 100 },
        timestamp: Date.now(),
      };

      localStorageMock.setItem("workflow-v2-state", JSON.stringify(persistedState));

      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      expect(result.current.symbol).toBe("SPX");
      expect(result.current.timeframe).toBe("4H");
      expect(result.current.phase).toBe("validate");
      expect(result.current.opportunity).toEqual(mockOpportunity);
      expect(result.current.accountSettings.accountBalance).toBe(25000);
      expect(result.current.hasPersistedState).toBe(true);
    });

    it("should ignore expired persisted state", async () => {
      const expiredState = {
        symbol: "SPX",
        timeframe: "4H",
        phase: "validate",
        opportunity: mockOpportunity,
        journalEntryId: null,
        accountSettings: {
          accountBalance: 25000,
          riskPercentage: 1.5,
        },
        sizingOverrides: {},
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };

      localStorageMock.setItem("workflow-v2-state", JSON.stringify(expiredState));

      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      // Should use defaults because state expired
      expect(result.current.symbol).toBe("DJI");
      expect(result.current.phase).toBe("discover");
      expect(result.current.hasPersistedState).toBe(false);
    });
  });

  // ===========================================================================
  // State Setters
  // ===========================================================================

  describe("state setters", () => {
    it("should update symbol", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      act(() => {
        result.current.setSymbol("SPX");
      });

      expect(result.current.symbol).toBe("SPX");
    });

    it("should update timeframe", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      act(() => {
        result.current.setTimeframe("4H");
      });

      expect(result.current.timeframe).toBe("4H");
    });

    it("should update account settings", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      act(() => {
        result.current.setAccountSettings({
          accountBalance: 50000,
          riskPercentage: 1,
        });
      });

      expect(result.current.accountSettings).toEqual({
        accountBalance: 50000,
        riskPercentage: 1,
      });
    });

    it("should merge sizing overrides", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      act(() => {
        result.current.setSizingOverrides({ entryPrice: 100 });
      });

      expect(result.current.sizingOverrides.entryPrice).toBe(100);

      act(() => {
        result.current.setSizingOverrides({ stopLoss: 95 });
      });

      // Both should be present
      expect(result.current.sizingOverrides.entryPrice).toBe(100);
      expect(result.current.sizingOverrides.stopLoss).toBe(95);
    });
  });

  // ===========================================================================
  // Workflow Actions
  // ===========================================================================

  describe("workflow actions", () => {
    it("selectOpportunity should transition to validate phase", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      act(() => {
        result.current.selectOpportunity(mockOpportunity);
      });

      expect(result.current.phase).toBe("validate");
      expect(result.current.opportunity).toEqual(mockOpportunity);
      expect(result.current.sizingOverrides).toEqual({});
    });

    it("backToDiscovery should clear opportunity and return to discover", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      // First select an opportunity
      act(() => {
        result.current.selectOpportunity(mockOpportunity);
      });

      expect(result.current.phase).toBe("validate");

      // Then go back
      act(() => {
        result.current.backToDiscovery();
      });

      expect(result.current.phase).toBe("discover");
      expect(result.current.opportunity).toBeNull();
      expect(result.current.sizingOverrides).toEqual({});
    });

    it("proceedToSize should transition to size phase", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      act(() => {
        result.current.selectOpportunity(mockOpportunity);
        result.current.proceedToSize();
      });

      expect(result.current.phase).toBe("size");
    });

    it("proceedToExecute should transition to execute phase", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      act(() => {
        result.current.selectOpportunity(mockOpportunity);
        result.current.proceedToSize();
        result.current.proceedToExecute();
      });

      expect(result.current.phase).toBe("execute");
    });

    it("startManaging should transition to manage phase with journal ID", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      act(() => {
        result.current.selectOpportunity(mockOpportunity);
        result.current.proceedToSize();
        result.current.proceedToExecute();
        result.current.startManaging("journal-123");
      });

      expect(result.current.phase).toBe("manage");
      expect(result.current.journalEntryId).toBe("journal-123");
    });

    it("finishManaging should reset to discover phase", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      act(() => {
        result.current.selectOpportunity(mockOpportunity);
        result.current.proceedToSize();
        result.current.proceedToExecute();
        result.current.startManaging("journal-123");
        result.current.finishManaging();
      });

      expect(result.current.phase).toBe("discover");
      expect(result.current.opportunity).toBeNull();
      expect(result.current.journalEntryId).toBeNull();
    });
  });

  // ===========================================================================
  // Reset
  // ===========================================================================

  describe("reset workflow", () => {
    it("should clear all state and remove from localStorage", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      // Set up some state
      act(() => {
        result.current.setSymbol("SPX");
        result.current.selectOpportunity(mockOpportunity);
        result.current.setAccountSettings({ accountBalance: 50000 });
      });

      expect(result.current.symbol).toBe("SPX");
      expect(result.current.opportunity).not.toBeNull();

      // Reset
      act(() => {
        result.current.resetWorkflow();
      });

      expect(result.current.symbol).toBe("DJI");
      expect(result.current.phase).toBe("discover");
      expect(result.current.opportunity).toBeNull();
      expect(result.current.accountSettings.accountBalance).toBe(10000);
      expect(result.current.hasPersistedState).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("workflow-v2-state");
    });
  });

  // ===========================================================================
  // Persistence
  // ===========================================================================

  describe("persistence", () => {
    it("should save state to localStorage after changes", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      act(() => {
        result.current.setSymbol("NDX");
      });

      // Check that localStorage.setItem was called
      expect(localStorageMock.setItem).toHaveBeenCalled();

      // Get the last call
      const lastCall = localStorageMock.setItem.mock.calls.slice(-1)[0];
      expect(lastCall[0]).toBe("workflow-v2-state");

      const savedState = JSON.parse(lastCall[1]);
      expect(savedState.symbol).toBe("NDX");
    });

    it("should save after restore completes", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      // Wait for restore to complete
      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      // Clear the mock to check only new calls
      localStorageMock.setItem.mockClear();

      act(() => {
        result.current.setSymbol("GOLD");
      });

      // Should save after changes when not restoring
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const lastCall = localStorageMock.setItem.mock.calls.slice(-1)[0];
      const savedState = JSON.parse(lastCall[1]);
      expect(savedState.symbol).toBe("GOLD");
    });
  });

  // ===========================================================================
  // Full Workflow Cycle
  // ===========================================================================

  describe("complete workflow cycle", () => {
    it("should complete a full discover -> manage -> finish cycle", async () => {
      const { result } = renderHook(() => useWorkflowV2State());

      await waitFor(() => {
        expect(result.current.isRestoring).toBe(false);
      });

      // Start in discover
      expect(result.current.phase).toBe("discover");

      // Select opportunity -> validate
      act(() => {
        result.current.selectOpportunity(mockOpportunity);
      });
      expect(result.current.phase).toBe("validate");
      expect(result.current.opportunity).toEqual(mockOpportunity);

      // Proceed to size
      act(() => {
        result.current.proceedToSize();
      });
      expect(result.current.phase).toBe("size");

      // Set sizing overrides
      act(() => {
        result.current.setSizingOverrides({ entryPrice: 100, stopLoss: 95 });
      });
      expect(result.current.sizingOverrides).toEqual({ entryPrice: 100, stopLoss: 95 });

      // Proceed to execute
      act(() => {
        result.current.proceedToExecute();
      });
      expect(result.current.phase).toBe("execute");

      // Start managing with journal entry
      act(() => {
        result.current.startManaging("journal-456");
      });
      expect(result.current.phase).toBe("manage");
      expect(result.current.journalEntryId).toBe("journal-456");

      // Finish managing
      act(() => {
        result.current.finishManaging();
      });
      expect(result.current.phase).toBe("discover");
      expect(result.current.opportunity).toBeNull();
      expect(result.current.journalEntryId).toBeNull();
      expect(result.current.sizingOverrides).toEqual({});
    });
  });
});
