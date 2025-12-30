/**
 * Shared types for trading components.
 */

/** Trade direction for signals and patterns. */
export type Direction = "buy" | "sell";

/** Signal type classification based on price action. */
export type SignalType = "type1" | "type2" | "type3";

/** Harmonic pattern types. */
export type PatternType =
  | "gartley"
  | "bat"
  | "butterfly"
  | "crab"
  | "shark"
  | "cypher";

/** Pattern lifecycle status. */
export type PatternStatus = "forming" | "complete" | "triggered" | "expired";
