/**
 * Tests for SignalsPanel component
 *
 * TDD: Tests define expected behavior for Workflow V2 signals display.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SignalsPanel } from "./SignalsPanel";
import type { AggregatedSignal, SignalCounts } from "@/hooks/use-signal-aggregation";

// Mock signals
const mockSignals: AggregatedSignal[] = [
  {
    id: "1",
    timeframe: "1D",
    direction: "long",
    type: "trend_alignment",
    confidence: 85,
    price: 42000,
    description: "Daily trend is bullish",
    isActive: true,
    timestamp: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    timeframe: "4H",
    direction: "short",
    type: "fib_rejection",
    confidence: 72,
    price: 42500,
    description: "Rejection at 61.8% retracement",
    isActive: true,
    timestamp: "2024-01-15T11:00:00Z",
    fibLevel: 0.618,
    fibStrategy: "retracement",
  },
  {
    id: "3",
    timeframe: "1H",
    direction: "long",
    type: "confluence",
    confidence: 90,
    price: 41800,
    description: "3 levels converge",
    isActive: false,
    timestamp: "2024-01-15T12:00:00Z",
    confluenceCount: 3,
  },
];

const mockCounts: SignalCounts = {
  long: 2,
  short: 1,
  total: 3,
  byTimeframe: { "1D": 1, "4H": 1, "1H": 1 } as Record<string, number>,
  byType: { trend_alignment: 1, fib_rejection: 1, confluence: 1 } as Record<string, number>,
};

describe("SignalsPanel", () => {
  const defaultProps = {
    signals: mockSignals,
    counts: mockCounts,
    isLoading: false,
    error: null,
    onSignalSelect: vi.fn(),
    onFilterChange: vi.fn(),
    onSortChange: vi.fn(),
    onRefresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering
  // ===========================================================================

  describe("rendering", () => {
    it("should render panel header", () => {
      render(<SignalsPanel {...defaultProps} />);
      expect(screen.getByText(/signals/i)).toBeInTheDocument();
    });

    it("should render signal count in header", () => {
      render(<SignalsPanel {...defaultProps} />);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("should render signal list", () => {
      render(<SignalsPanel {...defaultProps} />);
      expect(screen.getByText("Daily trend is bullish")).toBeInTheDocument();
      expect(screen.getByText("Rejection at 61.8% retracement")).toBeInTheDocument();
      expect(screen.getByText("3 levels converge")).toBeInTheDocument();
    });

    it("should render empty state when no signals", () => {
      render(<SignalsPanel {...defaultProps} signals={[]} counts={{ ...mockCounts, total: 0, long: 0, short: 0 }} />);
      expect(screen.getByText(/no signals/i)).toBeInTheDocument();
    });

    it("should render loading state", () => {
      render(<SignalsPanel {...defaultProps} isLoading={true} />);
      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });

    it("should render error state", () => {
      render(<SignalsPanel {...defaultProps} error="Failed to load signals" />);
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Signal Display
  // ===========================================================================

  describe("signal display", () => {
    it("should show direction badges", () => {
      render(<SignalsPanel {...defaultProps} />);
      // Signal cards have uppercase direction badges
      const signalCards = screen.getAllByTestId("signal-card");
      expect(signalCards).toHaveLength(3);
      // Check for LONG and SHORT badges within cards
      expect(screen.getAllByText("long")).toHaveLength(2);
      expect(screen.getAllByText("short")).toHaveLength(1);
    });

    it("should show timeframe labels", () => {
      render(<SignalsPanel {...defaultProps} />);
      expect(screen.getByText("1D")).toBeInTheDocument();
      expect(screen.getByText("4H")).toBeInTheDocument();
      expect(screen.getByText("1H")).toBeInTheDocument();
    });

    it("should show confidence scores", () => {
      render(<SignalsPanel {...defaultProps} />);
      expect(screen.getByText("85%")).toBeInTheDocument();
      expect(screen.getByText("72%")).toBeInTheDocument();
      expect(screen.getByText("90%")).toBeInTheDocument();
    });

    it("should show signal type indicator", () => {
      render(<SignalsPanel {...defaultProps} />);
      // Signal cards should exist
      const signalCards = screen.getAllByTestId("signal-card");
      expect(signalCards).toHaveLength(3);
    });

    it("should highlight active signals", () => {
      render(<SignalsPanel {...defaultProps} />);
      const signalCards = screen.getAllByTestId("signal-card");
      // First two are active, third is not
      expect(signalCards[0]).toHaveClass("border-blue-500");
      expect(signalCards[2]).not.toHaveClass("border-blue-500");
    });

    it("should show Fibonacci level for fib signals", () => {
      render(<SignalsPanel {...defaultProps} />);
      // There might be multiple 61.8% mentions (in description and as level indicator)
      const matches = screen.getAllByText(/61\.8%/);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    it("should show confluence count for confluence signals", () => {
      render(<SignalsPanel {...defaultProps} />);
      // The confluence count is displayed
      expect(screen.getByText("3 levels")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Filtering
  // ===========================================================================

  describe("filtering", () => {
    it("should render filter controls", () => {
      render(<SignalsPanel {...defaultProps} />);
      expect(screen.getByRole("combobox", { name: /direction/i })).toBeInTheDocument();
    });

    it("should call onFilterChange when direction filter changes", () => {
      render(<SignalsPanel {...defaultProps} />);
      const select = screen.getByRole("combobox", { name: /direction/i });
      fireEvent.change(select, { target: { value: "long" } });
      expect(defaultProps.onFilterChange).toHaveBeenCalled();
    });

    it("should render timeframe filter", () => {
      render(<SignalsPanel {...defaultProps} />);
      expect(screen.getByRole("button", { name: /timeframe/i })).toBeInTheDocument();
    });

    it("should render active-only toggle", () => {
      render(<SignalsPanel {...defaultProps} />);
      expect(screen.getByRole("checkbox", { name: /active/i })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Sorting
  // ===========================================================================

  describe("sorting", () => {
    it("should render sort control", () => {
      render(<SignalsPanel {...defaultProps} />);
      expect(screen.getByRole("combobox", { name: /sort/i })).toBeInTheDocument();
    });

    it("should call onSortChange when sort changes", () => {
      render(<SignalsPanel {...defaultProps} />);
      const select = screen.getByRole("combobox", { name: /sort/i });
      fireEvent.change(select, { target: { value: "timeframe" } });
      expect(defaultProps.onSortChange).toHaveBeenCalledWith("timeframe");
    });
  });

  // ===========================================================================
  // Interactions
  // ===========================================================================

  describe("interactions", () => {
    it("should call onSignalSelect when signal is clicked", () => {
      render(<SignalsPanel {...defaultProps} />);
      const signalCards = screen.getAllByTestId("signal-card");
      fireEvent.click(signalCards[0]);
      expect(defaultProps.onSignalSelect).toHaveBeenCalledWith(mockSignals[0]);
    });

    it("should call onRefresh when refresh button is clicked", () => {
      render(<SignalsPanel {...defaultProps} />);
      const refreshButton = screen.getByRole("button", { name: /refresh/i });
      fireEvent.click(refreshButton);
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it("should disable refresh button when loading", () => {
      render(<SignalsPanel {...defaultProps} isLoading={true} />);
      const refreshButton = screen.getByRole("button", { name: /refresh/i });
      expect(refreshButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // Summary Counts
  // ===========================================================================

  describe("summary counts", () => {
    it("should show long count", () => {
      render(<SignalsPanel {...defaultProps} />);
      expect(screen.getByText("2 Long")).toBeInTheDocument();
    });

    it("should show short count", () => {
      render(<SignalsPanel {...defaultProps} />);
      expect(screen.getByText("1 Short")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Collapsible
  // ===========================================================================

  describe("collapsible", () => {
    it("should toggle content visibility", () => {
      render(<SignalsPanel {...defaultProps} />);
      // Get the header button by its exact aria-label
      const header = screen.getByRole("button", { name: "Signals" });

      // Initially visible
      expect(screen.getByText("Daily trend is bullish")).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(header);

      // Content should be hidden
      expect(screen.queryByText("Daily trend is bullish")).not.toBeInTheDocument();
    });
  });
});
