/**
 * Tests for WatchlistPanel component
 *
 * TDD: Tests define expected behavior for watchlist and multi-symbol UI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WatchlistPanel } from "./WatchlistPanel";
import type { MarketSymbol } from "@/lib/chart-constants";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { WatchlistSummary, OpportunityFilter } from "@/hooks/use-watchlist";

// Mock opportunity data
const mockOpportunities: TradeOpportunity[] = [
  {
    id: "dji-opp-1",
    symbol: "DJI",
    direction: "long",
    confidence: 85,
    higherTimeframe: "1D",
    lowerTimeframe: "4H",
    tradingStyle: "swing",
    description: "Buy pullback",
    reasoning: "HTF bullish",
    isActive: true,
    entryZone: "support",
    signal: {
      id: "sig-1",
      type: "LONG",
      higherTF: "1D",
      lowerTF: "4H",
      pairName: "1D → 4H",
      confidence: 85,
      description: "Test",
      reasoning: "Test",
      isActive: true,
      tradingStyle: "swing",
      entryZone: "support",
    },
    higherTrend: undefined,
    lowerTrend: undefined,
    category: "with_trend",
    trendPhase: "correction",
  },
  {
    id: "spx-opp-1",
    symbol: "SPX",
    direction: "short",
    confidence: 75,
    higherTimeframe: "1W",
    lowerTimeframe: "1D",
    tradingStyle: "position",
    description: "Sell rally",
    reasoning: "HTF bearish",
    isActive: true,
    entryZone: "resistance",
    signal: {
      id: "sig-2",
      type: "SHORT",
      higherTF: "1W",
      lowerTF: "1D",
      pairName: "1W → 1D",
      confidence: 75,
      description: "Test",
      reasoning: "Test",
      isActive: true,
      tradingStyle: "position",
      entryZone: "resistance",
    },
    higherTrend: undefined,
    lowerTrend: undefined,
    category: "with_trend",
    trendPhase: "impulse",
  },
];

const mockSummary: WatchlistSummary = {
  totalOpportunities: 2,
  bySymbol: { DJI: 1, SPX: 1 },
  longCount: 1,
  shortCount: 1,
  bestOpportunity: mockOpportunities[0],
};

describe("WatchlistPanel", () => {
  const defaultProps = {
    watchlist: ["DJI", "SPX"] as MarketSymbol[],
    availableSymbols: ["NDX", "BTCUSD", "EURUSD", "GOLD"] as MarketSymbol[],
    opportunities: mockOpportunities,
    summary: mockSummary,
    activeSymbol: "DJI" as MarketSymbol,
    filter: {} as OpportunityFilter,
    isLoading: false,
    onAddSymbol: vi.fn(),
    onRemoveSymbol: vi.fn(),
    onSetActiveSymbol: vi.fn(),
    onSetFilter: vi.fn(),
    onClearFilter: vi.fn(),
    onSelectOpportunity: vi.fn(),
    onRefresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Header
  // ===========================================================================

  describe("header", () => {
    it("should show Watchlist title", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(
        screen.getByRole("heading", { name: /watchlist/i })
      ).toBeInTheDocument();
    });

    it("should show refresh button", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /refresh/i })
      ).toBeInTheDocument();
    });

    it("should call onRefresh when refresh button clicked", () => {
      render(<WatchlistPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
      expect(defaultProps.onRefresh).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Watchlist Symbols
  // ===========================================================================

  describe("watchlist symbols", () => {
    it("should show all watchlist symbols", () => {
      render(<WatchlistPanel {...defaultProps} />);

      // Symbols appear in button + opportunity cards, check at least one
      expect(screen.getAllByText("DJI").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("SPX").length).toBeGreaterThanOrEqual(1);
    });

    it("should highlight active symbol", () => {
      render(<WatchlistPanel {...defaultProps} />);

      // Find the symbol buttons (they have badge children)
      const djiButtons = screen.getAllByRole("button", { name: /dji/i });
      // First one should be the watchlist button
      expect(djiButtons[0]).toHaveClass("bg-primary");
    });

    it("should call onSetActiveSymbol when symbol clicked", () => {
      render(<WatchlistPanel {...defaultProps} />);

      // Find SPX buttons and click the watchlist one (first)
      const spxButtons = screen.getAllByRole("button", { name: /spx/i });
      fireEvent.click(spxButtons[0]);
      expect(defaultProps.onSetActiveSymbol).toHaveBeenCalledWith("SPX");
    });

    it("should show remove button for each symbol", () => {
      render(<WatchlistPanel {...defaultProps} />);

      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      expect(removeButtons.length).toBe(2);
    });

    it("should call onRemoveSymbol when remove clicked", () => {
      render(<WatchlistPanel {...defaultProps} />);

      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      fireEvent.click(removeButtons[0]);
      expect(defaultProps.onRemoveSymbol).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Add Symbol
  // ===========================================================================

  describe("add symbol", () => {
    it("should show add symbol button", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /add symbol/i })
      ).toBeInTheDocument();
    });

    it("should show available symbols dropdown when add clicked", async () => {
      const user = userEvent.setup();
      render(<WatchlistPanel {...defaultProps} />);

      const addButton = screen.getByRole("button", { name: /add symbol/i });
      await user.click(addButton);

      // Dropdown opens - check for menu items
      await waitFor(() => {
        expect(screen.getByText("NDX")).toBeInTheDocument();
      });
      expect(screen.getByText("BTCUSD")).toBeInTheDocument();
    });

    it("should call onAddSymbol when symbol selected", async () => {
      const user = userEvent.setup();
      render(<WatchlistPanel {...defaultProps} />);

      const addButton = screen.getByRole("button", { name: /add symbol/i });
      await user.click(addButton);

      // Wait for dropdown to open and find menu item
      const ndxItem = await screen.findByText("NDX");
      await user.click(ndxItem);

      expect(defaultProps.onAddSymbol).toHaveBeenCalledWith("NDX");
    });
  });

  // ===========================================================================
  // Summary Statistics
  // ===========================================================================

  describe("summary statistics", () => {
    it("should show total opportunities count", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    it("should show long count", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(screen.getByText(/1 long/i)).toBeInTheDocument();
    });

    it("should show short count", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(screen.getByText(/1 short/i)).toBeInTheDocument();
    });

    it("should show best opportunity highlight", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(screen.getByText(/best.*85%/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Opportunity List
  // ===========================================================================

  describe("opportunity list", () => {
    it("should show all opportunities", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(screen.getByText("Buy pullback")).toBeInTheDocument();
      expect(screen.getByText("Sell rally")).toBeInTheDocument();
    });

    it("should show opportunity symbol", () => {
      render(<WatchlistPanel {...defaultProps} />);

      // Symbols shown in opportunity cards
      const djiElements = screen.getAllByText("DJI");
      expect(djiElements.length).toBeGreaterThanOrEqual(1);
    });

    it("should show opportunity confidence", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(screen.getByText("85%")).toBeInTheDocument();
      expect(screen.getByText("75%")).toBeInTheDocument();
    });

    it("should show opportunity direction", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(screen.getByText("LONG")).toBeInTheDocument();
      expect(screen.getByText("SHORT")).toBeInTheDocument();
    });

    it("should call onSelectOpportunity when opportunity clicked", () => {
      render(<WatchlistPanel {...defaultProps} />);

      fireEvent.click(screen.getByText("Buy pullback"));
      expect(defaultProps.onSelectOpportunity).toHaveBeenCalledWith(
        mockOpportunities[0]
      );
    });
  });

  // ===========================================================================
  // Filtering
  // ===========================================================================

  describe("filtering", () => {
    it("should show filter controls", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(screen.getByText(/filter/i)).toBeInTheDocument();
    });

    it("should show direction filter options", () => {
      render(<WatchlistPanel {...defaultProps} />);

      expect(screen.getByRole("button", { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^long$/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^short$/i })).toBeInTheDocument();
    });

    it("should call onSetFilter when direction filter clicked", () => {
      render(<WatchlistPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /^long$/i }));
      expect(defaultProps.onSetFilter).toHaveBeenCalledWith({ direction: "long" });
    });

    it("should call onClearFilter when All clicked", () => {
      render(<WatchlistPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /all/i }));
      expect(defaultProps.onClearFilter).toHaveBeenCalled();
    });

    it("should highlight active filter", () => {
      render(<WatchlistPanel {...defaultProps} filter={{ direction: "long" }} />);

      const longButton = screen.getByRole("button", { name: /^long$/i });
      expect(longButton).toHaveClass("bg-primary");
    });
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe("loading state", () => {
    it("should show loading indicator when loading", () => {
      render(<WatchlistPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/scanning/i)).toBeInTheDocument();
    });

    it("should disable refresh button when loading", () => {
      render(<WatchlistPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByRole("button", { name: /refresh/i })).toBeDisabled();
    });
  });

  // ===========================================================================
  // Empty State
  // ===========================================================================

  describe("empty state", () => {
    it("should show message when no opportunities", () => {
      render(
        <WatchlistPanel
          {...defaultProps}
          opportunities={[]}
          summary={{ ...mockSummary, totalOpportunities: 0 }}
        />
      );

      expect(screen.getByText(/no opportunities/i)).toBeInTheDocument();
    });

    it("should show message when watchlist is empty", () => {
      render(
        <WatchlistPanel
          {...defaultProps}
          watchlist={[]}
          opportunities={[]}
          summary={{ ...mockSummary, totalOpportunities: 0 }}
        />
      );

      // Multiple "add symbols" messages may appear (in symbols card and opportunities card)
      const addSymbolsMessages = screen.getAllByText(/add symbols/i);
      expect(addSymbolsMessages.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===========================================================================
  // Per-Symbol Counts
  // ===========================================================================

  describe("per-symbol counts", () => {
    it("should show opportunity count per symbol", () => {
      render(<WatchlistPanel {...defaultProps} />);

      // Each symbol button should show count (first DJI button is the watchlist button)
      const djiButtons = screen.getAllByRole("button", { name: /dji/i });
      expect(djiButtons[0]).toHaveTextContent("1");
    });
  });
});
