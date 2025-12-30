"use client";

import { useCallback, useSyncExternalStore } from "react";

export type PositionSizingSettings = {
  // Account settings
  accountBalance: number;
  riskPercentage: number; // Risk per trade as % of account (e.g., 1 = 1%)
  riskCapital: number; // Fixed risk amount in currency
  usePercentageRisk: boolean; // true = use percentage, false = use fixed amount

  // Trade parameters (saved as defaults)
  defaultEntryPrice: number;
  defaultStopLossPrice: number;
  defaultTargetPrice: number;

  // Display preferences
  showRiskRewardRatio: boolean;
  showAccountImpact: boolean;
};

export type PositionSizeCalculation = {
  positionSize: number; // Number of units/shares
  riskAmount: number; // Total risk in currency
  distanceToStop: number; // Price distance from entry to stop
  riskRewardRatio: number; // R:R ratio
  potentialProfit: number; // Profit if target hit
  potentialLoss: number; // Loss if stop hit
  accountRiskPercentage: number; // % of account at risk
  isValidTrade: boolean; // Go/No-Go recommendation
  recommendation: string; // Trade recommendation text
};

const DEFAULT_SETTINGS: PositionSizingSettings = {
  accountBalance: 10000,
  riskPercentage: 1,
  riskCapital: 100,
  usePercentageRisk: true,
  defaultEntryPrice: 0,
  defaultStopLossPrice: 0,
  defaultTargetPrice: 0,
  showRiskRewardRatio: true,
  showAccountImpact: true,
};

const SETTINGS_KEY = "trader-position-sizing";

// Storage event listeners for cross-tab sync
const listeners = new Set<() => void>();

// Cache for getSnapshot to avoid infinite loops
let cachedSettings: PositionSizingSettings = DEFAULT_SETTINGS;
let cachedRawValue: string | null = null;

function subscribe(callback: () => void) {
  listeners.add(callback);
  // Also listen for storage events from other tabs
  const handleStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY) {
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

function getSnapshot(): PositionSizingSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored === cachedRawValue) {
      return cachedSettings;
    }
    cachedRawValue = stored;
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<PositionSizingSettings>;
      cachedSettings = { ...DEFAULT_SETTINGS, ...parsed };
    } else {
      cachedSettings = DEFAULT_SETTINGS;
    }
    return cachedSettings;
  } catch (error) {
    console.error("Failed to load position sizing settings:", error);
    return cachedSettings;
  }
}

function getServerSnapshot(): PositionSizingSettings {
  return DEFAULT_SETTINGS;
}

/**
 * Calculate position size based on risk parameters.
 * Formula: Position Size = Risk Capital / Distance to Stop
 */
export function calculatePositionSize(
  entryPrice: number,
  stopLossPrice: number,
  targetPrice: number,
  riskCapital: number,
  accountBalance: number
): PositionSizeCalculation {
  const distanceToStop = Math.abs(entryPrice - stopLossPrice);
  const distanceToTarget = Math.abs(targetPrice - entryPrice);

  // Avoid division by zero
  if (distanceToStop === 0) {
    return {
      positionSize: 0,
      riskAmount: 0,
      distanceToStop: 0,
      riskRewardRatio: 0,
      potentialProfit: 0,
      potentialLoss: 0,
      accountRiskPercentage: 0,
      isValidTrade: false,
      recommendation: "Stop loss cannot be at entry price",
    };
  }

  const positionSize = riskCapital / distanceToStop;
  const potentialLoss = positionSize * distanceToStop;
  const potentialProfit = positionSize * distanceToTarget;
  const riskRewardRatio = distanceToTarget > 0 ? distanceToTarget / distanceToStop : 0;
  const accountRiskPercentage = accountBalance > 0 ? (riskCapital / accountBalance) * 100 : 0;

  // Go/No-Go decision engine
  let isValidTrade = true;
  let recommendation = "";

  if (riskRewardRatio < 1) {
    isValidTrade = false;
    recommendation = "R:R below 1:1 - Risk exceeds potential reward";
  } else if (riskRewardRatio < 2) {
    recommendation = "Marginal trade - Consider 2:1+ R:R";
  } else if (riskRewardRatio >= 3) {
    recommendation = "Excellent R:R - Strong setup";
  } else {
    recommendation = "Good setup - Acceptable R:R";
  }

  if (accountRiskPercentage > 5) {
    isValidTrade = false;
    recommendation = "Risk too high - Exceeds 5% of account";
  } else if (accountRiskPercentage > 2) {
    recommendation = `${recommendation} | Warning: High risk (${accountRiskPercentage.toFixed(1)}% of account)`;
  }

  if (entryPrice <= 0 || stopLossPrice <= 0) {
    isValidTrade = false;
    recommendation = "Invalid prices - Enter valid entry and stop";
  }

  return {
    positionSize,
    riskAmount: riskCapital,
    distanceToStop,
    riskRewardRatio,
    potentialProfit,
    potentialLoss,
    accountRiskPercentage,
    isValidTrade,
    recommendation,
  };
}

export function usePositionSizing() {
  const settings = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setSettings = useCallback((newSettings: Partial<PositionSizingSettings>) => {
    try {
      const current = getSnapshot();
      const updated = { ...current, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      notifyListeners();
    } catch (error) {
      console.error("Failed to save position sizing settings:", error);
    }
  }, []);

  const resetSettings = useCallback(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
      notifyListeners();
    } catch (error) {
      console.error("Failed to reset position sizing settings:", error);
    }
  }, []);

  // Calculate risk capital based on settings
  const getRiskCapital = useCallback((): number => {
    if (settings.usePercentageRisk) {
      return (settings.accountBalance * settings.riskPercentage) / 100;
    }
    return settings.riskCapital;
  }, [settings]);

  return {
    settings,
    setSettings,
    resetSettings,
    getRiskCapital,
    defaults: DEFAULT_SETTINGS,
  };
}

export { DEFAULT_SETTINGS as DEFAULT_POSITION_SIZING_SETTINGS };
