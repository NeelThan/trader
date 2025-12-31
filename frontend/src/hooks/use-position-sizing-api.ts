/**
 * Hook for fetching position sizing calculations from the backend API.
 * This replaces local calculations with backend-computed values.
 */

import { useState, useCallback } from "react";
import {
  calculatePositionSize,
  calculateRiskReward,
  type PositionSizeData,
  type RiskRewardData,
  type TradeRecommendation,
} from "@/lib/api";

export type PositionSizingResult = {
  positionSize: number;
  distanceToStop: number;
  riskAmount: number;
  accountRiskPercentage: number;
  riskRewardRatio: number;
  targetRatios: number[];
  potentialProfit: number;
  potentialLoss: number;
  recommendation: TradeRecommendation;
  isValid: boolean;
};

export type UsePositionSizingAPIState = {
  result: PositionSizingResult | null;
  isLoading: boolean;
  error: string | null;
  isBackendAvailable: boolean;
};

export type UsePositionSizingAPIOptions = {
  entryPrice: number;
  stopLoss: number;
  targets: number[];
  riskCapital: number;
  accountBalance?: number;
};

const INITIAL_STATE: UsePositionSizingAPIState = {
  result: null,
  isLoading: false,
  error: null,
  isBackendAvailable: true,
};

/**
 * Hook for calculating position sizing via the backend API.
 * Returns a calculate function that can be called imperatively.
 */
export function usePositionSizingAPI() {
  const [state, setState] = useState<UsePositionSizingAPIState>(INITIAL_STATE);

  const calculate = useCallback(
    async (options: UsePositionSizingAPIOptions): Promise<PositionSizingResult | null> => {
      const { entryPrice, stopLoss, targets, riskCapital, accountBalance } = options;

      // Validate inputs
      if (!entryPrice || !stopLoss || entryPrice === stopLoss) {
        setState({
          result: null,
          isLoading: false,
          error: "Invalid entry or stop loss price",
          isBackendAvailable: true,
        });
        return null;
      }

      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // Fetch position size and risk/reward in parallel
        const [positionSizeResponse, riskRewardResponse] = await Promise.all([
          calculatePositionSize({
            entry_price: entryPrice,
            stop_loss: stopLoss,
            risk_capital: riskCapital,
            account_balance: accountBalance,
          }),
          targets.length > 0
            ? calculateRiskReward({
                entry_price: entryPrice,
                stop_loss: stopLoss,
                targets,
                position_size: 0, // Will be calculated server-side
              })
            : Promise.resolve<{ result: RiskRewardData }>({
                result: {
                  risk_reward_ratio: 0,
                  target_ratios: [],
                  potential_profit: 0,
                  potential_loss: 0,
                  recommendation: "poor" as TradeRecommendation,
                  is_valid: false,
                },
              }),
        ]);

        const positionSize = positionSizeResponse.result;
        const riskReward = riskRewardResponse.result;

        // Calculate potential P&L using the position size
        const potentialLoss = positionSize.position_size * positionSize.distance_to_stop;
        const potentialProfit =
          targets.length > 0
            ? positionSize.position_size * Math.abs(targets[0] - entryPrice)
            : 0;

        const result: PositionSizingResult = {
          positionSize: positionSize.position_size,
          distanceToStop: positionSize.distance_to_stop,
          riskAmount: positionSize.risk_amount,
          accountRiskPercentage: positionSize.account_risk_percentage,
          riskRewardRatio: riskReward.risk_reward_ratio,
          targetRatios: riskReward.target_ratios,
          potentialProfit,
          potentialLoss,
          recommendation: riskReward.recommendation,
          isValid: positionSize.is_valid && (targets.length === 0 || riskReward.is_valid),
        };

        setState({
          result,
          isLoading: false,
          error: null,
          isBackendAvailable: true,
        });

        return result;
      } catch (error) {
        console.error("Failed to calculate position sizing:", error);

        // Check if backend is unavailable
        const isUnavailable =
          error instanceof Error &&
          (error.message.includes("Backend unavailable") ||
            error.message.includes("fetch"));

        setState({
          result: null,
          isLoading: false,
          error: isUnavailable
            ? "Backend unavailable - calculation not possible"
            : "Failed to calculate position sizing",
          isBackendAvailable: !isUnavailable,
        });

        return null;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return {
    ...state,
    calculate,
    reset,
  };
}
