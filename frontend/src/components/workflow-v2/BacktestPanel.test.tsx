/**
 * Tests for BacktestPanel component.
 * TDD: Tests define expected behavior for backtest configuration and results UI.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BacktestPanel } from "./BacktestPanel";
import type { BacktestResult } from "@/types/backtest";

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
      targets: [44800],
      trade_category: "with_trend",
      confluence_score: 4,
      status: "target_hit",
      exit_time: "2025-02-15",
      exit_price: 44800,
      exit_reason: "target_1",
      pnl: 800,
      r_multiple: 1.6,
    },
    {
      entry_time: "2025-03-01",
      entry_price: 46000,
      direction: "short",
      position_size: 10,
      stop_loss: 46500,
      targets: [45200],
      trade_category: "counter_trend",
      confluence_score: 3,
      status: "stopped_out",
      exit_time: "2025-03-05",
      exit_price: 46500,
      exit_reason: "stop_loss",
      pnl: -500,
      r_multiple: -1.0,
    },
  ],
  equity_curve: [
    { timestamp: "2025-02-10", bar_index: 0, equity: 100000, trade_count: 0 },
    { timestamp: "2025-02-15", bar_index: 5, equity: 100800, trade_count: 1 },
  ],
  execution_time_seconds: 1.2,
};

describe("BacktestPanel", () => {
  const defaultProps = {
    symbol: "DJI" as const,
    result: null as BacktestResult | null,
    isLoading: false,
    error: null as string | null,
    onRunBacktest: vi.fn(),
    onSelectTrade: vi.fn(),
    selectedTradeIndex: null as number | null,
  };

  describe("config form", () => {
    it("should render date inputs and run button", () => {
      render(<BacktestPanel {...defaultProps} />);

      expect(screen.getByLabelText(/start date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /run backtest/i })).toBeInTheDocument();
    });

    it("should call onRunBacktest with config when run is clicked", () => {
      render(<BacktestPanel {...defaultProps} />);

      const startInput = screen.getByLabelText(/start date/i);
      const endInput = screen.getByLabelText(/end date/i);

      fireEvent.change(startInput, { target: { value: "2025-01-01" } });
      fireEvent.change(endInput, { target: { value: "2025-06-30" } });
      fireEvent.click(screen.getByRole("button", { name: /run backtest/i }));

      expect(defaultProps.onRunBacktest).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: "DJI",
          start_date: "2025-01-01",
          end_date: "2025-06-30",
        }),
      );
    });
  });

  describe("loading state", () => {
    it("should show loading indicator when running", () => {
      render(<BacktestPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/running/i)).toBeInTheDocument();
    });

    it("should disable run button while loading", () => {
      render(<BacktestPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByRole("button", { name: /running/i })).toBeDisabled();
    });
  });

  describe("error state", () => {
    it("should display error message", () => {
      render(<BacktestPanel {...defaultProps} error="Invalid date range" />);

      expect(screen.getByText(/invalid date range/i)).toBeInTheDocument();
    });
  });

  describe("results display", () => {
    it("should render metrics when result is available", () => {
      render(<BacktestPanel {...defaultProps} result={MOCK_RESULT} />);

      expect(screen.getByText("60.0%")).toBeInTheDocument(); // win rate
      expect(screen.getByText("1.80")).toBeInTheDocument(); // profit factor
      expect(screen.getByText("+2500")).toBeInTheDocument(); // total pnl
    });

    it("should render trade list", () => {
      render(<BacktestPanel {...defaultProps} result={MOCK_RESULT} />);

      expect(screen.getByText(/LONG/)).toBeInTheDocument();
      expect(screen.getByText(/SHORT/)).toBeInTheDocument();
    });

    it("should call onSelectTrade when trade is clicked", () => {
      render(<BacktestPanel {...defaultProps} result={MOCK_RESULT} />);

      const tradeRows = screen.getAllByRole("button", { name: /trade/i });
      fireEvent.click(tradeRows[0]);

      expect(defaultProps.onSelectTrade).toHaveBeenCalledWith(0);
    });
  });
});
