/**
 * Workflow V2 State Persistence Hook
 *
 * Persists workflow phase, selected opportunity, and execution state
 * to localStorage so users don't lose progress on page refresh.
 */

import { useState, useEffect, useCallback } from "react";
import type { WorkflowPhase } from "@/app/workflow-v2/page";
import type { TradeOpportunity } from "./use-trade-discovery";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";

const STORAGE_KEY = "workflow-v2-state";
const STATE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Persisted workflow state
 */
export type PersistedWorkflowState = {
  symbol: MarketSymbol;
  timeframe: Timeframe;
  phase: WorkflowPhase;
  opportunity: TradeOpportunity | null;
  journalEntryId: string | null;
  accountSettings: {
    accountBalance: number;
    riskPercentage: number;
  };
  sizingOverrides: {
    entryPrice?: number;
    stopLoss?: number;
    targets?: number[];
  };
  timestamp: number;
};

const DEFAULT_STATE: PersistedWorkflowState = {
  symbol: "DJI",
  timeframe: "1D",
  phase: "discover",
  opportunity: null,
  journalEntryId: null,
  accountSettings: {
    accountBalance: 10000,
    riskPercentage: 2,
  },
  sizingOverrides: {},
  timestamp: Date.now(),
};

/**
 * Load state from localStorage
 */
function loadPersistedState(): PersistedWorkflowState | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored) as PersistedWorkflowState;

    // Check if state has expired
    if (Date.now() - state.timestamp > STATE_EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return state;
  } catch (error) {
    console.error("Failed to load workflow state:", error);
    return null;
  }
}

/**
 * Save state to localStorage
 */
function savePersistedState(state: PersistedWorkflowState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state, timestamp: Date.now() })
    );
  } catch (error) {
    console.error("Failed to save workflow state:", error);
  }
}

/**
 * Clear persisted state
 */
function clearPersistedState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export type UseWorkflowV2StateResult = {
  // Core state
  symbol: MarketSymbol;
  timeframe: Timeframe;
  phase: WorkflowPhase;
  opportunity: TradeOpportunity | null;
  journalEntryId: string | null;
  accountSettings: PersistedWorkflowState["accountSettings"];
  sizingOverrides: PersistedWorkflowState["sizingOverrides"];

  // State setters
  setSymbol: (symbol: MarketSymbol) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  setPhase: (phase: WorkflowPhase) => void;
  setOpportunity: (opportunity: TradeOpportunity | null) => void;
  setJournalEntryId: (id: string | null) => void;
  setAccountSettings: (
    settings: Partial<PersistedWorkflowState["accountSettings"]>
  ) => void;
  setSizingOverrides: (
    overrides: Partial<PersistedWorkflowState["sizingOverrides"]>
  ) => void;

  // Actions
  selectOpportunity: (opportunity: TradeOpportunity) => void;
  backToDiscovery: () => void;
  proceedToSize: () => void;
  proceedToExecute: () => void;
  startManaging: (journalEntryId: string | null) => void;
  finishManaging: () => void;
  resetWorkflow: () => void;

  // State flags
  hasPersistedState: boolean;
  isRestoring: boolean;
};

/**
 * Hook to manage and persist workflow state
 */
export function useWorkflowV2State(): UseWorkflowV2StateResult {
  const [state, setState] = useState<PersistedWorkflowState>(DEFAULT_STATE);
  const [hasPersistedState, setHasPersistedState] = useState(false);
  const [isRestoring, setIsRestoring] = useState(true);

  // Restore state on mount
  useEffect(() => {
    const persisted = loadPersistedState();
    if (persisted) {
      setState(persisted);
      setHasPersistedState(true);
    }
    setIsRestoring(false);
  }, []);

  // Save state on changes (after initial restore)
  useEffect(() => {
    if (!isRestoring) {
      savePersistedState(state);
    }
  }, [state, isRestoring]);

  // Individual setters
  const setSymbol = useCallback((symbol: MarketSymbol) => {
    setState((prev) => ({ ...prev, symbol }));
  }, []);

  const setTimeframe = useCallback((timeframe: Timeframe) => {
    setState((prev) => ({ ...prev, timeframe }));
  }, []);

  const setPhase = useCallback((phase: WorkflowPhase) => {
    setState((prev) => ({ ...prev, phase }));
  }, []);

  const setOpportunity = useCallback((opportunity: TradeOpportunity | null) => {
    setState((prev) => ({ ...prev, opportunity }));
  }, []);

  const setJournalEntryId = useCallback((journalEntryId: string | null) => {
    setState((prev) => ({ ...prev, journalEntryId }));
  }, []);

  const setAccountSettings = useCallback(
    (settings: Partial<PersistedWorkflowState["accountSettings"]>) => {
      setState((prev) => ({
        ...prev,
        accountSettings: { ...prev.accountSettings, ...settings },
      }));
    },
    []
  );

  const setSizingOverrides = useCallback(
    (overrides: Partial<PersistedWorkflowState["sizingOverrides"]>) => {
      setState((prev) => ({
        ...prev,
        sizingOverrides: { ...prev.sizingOverrides, ...overrides },
      }));
    },
    []
  );

  // Workflow actions
  const selectOpportunity = useCallback((opportunity: TradeOpportunity) => {
    setState((prev) => ({
      ...prev,
      opportunity,
      phase: "validate",
      sizingOverrides: {}, // Clear sizing when selecting new opportunity
      journalEntryId: null,
    }));
  }, []);

  const backToDiscovery = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: "discover",
      opportunity: null,
      sizingOverrides: {},
      journalEntryId: null,
    }));
  }, []);

  const proceedToSize = useCallback(() => {
    setState((prev) => ({ ...prev, phase: "size" }));
  }, []);

  const proceedToExecute = useCallback(() => {
    setState((prev) => ({ ...prev, phase: "execute" }));
  }, []);

  const startManaging = useCallback((journalEntryId: string | null) => {
    setState((prev) => ({
      ...prev,
      phase: "manage",
      journalEntryId,
    }));
  }, []);

  const finishManaging = useCallback(() => {
    setState((prev) => ({
      ...prev,
      phase: "discover",
      opportunity: null,
      sizingOverrides: {},
      journalEntryId: null,
    }));
  }, []);

  const resetWorkflow = useCallback(() => {
    clearPersistedState();
    setState(DEFAULT_STATE);
    setHasPersistedState(false);
  }, []);

  return {
    // Core state
    symbol: state.symbol,
    timeframe: state.timeframe,
    phase: state.phase,
    opportunity: state.opportunity,
    journalEntryId: state.journalEntryId,
    accountSettings: state.accountSettings,
    sizingOverrides: state.sizingOverrides,

    // Setters
    setSymbol,
    setTimeframe,
    setPhase,
    setOpportunity,
    setJournalEntryId,
    setAccountSettings,
    setSizingOverrides,

    // Actions
    selectOpportunity,
    backToDiscovery,
    proceedToSize,
    proceedToExecute,
    startManaging,
    finishManaging,
    resetWorkflow,

    // Flags
    hasPersistedState,
    isRestoring,
  };
}
