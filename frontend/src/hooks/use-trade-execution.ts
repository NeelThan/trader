/**
 * Trade Execution Hook
 *
 * Handles position sizing calculation and trade execution.
 * Connects to journal for auto-logging trades.
 */

import { useState, useCallback, useMemo, useEffect } from "react";
import { createJournalEntry, type JournalEntryRequest } from "@/lib/api";
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
};

export type UseTradeExecutionOptions = {
  opportunity: TradeOpportunity | null;
  validation: ValidationResult;
  enabled: boolean;
};

export type UseTradeExecutionResult = {
  /** Current sizing data */
  sizing: SizingData;
  /** Update sizing parameters */
  updateSizing: (updates: Partial<SizingData>) => void;
  /** Execute the trade */
  execute: () => Promise<boolean>;
  /** Is currently executing */
  isExecuting: boolean;
  /** Execution error */
  error: string | null;
};

/**
 * Calculate position size from risk parameters
 */
function calculatePositionSize(
  accountBalance: number,
  riskPercentage: number,
  entryPrice: number,
  stopLoss: number
): { positionSize: number; riskAmount: number; stopDistance: number } {
  const riskAmount = accountBalance * (riskPercentage / 100);
  const stopDistance = Math.abs(entryPrice - stopLoss);

  if (stopDistance === 0) {
    return { positionSize: 0, riskAmount, stopDistance: 0 };
  }

  const positionSize = riskAmount / stopDistance;
  return { positionSize, riskAmount, stopDistance };
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
}: UseTradeExecutionOptions): UseTradeExecutionResult {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize sizing - separate account settings from trade-specific values
  const [accountSettings, setAccountSettings] = useState({
    accountBalance: 10000,
    riskPercentage: 2,
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
  const [tradeOverrides, setTradeOverrides] = useState<{
    entryPrice?: number;
    stopLoss?: number;
    targets?: number[];
  }>({});

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

  // Reset captured values and overrides when opportunity changes
  useEffect(() => {
    setCapturedValidation({ entry: null, stop: null, targets: [] });
    setTradeOverrides({});
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

    const { positionSize, riskAmount, stopDistance } = calculatePositionSize(
      accountBalance,
      riskPercentage,
      entryPrice,
      stopLoss
    );

    const riskRewardRatio = calculateRiskReward(entryPrice, stopLoss, targets, direction);
    const recommendation = getRecommendation(riskRewardRatio);
    const isValid = positionSize > 0 && riskRewardRatio >= 1.5 && targets.length > 0;

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

  // Execute trade and journal it
  const execute = useCallback(async (): Promise<boolean> => {
    if (!opportunity || !sizing.isValid) {
      setError("Invalid trade parameters");
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

      await createJournalEntry(entry);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to execute trade";
      setError(message);
      return false;
    } finally {
      setIsExecuting(false);
    }
  }, [opportunity, sizing]);

  return {
    sizing,
    updateSizing,
    execute,
    isExecuting,
    error,
  };
}
