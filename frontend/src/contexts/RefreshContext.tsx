"use client";

/**
 * Unified Refresh Context - Coordinates all data refresh operations.
 *
 * Provides:
 * - Centralized refresh status tracking
 * - Visual feedback for refresh operations
 * - Countdown timers for auto-refresh
 * - Manual refresh triggers
 * - Last updated timestamps per data source
 */

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

/**
 * Data sources that can be refreshed
 */
export type DataSource = "market" | "trends" | "opportunities" | "validation";

/**
 * Refresh status for a data source
 */
export type RefreshStatus = "idle" | "refreshing" | "success" | "error";

/**
 * Entry for each data source
 */
export type RefreshEntry = {
  status: RefreshStatus;
  lastUpdated: Date | null;
  lastRefreshDuration: number | null; // milliseconds
  countdown: number; // seconds until next auto-refresh
  autoRefreshEnabled: boolean;
  error: string | null;
  /** Visible animation trigger - increments on each refresh */
  refreshCount: number;
};

/**
 * Store state
 */
type RefreshStore = {
  entries: Map<DataSource, RefreshEntry>;
  /** Global refresh in progress flag */
  isRefreshing: boolean;
  /** Last global refresh timestamp */
  lastGlobalRefresh: Date | null;
};

/**
 * Default entry for a data source
 */
function createDefaultEntry(): RefreshEntry {
  return {
    status: "idle",
    lastUpdated: null,
    lastRefreshDuration: null,
    countdown: 60,
    autoRefreshEnabled: true,
    error: null,
    refreshCount: 0,
  };
}

/**
 * Context value type
 */
type RefreshContextValue = {
  // Get refresh entry for a data source
  getEntry: (source: DataSource) => RefreshEntry;

  // Start a refresh operation (marks as refreshing)
  startRefresh: (source: DataSource) => void;

  // Complete a refresh operation (marks as success/error)
  completeRefresh: (source: DataSource, error?: string | null) => void;

  // Update countdown for a data source
  updateCountdown: (source: DataSource, countdown: number) => void;

  // Toggle auto-refresh for a data source
  setAutoRefreshEnabled: (source: DataSource, enabled: boolean) => void;

  // Trigger global refresh (all sources)
  refreshAll: () => void;

  // Is any source currently refreshing?
  isAnyRefreshing: boolean;

  // Subscribe to store updates
  subscribe: (listener: () => void) => () => void;

  // Get snapshot for useSyncExternalStore
  getSnapshot: () => RefreshStore;
};

const RefreshContext = createContext<RefreshContextValue | null>(null);

/**
 * Create initial store state
 */
function createStore(): RefreshStore {
  const entries = new Map<DataSource, RefreshEntry>();
  entries.set("market", createDefaultEntry());
  entries.set("trends", createDefaultEntry());
  entries.set("opportunities", createDefaultEntry());
  entries.set("validation", createDefaultEntry());

  return {
    entries,
    isRefreshing: false,
    lastGlobalRefresh: null,
  };
}

export function RefreshProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<RefreshStore>(createStore());
  const listenersRef = useRef<Set<() => void>>(new Set());
  const refreshCallbacksRef = useRef<Map<DataSource, () => void>>(new Map());

  // Notify all subscribers of state change
  const emitChange = useCallback(() => {
    listenersRef.current.forEach((listener) => listener());
  }, []);

  // Subscribe to store updates
  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  // Get current snapshot
  const getSnapshot = useCallback(() => {
    return storeRef.current;
  }, []);

  // Get entry for a data source
  const getEntry = useCallback((source: DataSource): RefreshEntry => {
    return storeRef.current.entries.get(source) || createDefaultEntry();
  }, []);

  // Start a refresh operation
  const startRefresh = useCallback(
    (source: DataSource) => {
      const entry = storeRef.current.entries.get(source) || createDefaultEntry();
      storeRef.current.entries.set(source, {
        ...entry,
        status: "refreshing",
        refreshCount: entry.refreshCount + 1,
      });
      storeRef.current.isRefreshing = true;
      emitChange();
    },
    [emitChange]
  );

  // Complete a refresh operation
  const completeRefresh = useCallback(
    (source: DataSource, error?: string | null) => {
      const entry = storeRef.current.entries.get(source) || createDefaultEntry();
      const startTime = entry.lastUpdated?.getTime() || Date.now();
      const duration = Date.now() - startTime;

      storeRef.current.entries.set(source, {
        ...entry,
        status: error ? "error" : "success",
        lastUpdated: new Date(),
        lastRefreshDuration: duration,
        error: error || null,
      });

      // Check if any source is still refreshing
      let anyRefreshing = false;
      storeRef.current.entries.forEach((e) => {
        if (e.status === "refreshing") anyRefreshing = true;
      });
      storeRef.current.isRefreshing = anyRefreshing;

      if (!anyRefreshing) {
        storeRef.current.lastGlobalRefresh = new Date();
      }

      emitChange();
    },
    [emitChange]
  );

  // Update countdown for a data source
  const updateCountdown = useCallback(
    (source: DataSource, countdown: number) => {
      const entry = storeRef.current.entries.get(source) || createDefaultEntry();
      storeRef.current.entries.set(source, {
        ...entry,
        countdown,
      });
      emitChange();
    },
    [emitChange]
  );

  // Toggle auto-refresh for a data source
  const setAutoRefreshEnabled = useCallback(
    (source: DataSource, enabled: boolean) => {
      const entry = storeRef.current.entries.get(source) || createDefaultEntry();
      storeRef.current.entries.set(source, {
        ...entry,
        autoRefreshEnabled: enabled,
      });
      emitChange();
    },
    [emitChange]
  );

  // Trigger global refresh
  const refreshAll = useCallback(() => {
    refreshCallbacksRef.current.forEach((callback) => callback());
  }, []);

  // Calculate isAnyRefreshing from store
  const isAnyRefreshing = useSyncExternalStore(
    subscribe,
    () => getSnapshot().isRefreshing,
    () => false
  );

  const contextValue: RefreshContextValue = {
    getEntry,
    startRefresh,
    completeRefresh,
    updateCountdown,
    setAutoRefreshEnabled,
    refreshAll,
    isAnyRefreshing,
    subscribe,
    getSnapshot,
  };

  return (
    <RefreshContext.Provider value={contextValue}>
      {children}
    </RefreshContext.Provider>
  );
}

/**
 * Hook to access the refresh context
 */
export function useRefreshContext(): RefreshContextValue {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefreshContext must be used within a RefreshProvider");
  }
  return context;
}

/**
 * Hook to get refresh status for a specific data source
 */
export function useRefreshStatus(source: DataSource): RefreshEntry {
  const context = useRefreshContext();

  return useSyncExternalStore(
    context.subscribe,
    () => context.getEntry(source),
    () => createDefaultEntry()
  );
}

/**
 * Hook to check if any data source is refreshing
 */
export function useIsRefreshing(): boolean {
  const context = useRefreshContext();

  return useSyncExternalStore(
    context.subscribe,
    () => context.getSnapshot().isRefreshing,
    () => false
  );
}

/**
 * Format time ago for display
 */
export function formatTimeAgo(date: Date | null): string {
  if (!date) return "Never";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Format countdown for display
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Refreshing...";
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
