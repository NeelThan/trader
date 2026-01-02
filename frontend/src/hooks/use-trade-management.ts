/**
 * Trade Management Hook
 *
 * Manages an active trade's lifecycle:
 * - Track status (pending -> active -> breakeven/trailing -> closed)
 * - Calculate P&L in real-time
 * - Support breakeven and trailing stop
 * - Log trade actions
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { TradeOpportunity } from "./use-trade-discovery";
import type { SizingData } from "./use-trade-execution";

/**
 * Trade status
 */
export type TradeStatus =
  | "pending"
  | "active"
  | "at_breakeven"
  | "trailing"
  | "closed";

/**
 * Trade log entry action types
 */
export type TradeLogAction =
  | "entry"
  | "exit"
  | "stop_moved"
  | "target_hit"
  | "note";

/**
 * Trade log entry
 */
export type TradeLogEntry = {
  action: TradeLogAction;
  price: number;
  note: string;
  timestamp: string;
};

export type UseTradeManagementOptions = {
  opportunity: TradeOpportunity;
  sizing: SizingData;
};

export type UseTradeManagementResult = {
  /** Current trade status */
  status: TradeStatus;
  /** Current market price */
  currentPrice: number;
  /** Current P&L (unrealized if open) */
  currentPnL: number;
  /** P&L as percentage */
  pnlPercent: number;
  /** R-multiple (P&L / risk) */
  rMultiple: number;
  /** Whether stop is at breakeven */
  freeTradeActive: boolean;
  /** Whether trailing stop is enabled */
  trailingEnabled: boolean;
  /** Current trailing stop price */
  trailingStopPrice: number | null;
  /** Effective stop price (original, breakeven, or trailing) */
  effectiveStopPrice: number;
  /** Trade action log */
  tradeLog: TradeLogEntry[];
  /** Activate the trade */
  activateTrade: () => void;
  /** Update current price (simulates market data) */
  updateCurrentPrice: (price: number) => void;
  /** Move stop to breakeven */
  moveToBreakeven: () => void;
  /** Enable trailing stop */
  enableTrailingStop: () => void;
  /** Close the trade */
  closeTrade: (reason: string) => void;
  /** Add a note to the trade log */
  addNote: (note: string) => void;
};

/**
 * Hook to manage an active trade
 */
export function useTradeManagement({
  opportunity,
  sizing,
}: UseTradeManagementOptions): UseTradeManagementResult {
  const isLong = opportunity.direction === "long";
  const riskPerUnit = Math.abs(sizing.entryPrice - sizing.stopLoss);

  // Trade state
  const [status, setStatus] = useState<TradeStatus>("pending");
  const [currentPrice, setCurrentPrice] = useState(sizing.entryPrice);
  const [freeTradeActive, setFreeTradeActive] = useState(false);
  const [trailingEnabled, setTrailingEnabled] = useState(false);
  const [trailingStopPrice, setTrailingStopPrice] = useState<number | null>(null);
  const [tradeLog, setTradeLog] = useState<TradeLogEntry[]>([]);

  // Track targets hit to avoid duplicate logs
  const targetsHitRef = useRef<Set<number>>(new Set());

  // Refs to track current state for callbacks - updated synchronously.
  // This pattern ensures refs are always current when callbacks execute,
  // avoiding stale closure issues when multiple actions occur in same batch.
  /* eslint-disable react-hooks/refs -- intentional sync for stale closure prevention */
  const statusRef = useRef(status);
  statusRef.current = status;
  const freeTradeActiveRef = useRef(freeTradeActive);
  freeTradeActiveRef.current = freeTradeActive;
  const trailingEnabledRef = useRef(trailingEnabled);
  trailingEnabledRef.current = trailingEnabled;
  const trailingStopPriceRef = useRef(trailingStopPrice);
  trailingStopPriceRef.current = trailingStopPrice;
  /* eslint-enable react-hooks/refs */

  // Add entry to trade log
  const addLogEntry = useCallback(
    (action: TradeLogAction, price: number, note: string) => {
      setTradeLog((prev) => [
        ...prev,
        {
          action,
          price,
          note,
          timestamp: new Date().toISOString(),
        },
      ]);
    },
    []
  );

  // Calculate P&L
  const currentPnL = useMemo(() => {
    if (status === "pending") return 0;
    const pnlPerUnit = isLong
      ? currentPrice - sizing.entryPrice
      : sizing.entryPrice - currentPrice;
    return pnlPerUnit * sizing.positionSize;
  }, [status, isLong, currentPrice, sizing.entryPrice, sizing.positionSize]);

  // Calculate P&L percentage
  const pnlPercent = useMemo(() => {
    const entryValue = sizing.entryPrice * sizing.positionSize;
    if (entryValue === 0) return 0;
    return (currentPnL / entryValue) * 100;
  }, [currentPnL, sizing.entryPrice, sizing.positionSize]);

  // Calculate R-multiple
  const rMultiple = useMemo(() => {
    const riskAmount = riskPerUnit * sizing.positionSize;
    if (riskAmount === 0) return 0;
    return currentPnL / riskAmount;
  }, [currentPnL, riskPerUnit, sizing.positionSize]);

  // Effective stop price
  const effectiveStopPrice = useMemo(() => {
    if (trailingEnabled && trailingStopPrice !== null) {
      return trailingStopPrice;
    }
    if (freeTradeActive) {
      return sizing.entryPrice;
    }
    return sizing.stopLoss;
  }, [freeTradeActive, trailingEnabled, trailingStopPrice, sizing.entryPrice, sizing.stopLoss]);

  // Activate trade
  const activateTrade = useCallback(() => {
    if (statusRef.current !== "pending") return;
    statusRef.current = "active"; // Update ref immediately for same-act calls
    setStatus("active");
    addLogEntry(
      "entry",
      sizing.entryPrice,
      `Entered ${isLong ? "LONG" : "SHORT"} position`
    );
  }, [sizing.entryPrice, isLong, addLogEntry]);

  // Update current price and check for stops/targets
  const updateCurrentPrice = useCallback(
    (price: number) => {
      setCurrentPrice(price);

      // Only check stops/targets when active
      const currentStatus = statusRef.current;
      if (currentStatus === "pending" || currentStatus === "closed") return;

      // Check for stop hit
      const isFreeTradeActive = freeTradeActiveRef.current;
      const currentStop = isFreeTradeActive ? sizing.entryPrice : sizing.stopLoss;
      const stopHit = isLong ? price <= currentStop : price >= currentStop;

      if (stopHit) {
        statusRef.current = "closed"; // Update ref immediately
        setStatus("closed");
        addLogEntry("exit", price, "Stop loss hit");
        return;
      }

      // Check for target hits
      for (let i = 0; i < sizing.targets.length; i++) {
        if (targetsHitRef.current.has(i)) continue;

        const targetHit = isLong
          ? price >= sizing.targets[i]
          : price <= sizing.targets[i];

        if (targetHit) {
          targetsHitRef.current.add(i);
          addLogEntry("target_hit", sizing.targets[i], `Target ${i + 1} reached`);
          break;
        }
      }

      // Update trailing stop if enabled
      const isTrailingEnabled = trailingEnabledRef.current;
      const currentTrailingStopPrice = trailingStopPriceRef.current;
      if (isTrailingEnabled && currentTrailingStopPrice !== null) {
        const newTrailPrice = isLong
          ? Math.max(currentTrailingStopPrice, price - riskPerUnit * 0.5)
          : Math.min(currentTrailingStopPrice, price + riskPerUnit * 0.5);

        if (newTrailPrice !== currentTrailingStopPrice) {
          setTrailingStopPrice(newTrailPrice);
        }

        // Check trailing stop hit
        const trailHit = isLong
          ? price <= currentTrailingStopPrice
          : price >= currentTrailingStopPrice;

        if (trailHit) {
          statusRef.current = "closed"; // Update ref immediately
          setStatus("closed");
          addLogEntry("exit", price, "Trailing stop hit");
        }
      }
    },
    [
      isLong,
      sizing.entryPrice,
      sizing.stopLoss,
      sizing.targets,
      riskPerUnit,
      addLogEntry,
    ]
  );

  // Move to breakeven
  const moveToBreakeven = useCallback(() => {
    if (statusRef.current === "pending" || statusRef.current === "closed") return;
    freeTradeActiveRef.current = true; // Update ref immediately
    statusRef.current = "at_breakeven"; // Update ref immediately
    setFreeTradeActive(true);
    setStatus("at_breakeven");
    addLogEntry("stop_moved", sizing.entryPrice, "Stop moved to breakeven - FREE TRADE");
  }, [sizing.entryPrice, addLogEntry]);

  // Enable trailing stop
  const enableTrailingStop = useCallback(() => {
    if (statusRef.current === "pending" || statusRef.current === "closed") return;
    // Use ref for current price since it may have been updated
    setCurrentPrice((prevPrice) => {
      const trailPrice = isLong
        ? prevPrice - riskPerUnit * 0.5
        : prevPrice + riskPerUnit * 0.5;
      trailingEnabledRef.current = true; // Update ref immediately
      trailingStopPriceRef.current = trailPrice; // Update ref immediately
      statusRef.current = "trailing"; // Update ref immediately
      setTrailingEnabled(true);
      setTrailingStopPrice(trailPrice);
      setStatus("trailing");
      addLogEntry("stop_moved", trailPrice, "Trailing stop enabled");
      return prevPrice;
    });
  }, [isLong, riskPerUnit, addLogEntry]);

  // Close trade
  const closeTrade = useCallback(
    (reason: string) => {
      if (statusRef.current === "pending" || statusRef.current === "closed") return;
      statusRef.current = "closed"; // Update ref immediately
      setCurrentPrice((prevPrice) => {
        setStatus("closed");
        addLogEntry("exit", prevPrice, reason);
        return prevPrice;
      });
    },
    [addLogEntry]
  );

  // Add note
  const addNote = useCallback(
    (note: string) => {
      if (!note.trim()) return;
      setCurrentPrice((prevPrice) => {
        addLogEntry("note", prevPrice, note);
        return prevPrice;
      });
    },
    [addLogEntry]
  );

  return {
    status,
    currentPrice,
    currentPnL,
    pnlPercent,
    rMultiple,
    freeTradeActive,
    trailingEnabled,
    trailingStopPrice,
    effectiveStopPrice,
    tradeLog,
    activateTrade,
    updateCurrentPrice,
    moveToBreakeven,
    enableTrailingStop,
    closeTrade,
    addNote,
  };
}
