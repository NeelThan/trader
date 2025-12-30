/**
 * Hook for detecting trading signals at Fibonacci levels using the backend API.
 */

import { useState, useCallback } from "react";
import { detectSignal, type SignalData, type SignalRequest } from "@/lib/api";
import type { OHLCData } from "@/components/trading";

export type DetectedSignal = SignalData & {
  barIndex: number;
  bar: OHLCData;
};

export type UseSignalDetectionReturn = {
  signals: DetectedSignal[];
  isLoading: boolean;
  error: string | null;
  detectSignalsForLevel: (
    data: OHLCData[],
    fibonacciLevel: number,
    lookbackBars?: number
  ) => Promise<void>;
  detectSignalsForMultipleLevels: (
    data: OHLCData[],
    fibonacciLevels: number[],
    lookbackBars?: number
  ) => Promise<void>;
  clearSignals: () => void;
};

/**
 * Hook for detecting trading signals at Fibonacci levels.
 * Calls the backend /signal/detect endpoint for each bar.
 */
export function useSignalDetection(): UseSignalDetectionReturn {
  const [signals, setSignals] = useState<DetectedSignal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectSignalsForLevel = useCallback(
    async (
      data: OHLCData[],
      fibonacciLevel: number,
      lookbackBars: number = 20
    ) => {
      if (data.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        const startIndex = Math.max(0, data.length - lookbackBars);
        const recentBars = data.slice(startIndex);
        const detectedSignals: DetectedSignal[] = [];

        // Check each bar for signals
        for (let i = 0; i < recentBars.length; i++) {
          const bar = recentBars[i];
          const request: SignalRequest = {
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
            fibonacci_level: fibonacciLevel,
          };

          const response = await detectSignal(request);

          if (response.signal) {
            detectedSignals.push({
              ...response.signal,
              barIndex: startIndex + i,
              bar,
            });
          }
        }

        setSignals((prev) => {
          // Remove duplicates based on barIndex and level
          const newSignals = [...prev];
          for (const signal of detectedSignals) {
            const existingIndex = newSignals.findIndex(
              (s) => s.barIndex === signal.barIndex && s.level === signal.level
            );
            if (existingIndex === -1) {
              newSignals.push(signal);
            } else {
              newSignals[existingIndex] = signal;
            }
          }
          return newSignals;
        });
      } catch (err) {
        console.error("Signal detection failed:", err);
        setError(
          err instanceof Error ? err.message : "Signal detection failed"
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const detectSignalsForMultipleLevels = useCallback(
    async (
      data: OHLCData[],
      fibonacciLevels: number[],
      lookbackBars: number = 20
    ) => {
      if (data.length === 0 || fibonacciLevels.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        const startIndex = Math.max(0, data.length - lookbackBars);
        const recentBars = data.slice(startIndex);
        const detectedSignals: DetectedSignal[] = [];

        // Check each bar against each Fibonacci level
        for (let i = 0; i < recentBars.length; i++) {
          const bar = recentBars[i];

          for (const level of fibonacciLevels) {
            const request: SignalRequest = {
              open: bar.open,
              high: bar.high,
              low: bar.low,
              close: bar.close,
              fibonacci_level: level,
            };

            const response = await detectSignal(request);

            if (response.signal) {
              detectedSignals.push({
                ...response.signal,
                barIndex: startIndex + i,
                bar,
              });
            }
          }
        }

        setSignals(detectedSignals);
      } catch (err) {
        console.error("Signal detection failed:", err);
        setError(
          err instanceof Error ? err.message : "Signal detection failed"
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearSignals = useCallback(() => {
    setSignals([]);
    setError(null);
  }, []);

  return {
    signals,
    isLoading,
    error,
    detectSignalsForLevel,
    detectSignalsForMultipleLevels,
    clearSignals,
  };
}
