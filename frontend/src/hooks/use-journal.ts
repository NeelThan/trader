/**
 * Hook for managing trade journal entries and analytics.
 * Provides CRUD operations and real-time analytics updates.
 */

import { useState, useCallback, useEffect } from "react";
import {
  createJournalEntry,
  getJournalEntries,
  getJournalEntry,
  getJournalAnalytics,
  getDetailedAnalytics,
  deleteJournalEntry,
  updateJournalEntry,
  type JournalEntryRequest,
  type JournalEntryUpdateRequest,
  type JournalEntryData,
  type JournalAnalyticsData,
  type DetailedAnalyticsData,
  type TradeDirection,
} from "@/lib/api";
import type { StoredWorkflow } from "./use-workflow-manager";
import type { WorkflowState } from "./use-workflow-state";

export type UseJournalState = {
  entries: JournalEntryData[];
  analytics: JournalAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
  isBackendAvailable: boolean;
};

const EMPTY_ANALYTICS: JournalAnalyticsData = {
  total_trades: 0,
  wins: 0,
  losses: 0,
  breakevens: 0,
  win_rate: 0,
  total_pnl: 0,
  average_r: 0,
  largest_win: 0,
  largest_loss: 0,
  profit_factor: 0,
};

const INITIAL_STATE: UseJournalState = {
  entries: [],
  analytics: null,
  isLoading: false,
  error: null,
  isBackendAvailable: true,
};

/**
 * Hook for managing trade journal.
 * Fetches entries and analytics on mount, provides CRUD operations.
 */
export function useJournal(symbolFilter?: string) {
  const [state, setState] = useState<UseJournalState>(INITIAL_STATE);

  // Fetch entries and analytics
  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const [entriesResponse, analyticsResponse] = await Promise.all([
        getJournalEntries(symbolFilter),
        getJournalAnalytics(),
      ]);

      setState({
        entries: entriesResponse.entries,
        analytics: analyticsResponse.analytics,
        isLoading: false,
        error: null,
        isBackendAvailable: true,
      });
    } catch (error) {
      console.error("Failed to fetch journal:", error);

      const isUnavailable =
        error instanceof Error &&
        (error.message.includes("Backend unavailable") ||
          error.message.includes("fetch") ||
          error.message.includes("Failed to fetch"));

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: isUnavailable
          ? "Backend unavailable"
          : "Failed to load journal",
        isBackendAvailable: !isUnavailable,
      }));
    }
  }, [symbolFilter]);

  // Fetch on mount and when filter changes
  // Using void to handle promise without triggering lint warning
  useEffect(() => {
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  // Add new entry
  const addEntry = useCallback(
    async (entry: JournalEntryRequest): Promise<JournalEntryData | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await createJournalEntry(entry);
        // Refresh to get updated analytics
        await refresh();
        return response.entry;
      } catch (error) {
        console.error("Failed to create journal entry:", error);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to create entry",
        }));

        return null;
      }
    },
    [refresh]
  );

  // Delete entry
  const removeEntry = useCallback(
    async (entryId: string): Promise<boolean> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        await deleteJournalEntry(entryId);
        // Refresh to get updated analytics
        await refresh();
        return true;
      } catch (error) {
        console.error("Failed to delete journal entry:", error);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to delete entry",
        }));

        return false;
      }
    },
    [refresh]
  );

  // Update entry
  const updateEntry = useCallback(
    async (
      entryId: string,
      updates: JournalEntryUpdateRequest
    ): Promise<JournalEntryData | null> => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await updateJournalEntry(entryId, updates);
        // Refresh to get updated analytics
        await refresh();
        return response.entry;
      } catch (error) {
        console.error("Failed to update journal entry:", error);

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to update entry",
        }));

        return null;
      }
    },
    [refresh]
  );

  // Get single entry
  const getEntry = useCallback(
    async (entryId: string): Promise<JournalEntryData | null> => {
      try {
        const response = await getJournalEntry(entryId);
        return response.entry;
      } catch (error) {
        console.error("Failed to get journal entry:", error);
        return null;
      }
    },
    []
  );

  return {
    ...state,
    analytics: state.analytics ?? EMPTY_ANALYTICS,
    refresh,
    addEntry,
    removeEntry,
    updateEntry,
    getEntry,
  };
}

/**
 * Format currency value for display.
 */
export function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  const prefix = value < 0 ? "-" : value > 0 ? "+" : "";

  if (absValue >= 1000000) {
    return `${prefix}$${(absValue / 1000000).toFixed(2)}M`;
  }
  if (absValue >= 1000) {
    return `${prefix}$${(absValue / 1000).toFixed(1)}K`;
  }
  return `${prefix}$${absValue.toFixed(2)}`;
}

/**
 * Format R-multiple for display.
 */
export function formatRMultiple(value: number): string {
  const prefix = value >= 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}R`;
}

/**
 * Format percentage for display.
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format date for display.
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format time for display.
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// Workflow Import Utilities
// ============================================================================

/**
 * Check if a workflow can be imported to the journal.
 * Requirements:
 * - Status is "completed"
 * - Has entry price
 * - Exit price can be provided during import if not in trade log
 */
export function canImportWorkflow(workflow: StoredWorkflow): boolean {
  if (workflow.status !== "completed") return false;
  if (workflow.state.entryPrice <= 0) return false;
  // Allow import even if tradeStatus isn't closed - user can provide exit price
  return true;
}

/**
 * Extract exit information from a workflow's trade log.
 * Returns the exit price and time from the last "exit" or "target_hit" entry.
 */
function getExitInfoFromTradeLog(state: WorkflowState): {
  exitPrice: number | null;
  exitTime: string | null;
  exitReason: string | null;
} {
  // Look for exit entries in reverse order (most recent first)
  const exitEntries = [...state.tradeLog]
    .reverse()
    .filter((e) => e.action === "exit" || e.action === "target_hit");

  if (exitEntries.length > 0) {
    const exitEntry = exitEntries[0];
    return {
      exitPrice: exitEntry.price,
      exitTime: exitEntry.timestamp,
      exitReason: exitEntry.note || exitEntry.action,
    };
  }

  return { exitPrice: null, exitTime: null, exitReason: null };
}

/**
 * Convert a completed workflow to a journal entry request.
 * Returns null if the workflow cannot be converted.
 * @param exitPriceOverride - Optional exit price to use when trade log doesn't have one
 */
export function workflowToJournalEntry(
  workflow: StoredWorkflow,
  exitPriceOverride?: number
): JournalEntryRequest | null {
  // Less strict check - just need completed status and entry price
  if (workflow.status !== "completed") return null;
  if (workflow.state.entryPrice <= 0) return null;

  const { state } = workflow;

  // Get exit info from trade log or use override
  const exitInfo = getExitInfoFromTradeLog(state);
  const exitPrice = exitPriceOverride ?? exitInfo.exitPrice;

  // If no exit price available, can't create entry
  if (!exitPrice || exitPrice <= 0) return null;

  // Map trade direction
  let direction: TradeDirection;
  if (state.tradeDirection === "GO_LONG") {
    direction = "long";
  } else if (state.tradeDirection === "GO_SHORT") {
    direction = "short";
  } else {
    return null; // STAND_ASIDE can't be journaled
  }

  // Get entry time from trade log or workflow creation
  const entryEntry = state.tradeLog.find((e) => e.action === "entry");
  const entryTime = entryEntry?.timestamp ?? workflow.createdAt;

  // Get exit time
  const exitTime = exitInfo.exitTime ?? workflow.updatedAt;

  return {
    symbol: state.symbol,
    direction,
    entry_price: state.entryPrice,
    exit_price: exitPrice,
    stop_loss: state.stopLoss,
    position_size: state.positionSize,
    entry_time: entryTime,
    exit_time: exitTime,
    timeframe: state.lowerTimeframe,
    targets: state.targets,
    exit_reason: exitInfo.exitReason ?? undefined,
    notes: `Imported from workflow: ${workflow.name}`,
    workflow_id: workflow.id,
  };
}

/**
 * Get importable workflows from the workflow store.
 */
export function getImportableWorkflows(workflows: StoredWorkflow[]): StoredWorkflow[] {
  return workflows.filter(canImportWorkflow);
}

/**
 * Check if a workflow has already been imported to the journal.
 */
export function isWorkflowImported(
  workflowId: string,
  journalEntries: JournalEntryData[]
): boolean {
  return journalEntries.some((entry) => entry.workflow_id === workflowId);
}

// ============================================================================
// Detailed Analytics Hook
// ============================================================================

export type UseDetailedAnalyticsState = {
  detailedAnalytics: DetailedAnalyticsData | null;
  isLoading: boolean;
  error: string | null;
};

const EMPTY_DETAILED_ANALYTICS: DetailedAnalyticsData = {
  by_symbol: [],
  by_timeframe: [],
  by_month: [],
  streaks: { current: 0, best_win_streak: 0, worst_loss_streak: 0 },
  equity_curve: [],
  recent_trades: [],
};

/**
 * Hook for fetching detailed journal analytics.
 * Includes performance breakdowns by symbol, timeframe, month,
 * streak information, and equity curve data.
 */
export function useDetailedJournalAnalytics(recentCount: number = 5) {
  const [state, setState] = useState<UseDetailedAnalyticsState>({
    detailedAnalytics: null,
    isLoading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await getDetailedAnalytics(recentCount);
      setState({
        detailedAnalytics: response.analytics,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to fetch detailed analytics:", error);

      const isUnavailable =
        error instanceof Error &&
        (error.message.includes("Backend unavailable") ||
          error.message.includes("fetch") ||
          error.message.includes("Failed to fetch"));

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: isUnavailable
          ? "Backend unavailable"
          : "Failed to load detailed analytics",
      }));
    }
  }, [recentCount]);

  useEffect(() => {
    void (async () => {
      await refresh();
    })();
  }, [refresh]);

  return {
    ...state,
    detailedAnalytics: state.detailedAnalytics ?? EMPTY_DETAILED_ANALYTICS,
    refresh,
  };
}
