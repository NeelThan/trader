/**
 * TypeScript types for the Trader Backend API.
 * These types match the Pydantic models in the backend.
 */

export type Direction = "buy" | "sell";

// Fibonacci Request/Response Types

export type RetracementRequest = {
  high: number;
  low: number;
  direction: Direction;
};

export type ExtensionRequest = {
  high: number;
  low: number;
  direction: Direction;
};

export type ProjectionRequest = {
  point_a: number;
  point_b: number;
  point_c: number;
  direction: Direction;
};

export type ExpansionRequest = {
  point_a: number;
  point_b: number;
  direction: Direction;
};

export type FibonacciResponse = {
  levels: Record<string, number>;
};

// Signal Request/Response Types

export type SignalRequest = {
  open: number;
  high: number;
  low: number;
  close: number;
  fibonacci_level: number;
};

export type SignalData = {
  direction: string;
  signal_type: string;
  strength: number;
  level: number;
};

export type SignalResponse = {
  signal: SignalData | null;
};

// Harmonic Pattern Request/Response Types

export type HarmonicValidateRequest = {
  x: number;
  a: number;
  b: number;
  c: number;
  d: number;
};

export type HarmonicPatternData = {
  pattern_type: string;
  direction: string;
  x: number;
  a: number;
  b: number;
  c: number;
  d: number;
};

export type HarmonicValidateResponse = {
  pattern: HarmonicPatternData | null;
};

export type PatternType = "gartley" | "butterfly" | "bat" | "crab";

export type ReversalZoneRequest = {
  x: number;
  a: number;
  b: number;
  c: number;
  pattern_type: PatternType;
};

export type ReversalZoneData = {
  d_level: number;
  direction: string;
  pattern_type: string;
};

export type ReversalZoneResponse = {
  reversal_zone: ReversalZoneData | null;
};

// Parsed Fibonacci Levels (with numeric keys converted to ratios)

export type FibonacciLevel = {
  ratio: number;
  price: number;
};

export type ParsedFibonacciLevels = {
  levels: FibonacciLevel[];
};
