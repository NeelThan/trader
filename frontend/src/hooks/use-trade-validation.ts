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
  type VisibilityConfig,
  FIBONACCI_RATIOS,
} from "@/lib/chart-pro/strategy-types";
import type { Timeframe } from "@/lib/chart-constants";

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
 * Create visibility config for validation
 *
 * Enables only the timeframes, strategies, and directions needed for validation:
 * - Entry: Lower TF RETRACEMENT in trade direction
 * - Targets: Higher TF EXTENSION in trade direction
 */
function createValidationVisibilityConfig(
  opportunity: TradeOpportunity
): VisibilityConfig {
  const timeframes: Timeframe[] = [
    opportunity.higherTimeframe,
    opportunity.lowerTimeframe,
  ];
  const direction = opportunity.direction;

  return {
    timeframes: timeframes.map((tf) => ({
      timeframe: tf,
      enabled: true,
      strategies: [
        {
          strategy: "RETRACEMENT" as const,
          long: {
            // Enable long retracement on lower TF for long entries
            enabled:
              tf === opportunity.lowerTimeframe && direction === "long",
            ratios: FIBONACCI_RATIOS.RETRACEMENT.map((ratio) => ({
              ratio,
              visible: true,
            })),
          },
          short: {
            // Enable short retracement on lower TF for short entries
            enabled:
              tf === opportunity.lowerTimeframe && direction === "short",
            ratios: FIBONACCI_RATIOS.RETRACEMENT.map((ratio) => ({
              ratio,
              visible: true,
            })),
          },
        },
        {
          strategy: "EXTENSION" as const,
          long: {
            // Enable long extension on higher TF for long targets
            enabled:
              tf === opportunity.higherTimeframe && direction === "long",
            ratios: FIBONACCI_RATIOS.EXTENSION.map((ratio) => ({
              ratio,
              visible: true,
            })),
          },
          short: {
            // Enable short extension on higher TF for short targets
            enabled:
              tf === opportunity.higherTimeframe && direction === "short",
            ratios: FIBONACCI_RATIOS.EXTENSION.map((ratio) => ({
              ratio,
              visible: true,
            })),
          },
        },
      ],
    })),
  };
}

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
  // Create visibility config for this specific opportunity
  const visibilityConfig = useMemo((): VisibilityConfig => {
    if (!opportunity) {
      // Return empty config when no opportunity
      return { timeframes: [] };
    }
    return createValidationVisibilityConfig(opportunity);
  }, [opportunity]);

  // Fetch Fibonacci levels for the opportunity's timeframes
  const { allLevels, isLoading: isLoadingLevels } = useMultiTFLevels({
    symbol: opportunity?.symbol ?? "DJI",
    visibilityConfig,
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

    // 4. RSI Confirmation (Pullback Logic)
    // For pullback entries, we WANT the lower TF to show counter-trend:
    // - LONG (buy the dip): Lower TF RSI bearish/oversold = GOOD pullback
    // - SHORT (sell the rally): Lower TF RSI bullish/overbought = GOOD rally
    const rsiSignal = opportunity.lowerTrend?.rsi.signal;
    const rsiValue = opportunity.lowerTrend?.rsi.value;
    const higherTrend = opportunity.higherTrend?.trend;
    const lowerTrend = opportunity.lowerTrend?.trend;

    // Check if this is a pullback setup (higher TF trending, lower TF counter-trend)
    const isPullbackSetup =
      (opportunity.direction === "long" && higherTrend === "bullish" && lowerTrend === "bearish") ||
      (opportunity.direction === "short" && higherTrend === "bearish" && lowerTrend === "bullish");

    let rsiConfirmed: boolean;
    let rsiExplanation: string;

    if (isPullbackSetup) {
      // For pullbacks, counter-trend RSI is expected and good
      const isOversold = rsiValue !== undefined && rsiValue < 40;
      const isOverbought = rsiValue !== undefined && rsiValue > 60;

      if (opportunity.direction === "long") {
        // For long pullback, RSI bearish/oversold means good entry opportunity
        rsiConfirmed = rsiSignal === "bearish" || isOversold;
        rsiExplanation = rsiConfirmed
          ? `RSI ${rsiValue?.toFixed(1) ?? ""}${isOversold ? " (oversold)" : ""} - pullback entry opportunity`
          : `RSI neutral - wait for deeper pullback`;
      } else {
        // For short pullback, RSI bullish/overbought means good entry opportunity
        rsiConfirmed = rsiSignal === "bullish" || isOverbought;
        rsiExplanation = rsiConfirmed
          ? `RSI ${rsiValue?.toFixed(1) ?? ""}${isOverbought ? " (overbought)" : ""} - rally entry opportunity`
          : `RSI neutral - wait for stronger rally`;
      }
    } else {
      // Non-pullback: use original logic
      rsiConfirmed =
        (opportunity.direction === "long" && rsiSignal === "bullish") ||
        (opportunity.direction === "short" && rsiSignal === "bearish") ||
        rsiSignal === "neutral";
      rsiExplanation = rsiConfirmed
        ? `RSI ${rsiSignal} on ${opportunity.lowerTimeframe}`
        : `RSI ${rsiSignal} conflicts with ${opportunity.direction} bias`;
    }

    checks.push(
      createCheck(
        "RSI Confirmation",
        rsiConfirmed,
        rsiExplanation,
        rsiValue ? `RSI: ${rsiValue.toFixed(1)}` : undefined
      )
    );

    // 5. MACD Confirmation (Pullback Logic)
    // For pullbacks, we check the higher TF MACD for trend confirmation
    // Lower TF MACD being counter-trend is expected during pullback
    const macdSignal = opportunity.lowerTrend?.macd.signal;
    const higherMacdSignal = opportunity.higherTrend?.macd.signal;

    let macdConfirmed: boolean;
    let macdExplanation: string;

    if (isPullbackSetup) {
      // For pullbacks, check that HIGHER TF MACD confirms the trend direction
      macdConfirmed =
        (opportunity.direction === "long" && higherMacdSignal === "bullish") ||
        (opportunity.direction === "short" && higherMacdSignal === "bearish");
      macdExplanation = macdConfirmed
        ? `${opportunity.higherTimeframe} MACD ${higherMacdSignal} - trend momentum intact`
        : `${opportunity.higherTimeframe} MACD ${higherMacdSignal} - trend momentum weakening`;
    } else {
      // Non-pullback: use original logic
      macdConfirmed =
        (opportunity.direction === "long" && macdSignal === "bullish") ||
        (opportunity.direction === "short" && macdSignal === "bearish");
      macdExplanation = macdConfirmed
        ? `MACD ${macdSignal} confirms ${opportunity.direction} momentum`
        : `MACD ${macdSignal} - momentum not confirmed`;
    }

    checks.push(
      createCheck(
        "MACD Confirmation",
        macdConfirmed,
        macdExplanation,
        isPullbackSetup
          ? `${opportunity.higherTimeframe}: ${higherMacdSignal}, ${opportunity.lowerTimeframe}: ${macdSignal}`
          : undefined
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
