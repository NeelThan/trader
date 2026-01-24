/**
 * Trade Execution Hook
 *
 * Handles position sizing and trade execution via backend APIs.
 * Connects to journal for auto-logging trades.
 *
 * ADR Compliant: Position sizing and R:R calculations are server-side.
 * Frontend is a pure presentation layer.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { createJournalEntry, type JournalEntryRequest } from "@/lib/api";
import { withRetry, formatRetryError, DEFAULT_RETRY_CONFIG } from "@/lib/retry";
import type { TradeOpportunity } from "./use-trade-discovery";
import type { ValidationResult } from "./use-trade-validation";
import {
  type TradeCategory,
  TRADE_CATEGORY_RISK,
  TRADE_CATEGORY_EXPLANATIONS,
} from "@/types/workflow-v2";

/**
 * Position sizing data
 */
export type SizingData = {
  /** Account balance */
  accountBalance: number;
  /** Risk percentage (1-5%) */
  riskPercentage: number;
  /** Entry price */
  entryPrice: number;
  /** Stop loss price */
  stopLoss: number;
  /** Target prices */
  targets: number[];
  /** Calculated position size */
  positionSize: number;
  /** Risk amount in currency */
  riskAmount: number;
  /** Risk/reward ratio */
  riskRewardRatio: number;
  /** Distance to stop in points */
  stopDistance: number;
  /** Recommendation level */
  recommendation: "excellent" | "good" | "marginal" | "poor";
  /** Is the sizing valid */
  isValid: boolean;
  /** Guardrail warnings (position/risk adjustments) */
  guardrailWarnings: string[];
};

export type UseTradeExecutionOptions = {
  opportunity: TradeOpportunity | null;
  validation: ValidationResult;
  enabled: boolean;
  /** Initial account settings (from persisted state) */
  initialAccountSettings?: {
    accountBalance: number;
    riskPercentage: number;
  };
  /** Initial sizing overrides (from persisted state) */
  initialSizingOverrides?: {
    entryPrice?: number;
    stopLoss?: number;
    targets?: number[];
  };
};

/**
 * Captured validation values (persisted when validation is disabled)
 */
export type CapturedValidation = {
  entry: number | null;
  stop: number | null;
  targets: number[];
};

/**
 * Category-based sizing information
 */
export type CategoryInfo = {
  /** The trade category */
  category: TradeCategory;
  /** Risk multiplier for this category (0.25 - 1.0) */
  riskMultiplier: number;
  /** Base risk percentage before category adjustment */
  baseRiskPercentage: number;
  /** Risk percentage after category adjustment */
  adjustedRiskPercentage: number;
  /** Human-readable explanation of the category */
  explanation: string;
};

export type UseTradeExecutionResult = {
  /** Current sizing data */
  sizing: SizingData;
  /** Category-based sizing information */
  categoryInfo: CategoryInfo;
  /** Captured validation values (persisted across phase changes) */
  capturedValidation: CapturedValidation;
  /** Whether there are captured suggested values available */
  hasCapturedSuggestions: boolean;
  /** User's explicit trade overrides (for persistence) */
  tradeOverrides: {
    entryPrice?: number;
    stopLoss?: number;
    targets?: number[];
  };
  /** Journal entry ID from execution (for updating on close) */
  journalEntryId: string | null;
  /** Update sizing parameters */
  updateSizing: (updates: Partial<SizingData>) => void;
  /** Restore suggested values from validation */
  restoreSuggested: () => void;
  /** Execute the trade */
  execute: () => Promise<boolean>;
  /** Is currently executing */
  isExecuting: boolean;
  /** Is loading sizing calculations from backend */
  isLoadingSizing: boolean;
  /** Execution error */
  error: string | null;
};

/**
 * Backend API response types
 */
interface PositionSizeResult {
  position_size: number;
  distance_to_stop: number;
  risk_amount: number;
  account_risk_percentage: number;
  is_valid: boolean;
  trade_category: string | null;
  risk_multiplier: number;
  original_risk_amount: number | null;
  category_explanation: string | null;
}

interface RiskRewardResult {
  risk_reward_ratio: number;
  target_ratios: number[];
  potential_profit: number;
  potential_loss: number;
  recommendation: string;
  is_valid: boolean;
}

/**
 * Fetch position size from backend API
 */
async function fetchPositionSize(
  entryPrice: number,
  stopLoss: number,
  riskCapital: number,
  accountBalance: number,
  tradeCategory?: string
): Promise<PositionSizeResult | null> {
  try {
    const response = await fetch("/api/trader/position/size", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry_price: entryPrice,
        stop_loss: stopLoss,
        risk_capital: riskCapital,
        account_balance: accountBalance,
        trade_category: tradeCategory,
      }),
    });

    if (!response.ok) {
      console.warn("Position size API unavailable:", response.status);
      return null;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.warn("Position size API error:", error);
    return null;
  }
}

/**
 * Fetch risk/reward from backend API
 */
async function fetchRiskReward(
  entryPrice: number,
  stopLoss: number,
  targets: number[],
  positionSize: number
): Promise<RiskRewardResult | null> {
  try {
    const response = await fetch("/api/trader/position/risk-reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry_price: entryPrice,
        stop_loss: stopLoss,
        targets,
        position_size: positionSize,
      }),
    });

    if (!response.ok) {
      console.warn("Risk/reward API unavailable:", response.status);
      return null;
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.warn("Risk/reward API error:", error);
    return null;
  }
}

/**
 * Hook to manage trade execution
 */
export function useTradeExecution({
  opportunity,
  validation,
  enabled,
  initialAccountSettings,
  initialSizingOverrides,
}: UseTradeExecutionOptions): UseTradeExecutionResult {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [journalEntryId, setJournalEntryId] = useState<string | null>(null);

  // Initialize sizing - separate account settings from trade-specific values
  // Use initial values from persisted state if provided
  const [accountSettings, setAccountSettings] = useState({
    accountBalance: initialAccountSettings?.accountBalance ?? 10000,
    riskPercentage: initialAccountSettings?.riskPercentage ?? 2,
  });

  // Backend API results state
  const [positionSizeResult, setPositionSizeResult] = useState<PositionSizeResult | null>(null);
  const [riskRewardResult, setRiskRewardResult] = useState<RiskRewardResult | null>(null);
  const [isLoadingBackend, setIsLoadingBackend] = useState(false);

  // Captured validation values - stored when validation provides non-null values
  // This persists even when validation hook becomes disabled (phase changes)
  const [capturedValidation, setCapturedValidation] = useState<{
    entry: number | null;
    stop: number | null;
    targets: number[];
  }>({
    entry: null,
    stop: null,
    targets: [],
  });

  // Trade-specific overrides (user edits)
  // Initialize with persisted overrides if provided
  const [tradeOverrides, setTradeOverrides] = useState<{
    entryPrice?: number;
    stopLoss?: number;
    targets?: number[];
  }>(initialSizingOverrides ?? {});

  // Capture validation values when they become available
  // These persist even when validation is disabled (e.g., when moving to sizing phase)
  useEffect(() => {
    if (validation.suggestedEntry !== null || validation.suggestedStop !== null || validation.suggestedTargets.length > 0) {
      setCapturedValidation({
        entry: validation.suggestedEntry,
        stop: validation.suggestedStop,
        targets: validation.suggestedTargets,
      });
    }
  }, [validation.suggestedEntry, validation.suggestedStop, validation.suggestedTargets]);

  // Reset captured values, overrides, and journal entry ID when opportunity changes
  useEffect(() => {
    setCapturedValidation({ entry: null, stop: null, targets: [] });
    setTradeOverrides({});
    setJournalEntryId(null);
    setPositionSizeResult(null);
    setRiskRewardResult(null);
  }, [opportunity?.id]);

  // Calculate derived inputs for API calls
  const derivedInputs = useMemo(() => {
    const { accountBalance, riskPercentage } = accountSettings;
    const category = opportunity?.category ?? "with_trend";
    const direction = opportunity?.direction ?? "long";

    // Priority: User overrides > Captured validation values > Current validation > Fallback
    const entryPrice =
      tradeOverrides.entryPrice ??
      capturedValidation.entry ??
      validation.suggestedEntry ??
      0;
    const stopLoss =
      tradeOverrides.stopLoss ??
      capturedValidation.stop ??
      validation.suggestedStop ??
      0;
    const targets =
      tradeOverrides.targets ??
      (capturedValidation.targets.length > 0 ? capturedValidation.targets : null) ??
      validation.suggestedTargets ??
      [];

    // Calculate risk capital (the amount willing to lose)
    const riskCapital = accountBalance * (riskPercentage / 100);

    return { accountBalance, riskPercentage, entryPrice, stopLoss, targets, category, direction, riskCapital };
  }, [accountSettings, tradeOverrides, capturedValidation, validation, opportunity?.category, opportunity?.direction]);

  // Fetch position size and risk/reward from backend APIs
  useEffect(() => {
    const { entryPrice, stopLoss, targets, category, riskCapital, accountBalance } = derivedInputs;

    // Skip if we don't have valid inputs
    if (!enabled || entryPrice === 0 || stopLoss === 0) {
      setPositionSizeResult(null);
      setRiskRewardResult(null);
      return;
    }

    let cancelled = false;
    setIsLoadingBackend(true);

    // Fetch position size first, then risk/reward with the position size
    fetchPositionSize(entryPrice, stopLoss, riskCapital, accountBalance, category)
      .then((posResult) => {
        if (cancelled) return;
        setPositionSizeResult(posResult);

        // Now fetch risk/reward if we have position size and targets
        if (posResult && targets.length > 0) {
          return fetchRiskReward(entryPrice, stopLoss, targets, posResult.position_size);
        }
        return null;
      })
      .then((rrResult) => {
        if (cancelled) return;
        setRiskRewardResult(rrResult ?? null);
        setIsLoadingBackend(false);
      })
      .catch(() => {
        if (!cancelled) {
          setIsLoadingBackend(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, derivedInputs]);

  // Calculate category info
  const categoryInfo = useMemo((): CategoryInfo => {
    const category = opportunity?.category ?? "with_trend";
    const riskMultiplier = TRADE_CATEGORY_RISK[category];
    const baseRiskPercentage = accountSettings.riskPercentage;
    const adjustedRiskPercentage = baseRiskPercentage * riskMultiplier;
    const explanation = TRADE_CATEGORY_EXPLANATIONS[category];

    return {
      category,
      riskMultiplier,
      baseRiskPercentage,
      adjustedRiskPercentage,
      explanation,
    };
  }, [opportunity?.category, accountSettings.riskPercentage]);

  // Build sizing data from backend results and UI inputs
  const sizing = useMemo((): SizingData => {
    const { accountBalance, riskPercentage, entryPrice, stopLoss, targets, direction } = derivedInputs;

    // Use backend results if available
    const positionSize = positionSizeResult?.position_size ?? 0;
    const riskAmount = positionSizeResult?.risk_amount ?? 0;
    const stopDistance = positionSizeResult?.distance_to_stop ?? Math.abs(entryPrice - stopLoss);
    const riskRewardRatio = riskRewardResult?.risk_reward_ratio ?? 0;
    const recommendation = (riskRewardResult?.recommendation ?? "poor") as "excellent" | "good" | "marginal" | "poor";

    // Build guardrail warnings from backend
    const guardrailWarnings: string[] = [];
    if (positionSizeResult?.original_risk_amount && positionSizeResult.original_risk_amount > positionSizeResult.risk_amount) {
      guardrailWarnings.push(`Risk adjusted by category: ${positionSizeResult.category_explanation}`);
    }

    // Direction validation: stop must be on correct side of entry
    const isStopOnCorrectSide =
      entryPrice === 0 ||
      stopLoss === 0 ||
      (direction === "long" ? stopLoss < entryPrice : stopLoss > entryPrice);

    // isValid = basic requirements met + backend returned valid result
    const isValid = entryPrice > 0 && stopLoss > 0 && positionSize > 0 && isStopOnCorrectSide &&
                   (positionSizeResult?.is_valid ?? false);

    return {
      accountBalance,
      riskPercentage,
      entryPrice,
      stopLoss,
      targets,
      positionSize,
      riskAmount,
      riskRewardRatio,
      stopDistance,
      recommendation,
      isValid,
      guardrailWarnings,
    };
  }, [derivedInputs, positionSizeResult, riskRewardResult]);

  // Update sizing - route to appropriate state based on field
  const updateSizing = useCallback((updates: Partial<SizingData>) => {
    // Account settings
    if (updates.accountBalance !== undefined || updates.riskPercentage !== undefined) {
      setAccountSettings((prev) => ({
        accountBalance: updates.accountBalance ?? prev.accountBalance,
        riskPercentage: updates.riskPercentage ?? prev.riskPercentage,
      }));
    }

    // Trade-specific overrides
    if (
      updates.entryPrice !== undefined ||
      updates.stopLoss !== undefined ||
      updates.targets !== undefined
    ) {
      setTradeOverrides((prev) => ({
        ...prev,
        ...(updates.entryPrice !== undefined && { entryPrice: updates.entryPrice }),
        ...(updates.stopLoss !== undefined && { stopLoss: updates.stopLoss }),
        ...(updates.targets !== undefined && { targets: updates.targets }),
      }));
    }
  }, []);

  // Restore suggested values from validation
  const restoreSuggested = useCallback(() => {
    // Clear trade overrides so captured validation values are used
    setTradeOverrides({});
  }, []);

  // Execute trade and journal it (with retry logic for network resilience)
  const execute = useCallback(async (): Promise<boolean> => {
    if (!opportunity) {
      setError("No opportunity selected");
      return false;
    }
    if (!sizing.isValid) {
      setError("Please set entry price and stop loss");
      return false;
    }

    setIsExecuting(true);
    setError(null);

    try {
      // Create journal entry for the trade
      // For paper trading, we log the entry - exit will be updated later
      const entry: JournalEntryRequest = {
        symbol: opportunity.symbol,
        direction: opportunity.direction,
        entry_price: sizing.entryPrice,
        exit_price: 0, // Will be set when trade is closed
        stop_loss: sizing.stopLoss,
        targets: sizing.targets,
        position_size: sizing.positionSize,
        entry_time: new Date().toISOString(),
        exit_time: "", // Will be set when trade is closed
        timeframe: opportunity.lowerTimeframe,
        notes: `${opportunity.description}\n\nReasoning: ${opportunity.reasoning}`,
      };

      // Use retry logic for network resilience
      const response = await withRetry(() => createJournalEntry(entry));
      // Store the entry ID so we can update it when trade closes
      setJournalEntryId(response.entry.id);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to execute trade";
      setError(formatRetryError(message, DEFAULT_RETRY_CONFIG));
      return false;
    } finally {
      setIsExecuting(false);
    }
  }, [opportunity, sizing]);

  // Check if there are captured suggestions available
  const hasCapturedSuggestions =
    capturedValidation.entry !== null ||
    capturedValidation.stop !== null ||
    capturedValidation.targets.length > 0;

  return {
    sizing,
    categoryInfo,
    capturedValidation,
    hasCapturedSuggestions,
    tradeOverrides,
    journalEntryId,
    updateSizing,
    restoreSuggested,
    execute,
    isExecuting,
    isLoadingSizing: isLoadingBackend,
    error,
  };
}
