import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useBacktest } from "./use-backtest";
import type { BacktestConfig, BacktestResult } from "@/types/backtest";

const MOCK_CONFIG: BacktestConfig = {
  symbol: "DJI",
  higher_timeframe: "1D",
  lower_timeframe: "4H",
  start_date: "2025-01-01",
  end_date: "2025-06-30",
  initial_capital: 100_000,
  risk_per_trade: 0.01,
  lookback_periods: 50,
  confluence_threshold: 3,
  validation_pass_threshold: 0.6,
  atr_stop_multiplier: 1.5,
  breakeven_at_r: 1.0,
  trailing_stop_at_r: 2.0,
};

const MOCK_RESULT: BacktestResult = {
  config: {},
  metrics: {
    total_trades: 5,
    winning_trades: 3,
    losing_trades: 2,
    breakeven_trades: 0,
    win_rate: 0.6,
    profit_factor: 1.8,
    total_pnl: 2500,
    average_pnl: 500,
    average_r: 1.2,
    largest_winner: 1500,
    largest_loser: -800,
    max_drawdown: 0.05,
    sharpe_ratio: 1.5,
    sortino_ratio: 2.0,
    by_category: {},
  },
  trades: [
    {
      entry_time: "2025-02-10",
      entry_price: 44000,
      direction: "long",
      position_size: 10,
      stop_loss: 43500,
      targets: [44800, 45200],
      trade_category: "with_trend",
      confluence_score: 4,
      status: "target_hit",
      exit_time: "2025-02-15",
      exit_price: 44800,
      exit_reason: "target_1",
      pnl: 800,
      r_multiple: 1.6,
    },
  ],
  equity_curve: [
    { timestamp: "2025-02-10", bar_index: 0, equity: 100_000, trade_count: 0 },
    { timestamp: "2025-02-15", bar_index: 5, equity: 100_800, trade_count: 1 },
  ],
  execution_time_seconds: 1.2,
};

describe("useBacktest", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should return idle state with no result", () => {
      const { result } = renderHook(() => useBacktest());

      expect(result.current.result).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe("runBacktest", () => {
    it("should call the backtest API with the correct config", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(MOCK_RESULT), { status: 200 }),
      );

      const { result } = renderHook(() => useBacktest());

      await act(async () => {
        await result.current.runBacktest(MOCK_CONFIG);
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/trader/backtest/run",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(MOCK_CONFIG),
        }),
      );
    });

    it("should transition through loading states on success", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(MOCK_RESULT), { status: 200 }),
      );

      const { result } = renderHook(() => useBacktest());

      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        await result.current.runBacktest(MOCK_CONFIG);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.result).not.toBeNull();
        expect(result.current.error).toBeNull();
      });

      expect(result.current.result?.metrics.total_trades).toBe(5);
      expect(result.current.result?.trades).toHaveLength(1);
    });

    it("should set error on network failure", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useBacktest());

      await act(async () => {
        await result.current.runBacktest(MOCK_CONFIG);
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Network error");
        expect(result.current.result).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should set error on non-ok response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify({ detail: "Invalid date range" }), { status: 422 }),
      );

      const { result } = renderHook(() => useBacktest());

      await act(async () => {
        await result.current.runBacktest(MOCK_CONFIG);
      });

      await waitFor(() => {
        expect(result.current.error).toBe("Invalid date range");
        expect(result.current.result).toBeNull();
      });
    });
  });

  describe("reset", () => {
    it("should clear result and error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(JSON.stringify(MOCK_RESULT), { status: 200 }),
      );

      const { result } = renderHook(() => useBacktest());

      await act(async () => {
        await result.current.runBacktest(MOCK_CONFIG);
      });

      await waitFor(() => {
        expect(result.current.result).not.toBeNull();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });
});
