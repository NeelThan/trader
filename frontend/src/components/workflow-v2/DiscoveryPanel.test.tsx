/**
 * Tests for DiscoveryPanel component
 *
 * TDD: Tests define expected behavior for trade discovery UI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiscoveryPanel } from "./DiscoveryPanel";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";

// Mock opportunity - active
const mockActiveOpportunity: TradeOpportunity = {
  id: "opp-active-1",
  symbol: "DJI",
  higherTimeframe: "1D",
  lowerTimeframe: "4H",
  direction: "long",
  confidence: 75,
  tradingStyle: "swing",
  description: "Buy the pullback to Fib support",
  reasoning: "Higher TF bullish, lower TF pullback",
  isActive: true,
  entryZone: "support",
  signal: {
    id: "sig-1",
    type: "LONG",
    higherTF: "1D",
    lowerTF: "4H",
    pairName: "1D → 4H",
    confidence: 75,
    description: "Test signal",
    reasoning: "Test reasoning",
    isActive: true,
    tradingStyle: "swing",
    entryZone: "support",
  },
  higherTrend: undefined,
  lowerTrend: undefined,
  category: "with_trend",
  trendPhase: "correction",
};

// Mock opportunity - developing (not active)
const mockDevelopingOpportunity: TradeOpportunity = {
  id: "opp-developing-1",
  symbol: "DJI",
  higherTimeframe: "1W",
  lowerTimeframe: "1D",
  direction: "short",
  confidence: 60,
  tradingStyle: "position",
  description: "Weekly bearish trend forming",
  reasoning: "Higher TF showing LH, LL pattern forming",
  isActive: false,
  entryZone: "resistance",
  signal: {
    id: "sig-2",
    type: "SHORT",
    higherTF: "1W",
    lowerTF: "1D",
    pairName: "1W → 1D",
    confidence: 60,
    description: "Weekly short signal",
    reasoning: "Bearish structure developing",
    isActive: false,
    tradingStyle: "position",
    entryZone: "resistance",
  },
  higherTrend: undefined,
  lowerTrend: undefined,
  category: "with_trend",
  trendPhase: "impulse",
};

describe("DiscoveryPanel", () => {
  const defaultProps = {
    opportunities: [mockActiveOpportunity, mockDevelopingOpportunity],
    isLoading: false,
    hasError: false,
    errors: [],
    onRefresh: vi.fn(),
    onSelectOpportunity: vi.fn(),
    symbol: "DJI" as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe("loading state", () => {
    it("should show loading indicator when loading", () => {
      render(<DiscoveryPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/scanning timeframes/i)).toBeInTheDocument();
    });

    it("should show skeleton cards when loading", () => {
      const { container } = render(
        <DiscoveryPanel {...defaultProps} isLoading={true} />
      );

      // Should render 3 skeleton cards (Skeleton uses animate-pulse class)
      const skeletons = container.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBe(3);
    });

    it("should hide opportunity cards when loading", () => {
      render(<DiscoveryPanel {...defaultProps} isLoading={true} />);

      expect(
        screen.queryByText("Trade Opportunities")
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Buy the pullback to Fib support")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe("empty state", () => {
    it("should show empty message when no opportunities", () => {
      render(<DiscoveryPanel {...defaultProps} opportunities={[]} />);

      expect(screen.getByText("No opportunities found")).toBeInTheDocument();
    });

    it("should show waiting message when no opportunities", () => {
      render(<DiscoveryPanel {...defaultProps} opportunities={[]} />);

      expect(
        screen.getByText("Waiting for trend alignment...")
      ).toBeInTheDocument();
    });

    it("should not show opportunity header when empty", () => {
      render(<DiscoveryPanel {...defaultProps} opportunities={[]} />);

      expect(
        screen.queryByText("Trade Opportunities")
      ).not.toBeInTheDocument();
    });

    it("should show test mode buttons when no opportunities", () => {
      render(<DiscoveryPanel {...defaultProps} opportunities={[]} />);

      expect(screen.getByText("Test Mode")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /test long/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /test short/i })).toBeInTheDocument();
    });

    it("should create test opportunity from empty state", () => {
      render(<DiscoveryPanel {...defaultProps} opportunities={[]} />);

      fireEvent.click(screen.getByRole("button", { name: /test long/i }));

      expect(defaultProps.onSelectOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: "long",
          symbol: "DJI",
        })
      );
    });
  });

  // ===========================================================================
  // Error State
  // ===========================================================================

  describe("error state", () => {
    it("should show error banner when hasError is true", () => {
      render(<DiscoveryPanel {...defaultProps} hasError={true} />);

      expect(screen.getByText("Some data unavailable")).toBeInTheDocument();
    });

    it("should show retry button when error and onRefresh provided", () => {
      render(<DiscoveryPanel {...defaultProps} hasError={true} />);

      expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
    });

    it("should call onRefresh when retry clicked", () => {
      render(<DiscoveryPanel {...defaultProps} hasError={true} />);

      fireEvent.click(screen.getByRole("button", { name: /retry/i }));
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });

    it("should show failed timeframes in error banner", () => {
      render(
        <DiscoveryPanel
          {...defaultProps}
          hasError={true}
          errors={[
            { timeframe: "1D", error: "Connection failed" },
            { timeframe: "4H", error: "Timeout" },
          ]}
        />
      );

      expect(screen.getByText(/Failed: 1D, 4H/)).toBeInTheDocument();
    });

    it("should show error banner with opportunities when partial failure", () => {
      render(<DiscoveryPanel {...defaultProps} hasError={true} />);

      // Both error and opportunities should be visible
      expect(screen.getByText("Some data unavailable")).toBeInTheDocument();
      expect(screen.getByText("Trade Opportunities")).toBeInTheDocument();
    });

    it("should show error banner in empty state", () => {
      render(
        <DiscoveryPanel
          {...defaultProps}
          opportunities={[]}
          hasError={true}
        />
      );

      expect(screen.getByText("Some data unavailable")).toBeInTheDocument();
      expect(screen.getByText("No opportunities found")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Header
  // ===========================================================================

  describe("header", () => {
    it("should show Trade Opportunities title", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(screen.getByText("Trade Opportunities")).toBeInTheDocument();
    });

    it("should show active count badge", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(screen.getByText("1 active")).toBeInTheDocument();
    });

    it("should show 0 active when no active opportunities", () => {
      render(
        <DiscoveryPanel
          {...defaultProps}
          opportunities={[mockDevelopingOpportunity]}
        />
      );

      expect(screen.getByText("0 active")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Opportunity Cards
  // ===========================================================================

  describe("opportunity cards", () => {
    it("should render active opportunity card", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(screen.getByText("LONG")).toBeInTheDocument();
      expect(screen.getByText("Buy the pullback to Fib support")).toBeInTheDocument();
    });

    it("should render developing opportunity card", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(screen.getByText("SHORT")).toBeInTheDocument();
      expect(screen.getByText("Weekly bearish trend forming")).toBeInTheDocument();
    });

    it("should show timeframe pair on card", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(screen.getByText("1D → 4H")).toBeInTheDocument();
      expect(screen.getByText("1W → 1D")).toBeInTheDocument();
    });

    it("should show confidence percentage", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(screen.getByText("75%")).toBeInTheDocument();
      expect(screen.getByText("60%")).toBeInTheDocument();
    });

    it("should show trading style", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(screen.getByText("swing")).toBeInTheDocument();
      expect(screen.getByText("position")).toBeInTheDocument();
    });

    it("should show reasoning text", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(
        screen.getByText("Higher TF bullish, lower TF pullback")
      ).toBeInTheDocument();
    });

    it("should show ACTIVE badge for active opportunities", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    });

    it("should not show ACTIVE badge for developing opportunities", () => {
      render(
        <DiscoveryPanel
          {...defaultProps}
          opportunities={[mockDevelopingOpportunity]}
        />
      );

      expect(screen.queryByText("ACTIVE")).not.toBeInTheDocument();
    });

    it("should show Evaluate button on each card", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      const evaluateButtons = screen.getAllByText("Evaluate →");
      expect(evaluateButtons).toHaveLength(2);
    });
  });

  // ===========================================================================
  // Sections
  // ===========================================================================

  describe("sections", () => {
    it("should show Ready to Trade section for active opportunities", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(screen.getByText("Ready to Trade")).toBeInTheDocument();
    });

    it("should show Developing section for waiting opportunities", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(screen.getByText("Developing")).toBeInTheDocument();
    });

    it("should not show Ready to Trade when no active opportunities", () => {
      render(
        <DiscoveryPanel
          {...defaultProps}
          opportunities={[mockDevelopingOpportunity]}
        />
      );

      expect(screen.queryByText("Ready to Trade")).not.toBeInTheDocument();
    });

    it("should not show Developing when no developing opportunities", () => {
      render(
        <DiscoveryPanel
          {...defaultProps}
          opportunities={[mockActiveOpportunity]}
        />
      );

      expect(screen.queryByText("Developing")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Click Handling
  // ===========================================================================

  describe("click handling", () => {
    it("should call onSelectOpportunity when card clicked", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      fireEvent.click(screen.getByText("Buy the pullback to Fib support"));
      expect(defaultProps.onSelectOpportunity).toHaveBeenCalledWith(
        mockActiveOpportunity
      );
    });

    it("should call onSelectOpportunity with correct opportunity", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      fireEvent.click(screen.getByText("Weekly bearish trend forming"));
      expect(defaultProps.onSelectOpportunity).toHaveBeenCalledWith(
        mockDevelopingOpportunity
      );
    });
  });

  // ===========================================================================
  // Test Mode
  // ===========================================================================

  describe("test mode", () => {
    it("should show Test Mode section", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(screen.getByText("Test Mode")).toBeInTheDocument();
    });

    it("should show Test LONG button", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /test long/i })
      ).toBeInTheDocument();
    });

    it("should show Test SHORT button", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /test short/i })
      ).toBeInTheDocument();
    });

    it("should create long test opportunity when Test LONG clicked", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /test long/i }));

      expect(defaultProps.onSelectOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: "long",
          symbol: "DJI",
          higherTimeframe: "1D",
          lowerTimeframe: "4H",
          isActive: true,
        })
      );
    });

    it("should create short test opportunity when Test SHORT clicked", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /test short/i }));

      expect(defaultProps.onSelectOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: "short",
          symbol: "DJI",
          higherTimeframe: "1D",
          lowerTimeframe: "4H",
          isActive: true,
        })
      );
    });

    it("should use provided symbol for test trades", () => {
      render(<DiscoveryPanel {...defaultProps} symbol="SPX" />);

      fireEvent.click(screen.getByRole("button", { name: /test long/i }));

      expect(defaultProps.onSelectOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: "SPX",
        })
      );
    });

    it("should include trend data in test opportunity", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /test long/i }));

      expect(defaultProps.onSelectOpportunity).toHaveBeenCalledWith(
        expect.objectContaining({
          higherTrend: expect.objectContaining({
            timeframe: "1D",
            trend: "bullish",
          }),
          lowerTrend: expect.objectContaining({
            timeframe: "4H",
            trend: "bearish", // Counter-trend for entry
          }),
        })
      );
    });
  });

  // ===========================================================================
  // Legend
  // ===========================================================================

  describe("legend", () => {
    it("should show long trade explanation", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(
        screen.getByText("LONG: Higher TF bullish + Lower TF counter-trend")
      ).toBeInTheDocument();
    });

    it("should show short trade explanation", () => {
      render(<DiscoveryPanel {...defaultProps} />);

      expect(
        screen.getByText("SHORT: Higher TF bearish + Lower TF counter-trend")
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Card Styling
  // ===========================================================================

  describe("card styling", () => {
    it("should apply green styling for long opportunities", () => {
      const { container } = render(
        <DiscoveryPanel
          {...defaultProps}
          opportunities={[mockActiveOpportunity]}
        />
      );

      const card = container.querySelector(".bg-green-500\\/10");
      expect(card).toBeInTheDocument();
    });

    it("should apply red styling for short opportunities", () => {
      const { container } = render(
        <DiscoveryPanel
          {...defaultProps}
          opportunities={[mockDevelopingOpportunity]}
        />
      );

      const card = container.querySelector(".bg-red-500\\/10");
      expect(card).toBeInTheDocument();
    });

    it("should apply reduced opacity for developing opportunities", () => {
      const { container } = render(
        <DiscoveryPanel
          {...defaultProps}
          opportunities={[mockDevelopingOpportunity]}
        />
      );

      const card = container.querySelector(".opacity-70");
      expect(card).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Multiple Opportunities
  // ===========================================================================

  describe("multiple opportunities", () => {
    it("should render multiple active opportunities", () => {
      const secondActive: TradeOpportunity = {
        ...mockActiveOpportunity,
        id: "opp-active-2",
        higherTimeframe: "4H",
        lowerTimeframe: "1H",
        description: "Second active opportunity",
      };

      render(
        <DiscoveryPanel
          {...defaultProps}
          opportunities={[mockActiveOpportunity, secondActive]}
        />
      );

      expect(screen.getByText("2 active")).toBeInTheDocument();
      expect(screen.getByText("Buy the pullback to Fib support")).toBeInTheDocument();
      expect(screen.getByText("Second active opportunity")).toBeInTheDocument();
    });

    it("should render multiple developing opportunities", () => {
      const secondDeveloping: TradeOpportunity = {
        ...mockDevelopingOpportunity,
        id: "opp-developing-2",
        description: "Second developing opportunity",
      };

      render(
        <DiscoveryPanel
          {...defaultProps}
          opportunities={[mockDevelopingOpportunity, secondDeveloping]}
        />
      );

      expect(screen.getByText("0 active")).toBeInTheDocument();
      expect(screen.getByText("Weekly bearish trend forming")).toBeInTheDocument();
      expect(screen.getByText("Second developing opportunity")).toBeInTheDocument();
    });
  });
});
