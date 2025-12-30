/**
 * Hook for detecting and validating harmonic patterns using the backend API.
 */

import { useState, useCallback } from "react";
import {
  validateHarmonicPattern,
  getReversalZone,
  type HarmonicPatternData,
  type ReversalZoneData,
  type PatternType,
} from "@/lib/api";

export type HarmonicPatternInput = {
  x: number;
  a: number;
  b: number;
  c: number;
  d: number;
};

export type ValidatedPattern = HarmonicPatternData & {
  id: string;
};

export type UseHarmonicPatternsReturn = {
  patterns: ValidatedPattern[];
  reversalZone: ReversalZoneData | null;
  isLoading: boolean;
  error: string | null;
  validatePattern: (points: HarmonicPatternInput) => Promise<ValidatedPattern | null>;
  calculateReversalZone: (
    x: number,
    a: number,
    b: number,
    c: number,
    patternType: PatternType
  ) => Promise<ReversalZoneData | null>;
  clearPatterns: () => void;
};

/**
 * Hook for validating harmonic patterns and calculating reversal zones.
 */
export function useHarmonicPatterns(): UseHarmonicPatternsReturn {
  const [patterns, setPatterns] = useState<ValidatedPattern[]>([]);
  const [reversalZone, setReversalZone] = useState<ReversalZoneData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validatePatternFn = useCallback(
    async (points: HarmonicPatternInput): Promise<ValidatedPattern | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await validateHarmonicPattern(points);

        if (response.pattern) {
          const validatedPattern: ValidatedPattern = {
            ...response.pattern,
            id: `${response.pattern.pattern_type}-${Date.now()}`,
          };

          setPatterns((prev) => [...prev, validatedPattern]);
          return validatedPattern;
        }

        return null;
      } catch (err) {
        console.error("Pattern validation failed:", err);
        setError(
          err instanceof Error ? err.message : "Pattern validation failed"
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const calculateReversalZoneFn = useCallback(
    async (
      x: number,
      a: number,
      b: number,
      c: number,
      patternType: PatternType
    ): Promise<ReversalZoneData | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getReversalZone({
          x,
          a,
          b,
          c,
          pattern_type: patternType,
        });

        if (response.reversal_zone) {
          setReversalZone(response.reversal_zone);
          return response.reversal_zone;
        }

        return null;
      } catch (err) {
        console.error("Reversal zone calculation failed:", err);
        setError(
          err instanceof Error ? err.message : "Reversal zone calculation failed"
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const clearPatterns = useCallback(() => {
    setPatterns([]);
    setReversalZone(null);
    setError(null);
  }, []);

  return {
    patterns,
    reversalZone,
    isLoading,
    error,
    validatePattern: validatePatternFn,
    calculateReversalZone: calculateReversalZoneFn,
    clearPatterns,
  };
}
