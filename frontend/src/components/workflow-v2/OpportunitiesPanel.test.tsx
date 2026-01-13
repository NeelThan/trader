/**
 * Tests for OpportunitiesPanel component
 *
 * TDD: Tests define expected behavior for the opportunities scanner panel.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OpportunitiesPanel } from "./OpportunitiesPanel";
import type { TradeOpportunity } from "@/types/workflow-v2";

// Mock opportunity data
const createMockOpportunity = (
  symbol: string,
  direction: "long" | "short",
  overrides: Partial<TradeOpportunity> = {}
): TradeOpportunity => ({
  symbol: symbol as TradeOpportunity["symbol"],
  higher_timeframe: "1D",
  lower_timeframe: "4H",
  direction,
  confidence: 75,
  category: "with_trend",
  phase: "correction",
  description: `${direction === "long" ? "Buy" : "Sell"} correction in 1D ${direction === "long" ? "bullish" : "bearish"} trend`,
  ...overrides,
});

describe("OpportunitiesPanel", () => {
  const defaultProps = {
    opportunities: [] as TradeOpportunity[],
    symbolsScanned: ["DJI", "SPX", "NDX"],
    scanTimeMs: 150,
    isLoading: false,
    error: null,
    onRefresh: vi.fn(),
    onSelectOpportunity: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe("loading state", () => {
    it("should show loading indicator when scanning", () => {
      render(<OpportunitiesPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/scanning/i)).toBeInTheDocument();
    });

    it("should show skeleton cards while loading", () => {
      render(<OpportunitiesPanel {...defaultProps} isLoading={true} />);

      // Should have loading skeletons
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe("empty state", () => {
    it("should show empty message when no opportunities", () => {
      render(<OpportunitiesPanel {...defaultProps} />);

      expect(screen.getByText(/no opportunities/i)).toBeInTheDocument();
    });

    it("should show scanned symbols count", () => {
      render(<OpportunitiesPanel {...defaultProps} />);

      expect(screen.getByText(/3 symbols/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Opportunities Display
  // ===========================================================================

  describe("opportunities display", () => {
    it("should render opportunity cards", () => {
      const opportunities = [
        createMockOpportunity("DJI", "long"),
        createMockOpportunity("SPX", "short"),
      ];

      render(<OpportunitiesPanel {...defaultProps} opportunities={opportunities} />);

      expect(screen.getByText("DJI")).toBeInTheDocument();
      expect(screen.getByText("SPX")).toBeInTheDocument();
    });

    it("should show direction indicator for long trades", () => {
      const opportunities = [createMockOpportunity("DJI", "long")];

      render(<OpportunitiesPanel {...defaultProps} opportunities={opportunities} />);

      expect(screen.getByText(/long/i)).toBeInTheDocument();
    });

    it("should show direction indicator for short trades", () => {
      const opportunities = [createMockOpportunity("DJI", "short")];

      render(<OpportunitiesPanel {...defaultProps} opportunities={opportunities} />);

      expect(screen.getByText(/short/i)).toBeInTheDocument();
    });

    it("should show timeframe pair", () => {
      const opportunities = [createMockOpportunity("DJI", "long")];

      render(<OpportunitiesPanel {...defaultProps} opportunities={opportunities} />);

      // Timeframes shown in badges - may appear multiple times
      expect(screen.getAllByText(/1D/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/4H/).length).toBeGreaterThan(0);
    });

    it("should show confidence score", () => {
      const opportunities = [createMockOpportunity("DJI", "long", { confidence: 85 })];

      render(<OpportunitiesPanel {...defaultProps} opportunities={opportunities} />);

      expect(screen.getByText(/85%/)).toBeInTheDocument();
    });

    it("should show trade category badge", () => {
      const opportunities = [createMockOpportunity("DJI", "long", { category: "with_trend" })];

      render(<OpportunitiesPanel {...defaultProps} opportunities={opportunities} />);

      expect(screen.getByText(/with.?trend/i)).toBeInTheDocument();
    });

    it("should show phase indicator", () => {
      const opportunities = [createMockOpportunity("DJI", "long", { phase: "correction" })];

      render(<OpportunitiesPanel {...defaultProps} opportunities={opportunities} />);

      // Phase appears in badge and may also appear in description
      expect(screen.getAllByText(/correction/i).length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Interactions
  // ===========================================================================

  describe("interactions", () => {
    it("should call onSelectOpportunity when clicking an opportunity", () => {
      const opportunities = [createMockOpportunity("DJI", "long")];
      const onSelect = vi.fn();

      render(
        <OpportunitiesPanel
          {...defaultProps}
          opportunities={opportunities}
          onSelectOpportunity={onSelect}
        />
      );

      // Click on the opportunity card
      const card = screen.getByText("DJI").closest("div[class*='cursor-pointer']");
      if (card) fireEvent.click(card);

      expect(onSelect).toHaveBeenCalledWith(opportunities[0]);
    });

    it("should call onRefresh when clicking refresh button", () => {
      const onRefresh = vi.fn();

      render(<OpportunitiesPanel {...defaultProps} onRefresh={onRefresh} />);

      const refreshButton = screen.getByRole("button", { name: /refresh|scan/i });
      fireEvent.click(refreshButton);

      expect(onRefresh).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Error State
  // ===========================================================================

  describe("error state", () => {
    it("should show error message when error occurs", () => {
      render(
        <OpportunitiesPanel {...defaultProps} error="Network error" />
      );

      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    it("should show retry button on error", () => {
      render(
        <OpportunitiesPanel {...defaultProps} error="Network error" />
      );

      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Scan Metadata
  // ===========================================================================

  describe("scan metadata", () => {
    it("should show scan time", () => {
      const opportunities = [createMockOpportunity("DJI", "long")];

      render(
        <OpportunitiesPanel
          {...defaultProps}
          opportunities={opportunities}
          scanTimeMs={250}
        />
      );

      expect(screen.getByText(/250ms/i)).toBeInTheDocument();
    });

    it("should show opportunity count in header", () => {
      const opportunities = [
        createMockOpportunity("DJI", "long"),
        createMockOpportunity("SPX", "short"),
        createMockOpportunity("NDX", "long"),
      ];

      render(<OpportunitiesPanel {...defaultProps} opportunities={opportunities} />);

      expect(screen.getByText(/3/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Category Styling
  // ===========================================================================

  describe("category styling", () => {
    it("should style with_trend category with green", () => {
      const opportunities = [createMockOpportunity("DJI", "long", { category: "with_trend" })];

      render(<OpportunitiesPanel {...defaultProps} opportunities={opportunities} />);

      const badge = screen.getByText(/with.?trend/i);
      expect(badge.className).toMatch(/green/i);
    });

    it("should style counter_trend category with amber", () => {
      const opportunities = [createMockOpportunity("DJI", "short", { category: "counter_trend" })];

      render(<OpportunitiesPanel {...defaultProps} opportunities={opportunities} />);

      const badge = screen.getByText(/counter/i);
      expect(badge.className).toMatch(/amber/i);
    });

    it("should style reversal_attempt category with red", () => {
      const opportunities = [createMockOpportunity("DJI", "long", { category: "reversal_attempt" })];

      render(<OpportunitiesPanel {...defaultProps} opportunities={opportunities} />);

      const badge = screen.getByText(/reversal/i);
      expect(badge.className).toMatch(/red/i);
    });
  });
});
