"use client";

import { useCallback, useSyncExternalStore } from "react";
import type {
  MarketSymbol,
  Timeframe,
  TrendDirection,
  TradeAction,
  TradingStyle,
  PivotPoint,
  DataSource,
} from "@/lib/chart-constants";

// Re-export types that are used in components
export type { PivotPoint } from "@/lib/chart-constants";

// ============================================================================
// Workflow Types
// ============================================================================

export type FibonacciTool = "retracement" | "extension" | "projection" | "expansion";

export type FibonacciLevel = {
  ratio: number;
  price: number;
  label: string;
};

export type DetectedPattern = {
  type: "gartley" | "butterfly" | "bat" | "crab";
  direction: "buy" | "sell";
  confidence: number;
  x: number;
  a: number;
  b: number;
  c: number;
  d: number;
};

export type DetectedSignal = {
  timeframe: Timeframe;
  signalType: "type_1" | "type_2";
  direction: "buy" | "sell";
  level: number;
  levelType: string;
  strength: number;
};

export type SignalBar = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  signalType: "type_1" | "type_2";
  direction: "buy" | "sell";
  level: number;
};

export type ChecklistItem = {
  id: string;
  label: string;
  category: "trend" | "fibonacci" | "signal" | "risk" | "timing";
  checked: boolean;
  required: boolean;
  autoValidated?: boolean;
};

export type TradeLogEntry = {
  timestamp: string;
  action: "entry" | "stop_moved" | "partial_close" | "target_hit" | "exit";
  price: number;
  note: string;
};

export type TradeStatus = "pending" | "active" | "at_breakeven" | "trailing" | "closed";

export type GoNoGoDecision = "GO" | "NO_GO" | "PENDING";

// ============================================================================
// Workflow State
// ============================================================================

export type WorkflowState = {
  // Workflow progress
  currentStep: number;
  completedSteps: number[];
  lastUpdated: string;

  // Step 1: Market Selection
  symbol: MarketSymbol;
  higherTimeframe: Timeframe;
  lowerTimeframe: Timeframe;
  tradingStyle: TradingStyle;
  dataSource: DataSource;

  // Step 2: Trend Alignment
  higherTrend: TrendDirection;
  lowerTrend: TrendDirection;
  tradeDirection: TradeAction;
  trendConfidence: number;

  // Step 3: Fibonacci Setup
  pivots: PivotPoint[];
  fibTool: FibonacciTool;
  fibLevels: FibonacciLevel[];
  selectedLevelIndex: number | null;

  // Step 4: Pattern Scan
  detectedPatterns: DetectedPattern[];
  detectedSignals: DetectedSignal[];
  scanCompleted: boolean;

  // Step 5: Entry Confirmation
  selectedLevel: number | null;
  signalBar: SignalBar | null;
  entryConfirmed: boolean;

  // Step 6: Position Sizing
  entryPrice: number;
  stopLoss: number;
  targets: number[];
  positionSize: number;
  riskRewardRatio: number;
  riskAmount: number;

  // Step 7: Checklist
  checklistItems: ChecklistItem[];
  goNoGo: GoNoGoDecision;

  // Step 8: Trade Management
  tradeStatus: TradeStatus;
  currentPnL: number;
  breakEvenPrice: number;
  freeTradeActive: boolean;
  trailingEnabled: boolean;
  trailingStopPrice: number | null;
  tradeLog: TradeLogEntry[];
};

// ============================================================================
// Default Values
// ============================================================================

const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  // Trend checks
  { id: "trend-aligned", label: "Higher and lower timeframe trends are aligned", category: "trend", checked: false, required: true, autoValidated: true },
  { id: "trade-direction", label: "Trade direction is GO_LONG or GO_SHORT (not STAND_ASIDE)", category: "trend", checked: false, required: true, autoValidated: true },

  // Fibonacci checks
  { id: "fib-levels", label: "Fibonacci levels calculated and displayed", category: "fibonacci", checked: false, required: true, autoValidated: true },
  { id: "price-at-level", label: "Price is at or near a key Fibonacci level", category: "fibonacci", checked: false, required: true },

  // Signal checks
  { id: "signal-bar", label: "Valid signal bar formed at the level", category: "signal", checked: false, required: true, autoValidated: true },
  { id: "signal-direction", label: "Signal bar direction matches trade direction", category: "signal", checked: false, required: true, autoValidated: true },

  // Risk checks
  { id: "rr-acceptable", label: "Risk:Reward ratio is 2:1 or better", category: "risk", checked: false, required: true, autoValidated: true },
  { id: "risk-limit", label: "Risk is within acceptable limits (< 2% of account)", category: "risk", checked: false, required: false },
  { id: "stop-placement", label: "Stop loss placed beyond swing high/low", category: "risk", checked: false, required: true },

  // Timing checks
  { id: "market-open", label: "Market is open or scheduled to open soon", category: "timing", checked: false, required: false },
  { id: "no-news", label: "No major news events pending", category: "timing", checked: false, required: false },
];

const DEFAULT_STATE: WorkflowState = {
  // Workflow progress
  currentStep: 1,
  completedSteps: [],
  lastUpdated: new Date().toISOString(),

  // Step 1: Market Selection
  symbol: "SPX",
  higherTimeframe: "1D",
  lowerTimeframe: "4H",
  tradingStyle: "swing",
  dataSource: "yahoo",

  // Step 2: Trend Alignment
  higherTrend: "NEUTRAL",
  lowerTrend: "NEUTRAL",
  tradeDirection: "STAND_ASIDE",
  trendConfidence: 0,

  // Step 3: Fibonacci Setup
  pivots: [],
  fibTool: "retracement",
  fibLevels: [],
  selectedLevelIndex: null,

  // Step 4: Pattern Scan
  detectedPatterns: [],
  detectedSignals: [],
  scanCompleted: false,

  // Step 5: Entry Confirmation
  selectedLevel: null,
  signalBar: null,
  entryConfirmed: false,

  // Step 6: Position Sizing
  entryPrice: 0,
  stopLoss: 0,
  targets: [],
  positionSize: 0,
  riskRewardRatio: 0,
  riskAmount: 0,

  // Step 7: Checklist
  checklistItems: DEFAULT_CHECKLIST_ITEMS,
  goNoGo: "PENDING",

  // Step 8: Trade Management
  tradeStatus: "pending",
  currentPnL: 0,
  breakEvenPrice: 0,
  freeTradeActive: false,
  trailingEnabled: false,
  trailingStopPrice: null,
  tradeLog: [],
};

// ============================================================================
// Storage Configuration
// ============================================================================

const LEGACY_STORAGE_KEY = "trader-workflow-state";
const MANAGER_STORAGE_KEY = "trader-workflow-store";

// Storage event listeners for cross-tab sync
const listeners = new Set<() => void>();

// Cache for getSnapshot to avoid infinite loops
let cachedState: WorkflowState = DEFAULT_STATE;
let cachedRawValue: string | null = null;

function subscribe(callback: () => void) {
  listeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === MANAGER_STORAGE_KEY || e.key === LEGACY_STORAGE_KEY) {
      cachedRawValue = null;
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
  listeners.forEach((listener) => listener());
}

type StoredWorkflow = {
  id: string;
  name: string;
  status: string;
  state: WorkflowState;
  createdAt: string;
  updatedAt: string;
};

type WorkflowStore = {
  workflows: StoredWorkflow[];
  activeWorkflowId: string | null;
  version: number;
};

function getSnapshot(): WorkflowState {
  try {
    // First, try to read from the new workflow manager store
    const managerStore = localStorage.getItem(MANAGER_STORAGE_KEY);

    if (managerStore) {
      const store = JSON.parse(managerStore) as WorkflowStore;

      if (store.activeWorkflowId) {
        const activeWorkflow = store.workflows.find(w => w.id === store.activeWorkflowId);
        if (activeWorkflow) {
          const rawValue = JSON.stringify(activeWorkflow.state);
          if (rawValue === cachedRawValue) {
            return cachedState;
          }
          cachedRawValue = rawValue;
          cachedState = { ...DEFAULT_STATE, ...activeWorkflow.state };
          return cachedState;
        }
      }
    }

    // Fallback to legacy storage for backward compatibility
    const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyStored === cachedRawValue) {
      return cachedState;
    }
    cachedRawValue = legacyStored;
    if (legacyStored) {
      const parsed = JSON.parse(legacyStored) as Partial<WorkflowState>;
      cachedState = { ...DEFAULT_STATE, ...parsed };
    } else {
      cachedState = DEFAULT_STATE;
    }
    return cachedState;
  } catch (error) {
    console.error("Failed to load workflow state:", error);
    return cachedState;
  }
}

function getServerSnapshot(): WorkflowState {
  return DEFAULT_STATE;
}

function saveState(state: WorkflowState): boolean {
  try {
    // Try to save to the workflow manager store first
    const managerStore = localStorage.getItem(MANAGER_STORAGE_KEY);

    if (managerStore) {
      const store = JSON.parse(managerStore) as WorkflowStore;

      if (store.activeWorkflowId) {
        const workflowIndex = store.workflows.findIndex(w => w.id === store.activeWorkflowId);
        if (workflowIndex !== -1) {
          const now = new Date().toISOString();
          store.workflows[workflowIndex] = {
            ...store.workflows[workflowIndex],
            state,
            updatedAt: now,
          };
          localStorage.setItem(MANAGER_STORAGE_KEY, JSON.stringify(store));
          notifyListeners();
          return true;
        }
      }
    }

    // Fallback to legacy storage
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state));
    notifyListeners();
    return true;
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === "QuotaExceededError") {
        console.error("Failed to save workflow state: localStorage quota exceeded");
      } else if (error.name === "SecurityError") {
        console.error("Failed to save workflow state: localStorage access denied (private mode?)");
      } else {
        console.error("Failed to save workflow state:", error.name, error.message);
      }
    } else if (error instanceof TypeError) {
      console.error("Failed to save workflow state: non-serializable data in state", error);
    } else {
      console.error("Failed to save workflow state:", error);
    }
    return false;
  }
}

// ============================================================================
// Step Validation
// ============================================================================

export const WORKFLOW_STEPS = [
  { number: 1, name: "Market", title: "Market & Timeframe Selection" },
  { number: 2, name: "Trend", title: "Trend Alignment Check" },
  { number: 3, name: "Fibonacci", title: "Fibonacci Setup" },
  { number: 4, name: "Patterns", title: "Pattern & Signal Scan" },
  { number: 5, name: "Entry", title: "Entry Signal Confirmation" },
  { number: 6, name: "Position", title: "Position Sizing" },
  { number: 7, name: "Checklist", title: "Pre-Trade Checklist" },
  { number: 8, name: "Manage", title: "Trade Management" },
] as const;

export function validateStep(state: WorkflowState, step: number): { valid: boolean; reason?: string } {
  switch (step) {
    case 1:
      // Step 1 is always valid (has defaults)
      return { valid: true };

    case 2:
      // Step 2 blocks if STAND_ASIDE
      if (state.tradeDirection === "STAND_ASIDE") {
        return { valid: false, reason: "Trend alignment is STAND ASIDE - wait for a counter-trend move" };
      }
      return { valid: true };

    case 3:
      // Step 3 requires pivots and levels
      if (state.pivots.length < 2) {
        return { valid: false, reason: "At least 2 pivot points required" };
      }
      if (state.fibLevels.length === 0) {
        return { valid: false, reason: "Fibonacci levels not calculated" };
      }
      return { valid: true };

    case 4:
      // Step 4 requires scan completed
      if (!state.scanCompleted) {
        return { valid: false, reason: "Pattern/signal scan not completed" };
      }
      return { valid: true };

    case 5:
      // Step 5 requires entry confirmation
      if (!state.entryConfirmed) {
        return { valid: false, reason: "Entry signal not confirmed" };
      }
      return { valid: true };

    case 6:
      // Step 6 requires valid R:R
      if (state.riskRewardRatio < 1) {
        return { valid: false, reason: "Risk:Reward ratio must be at least 1:1" };
      }
      if (state.positionSize <= 0) {
        return { valid: false, reason: "Position size not calculated" };
      }
      return { valid: true };

    case 7:
      // Step 7 requires GO decision
      if (state.goNoGo !== "GO") {
        const failedItems = state.checklistItems.filter(item => item.required && !item.checked);
        if (failedItems.length > 0) {
          return { valid: false, reason: `Failed: ${failedItems[0].label}` };
        }
        return { valid: false, reason: "Trade not approved" };
      }
      return { valid: true };

    case 8:
      // Step 8 is always valid (trade management)
      return { valid: true };

    default:
      return { valid: true };
  }
}

// ============================================================================
// Hook
// ============================================================================

export function useWorkflowState() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setState = useCallback((newState: Partial<WorkflowState>) => {
    const current = getSnapshot();
    const updated = { ...current, ...newState, lastUpdated: new Date().toISOString() };
    saveState(updated);
  }, []);

  const resetWorkflow = useCallback(() => {
    saveState({ ...DEFAULT_STATE, lastUpdated: new Date().toISOString() });
  }, []);

  const goToStep = useCallback((step: number) => {
    const current = getSnapshot();
    const validation = validateStep(current, step - 1);

    // Allow going backward or to the same step
    if (step <= current.currentStep) {
      setState({ currentStep: step });
      return true;
    }

    // For forward navigation, validate previous step
    if (!validation.valid) {
      console.warn(`Cannot advance to step ${step}: ${validation.reason}`);
      return false;
    }

    // Mark previous steps as completed
    const completedSteps = [...current.completedSteps];
    for (let i = 1; i < step; i++) {
      if (!completedSteps.includes(i)) {
        completedSteps.push(i);
      }
    }

    setState({ currentStep: step, completedSteps });
    return true;
  }, [setState]);

  const nextStep = useCallback(() => {
    const current = getSnapshot();
    if (current.currentStep >= WORKFLOW_STEPS.length) return false;
    return goToStep(current.currentStep + 1);
  }, [goToStep]);

  const prevStep = useCallback(() => {
    const current = getSnapshot();
    if (current.currentStep <= 1) return false;
    return goToStep(current.currentStep - 1);
  }, [goToStep]);

  const updateChecklist = useCallback((itemId: string, checked: boolean) => {
    const current = getSnapshot();
    const items = current.checklistItems.map(item =>
      item.id === itemId ? { ...item, checked } : item
    );

    // Determine GO/NO_GO based on checklist
    const requiredItems = items.filter(item => item.required);
    const allRequiredChecked = requiredItems.every(item => item.checked);
    const goNoGo: GoNoGoDecision = allRequiredChecked ? "GO" : "PENDING";

    setState({ checklistItems: items, goNoGo });
  }, [setState]);

  const addTradeLogEntry = useCallback((entry: Omit<TradeLogEntry, "timestamp">) => {
    const current = getSnapshot();
    const newEntry: TradeLogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    setState({ tradeLog: [...current.tradeLog, newEntry] });
  }, [setState]);

  const getCurrentStepInfo = useCallback(() => {
    return WORKFLOW_STEPS.find(s => s.number === state.currentStep) || WORKFLOW_STEPS[0];
  }, [state.currentStep]);

  const getStepValidation = useCallback((step: number) => {
    return validateStep(state, step);
  }, [state]);

  return {
    state,
    setState,
    resetWorkflow,
    goToStep,
    nextStep,
    prevStep,
    updateChecklist,
    addTradeLogEntry,
    getCurrentStepInfo,
    getStepValidation,
    steps: WORKFLOW_STEPS,
    defaults: DEFAULT_STATE,
  };
}

export { DEFAULT_STATE as DEFAULT_WORKFLOW_STATE };
