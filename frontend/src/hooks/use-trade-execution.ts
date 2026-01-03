/**
 * Trade Execution Hook
 *
 * Handles position sizing calculation and trade execution.
 * Connects to journal for auto-logging trades.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { createJournalEntry, type JournalEntryRequest } from "@/lib/api";
import { withRetry, formatRetryError, DEFAULT_RETRY_CONFIG } from "@/lib/retry";
import type { TradeOpportunity } from "./use-trade-discovery";
import type { ValidationResult } from "./use-trade-validation";

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

export type UseTradeExecutionResult = {
  /** Current sizing data */
  sizing: SizingData;
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
  /** Execution error */
  error: string | null;
};

/**
 * Position sizing guardrails
 */
const GUARDRAILS = {
  /** Maximum allowed risk percentage per trade */
  maxRiskPercentage: 5,
  /** Minimum risk percentage (avoid dust trades) */
  minRiskPercentage: 0.1,
  /** Maximum position value as percentage of account */
  maxPositionPercentage: 50,
};

/**
 * Calculate position size from risk parameters
 */
function calculatePositionSize(
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  stopLoss: number
): { positionSize: number; riskAmount: number; stopDistance: number; guardrailWarnings: string[] } {
  const guardrailWarnings: string[] = [];

  // Apply risk percentage guardrails
  const clampedRiskPercentage = Math.min(
    Math.max(riskPercentage, GUARDRAILS.minRiskPercentage),
    GUARDRAILS.maxRiskPercentage
  );

  if (riskPercentage > GUARDRAILS.maxRiskPercentage) {
    guardrailWarnings.push(`Risk capped at ${GUARDRAILS.maxRiskPercentage}% (was ${riskPercentage}%)`);
  }

  const riskAmount = accountBalance * (clampedRiskPercentage / 100);
  const stopDistance = Math.abs(entryPrice - stopLoss);

  if (stopDistance === 0) {
    return { positionSize: 0, riskAmount, stopDistance: 0, guardrailWarnings };
  }

  let positionSize = riskAmount / stopDistance;

  // Check if position value exceeds maximum percentage of account
  const positionValue = positionSize * entryPrice;
  const maxPositionValue = accountBalance * (GUARDRAILS.maxPositionPercentage / 100);

  if (positionValue > maxPositionValue) {
    positionSize = maxPositionValue / entryPrice;
    guardrailWarnings.push(
      `Position size reduced to stay under ${GUARDRAILS.maxPositionPercentage}% of account`
    );
  }

  return { positionSize, riskAmount, stopDistance, guardrailWarnings };
}

/**
 * Calculate risk/reward ratio
 */
function calculateRiskReward(
  entryPrice: number,
  stopLoss: number,
  targets: number[],
  direction: "long" | "short"
): number {
  if (targets.length === 0) return 0;

  const stopDistance = Math.abs(entryPrice - stopLoss);
  if (stopDistance === 0) return 0;

  // Use first target for R:R calculation
  const targetDistance =
    direction === "long"
      ? targets[0] - entryPrice
      : entryPrice - targets[0];

  return targetDistance / stopDistance;
}

/**
 * Get recommendation based on R:R ratio
 */
function getRecommendation(
  riskRewardRatio: number
): "excellent" | "good" | "marginal" | "poor" {
  if (riskRewardRatio >= 3) return "excellent";
  if (riskRewardRatio >= 2) return "good";
  if (riskRewardRatio >= 1.5) return "marginal";
  return "poor";
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
  }, [opportunity?.id]);

  // Calculate full sizing data
  const sizing = useMemo((): SizingData => {
    const { accountBalance, riskPercentage } = accountSettings;

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
    const direction = opportunity?.direction ?? "long";

    const { positionSize, riskAmount, stopDistance, guardrailWarnings } = calculatePositionSize(
      accountBalance,
      riskPercentage,
      entryPrice,
      stopLoss
    );

    const riskRewardRatio = calculateRiskReward(entryPrice, stopLoss, targets, direction);
    const recommendation = getRecommendation(riskRewardRatio);

    // Direction validation: stop must be on correct side of entry
    const isStopOnCorrectSide =
      entryPrice === 0 ||
      stopLoss === 0 ||
      (direction === "long" ? stopLoss < entryPrice : stopLoss > entryPrice);

    // isValid = basic requirements met (entry/stop set, position size calculated, stop on correct side)
    const isValid = entryPrice > 0 && stopLoss > 0 && positionSize > 0 && isStopOnCorrectSide;

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
  }, [accountSettings, tradeOverrides, capturedValidation, validation, opportunity?.direction]);

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
    capturedValidation,
    hasCapturedSuggestions,
    tradeOverrides,
    journalEntryId,
    updateSizing,
    restoreSuggested,
    execute,
    isExecuting,
    error,
  };
}
