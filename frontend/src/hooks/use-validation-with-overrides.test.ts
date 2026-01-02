/**
 * Tests for useValidationWithOverrides hook
 *
 * TDD: Tests define expected behavior for validation with override support.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useValidationWithOverrides,
  type ValidationCheckWithOverride,
} from "./use-validation-with-overrides";
import type { ValidationResult, ValidationCheck } from "./use-trade-validation";
import type { CheckImportance } from "@/lib/educational/validation-explanations";

// Mock the useTradeValidation hook
vi.mock("./use-trade-validation", () => ({
  useTradeValidation: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
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

import { useTradeValidation } from "./use-trade-validation";
import type { TradeOpportunity } from "./use-trade-discovery";

// Mock opportunity
const mockOpportunity: TradeOpportunity = {
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

// Create mock checks
const createMockChecks = (): ValidationCheck[] => [
  {
    name: "Trend Alignment",
    passed: true,
    status: "passed",
    explanation: "Aligned for long",
  },
  {
    name: "Entry Zone",
    passed: true,
    status: "passed",
    explanation: "Found entry levels",
  },
  {
    name: "Target Zones",
    passed: false,
    status: "failed",
    explanation: "No targets found",
  },
  {
    name: "RSI Confirmation",
    passed: false,
    status: "failed",
    explanation: "RSI conflicts",
  },
  {
    name: "MACD Confirmation",
    passed: true,
    status: "passed",
    explanation: "MACD confirms",
  },
];

const createMockValidationResult = (
  checks: ValidationCheck[] = createMockChecks()
): ValidationResult => ({
  checks,
  passedCount: checks.filter((c) => c.passed).length,
  totalCount: checks.length,
  isValid: checks.filter((c) => c.passed).length >= 3,
  passPercentage: Math.round(
    (checks.filter((c) => c.passed).length / checks.length) * 100
  ),
  entryLevels: [],
  targetLevels: [],
  suggestedEntry: 42100,
  suggestedStop: 41800,
  suggestedTargets: [42700, 43000],
});

describe("useValidationWithOverrides", () => {
  const mockUseTradeValidation = useTradeValidation as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    localStorageMock.getItem.mockReturnValue(null);
    mockUseTradeValidation.mockImplementation(() => ({
      result: createMockValidationResult(),
      isLoading: false,
    }));
  });

  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("initial state", () => {
    it("should return enhanced checks with importance and override state", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      expect(result.current.checks).toHaveLength(5);
      expect(result.current.checks[0]).toHaveProperty("importance");
      expect(result.current.checks[0]).toHaveProperty("isOverridden");
      expect(result.current.checks[0]).toHaveProperty("canOverride");
    });

    it("should use default importance from validation-explanations", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      // Trend Alignment should be required by default
      const trendCheck = result.current.checks.find(
        (c) => c.name === "Trend Alignment"
      );
      expect(trendCheck?.importance).toBe("required");

      // RSI Confirmation should be warning by default
      const rsiCheck = result.current.checks.find(
        (c) => c.name === "RSI Confirmation"
      );
      expect(rsiCheck?.importance).toBe("warning");
    });

    it("should return loading state", () => {
      mockUseTradeValidation.mockReturnValue({
        result: createMockValidationResult(),
        isLoading: true,
      });

      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      expect(result.current.isLoading).toBe(true);
    });
  });

  // ===========================================================================
  // Check Importance
  // ===========================================================================

  describe("check importance", () => {
    it("should allow setting check importance", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      act(() => {
        result.current.setCheckImportance("RSI Confirmation", "ignored");
      });

      const rsiCheck = result.current.checks.find(
        (c) => c.name === "RSI Confirmation"
      );
      expect(rsiCheck?.importance).toBe("ignored");
    });

    it("should persist importance settings to localStorage", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      act(() => {
        result.current.setCheckImportance("MACD Confirmation", "ignored");
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it("should load importance settings from localStorage", () => {
      const savedSettings = {
        "RSI Confirmation": "ignored",
        "MACD Confirmation": "required",
      };
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(savedSettings));

      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      const rsiCheck = result.current.checks.find(
        (c) => c.name === "RSI Confirmation"
      );
      expect(rsiCheck?.importance).toBe("ignored");
    });
  });

  // ===========================================================================
  // Override Capability
  // ===========================================================================

  describe("override capability", () => {
    it("should mark warning checks as overrideable", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      const rsiCheck = result.current.checks.find(
        (c) => c.name === "RSI Confirmation"
      );
      expect(rsiCheck?.canOverride).toBe(true);
    });

    it("should not allow overriding required checks", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      const trendCheck = result.current.checks.find(
        (c) => c.name === "Trend Alignment"
      );
      expect(trendCheck?.canOverride).toBe(false);
    });

    it("should not allow overriding ignored checks", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      act(() => {
        result.current.setCheckImportance("RSI Confirmation", "ignored");
      });

      const rsiCheck = result.current.checks.find(
        (c) => c.name === "RSI Confirmation"
      );
      expect(rsiCheck?.canOverride).toBe(false);
    });

    it("should allow overriding failed warning checks", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      act(() => {
        result.current.overrideCheck("RSI Confirmation");
      });

      const rsiCheck = result.current.checks.find(
        (c) => c.name === "RSI Confirmation"
      );
      expect(rsiCheck?.isOverridden).toBe(true);
    });

    it("should not override passed checks", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      act(() => {
        result.current.overrideCheck("MACD Confirmation"); // This is passed
      });

      const macdCheck = result.current.checks.find(
        (c) => c.name === "MACD Confirmation"
      );
      expect(macdCheck?.isOverridden).toBe(false);
    });

    it("should allow removing override", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      act(() => {
        result.current.overrideCheck("RSI Confirmation");
      });

      act(() => {
        result.current.removeOverride("RSI Confirmation");
      });

      const rsiCheck = result.current.checks.find(
        (c) => c.name === "RSI Confirmation"
      );
      expect(rsiCheck?.isOverridden).toBe(false);
    });

    it("should clear all overrides", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      act(() => {
        result.current.overrideCheck("RSI Confirmation");
        result.current.overrideCheck("Target Zones");
      });

      act(() => {
        result.current.clearOverrides();
      });

      expect(result.current.overriddenChecks).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Effective Validation Result
  // ===========================================================================

  describe("effective validation", () => {
    it("should calculate effective pass rate with overrides", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      // Initial: 3/5 passed = 60%
      expect(result.current.effectivePassPercentage).toBe(60);

      act(() => {
        result.current.overrideCheck("RSI Confirmation");
      });

      // After override: 4/5 effectively passed = 80%
      expect(result.current.effectivePassPercentage).toBe(80);
    });

    it("should exclude ignored checks from effective count", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      act(() => {
        result.current.setCheckImportance("RSI Confirmation", "ignored");
        result.current.setCheckImportance("Target Zones", "ignored");
      });

      // Now only 3 checks matter: Trend (pass), Entry (pass), MACD (pass) = 3/3 = 100%
      expect(result.current.effectivePassPercentage).toBe(100);
    });

    it("should be valid when effective pass rate >= 60% with overrides", () => {
      // Required checks pass, warning checks fail - can override to become valid
      mockUseTradeValidation.mockReturnValue({
        result: createMockValidationResult([
          { name: "Trend Alignment", passed: true, status: "passed", explanation: "" },
          { name: "Entry Zone", passed: true, status: "passed", explanation: "" },
          { name: "Target Zones", passed: false, status: "failed", explanation: "" },
          { name: "RSI Confirmation", passed: false, status: "failed", explanation: "" },
          { name: "MACD Confirmation", passed: false, status: "failed", explanation: "" },
        ]),
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      // 2/5 = 40%, not valid
      expect(result.current.isEffectivelyValid).toBe(false);

      act(() => {
        // Override the warning checks (Target Zones and RSI)
        result.current.overrideCheck("Target Zones");
        result.current.overrideCheck("RSI Confirmation");
      });

      // After overrides: 2 required pass + 2 warnings overridden = 4/5 = 80%, valid
      expect(result.current.isEffectivelyValid).toBe(true);
    });

    it("should not be valid if required checks fail", () => {
      mockUseTradeValidation.mockReturnValue({
        result: createMockValidationResult([
          { name: "Trend Alignment", passed: false, status: "failed", explanation: "" },
          { name: "Entry Zone", passed: true, status: "passed", explanation: "" },
          { name: "Target Zones", passed: true, status: "passed", explanation: "" },
          { name: "RSI Confirmation", passed: true, status: "passed", explanation: "" },
          { name: "MACD Confirmation", passed: true, status: "passed", explanation: "" },
        ]),
        isLoading: false,
      });

      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      // Even with 4/5 passed, Trend Alignment is required and failed
      expect(result.current.isEffectivelyValid).toBe(false);
      expect(result.current.failedRequiredChecks).toContain("Trend Alignment");
    });
  });

  // ===========================================================================
  // Override Logging
  // ===========================================================================

  describe("override logging", () => {
    it("should track override reasons", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      act(() => {
        result.current.overrideCheck("RSI Confirmation", "RSI is near reversal");
      });

      expect(result.current.overrideLog).toContainEqual(
        expect.objectContaining({
          checkName: "RSI Confirmation",
          reason: "RSI is near reversal",
        })
      );
    });

    it("should include timestamp in override log", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      act(() => {
        result.current.overrideCheck("RSI Confirmation");
      });

      expect(result.current.overrideLog[0]).toHaveProperty("timestamp");
    });

    it("should export override log for journaling", () => {
      const { result } = renderHook(() =>
        useValidationWithOverrides({
          opportunity: mockOpportunity,
          enabled: true,
        })
      );

      act(() => {
        result.current.overrideCheck("RSI Confirmation", "Near support");
        result.current.overrideCheck("Target Zones", "Using swing high as target");
      });

      const exportedLog = result.current.getOverrideLogForJournal();
      expect(exportedLog).toHaveLength(2);
      expect(exportedLog[0]).toHaveProperty("checkName");
      expect(exportedLog[0]).toHaveProperty("reason");
    });
  });

  // ===========================================================================
  // Reset on Opportunity Change
  // ===========================================================================

  describe("reset on opportunity change", () => {
    it("should clear overrides when opportunity changes", () => {
      const { result, rerender } = renderHook(
        ({ opp }) =>
          useValidationWithOverrides({
            opportunity: opp,
            enabled: true,
          }),
        { initialProps: { opp: mockOpportunity } }
      );

      act(() => {
        result.current.overrideCheck("RSI Confirmation");
      });

      expect(result.current.overriddenChecks).toHaveLength(1);

      const newOpportunity = { ...mockOpportunity, id: "new-opp" };
      rerender({ opp: newOpportunity });

      expect(result.current.overriddenChecks).toHaveLength(0);
    });
  });
});
