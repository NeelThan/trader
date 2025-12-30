/**
 * API client for the Trader Backend.
 * Calls Next.js API routes which proxy to the Python backend.
 */

import type {
  RetracementRequest,
  ExtensionRequest,
  ProjectionRequest,
  ExpansionRequest,
  FibonacciResponse,
  SignalRequest,
  SignalResponse,
  HarmonicValidateRequest,
  HarmonicValidateResponse,
  ReversalZoneRequest,
  ReversalZoneResponse,
  FibonacciLevel,
  ParsedFibonacciLevels,
} from "./types";

const API_BASE = "/api/trader";

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new APIError(
      `API request failed: ${response.statusText}`,
      response.status,
      data
    );
  }

  return response.json();
}

/**
 * Parse the backend's level format (keys like "0", "236", "618")
 * into our FibonacciLevel array format.
 */
function parseLevels(response: FibonacciResponse): ParsedFibonacciLevels {
  const levels: FibonacciLevel[] = Object.entries(response.levels)
    .map(([key, price]) => ({
      ratio: parseInt(key, 10) / 1000,
      price,
    }))
    .sort((a, b) => a.ratio - b.ratio);

  return { levels };
}

// Fibonacci API

export async function getRetracementLevels(
  request: RetracementRequest
): Promise<ParsedFibonacciLevels> {
  const response = await fetchAPI<FibonacciResponse>("/fibonacci/retracement", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return parseLevels(response);
}

export async function getExtensionLevels(
  request: ExtensionRequest
): Promise<ParsedFibonacciLevels> {
  const response = await fetchAPI<FibonacciResponse>("/fibonacci/extension", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return parseLevels(response);
}

export async function getProjectionLevels(
  request: ProjectionRequest
): Promise<ParsedFibonacciLevels> {
  const response = await fetchAPI<FibonacciResponse>("/fibonacci/projection", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return parseLevels(response);
}

export async function getExpansionLevels(
  request: ExpansionRequest
): Promise<ParsedFibonacciLevels> {
  const response = await fetchAPI<FibonacciResponse>("/fibonacci/expansion", {
    method: "POST",
    body: JSON.stringify(request),
  });
  return parseLevels(response);
}

// Signal API

export async function detectSignal(
  request: SignalRequest
): Promise<SignalResponse> {
  return fetchAPI<SignalResponse>("/signal/detect", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// Harmonic API

export async function validateHarmonicPattern(
  request: HarmonicValidateRequest
): Promise<HarmonicValidateResponse> {
  return fetchAPI<HarmonicValidateResponse>("/harmonic/validate", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function getReversalZone(
  request: ReversalZoneRequest
): Promise<ReversalZoneResponse> {
  return fetchAPI<ReversalZoneResponse>("/harmonic/reversal-zone", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

// Health check

export async function checkHealth(): Promise<{ status: string }> {
  return fetchAPI<{ status: string }>("/health");
}

// Export all types
export type { Direction } from "./types";
export type {
  RetracementRequest,
  ExtensionRequest,
  ProjectionRequest,
  ExpansionRequest,
  FibonacciResponse,
  FibonacciLevel,
  ParsedFibonacciLevels,
  SignalRequest,
  SignalData,
  SignalResponse,
  HarmonicValidateRequest,
  HarmonicPatternData,
  HarmonicValidateResponse,
  PatternType,
  ReversalZoneRequest,
  ReversalZoneData,
  ReversalZoneResponse,
} from "./types";
