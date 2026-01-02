/**
 * Validation with Overrides Hook
 *
 * Enhances the base validation hook with:
 * - Configurable check importance (required/warning/ignored)
 * - Override capability for warning checks
 * - Override logging for journal integration
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { useTradeValidation, type ValidationCheck } from "./use-trade-validation";
import type { TradeOpportunity } from "./use-trade-discovery";
import {
  type CheckImportance,
  type ValidationCheckType,
  DEFAULT_CHECK_IMPORTANCE,
} from "@/lib/educational/validation-explanations";

const STORAGE_KEY = "workflow-v2-check-importance";

/**
 * Map check names to ValidationCheckType
 */
const CHECK_NAME_TO_TYPE: Record<string, ValidationCheckType> = {
  "Trend Alignment": "trend_alignment",
  "Entry Zone": "entry_zone",
  "Target Zones": "target_zones",
  "RSI Confirmation": "rsi_confirmation",
  "MACD Confirmation": "macd_confirmation",
};

/**
 * Extended validation check with importance and override state
 */
export type ValidationCheckWithOverride = ValidationCheck & {
  /** Check importance level */
  importance: CheckImportance;
  /** Whether this check has been overridden */
  isOverridden: boolean;
  /** Whether this check can be overridden */
  canOverride: boolean;
  /** Check type for educational content lookup */
  checkType: ValidationCheckType | null;
};

/**
 * Override log entry
 */
export type OverrideLogEntry = {
  /** Name of the overridden check */
  checkName: string;
  /** User-provided reason for override */
  reason: string;
  /** When the override was made */
  timestamp: string;
};

export type UseValidationWithOverridesOptions = {
  opportunity: TradeOpportunity | null;
  enabled: boolean;
};

export type UseValidationWithOverridesResult = {
  /** Enhanced checks with importance and override state */
  checks: ValidationCheckWithOverride[];
  /** Loading state */
  isLoading: boolean;
  /** Original validation result */
  originalResult: ReturnType<typeof useTradeValidation>["result"];
  /** Names of overridden checks */
  overriddenChecks: string[];
  /** Names of failed required checks */
  failedRequiredChecks: string[];
  /** Effective pass percentage (considering overrides and ignored) */
  effectivePassPercentage: number;
  /** Whether validation passes considering overrides */
  isEffectivelyValid: boolean;
  /** Override log for journaling */
  overrideLog: OverrideLogEntry[];
  /** Set importance for a check */
  setCheckImportance: (checkName: string, importance: CheckImportance) => void;
  /** Override a failed warning check */
  overrideCheck: (checkName: string, reason?: string) => void;
  /** Remove an override */
  removeOverride: (checkName: string) => void;
  /** Clear all overrides */
  clearOverrides: () => void;
  /** Get override log for journal export */
  getOverrideLogForJournal: () => OverrideLogEntry[];
};

/**
 * Load importance settings from localStorage
 */
function loadImportanceSettings(): Record<string, CheckImportance> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

/**
 * Save importance settings to localStorage
 */
function saveImportanceSettings(settings: Record<string, CheckImportance>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Hook to add override capability to trade validation
 */
export function useValidationWithOverrides({
  opportunity,
  enabled,
}: UseValidationWithOverridesOptions): UseValidationWithOverridesResult {
  // Get base validation result
  const { result: originalResult, isLoading } = useTradeValidation({
    opportunity,
    enabled,
  });

  // State for importance settings
  const [importanceSettings, setImportanceSettings] = useState<
    Record<string, CheckImportance>
  >(() => loadImportanceSettings());

  // State for overrides
  const [overrides, setOverrides] = useState<Set<string>>(new Set());

  // State for override log
  const [overrideLog, setOverrideLog] = useState<OverrideLogEntry[]>([]);

  // Track previous opportunity ID to clear overrides when it changes
  const prevOpportunityIdRef = useRef<string | undefined>(opportunity?.id);
  if (prevOpportunityIdRef.current !== opportunity?.id) {
    prevOpportunityIdRef.current = opportunity?.id;
    // Clear overrides when opportunity changes (synchronous update during render)
    if (overrides.size > 0) {
      setOverrides(new Set());
    }
    if (overrideLog.length > 0) {
      setOverrideLog([]);
    }
  }

  // Get importance for a check
  const getImportance = useCallback(
    (checkName: string): CheckImportance => {
      // Check user settings first
      if (importanceSettings[checkName]) {
        return importanceSettings[checkName];
      }
      // Fall back to default
      const checkType = CHECK_NAME_TO_TYPE[checkName];
      if (checkType) {
        return DEFAULT_CHECK_IMPORTANCE[checkType];
      }
      return "warning";
    },
    [importanceSettings]
  );

  // Set importance for a check
  const setCheckImportance = useCallback(
    (checkName: string, importance: CheckImportance) => {
      setImportanceSettings((prev) => {
        const updated = { ...prev, [checkName]: importance };
        saveImportanceSettings(updated);
        return updated;
      });
    },
    []
  );

  // Override a check
  const overrideCheck = useCallback(
    (checkName: string, reason: string = "") => {
      const check = originalResult.checks.find((c) => c.name === checkName);
      if (!check) return;

      // Can only override failed warning checks
      const importance = getImportance(checkName);
      if (check.passed || importance !== "warning") return;

      setOverrides((prev) => new Set(prev).add(checkName));
      setOverrideLog((prev) => [
        ...prev,
        {
          checkName,
          reason,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    [originalResult.checks, getImportance]
  );

  // Remove an override
  const removeOverride = useCallback((checkName: string) => {
    setOverrides((prev) => {
      const updated = new Set(prev);
      updated.delete(checkName);
      return updated;
    });
    setOverrideLog((prev) => prev.filter((log) => log.checkName !== checkName));
  }, []);

  // Clear all overrides
  const clearOverrides = useCallback(() => {
    setOverrides(new Set());
    setOverrideLog([]);
  }, []);

  // Build enhanced checks
  const checks = useMemo((): ValidationCheckWithOverride[] => {
    return originalResult.checks.map((check) => {
      const importance = getImportance(check.name);
      const isOverridden = overrides.has(check.name);
      const canOverride = !check.passed && importance === "warning";
      const checkType = CHECK_NAME_TO_TYPE[check.name] ?? null;

      return {
        ...check,
        importance,
        isOverridden,
        canOverride,
        checkType,
      };
    });
  }, [originalResult.checks, getImportance, overrides]);

  // Get overridden check names
  const overriddenChecks = useMemo(() => Array.from(overrides), [overrides]);

  // Get failed required checks
  const failedRequiredChecks = useMemo(() => {
    return checks
      .filter((c) => !c.passed && c.importance === "required")
      .map((c) => c.name);
  }, [checks]);

  // Calculate effective pass percentage
  const effectivePassPercentage = useMemo(() => {
    // Filter out ignored checks
    const activeChecks = checks.filter((c) => c.importance !== "ignored");
    if (activeChecks.length === 0) return 100;

    // Count passed or overridden
    const effectivelyPassed = activeChecks.filter(
      (c) => c.passed || c.isOverridden
    ).length;

    return Math.round((effectivelyPassed / activeChecks.length) * 100);
  }, [checks]);

  // Check if effectively valid
  const isEffectivelyValid = useMemo(() => {
    // Must have no failed required checks
    if (failedRequiredChecks.length > 0) return false;

    // Must have at least 60% effective pass rate
    return effectivePassPercentage >= 60;
  }, [failedRequiredChecks, effectivePassPercentage]);

  // Get override log for journal export
  const getOverrideLogForJournal = useCallback(() => {
    return [...overrideLog];
  }, [overrideLog]);

  return {
    checks,
    isLoading,
    originalResult,
    overriddenChecks,
    failedRequiredChecks,
    effectivePassPercentage,
    isEffectivelyValid,
    overrideLog,
    setCheckImportance,
    overrideCheck,
    removeOverride,
    clearOverrides,
    getOverrideLogForJournal,
  };
}
