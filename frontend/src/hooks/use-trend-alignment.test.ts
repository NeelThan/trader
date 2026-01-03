/**
 * Tests for useTrendAlignment hook
 *
 * Tests trend analysis across multiple timeframes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTrendAlignment } from "./use-trend-alignment";

// Mock fetch globally - always returns immediately
const mockFetch = vi.fn(() =>
  Promise.resolve({
    ok: false,
    status: 500,
    json: () => Promise.resolve({}),
  })
);
global.fetch = mockFetch;

describe("useTrendAlignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("disabled state", () => {
    it("should not fetch when disabled", () => {
      const { result } = renderHook(() =>
        useTrendAlignment({ symbol: "DJI", enabled: false, timeframes: ["1D"] })
      );

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.trends).toHaveLength(1);
      expect(result.current.trends[0].timeframe).toBe("1D");
    });

    it("should have correct structure when disabled", () => {
      const { result } = renderHook(() =>
        useTrendAlignment({ symbol: "DJI", enabled: false, timeframes: ["1D", "4H"] })
      );

      expect(result.current.trends).toHaveLength(2);
      expect(result.current.overall.direction).toBe("ranging");
      expect(typeof result.current.refresh).toBe("function");
    });

    it("should have correct trend properties", () => {
      const { result } = renderHook(() =>
        useTrendAlignment({ symbol: "DJI", enabled: false, timeframes: ["1D"] })
      );

      const trend = result.current.trends[0];
      expect(trend).toHaveProperty("timeframe");
      expect(trend).toHaveProperty("trend");
      expect(trend).toHaveProperty("confidence");
      expect(trend).toHaveProperty("swing");
      expect(trend).toHaveProperty("rsi");
      expect(trend).toHaveProperty("macd");
      expect(trend).toHaveProperty("isLoading");
      expect(trend).toHaveProperty("error");
    });

    it("should have correct indicator structure", () => {
      const { result } = renderHook(() =>
        useTrendAlignment({ symbol: "DJI", enabled: false, timeframes: ["1D"] })
      );

      const trend = result.current.trends[0];
      expect(trend.swing).toHaveProperty("signal");
      expect(trend.rsi).toHaveProperty("signal");
      expect(trend.macd).toHaveProperty("signal");
    });

    it("should have overall alignment properties", () => {
      const { result } = renderHook(() =>
        useTrendAlignment({ symbol: "DJI", enabled: false, timeframes: ["1D"] })
      );

      expect(result.current.overall).toHaveProperty("direction");
      expect(result.current.overall).toHaveProperty("strength");
      expect(result.current.overall).toHaveProperty("description");
      expect(result.current.overall).toHaveProperty("bullishCount");
      expect(result.current.overall).toHaveProperty("bearishCount");
      expect(result.current.overall).toHaveProperty("rangingCount");
    });
  });
});
