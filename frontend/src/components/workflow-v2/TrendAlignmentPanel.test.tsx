/**
 * Tests for TrendAlignmentPanel component
 *
 * TDD: Tests define expected behavior for trend alignment UI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TrendAlignmentPanel, TrendIndicatorButton } from "./TrendAlignmentPanel";
import type { TimeframeTrend, OverallAlignment } from "@/hooks/use-trend-alignment";
import type { Timeframe } from "@/lib/chart-constants";

// Mock trend data
const createMockTrend = (
  timeframe: Timeframe,
  trend: "bullish" | "bearish" | "ranging" = "bullish",
  overrides: Partial<TimeframeTrend> = {}
): TimeframeTrend => ({
  timeframe,
  trend,
  confidence: 75,
  swing: { signal: trend === "bullish" ? "bullish" : trend === "bearish" ? "bearish" : "neutral" },
  rsi: { value: trend === "bullish" ? 60 : trend === "bearish" ? 40 : 50, signal: trend === "bullish" ? "bullish" : trend === "bearish" ? "bearish" : "neutral" },
  macd: { signal: trend === "bullish" ? "bullish" : trend === "bearish" ? "bearish" : "neutral" },
  isLoading: false,
  error: null,
  ...overrides,
});

const defaultTrends: TimeframeTrend[] = [
  createMockTrend("1M", "bullish"),
  createMockTrend("1W", "bullish"),
  createMockTrend("1D", "bullish"),
  createMockTrend("4H", "bearish"),
  createMockTrend("1H", "bearish"),
  createMockTrend("15m", "ranging"),
  createMockTrend("1m", "ranging"),
];

const defaultOverall: OverallAlignment = {
  direction: "bullish",
  strength: "moderate",
  bullishCount: 3,
  bearishCount: 2,
  rangingCount: 2,
  description: "Moderate bullish bias (3/7 timeframes)",
};

const defaultChartColors = {
  up: "#26a69a",
  down: "#ef5350",
};

describe("TrendAlignmentPanel", () => {
  const defaultProps = {
    trends: defaultTrends,
    overall: defaultOverall,
    isLoading: false,
    chartColors: defaultChartColors,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe("basic rendering", () => {
    it("should render Trend Alignment title", () => {
      render(<TrendAlignmentPanel {...defaultProps} />);

      expect(screen.getByText("Trend Alignment")).toBeInTheDocument();
    });

    it("should render all timeframes", () => {
      render(<TrendAlignmentPanel {...defaultProps} />);

      expect(screen.getByText("1M")).toBeInTheDocument();
      expect(screen.getByText("1W")).toBeInTheDocument();
      expect(screen.getByText("1D")).toBeInTheDocument();
      expect(screen.getByText("4H")).toBeInTheDocument();
      expect(screen.getByText("1H")).toBeInTheDocument();
      expect(screen.getByText("15m")).toBeInTheDocument();
      expect(screen.getByText("1m")).toBeInTheDocument();
    });

    it("should show trend labels on buttons", () => {
      render(<TrendAlignmentPanel {...defaultProps} />);

      // Count labels by their occurrence
      const bullishLabels = screen.getAllByText("Bullish");
      const bearishLabels = screen.getAllByText("Bearish");
      const rangingLabels = screen.getAllByText("Ranging");

      expect(bullishLabels.length).toBe(3);
      expect(bearishLabels.length).toBe(2);
      expect(rangingLabels.length).toBe(2);
    });

    it("should show bull/bear counts in header", () => {
      render(<TrendAlignmentPanel {...defaultProps} />);

      expect(screen.getByText("3 Bull")).toBeInTheDocument();
      expect(screen.getByText("2 Bear")).toBeInTheDocument();
    });

    it("should show confidence bar", () => {
      render(<TrendAlignmentPanel {...defaultProps} />);

      expect(screen.getByText("Confidence:")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe("loading state", () => {
    it("should show skeletons when loading", () => {
      render(<TrendAlignmentPanel {...defaultProps} isLoading={true} />);

      // Should not show timeframe buttons when loading
      expect(screen.queryByText("1D")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Phase Indicator
  // ===========================================================================

  describe("phase indicator", () => {
    it("should show phase indicator in timeframe breakdown popover", async () => {
      render(<TrendAlignmentPanel {...defaultProps} />);

      // Click on a timeframe button to open the popover
      const dayButton = screen.getByText("1D").closest("button");
      expect(dayButton).toBeInTheDocument();
      fireEvent.click(dayButton!);

      // Check for phase indicator in popover
      await waitFor(() => {
        expect(screen.getByText(/Phase:/)).toBeInTheDocument();
      });
    });

    it("should show impulse phase for high confidence aligned trend", async () => {
      const impulseTrend = createMockTrend("1D", "bullish", {
        confidence: 80,
        swing: { signal: "bullish" },
        rsi: { value: 65, signal: "bullish" },
        macd: { signal: "bullish" },
      });

      render(
        <TrendAlignmentPanel
          {...defaultProps}
          trends={[impulseTrend]}
        />
      );

      const dayButton = screen.getByText("1D").closest("button");
      fireEvent.click(dayButton!);

      await waitFor(() => {
        expect(screen.getByText("Impulse")).toBeInTheDocument();
      });
    });

    it("should show correction phase for diverging momentum", async () => {
      const correctionTrend = createMockTrend("1D", "bullish", {
        confidence: 60,
        swing: { signal: "bullish" },
        rsi: { value: 45, signal: "bearish" }, // Diverging
        macd: { signal: "bullish" },
      });

      render(
        <TrendAlignmentPanel
          {...defaultProps}
          trends={[correctionTrend]}
        />
      );

      const dayButton = screen.getByText("1D").closest("button");
      fireEvent.click(dayButton!);

      await waitFor(() => {
        expect(screen.getByText("Correction")).toBeInTheDocument();
      });
    });

    it("should show exhaustion phase for low confidence diverging", async () => {
      // Exhaustion requires: low confidence + diverging momentum + swing NOT in trend direction
      // (If swing is in trend direction, it's classified as correction instead)
      const exhaustionTrend = createMockTrend("1D", "bullish", {
        confidence: 35,
        swing: { signal: "neutral" }, // Swing not strongly bullish
        rsi: { value: 40, signal: "bearish" },
        macd: { signal: "bearish" },
      });

      render(
        <TrendAlignmentPanel
          {...defaultProps}
          trends={[exhaustionTrend]}
        />
      );

      const dayButton = screen.getByText("1D").closest("button");
      fireEvent.click(dayButton!);

      await waitFor(() => {
        expect(screen.getByText("Exhaustion")).toBeInTheDocument();
      });
    });

    it("should show continuation phase as default", async () => {
      const continuationTrend = createMockTrend("1D", "ranging", {
        confidence: 50,
        swing: { signal: "neutral" },
        rsi: { value: 50, signal: "neutral" },
        macd: { signal: "neutral" },
      });

      render(
        <TrendAlignmentPanel
          {...defaultProps}
          trends={[continuationTrend]}
        />
      );

      const dayButton = screen.getByText("1D").closest("button");
      fireEvent.click(dayButton!);

      await waitFor(() => {
        expect(screen.getByText("Continuation")).toBeInTheDocument();
      });
    });

    it("should show phase description", async () => {
      const impulseTrend = createMockTrend("1D", "bullish", {
        confidence: 80,
        swing: { signal: "bullish" },
        rsi: { value: 65, signal: "bullish" },
        macd: { signal: "bullish" },
      });

      render(
        <TrendAlignmentPanel
          {...defaultProps}
          trends={[impulseTrend]}
        />
      );

      const dayButton = screen.getByText("1D").closest("button");
      fireEvent.click(dayButton!);

      await waitFor(() => {
        // Check for phase description text
        expect(screen.getByText(/Strong trending move/)).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Timeframe Breakdown Popover
  // ===========================================================================

  describe("timeframe breakdown popover", () => {
    it("should open popover when clicking timeframe", async () => {
      render(<TrendAlignmentPanel {...defaultProps} />);

      const dayButton = screen.getByText("1D").closest("button");
      fireEvent.click(dayButton!);

      await waitFor(() => {
        expect(screen.getByText("1D Calculation")).toBeInTheDocument();
      });
    });

    it("should show indicator breakdown", async () => {
      render(<TrendAlignmentPanel {...defaultProps} />);

      const dayButton = screen.getByText("1D").closest("button");
      fireEvent.click(dayButton!);

      await waitFor(() => {
        expect(screen.getByText("Swing Pattern")).toBeInTheDocument();
        expect(screen.getByText("RSI (14)")).toBeInTheDocument();
        expect(screen.getByText("MACD Histogram")).toBeInTheDocument();
      });
    });

    it("should show total score", async () => {
      render(<TrendAlignmentPanel {...defaultProps} />);

      const dayButton = screen.getByText("1D").closest("button");
      fireEvent.click(dayButton!);

      await waitFor(() => {
        expect(screen.getByText("Total Score")).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Trading Recommendation
  // ===========================================================================

  describe("trading recommendation", () => {
    it("should show bullish recommendation for bullish alignment", () => {
      render(<TrendAlignmentPanel {...defaultProps} />);

      expect(
        screen.getByText(/Higher timeframes favor long positions/)
      ).toBeInTheDocument();
    });

    it("should show bearish recommendation for bearish alignment", () => {
      render(
        <TrendAlignmentPanel
          {...defaultProps}
          overall={{ ...defaultOverall, direction: "bearish" }}
        />
      );

      expect(
        screen.getByText(/Higher timeframes favor short positions/)
      ).toBeInTheDocument();
    });

    it("should show mixed signal warning for ranging", () => {
      render(
        <TrendAlignmentPanel
          {...defaultProps}
          overall={{ ...defaultOverall, direction: "ranging" }}
        />
      );

      expect(screen.getByText(/Mixed signals/)).toBeInTheDocument();
    });
  });
});

describe("TrendIndicatorButton", () => {
  const defaultProps = {
    bullishCount: 3,
    bearishCount: 2,
    overall: {
      direction: "bullish" as const,
      strength: "moderate" as const,
      bullishCount: 3,
      bearishCount: 2,
      rangingCount: 2,
      description: "Moderate bullish bias",
    },
    chartColors: defaultChartColors,
    onClick: vi.fn(),
    isActive: false,
  };

  it("should render bull/bear counts", () => {
    render(<TrendIndicatorButton {...defaultProps} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("should show direction badge", () => {
    render(<TrendIndicatorButton {...defaultProps} />);

    expect(screen.getByText("Bull")).toBeInTheDocument();
  });

  it("should call onClick when clicked", () => {
    render(<TrendIndicatorButton {...defaultProps} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(defaultProps.onClick).toHaveBeenCalled();
  });

  it("should apply active styles when active", () => {
    render(<TrendIndicatorButton {...defaultProps} isActive={true} />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-primary/20");
  });
});
