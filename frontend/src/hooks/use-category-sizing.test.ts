/**
 * Tests for useCategorySizing hook
 *
 * TDD: Tests define expected behavior for category-based position sizing.
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCategorySizing } from "./use-category-sizing";
import type { TradeCategory } from "@/types/workflow-v2";

describe("useCategorySizing", () => {
  // ===========================================================================
  // Risk Multipliers
  // ===========================================================================

  describe("risk multipliers", () => {
    it("should return 100% of base risk for with_trend", () => {
      const { result } = renderHook(() =>
        useCategorySizing("with_trend", 2)
      );

      expect(result.current.riskMultiplier).toBe(1.0);
      expect(result.current.adjustedRisk).toBe(2);
    });

    it("should return 50% of base risk for counter_trend", () => {
      const { result } = renderHook(() =>
        useCategorySizing("counter_trend", 2)
      );

      expect(result.current.riskMultiplier).toBe(0.5);
      expect(result.current.adjustedRisk).toBe(1);
    });

    it("should return 25% of base risk for reversal_attempt", () => {
      const { result } = renderHook(() =>
        useCategorySizing("reversal_attempt", 2)
      );

      expect(result.current.riskMultiplier).toBe(0.25);
      expect(result.current.adjustedRisk).toBe(0.5);
    });
  });

  // ===========================================================================
  // Adjusted Risk Calculation
  // ===========================================================================

  describe("adjusted risk calculation", () => {
    it("should calculate adjusted risk correctly for 1% base", () => {
      const { result } = renderHook(() =>
        useCategorySizing("counter_trend", 1)
      );

      expect(result.current.adjustedRisk).toBe(0.5);
    });

    it("should calculate adjusted risk correctly for 3% base", () => {
      const { result } = renderHook(() =>
        useCategorySizing("reversal_attempt", 3)
      );

      expect(result.current.adjustedRisk).toBe(0.75);
    });

    it("should handle 0 base risk", () => {
      const { result } = renderHook(() =>
        useCategorySizing("with_trend", 0)
      );

      expect(result.current.adjustedRisk).toBe(0);
    });
  });

  // ===========================================================================
  // Explanations
  // ===========================================================================

  describe("explanations", () => {
    it("should provide explanation for with_trend", () => {
      const { result } = renderHook(() =>
        useCategorySizing("with_trend", 2)
      );

      expect(result.current.explanation).toContain("higher timeframe trend");
    });

    it("should provide explanation for counter_trend", () => {
      const { result } = renderHook(() =>
        useCategorySizing("counter_trend", 2)
      );

      expect(result.current.explanation).toContain("against");
    });

    it("should provide explanation for reversal_attempt", () => {
      const { result } = renderHook(() =>
        useCategorySizing("reversal_attempt", 2)
      );

      expect(result.current.explanation).toContain("reversal");
    });
  });

  // ===========================================================================
  // All Categories
  // ===========================================================================

  describe("all categories", () => {
    const categories: TradeCategory[] = ["with_trend", "counter_trend", "reversal_attempt"];

    it.each(categories)("should handle %s category", (category) => {
      const { result } = renderHook(() =>
        useCategorySizing(category, 2)
      );

      expect(result.current.riskMultiplier).toBeGreaterThan(0);
      expect(result.current.riskMultiplier).toBeLessThanOrEqual(1);
      expect(result.current.adjustedRisk).toBeLessThanOrEqual(2);
      expect(result.current.explanation).toBeTruthy();
    });
  });

  // ===========================================================================
  // Updates on Input Changes
  // ===========================================================================

  describe("updates on input changes", () => {
    it("should update when category changes", () => {
      const { result, rerender } = renderHook(
        ({ category, base }: { category: TradeCategory; base: number }) =>
          useCategorySizing(category, base),
        { initialProps: { category: "with_trend" as TradeCategory, base: 2 } }
      );

      expect(result.current.adjustedRisk).toBe(2);

      rerender({ category: "counter_trend", base: 2 });

      expect(result.current.adjustedRisk).toBe(1);
    });

    it("should update when base risk changes", () => {
      const { result, rerender } = renderHook(
        ({ category, base }: { category: TradeCategory; base: number }) =>
          useCategorySizing(category, base),
        { initialProps: { category: "counter_trend" as TradeCategory, base: 2 } }
      );

      expect(result.current.adjustedRisk).toBe(1);

      rerender({ category: "counter_trend", base: 4 });

      expect(result.current.adjustedRisk).toBe(2);
    });
  });
});
