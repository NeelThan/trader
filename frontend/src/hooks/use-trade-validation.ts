/**
 * Trade Validation Hook
 *
 * Validates a selected trade opportunity against system criteria.
 * Checks trend alignment, Fibonacci levels, and indicator confirmation.
 */

import { useMemo } from "react";
import { useMultiTFLevels } from "./use-multi-tf-levels";
import type { TradeOpportunity } from "./use-trade-discovery";
import {
  type StrategyLevel,
  createDefaultVisibilityConfig,
  ALL_TIMEFRAMES,
} from "@/lib/chart-pro/strategy-types";

/**
 * Single validation check result
 */
export type ValidationCheck = {
  /** Check name */
  name: string;
  /** Whether check passed */
  passed: boolean;
  /** Status: passed, failed, pending */
  status: "passed" | "failed" | "pending";
  /** Explanation of result */
  explanation: string;
  /** Additional details */
  details?: string;
};

/**
 * Complete validation result
 */
export type ValidationResult = {
  /** All checks performed */
  checks: ValidationCheck[];
  /** Number of passed checks */
  passedCount: number;
  /** Total number of checks */
  totalCount: number;
  /** Overall pass/fail */
  isValid: boolean;
  /** Pass percentage */
  passPercentage: number;
  /** Entry Fibonacci levels */
  entryLevels: StrategyLevel[];
  /** Target Fibonacci levels */
  targetLevels: StrategyLevel[];
  /** Suggested entry price */
  suggestedEntry: number | null;
  /** Suggested stop loss */
  suggestedStop: number | null;
  /** Suggested targets */
  suggestedTargets: number[];
};

export type UseTradeValidationOptions = {
  opportunity: TradeOpportunity | null;
  enabled: boolean;
};

export type UseTradeValidationResult = {
  result: ValidationResult;
  isLoading: boolean;
};

/**
 * Create a validation check
 */
function createCheck(
  name: string,
  passed: boolean,
  explanation: string,
  details?: string
): ValidationCheck {
  return {
    name,
    passed,
    status: passed ? "passed" : "failed",
    explanation,
    details,
  };
}

/**
 * Get entry levels for the opportunity
 */
function getEntryLevels(
  levels: StrategyLevel[],
  opportunity: TradeOpportunity
): StrategyLevel[] {
  return levels.filter(
    (level) =>
      level.timeframe === opportunity.lowerTimeframe &&
      level.strategy === "RETRACEMENT" &&
      level.direction === opportunity.direction
  );
}

/**
 * Get target levels for the opportunity
 */
function getTargetLevels(
  levels: StrategyLevel[],
  opportunity: TradeOpportunity
): StrategyLevel[] {
  return levels.filter(
    (level) =>
      level.timeframe === opportunity.higherTimeframe &&
      level.strategy === "EXTENSION" &&
      level.direction === opportunity.direction
  );
}

/**
 * Hook to validate a trade opportunity
 */
export function useTradeValidation({
  opportunity,
  enabled,
}: UseTradeValidationOptions): UseTradeValidationResult {
  // Fetch Fibonacci levels for the opportunity's timeframes
  const { allLevels, isLoading: isLoadingLevels } = useMultiTFLevels({
    symbol: opportunity?.symbol ?? "DJI",
    visibilityConfig: createDefaultVisibilityConfig(ALL_TIMEFRAMES),
    enabled: enabled && opportunity !== null,
  });

  // Build validation result
  const result = useMemo((): ValidationResult => {
    if (!opportunity) {
      return {
        checks: [],
        passedCount: 0,
        totalCount: 0,
        isValid: false,
        passPercentage: 0,
        entryLevels: [],
        targetLevels: [],
        suggestedEntry: null,
        suggestedStop: null,
        suggestedTargets: [],
      };
    }

    const checks: ValidationCheck[] = [];

    // 1. Trend Alignment Check
    const trendAligned = opportunity.isActive && opportunity.confidence >= 60;
    checks.push(
      createCheck(
        "Trend Alignment",
        trendAligned,
        trendAligned
          ? `${opportunity.higherTimeframe} and ${opportunity.lowerTimeframe} are aligned for ${opportunity.direction}`
          : "Timeframes not aligned for this trade",
        `Confidence: ${opportunity.confidence}%`
      )
    );

    // 2. Entry Zone Check
    const entryLevels = getEntryLevels(allLevels, opportunity);
    const hasEntryZone = entryLevels.length > 0;
    checks.push(
      createCheck(
        "Entry Zone",
        hasEntryZone,
        hasEntryZone
          ? `Found ${entryLevels.length} Fibonacci entry levels`
          : "No Fibonacci entry zones found",
        hasEntryZone
          ? `Best: ${entryLevels[0]?.label} at ${entryLevels[0]?.price.toFixed(2)}`
          : undefined
      )
    );

    // 3. Target Zone Check
    const targetLevels = getTargetLevels(allLevels, opportunity);
    const hasTargets = targetLevels.length > 0;
    checks.push(
      createCheck(
        "Target Zones",
        hasTargets,
        hasTargets
          ? `Found ${targetLevels.length} extension targets`
          : "No extension targets found",
        hasTargets
          ? `First: ${targetLevels[0]?.label} at ${targetLevels[0]?.price.toFixed(2)}`
          : undefined
      )
    );

    // 4. RSI Confirmation
    const rsiSignal = opportunity.lowerTrend?.rsi.signal;
    const rsiConfirmed =
      (opportunity.direction === "long" && rsiSignal === "bullish") ||
      (opportunity.direction === "short" && rsiSignal === "bearish") ||
      rsiSignal === "neutral";
    checks.push(
      createCheck(
        "RSI Confirmation",
        rsiConfirmed,
        rsiConfirmed
          ? `RSI ${rsiSignal} on ${opportunity.lowerTimeframe}`
          : `RSI ${rsiSignal} conflicts with ${opportunity.direction} bias`,
        opportunity.lowerTrend?.rsi.value
          ? `RSI: ${opportunity.lowerTrend.rsi.value.toFixed(1)}`
          : undefined
      )
    );

    // 5. MACD Confirmation
    const macdSignal = opportunity.lowerTrend?.macd.signal;
    const macdConfirmed =
      (opportunity.direction === "long" && macdSignal === "bullish") ||
      (opportunity.direction === "short" && macdSignal === "bearish");
    checks.push(
      createCheck(
        "MACD Confirmation",
        macdConfirmed,
        macdConfirmed
          ? `MACD ${macdSignal} confirms ${opportunity.direction} momentum`
          : `MACD ${macdSignal} - momentum not confirmed`,
        undefined
      )
    );

    // Calculate summary
    const passedCount = checks.filter((c) => c.passed).length;
    const totalCount = checks.length;
    const passPercentage = Math.round((passedCount / totalCount) * 100);
    const isValid = passPercentage >= 60; // At least 3 of 5 checks

    // Calculate suggested prices
    const suggestedEntry = entryLevels[0]?.price ?? null;
    const suggestedStop = opportunity.direction === "long"
      ? entryLevels[entryLevels.length - 1]?.price ?? null
      : entryLevels[0]?.price ?? null;
    const suggestedTargets = targetLevels.slice(0, 3).map((l) => l.price);

    return {
      checks,
      passedCount,
      totalCount,
      isValid,
      passPercentage,
      entryLevels,
      targetLevels,
      suggestedEntry,
      suggestedStop,
      suggestedTargets,
    };
  }, [opportunity, allLevels]);

  return {
    result,
    isLoading: isLoadingLevels,
  };
}
