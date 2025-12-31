"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { WorkflowState } from "./use-workflow-state";
import { DEFAULT_WORKFLOW_STATE, WORKFLOW_STEPS, validateStep } from "./use-workflow-state";

// ============================================================================
// Multi-Workflow Types
// ============================================================================

export type WorkflowStatus = "pending" | "active" | "completed" | "cancelled";

export type WorkflowSummary = {
  id: string;
  name: string;
  status: WorkflowStatus;
  symbol: string;
  tradeDirection: string;
  currentStep: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  entryPrice: number | null;
  stopLoss: number | null;
  riskRewardRatio: number | null;
};

export type StoredWorkflow = {
  id: string;
  name: string;
  status: WorkflowStatus;
  state: WorkflowState;
  createdAt: string;
  updatedAt: string;
};

export type WorkflowStore = {
  workflows: StoredWorkflow[];
  activeWorkflowId: string | null;
  version: number;
};

// ============================================================================
// Storage Configuration
// ============================================================================

const STORAGE_KEY = "trader-workflow-store";
const LEGACY_KEY = "trader-workflow-state";

const listeners = new Set<() => void>();
let cachedStore: WorkflowStore | null = null;
let cachedRawValue: string | null = null;

function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generateName(symbol: string, tradeDirection: string): string {
  const direction = tradeDirection === "GO_LONG" ? "Long" : tradeDirection === "GO_SHORT" ? "Short" : "Pending";
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${symbol} ${direction} - ${date}`;
}

function getDefaultStore(): WorkflowStore {
  return {
    workflows: [],
    activeWorkflowId: null,
    version: 1,
  };
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedRawValue = null;
      cachedStore = null;
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function notifyListeners() {
  cachedRawValue = null;
  cachedStore = null;
  listeners.forEach((listener) => listener());
}

function migrateLegacyState(): StoredWorkflow | null {
  try {
    const legacyData = localStorage.getItem(LEGACY_KEY);
    if (!legacyData) return null;

    const legacyState = JSON.parse(legacyData) as WorkflowState;

    // Only migrate if there's meaningful data
    if (legacyState.currentStep <= 1 && legacyState.pivots.length === 0) {
      localStorage.removeItem(LEGACY_KEY);
      return null;
    }

    const workflow: StoredWorkflow = {
      id: generateId(),
      name: generateName(legacyState.symbol, legacyState.tradeDirection),
      status: legacyState.tradeStatus === "closed" ? "completed" : "pending",
      state: legacyState,
      createdAt: legacyState.lastUpdated,
      updatedAt: legacyState.lastUpdated,
    };

    // Remove legacy key after migration
    localStorage.removeItem(LEGACY_KEY);

    return workflow;
  } catch {
    return null;
  }
}

function getSnapshot(): WorkflowStore {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === cachedRawValue && cachedStore) {
      return cachedStore;
    }

    cachedRawValue = stored;

    if (stored) {
      cachedStore = JSON.parse(stored) as WorkflowStore;
    } else {
      // Check for legacy state to migrate
      const legacyWorkflow = migrateLegacyState();
      if (legacyWorkflow) {
        cachedStore = {
          ...getDefaultStore(),
          workflows: [legacyWorkflow],
          activeWorkflowId: legacyWorkflow.id,
        };
        // Save migrated data
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedStore));
      } else {
        cachedStore = getDefaultStore();
      }
    }

    return cachedStore;
  } catch (error) {
    console.error("Failed to load workflow store:", error);
    return cachedStore ?? getDefaultStore();
  }
}

function getServerSnapshot(): WorkflowStore {
  return getDefaultStore();
}

function saveStore(store: WorkflowStore): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    notifyListeners();
    return true;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === "QuotaExceededError") {
        console.error("Failed to save workflows: localStorage quota exceeded");
      } else if (error.name === "SecurityError") {
        console.error("Failed to save workflows: localStorage access denied");
      } else {
        console.error("Failed to save workflows:", error.name, error.message);
      }
    } else {
      console.error("Failed to save workflows:", error);
    }
    return false;
  }
}

// ============================================================================
// Workflow Summary Helpers
// ============================================================================

function createSummary(workflow: StoredWorkflow): WorkflowSummary {
  const { state } = workflow;
  return {
    id: workflow.id,
    name: workflow.name,
    status: workflow.status,
    symbol: state.symbol,
    tradeDirection: state.tradeDirection,
    currentStep: state.currentStep,
    totalSteps: WORKFLOW_STEPS.length,
    createdAt: workflow.createdAt,
    updatedAt: workflow.updatedAt,
    entryPrice: state.entryPrice > 0 ? state.entryPrice : null,
    stopLoss: state.stopLoss > 0 ? state.stopLoss : null,
    riskRewardRatio: state.riskRewardRatio > 0 ? state.riskRewardRatio : null,
  };
}

function getWorkflowProgress(workflow: StoredWorkflow): number {
  const { state } = workflow;
  // Calculate progress based on completed steps
  const completedCount = state.completedSteps.length;
  return Math.round((completedCount / WORKFLOW_STEPS.length) * 100);
}

function getWorkflowValidation(workflow: StoredWorkflow): { valid: boolean; issues: string[] } {
  const { state } = workflow;
  const issues: string[] = [];

  // Check each step's validation
  for (let step = 1; step <= state.currentStep; step++) {
    const validation = validateStep(state, step);
    if (!validation.valid && validation.reason) {
      issues.push(`Step ${step}: ${validation.reason}`);
    }
  }

  // Additional data integrity checks
  if (state.positionSize === 0 && state.currentStep >= 6) {
    issues.push("Position size not calculated");
  }
  if (state.higherTrend !== state.lowerTrend && state.tradeDirection !== "STAND_ASIDE") {
    issues.push("Trend alignment mismatch");
  }
  if (state.riskRewardRatio > 0 && state.riskRewardRatio < 2) {
    issues.push("Risk:Reward below 2:1");
  }

  return { valid: issues.length === 0, issues };
}

// ============================================================================
// Hook
// ============================================================================

export function useWorkflowManager() {
  const store = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Get all workflows with summaries
  const workflows = store.workflows.map(createSummary);

  // Get pending workflows (not completed or cancelled)
  const pendingWorkflows = workflows.filter(
    (w) => w.status === "pending" || w.status === "active"
  );

  // Get completed workflows
  const completedWorkflows = workflows.filter((w) => w.status === "completed");

  // Get active workflow
  const activeWorkflow = store.workflows.find((w) => w.id === store.activeWorkflowId) ?? null;
  const activeWorkflowSummary = activeWorkflow ? createSummary(activeWorkflow) : null;

  // Create a new workflow
  const createWorkflow = useCallback((initialState?: Partial<WorkflowState>): string => {
    const now = new Date().toISOString();
    const state: WorkflowState = { ...DEFAULT_WORKFLOW_STATE, ...initialState, lastUpdated: now };
    const id = generateId();

    const workflow: StoredWorkflow = {
      id,
      name: generateName(state.symbol, state.tradeDirection),
      status: "pending",
      state,
      createdAt: now,
      updatedAt: now,
    };

    const currentStore = getSnapshot();
    const updatedStore: WorkflowStore = {
      ...currentStore,
      workflows: [...currentStore.workflows, workflow],
      activeWorkflowId: id,
    };

    saveStore(updatedStore);
    return id;
  }, []);

  // Set active workflow
  const setActiveWorkflow = useCallback((id: string | null): boolean => {
    const currentStore = getSnapshot();

    if (id !== null && !currentStore.workflows.find((w) => w.id === id)) {
      console.warn(`Workflow ${id} not found`);
      return false;
    }

    saveStore({ ...currentStore, activeWorkflowId: id });
    return true;
  }, []);

  // Update active workflow state
  const updateActiveWorkflow = useCallback((updates: Partial<WorkflowState>): boolean => {
    const currentStore = getSnapshot();

    if (!currentStore.activeWorkflowId) {
      console.warn("No active workflow to update");
      return false;
    }

    const workflowIndex = currentStore.workflows.findIndex(
      (w) => w.id === currentStore.activeWorkflowId
    );

    if (workflowIndex === -1) {
      console.warn("Active workflow not found");
      return false;
    }

    const now = new Date().toISOString();
    const workflow = currentStore.workflows[workflowIndex];
    const updatedState = { ...workflow.state, ...updates, lastUpdated: now };

    // Update workflow name if symbol or direction changed
    let name = workflow.name;
    if (updates.symbol || updates.tradeDirection) {
      name = generateName(
        updates.symbol ?? workflow.state.symbol,
        updates.tradeDirection ?? workflow.state.tradeDirection
      );
    }

    // Update status based on trade status
    let status = workflow.status;
    if (updates.tradeStatus === "closed") {
      status = "completed";
    } else if (updates.currentStep && updates.currentStep > 1) {
      status = "active";
    }

    const updatedWorkflow: StoredWorkflow = {
      ...workflow,
      name,
      status,
      state: updatedState,
      updatedAt: now,
    };

    const workflows = [...currentStore.workflows];
    workflows[workflowIndex] = updatedWorkflow;

    return saveStore({ ...currentStore, workflows });
  }, []);

  // Delete a workflow
  const deleteWorkflow = useCallback((id: string): boolean => {
    const currentStore = getSnapshot();
    const workflows = currentStore.workflows.filter((w) => w.id !== id);

    // Clear active if deleted
    const activeWorkflowId = currentStore.activeWorkflowId === id
      ? null
      : currentStore.activeWorkflowId;

    return saveStore({ ...currentStore, workflows, activeWorkflowId });
  }, []);

  // Duplicate a workflow (useful for retrying with modifications)
  const duplicateWorkflow = useCallback((id: string): string | null => {
    const currentStore = getSnapshot();
    const source = currentStore.workflows.find((w) => w.id === id);

    if (!source) {
      console.warn(`Workflow ${id} not found`);
      return null;
    }

    const now = new Date().toISOString();
    const newId = generateId();

    const newWorkflow: StoredWorkflow = {
      id: newId,
      name: `${source.name} (Copy)`,
      status: "pending",
      state: { ...source.state, currentStep: 1, completedSteps: [], lastUpdated: now },
      createdAt: now,
      updatedAt: now,
    };

    const updatedStore: WorkflowStore = {
      ...currentStore,
      workflows: [...currentStore.workflows, newWorkflow],
      activeWorkflowId: newId,
    };

    saveStore(updatedStore);
    return newId;
  }, []);

  // Mark workflow as completed
  const completeWorkflow = useCallback((id: string): boolean => {
    const currentStore = getSnapshot();
    const workflowIndex = currentStore.workflows.findIndex((w) => w.id === id);

    if (workflowIndex === -1) {
      console.warn(`Workflow ${id} not found`);
      return false;
    }

    const now = new Date().toISOString();
    const workflow = currentStore.workflows[workflowIndex];
    const updatedWorkflow: StoredWorkflow = {
      ...workflow,
      status: "completed",
      state: { ...workflow.state, tradeStatus: "closed" },
      updatedAt: now,
    };

    const workflows = [...currentStore.workflows];
    workflows[workflowIndex] = updatedWorkflow;

    return saveStore({ ...currentStore, workflows });
  }, []);

  // Cancel workflow
  const cancelWorkflow = useCallback((id: string): boolean => {
    const currentStore = getSnapshot();
    const workflowIndex = currentStore.workflows.findIndex((w) => w.id === id);

    if (workflowIndex === -1) {
      console.warn(`Workflow ${id} not found`);
      return false;
    }

    const now = new Date().toISOString();
    const workflow = currentStore.workflows[workflowIndex];
    const updatedWorkflow: StoredWorkflow = {
      ...workflow,
      status: "cancelled",
      updatedAt: now,
    };

    const workflows = [...currentStore.workflows];
    workflows[workflowIndex] = updatedWorkflow;

    // Clear active if cancelled
    const activeWorkflowId = currentStore.activeWorkflowId === id
      ? null
      : currentStore.activeWorkflowId;

    return saveStore({ ...currentStore, workflows, activeWorkflowId });
  }, []);

  // Get full workflow by ID
  const getWorkflow = useCallback((id: string): StoredWorkflow | null => {
    return store.workflows.find((w) => w.id === id) ?? null;
  }, [store.workflows]);

  // Get workflow progress
  const getProgress = useCallback((id: string): number => {
    const workflow = store.workflows.find((w) => w.id === id);
    return workflow ? getWorkflowProgress(workflow) : 0;
  }, [store.workflows]);

  // Get workflow validation
  const getValidation = useCallback((id: string): { valid: boolean; issues: string[] } => {
    const workflow = store.workflows.find((w) => w.id === id);
    return workflow ? getWorkflowValidation(workflow) : { valid: false, issues: ["Workflow not found"] };
  }, [store.workflows]);

  // Clear all workflows (for testing/reset)
  const clearAll = useCallback((): boolean => {
    return saveStore(getDefaultStore());
  }, []);

  return {
    // Data
    workflows,
    pendingWorkflows,
    completedWorkflows,
    activeWorkflow,
    activeWorkflowSummary,
    hasActiveWorkflow: store.activeWorkflowId !== null,

    // CRUD Operations
    createWorkflow,
    setActiveWorkflow,
    updateActiveWorkflow,
    deleteWorkflow,
    duplicateWorkflow,

    // Status Operations
    completeWorkflow,
    cancelWorkflow,

    // Utilities
    getWorkflow,
    getProgress,
    getValidation,
    clearAll,
  };
}

export { WORKFLOW_STEPS };
