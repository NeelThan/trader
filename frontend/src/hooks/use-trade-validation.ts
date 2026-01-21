/**
 * Trade Validation Hook
 *
 * Validates a selected trade opportunity against system criteria.
 * Calls backend /workflow/validate endpoint for server-side validation.
 *
 * ADR Compliant: All business logic is handled server-side.
 * The frontend is a pure presentation layer.
 */

import { useMemo, useEffect, useState } from "react";
import { useMultiTFLevels } from "./use-multi-tf-levels";
import type { TradeOpportunity } from "./use-trade-discovery";
import {
  type StrategyLevel,
  type VisibilityConfig,
  FIBONACCI_RATIOS,
} from "@/lib/chart-pro/strategy-types";
import type { Timeframe } from "@/lib/chart-constants";
import {
  type ConfluenceScore,
  getConfluenceInterpretation,
} from "@/types/workflow-v2";

/**
 * Backend validation response types
 */
interface BackendValidationCheck {
  name: string;
  passed: boolean;
  explanation: string;
  details?: string | null;
}

interface BackendATRInfo {
  atr: number;
  atr_percent: number;
  volatility_level: "low" | "normal" | "high" | "extreme";
  current_price: number;
  suggested_stop_1x: number;
  suggested_stop_1_5x: number;
  suggested_stop_2x: number;
  interpretation: string;
}

interface BackendConfluenceBreakdown {
  base_fib_level: number;
  same_tf_confluence: number;
  higher_tf_confluence: number;
  cross_tool_confluence: number;
  previous_pivot: number;
  psychological_level: number;
}

interface BackendValidationResult {
  checks: BackendValidationCheck[];
  passed_count: number;
  total_count: number;
  is_valid: boolean;
  pass_percentage: number;
  atr_info?: BackendATRInfo | null;
  confluence_score?: number | null;
  confluence_breakdown?: BackendConfluenceBreakdown | null;
  trade_category?: string | null;
}

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
 * ATR analysis for volatility and stop loss info
 */
export type ATRInfo = {
  /** Current ATR value in price units */
  atr: number;
  /** ATR as percentage of current price */
  atrPercent: number;
  /** Volatility classification */
  volatilityLevel: "low" | "normal" | "high" | "extreme";
  /** Current price used in calculations */
  currentPrice: number;
  /** Stop distance at 1x ATR */
  suggestedStop1x: number;
  /** Stop distance at 1.5x ATR */
  suggestedStop1_5x: number;
  /** Stop distance at 2x ATR */
  suggestedStop2x: number;
  /** Human-readable interpretation */
  interpretation: string;
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
  /** Confluence score for entry levels */
  confluenceScore: ConfluenceScore | null;
  /** Is the market ranging (reduces Fib reliability) */
  isRanging: boolean;
  /** Ranging market warning message */
  rangingWarning: string | null;
  /** ATR analysis for volatility and stop loss info */
  atrInfo: ATRInfo | null;
};

export type UseTradeValidationOptions = {
  opportunity: TradeOpportunity | null;
  enabled: boolean;
  atrPeriod?: number;
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

// Note: Confluence score calculation is now handled by the backend
// via /workflow/validate endpoint. Frontend only displays results.

/**
 * Fetch validation from backend API
 */
async function fetchBackendValidation(
  opportunity: TradeOpportunity,
  atrPeriod: number = 14
): Promise<BackendValidationResult | null> {
  try {
    const response = await fetch("/api/trader/workflow/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: opportunity.symbol,
        higher_timeframe: opportunity.higherTimeframe,
        lower_timeframe: opportunity.lowerTimeframe,
        direction: opportunity.direction,
        atr_period: atrPeriod,
      }),
    });

    if (!response.ok) {
      console.warn("Backend validation unavailable:", response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn("Backend validation error:", error);
    return null;
  }
}

/**
 * Convert backend validation response to frontend format
 */
function convertBackendToFrontend(
  backend: BackendValidationResult
): Pick<ValidationResult, "checks" | "passedCount" | "totalCount" | "isValid" | "passPercentage" | "atrInfo" | "confluenceScore"> {
  const atrInfo: ATRInfo | null = backend.atr_info ? {
    atr: backend.atr_info.atr,
    atrPercent: backend.atr_info.atr_percent,
    volatilityLevel: backend.atr_info.volatility_level,
    currentPrice: backend.atr_info.current_price,
    suggestedStop1x: backend.atr_info.suggested_stop_1x,
    suggestedStop1_5x: backend.atr_info.suggested_stop_1_5x,
    suggestedStop2x: backend.atr_info.suggested_stop_2x,
    interpretation: backend.atr_info.interpretation,
  } : null;

  // Convert backend confluence to frontend format if available
  const confluenceScore: ConfluenceScore | null = backend.confluence_score != null && backend.confluence_breakdown ? {
    total: backend.confluence_score,
    breakdown: {
      baseFibLevel: backend.confluence_breakdown.base_fib_level,
      sameTFConfluence: backend.confluence_breakdown.same_tf_confluence,
      higherTFConfluence: backend.confluence_breakdown.higher_tf_confluence,
      crossToolConfluence: backend.confluence_breakdown.cross_tool_confluence,
      previousPivot: backend.confluence_breakdown.previous_pivot,
      psychologicalLevel: backend.confluence_breakdown.psychological_level,
    },
    interpretation: getConfluenceInterpretation(backend.confluence_score),
  } : null;

  return {
    checks: backend.checks.map((c) => ({
      name: c.name,
      passed: c.passed,
      status: c.passed ? "passed" : "failed",
      explanation: c.explanation,
      details: c.details ?? undefined,
    })),
    passedCount: backend.passed_count,
    totalCount: backend.total_count,
    isValid: backend.is_valid,
    passPercentage: backend.pass_percentage,
    atrInfo,
    confluenceScore,
  };
}

/**
 * Hook to validate a trade opportunity
 *
 * Calls backend /workflow/validate endpoint for server-side validation.
 * ADR Compliant: All validation logic is server-side.
 */
export function useTradeValidation({
  opportunity,
  enabled,
  atrPeriod = 14,
}: UseTradeValidationOptions): UseTradeValidationResult {
  // State for backend validation result
  const [backendResult, setBackendResult] = useState<BackendValidationResult | null>(null);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);
  const [backendError, setBackendError] = useState(false);

  // Fetch backend validation when opportunity or ATR period changes
  useEffect(() => {
    if (!enabled || !opportunity) {
      setBackendResult(null);
      setBackendError(false);
      return;
    }

    let cancelled = false;
    setIsLoadingBackend(true);

    fetchBackendValidation(opportunity, atrPeriod).then((result) => {
      if (!cancelled) {
        setBackendResult(result);
        setBackendError(result === null);
        setIsLoadingBackend(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [opportunity, enabled, atrPeriod]);

  // Create visibility config for this specific opportunity
  const visibilityConfig = useMemo((): VisibilityConfig => {
    if (!opportunity) {
      // Return empty config when no opportunity
      return { timeframes: [] };
    }
    return createValidationVisibilityConfig(opportunity);
  }, [opportunity]);

  // Fetch Fibonacci levels for entry/target details (always needed)
  const { allLevels, isLoading: isLoadingLevels } = useMultiTFLevels({
    symbol: opportunity?.symbol ?? "DJI",
    visibilityConfig,
    enabled: enabled && opportunity !== null,
  });

  // Build validation result - prefer backend, fallback to local
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
        confluenceScore: null,
        isRanging: false,
        rangingWarning: null,
        atrInfo: null,
      };
    }

    // Get entry and target levels (needed for both paths)
    const entryLevels = getEntryLevels(allLevels, opportunity);
    const targetLevels = getTargetLevels(allLevels, opportunity);

    // Sort entry levels by price for proper entry/stop selection
    const sortedEntryLevels =
      opportunity.direction === "long"
        ? [...entryLevels].sort((a, b) => b.price - a.price)
        : [...entryLevels].sort((a, b) => a.price - b.price);

    // Calculate suggested prices
    const suggestedEntry = sortedEntryLevels[0]?.price ?? null;
    const suggestedStop = sortedEntryLevels[sortedEntryLevels.length - 1]?.price ?? null;
    const suggestedTargets = targetLevels.slice(0, 3).map((l) => l.price);

    // Check for ranging market condition
    const isRanging = opportunity.higherTrend?.isRanging || opportunity.higherTrend?.trend === "ranging" || false;
    const rangingWarning = isRanging
      ? (opportunity.higherTrend?.rangingWarning || "Market is ranging - Fibonacci levels may be less reliable")
      : null;

    // Use backend validation (required - no local fallback)
    if (backendResult && !backendError) {
      const backendValidation = convertBackendToFrontend(backendResult);
      return {
        ...backendValidation,
        entryLevels,
        targetLevels,
        suggestedEntry,
        suggestedStop,
        suggestedTargets,
        isRanging,
        rangingWarning,
      };
    }

    // Backend unavailable - return unavailable state
    // ADR Compliant: No local business logic fallback
    const unavailableCheck: ValidationCheck = {
      name: "Backend Validation",
      passed: false,
      status: "failed",
      explanation: "Backend validation service unavailable",
      details: "Please ensure the backend server is running",
    };

    return {
      checks: [unavailableCheck],
      passedCount: 0,
      totalCount: 1,
      isValid: false,
      passPercentage: 0,
      entryLevels,
      targetLevels,
      suggestedEntry,
      suggestedStop,
      suggestedTargets,
      confluenceScore: null,
      isRanging,
      rangingWarning,
      atrInfo: null,
    };
  }, [opportunity, allLevels, backendResult, backendError]);

  return {
    result,
    isLoading: isLoadingLevels || isLoadingBackend,
  };
}
