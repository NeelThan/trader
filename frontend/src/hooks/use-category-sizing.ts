/**
 * Category-Based Position Sizing Hook
 *
 * Adjusts risk percentage based on trade category:
 * - WITH_TREND: 100% of base risk (trading with higher TF)
 * - COUNTER_TREND: 50% of base risk (against higher TF at major confluence)
 * - REVERSAL_ATTEMPT: 25% of base risk (speculative against trend)
 */

import { useMemo } from "react";
import {
  type TradeCategory,
  TRADE_CATEGORY_RISK,
  TRADE_CATEGORY_EXPLANATIONS,
} from "@/types/workflow-v2";

export type UseCategorySizingResult = {
  /** Risk percentage after category adjustment */
  adjustedRisk: number;
  /** Risk multiplier for this category (0.25 - 1.0) */
  riskMultiplier: number;
  /** Human-readable explanation of the adjustment */
  explanation: string;
};

/**
 * Hook to calculate category-adjusted risk percentage.
 *
 * @param category - The trade category (with_trend, counter_trend, reversal_attempt)
 * @param baseRiskPercentage - The base risk percentage (e.g., 2 for 2%)
 * @returns Object with adjustedRisk, riskMultiplier, and explanation
 */
export function useCategorySizing(
  category: TradeCategory,
  baseRiskPercentage: number
): UseCategorySizingResult {
  return useMemo(() => {
    const riskMultiplier = TRADE_CATEGORY_RISK[category];
    const adjustedRisk = baseRiskPercentage * riskMultiplier;
    const explanation = TRADE_CATEGORY_EXPLANATIONS[category];

    return {
      adjustedRisk,
      riskMultiplier,
      explanation,
    };
  }, [category, baseRiskPercentage]);
}
