/**
 * Hook for running backtests via the backend API.
 * Returns an imperative runBacktest function (not auto-fetch).
 */

import { useState, useCallback } from "react";
import type { BacktestConfig, BacktestResult } from "@/types/backtest";

const BACKTEST_API_URL = "/api/trader/backtest/run";

type BacktestState = {
  result: BacktestResult | null;
  isLoading: boolean;
  error: string | null;
};

const INITIAL_STATE: BacktestState = {
  result: null,
  isLoading: false,
  error: null,
};

export type UseBacktestReturn = BacktestState & {
  runBacktest: (config: BacktestConfig) => Promise<void>;
  reset: () => void;
};

export function useBacktest(): UseBacktestReturn {
  const [state, setState] = useState<BacktestState>(INITIAL_STATE);

  const runBacktest = useCallback(async (config: BacktestConfig) => {
    setState({ result: null, isLoading: true, error: null });

    try {
      const response = await fetch(BACKTEST_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.detail ?? `Backtest failed (${response.status})`;
        setState({ result: null, isLoading: false, error: message });
        return;
      }

      const data: BacktestResult = await response.json();
      setState({ result: data, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setState({ result: null, isLoading: false, error: message });
    }
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  return { ...state, runBacktest, reset };
}
