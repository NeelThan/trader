"use client";

/**
 * Hook for fetching workflow step data from the backend API.
 * Provides data for steps: ASSESS, ALIGN, LEVELS, CONFIRM.
 */

import { useState, useCallback } from "react";
import {
  assessTrend,
  checkAlignment,
  identifyLevels,
  confirmIndicators,
  type TrendAssessmentResponse,
  type AlignmentResultResponse,
  type LevelsResultResponse,
  type IndicatorConfirmationResponse,
  type Direction,
} from "@/lib/api";

export type WorkflowDataState = {
  assess: TrendAssessmentResponse | null;
  align: AlignmentResultResponse | null;
  levels: LevelsResultResponse | null;
  confirm: IndicatorConfirmationResponse | null;
  isLoading: Record<string, boolean>;
  errors: Record<string, string | null>;
};

const INITIAL_STATE: WorkflowDataState = {
  assess: null,
  align: null,
  levels: null,
  confirm: null,
  isLoading: {},
  errors: {},
};

export function useWorkflowData() {
  const [state, setState] = useState<WorkflowDataState>(INITIAL_STATE);

  const setLoading = useCallback((key: string, loading: boolean) => {
    setState((prev) => ({
      ...prev,
      isLoading: { ...prev.isLoading, [key]: loading },
    }));
  }, []);

  const setError = useCallback((key: string, error: string | null) => {
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [key]: error },
    }));
  }, []);

  const fetchAssess = useCallback(
    async (symbol: string, timeframe: string) => {
      setLoading("assess", true);
      setError("assess", null);
      try {
        const data = await assessTrend(symbol, timeframe);
        setState((prev) => ({ ...prev, assess: data }));
        return data;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed";
        setError("assess", message);
        return null;
      } finally {
        setLoading("assess", false);
      }
    },
    [setLoading, setError]
  );

  const fetchAlign = useCallback(
    async (symbol: string, timeframes: string[]) => {
      setLoading("align", true);
      setError("align", null);
      try {
        const data = await checkAlignment(symbol, timeframes);
        setState((prev) => ({ ...prev, align: data }));
        return data;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed";
        setError("align", message);
        return null;
      } finally {
        setLoading("align", false);
      }
    },
    [setLoading, setError]
  );

  const fetchLevels = useCallback(
    async (symbol: string, direction: Direction, timeframe: string) => {
      setLoading("levels", true);
      setError("levels", null);
      try {
        const data = await identifyLevels(symbol, direction, timeframe);
        setState((prev) => ({ ...prev, levels: data }));
        return data;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed";
        setError("levels", message);
        return null;
      } finally {
        setLoading("levels", false);
      }
    },
    [setLoading, setError]
  );

  const fetchConfirm = useCallback(
    async (symbol: string, timeframe: string) => {
      setLoading("confirm", true);
      setError("confirm", null);
      try {
        const data = await confirmIndicators(symbol, timeframe);
        setState((prev) => ({ ...prev, confirm: data }));
        return data;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed";
        setError("confirm", message);
        return null;
      } finally {
        setLoading("confirm", false);
      }
    },
    [setLoading, setError]
  );

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const isAnyLoading = Object.values(state.isLoading).some(Boolean);
  const hasAnyError = Object.values(state.errors).some((e) => e !== null);

  return {
    ...state,
    fetchAssess,
    fetchAlign,
    fetchLevels,
    fetchConfirm,
    reset,
    isAnyLoading,
    hasAnyError,
  };
}

// Re-export types for convenience
export type {
  TrendAssessmentResponse,
  AlignmentResultResponse,
  LevelsResultResponse,
  IndicatorConfirmationResponse,
} from "@/lib/api";
