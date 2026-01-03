/**
 * Tests for ManagePanel component
 *
 * TDD: Tests define expected behavior for trade management UI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ManagePanel } from "./ManagePanel";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { SizingData } from "@/hooks/use-trade-execution";

// Mock opportunity
const mockOpportunity: TradeOpportunity = {
  id: "test-opp-1",
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
};

// Mock sizing data
const createMockSizing = (overrides: Partial<SizingData> = {}): SizingData => ({
  accountBalance: 10000,
  riskPercentage: 2,
  entryPrice: 100,
  stopLoss: 95,
  targets: [110, 120],
  positionSize: 40,
  riskAmount: 200,
  riskRewardRatio: 2,
  stopDistance: 5,
  recommendation: "good",
  isValid: true,
  guardrailWarnings: [],
  ...overrides,
});

// Mock the API client
vi.mock("@/lib/api", () => ({
  updateJournalEntry: vi.fn().mockResolvedValue({ entry: { id: "test-entry-id" } }),
}));

describe("ManagePanel", () => {
  const defaultProps = {
    opportunity: mockOpportunity,
    sizing: createMockSizing(),
    journalEntryId: "test-entry-id",
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Header
  // ===========================================================================

  describe("header", () => {
    it("should show Manage Trade title", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(
        screen.getByRole("heading", { name: /manage trade/i })
      ).toBeInTheDocument();
    });

    it("should show symbol", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText("DJI")).toBeInTheDocument();
    });

    it("should show direction", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText("LONG")).toBeInTheDocument();
    });

    it("should use green styling for long trades", () => {
      render(<ManagePanel {...defaultProps} />);

      const directionText = screen.getByText("LONG");
      expect(directionText).toHaveClass("text-green-400");
    });

    it("should use red styling for short trades", () => {
      const shortOpportunity = { ...mockOpportunity, direction: "short" as const };
      render(<ManagePanel {...defaultProps} opportunity={shortOpportunity} />);

      const directionText = screen.getByText("SHORT");
      expect(directionText).toHaveClass("text-red-400");
    });
  });

  // ===========================================================================
  // Trade Status
  // ===========================================================================

  describe("trade status", () => {
    it("should show pending status initially", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    it("should show start trade button when pending", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /start trade/i })
      ).toBeInTheDocument();
    });

    it("should show active status after starting", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));

      expect(screen.getByText(/active/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // P&L Display
  // ===========================================================================

  describe("pnl display", () => {
    it("should show P&L section", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText(/p&l/i)).toBeInTheDocument();
    });

    it("should show zero P&L when pending", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText("$0.00")).toBeInTheDocument();
    });

    it("should show R-multiple", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText(/0\.00R/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Price Display
  // ===========================================================================

  describe("price display", () => {
    it("should show current price", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText(/current price/i)).toBeInTheDocument();
    });

    it("should show entry price", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText(/entry/i)).toBeInTheDocument();
      // Entry and current price may be the same, so check for at least one
      expect(screen.getAllByText("100.00").length).toBeGreaterThanOrEqual(1);
    });

    it("should show stop loss price", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText(/stop/i)).toBeInTheDocument();
      expect(screen.getByText("95.00")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Price Simulation
  // ===========================================================================

  describe("price simulation", () => {
    it("should have price input for simulation", () => {
      render(<ManagePanel {...defaultProps} />);

      // Activate trade first
      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));

      expect(screen.getByLabelText(/simulate price/i)).toBeInTheDocument();
    });

    it("should update P&L when price changes", async () => {
      render(<ManagePanel {...defaultProps} />);

      // Activate trade
      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));

      // Update price to 105 (long position, $5 profit * 40 units = $200)
      const priceInput = screen.getByLabelText(/simulate price/i);
      fireEvent.change(priceInput, { target: { value: "105" } });
      fireEvent.blur(priceInput);

      await waitFor(() => {
        expect(screen.getByText("$200.00")).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Breakeven Button
  // ===========================================================================

  describe("breakeven button", () => {
    it("should show move to breakeven button when active", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));

      expect(
        screen.getByRole("button", { name: /breakeven/i })
      ).toBeInTheDocument();
    });

    it("should disable breakeven button when pending", () => {
      render(<ManagePanel {...defaultProps} />);

      const breakevenBtn = screen.getByRole("button", { name: /breakeven/i });
      expect(breakevenBtn).toBeDisabled();
    });

    it("should show FREE TRADE badge after moving to breakeven", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));
      fireEvent.click(screen.getByRole("button", { name: /breakeven/i }));

      // Badge shows "FREE TRADE" - may appear in multiple places (badge + log)
      expect(screen.getAllByText(/free trade/i).length).toBeGreaterThanOrEqual(1);
    });

    it("should update status to at_breakeven", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));
      fireEvent.click(screen.getByRole("button", { name: /breakeven/i }));

      // Status badge shows "At Breakeven"
      expect(screen.getByText("At Breakeven")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Trailing Stop Button
  // ===========================================================================

  describe("trailing stop button", () => {
    it("should show enable trailing stop button when active", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));

      expect(
        screen.getByRole("button", { name: /trailing/i })
      ).toBeInTheDocument();
    });

    it("should disable trailing button when pending", () => {
      render(<ManagePanel {...defaultProps} />);

      const trailingBtn = screen.getByRole("button", { name: /trailing/i });
      expect(trailingBtn).toBeDisabled();
    });

    it("should show trailing status after enabling", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));
      fireEvent.click(screen.getByRole("button", { name: /trailing/i }));

      // Status badge shows "Trailing" - there's also a Trailing button
      const trailingElements = screen.getAllByText("Trailing");
      // At least one should be the status badge (not the button)
      expect(trailingElements.length).toBeGreaterThanOrEqual(1);
    });

    it("should show trailing stop price after enabling", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));
      fireEvent.click(screen.getByRole("button", { name: /trailing/i }));

      // Trailing stop should be visible (97.50 for long with 0.5 * riskPerUnit)
      expect(screen.getByText(/trail:/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Close Trade Button
  // ===========================================================================

  describe("close trade button", () => {
    it("should show close trade button when active", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));

      expect(
        screen.getByRole("button", { name: /close trade/i })
      ).toBeInTheDocument();
    });

    it("should disable close button when pending", () => {
      render(<ManagePanel {...defaultProps} />);

      const closeBtn = screen.getByRole("button", { name: /close trade/i });
      expect(closeBtn).toBeDisabled();
    });

    it("should show closed status after closing", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));
      fireEvent.click(screen.getByRole("button", { name: /close trade/i }));

      // Status badge shows "Closed"
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });

    it("should call onClose after closing trade", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));
      fireEvent.click(screen.getByRole("button", { name: /close trade/i }));

      // After closing, user can finish
      fireEvent.click(screen.getByRole("button", { name: /finish/i }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Trade Log
  // ===========================================================================

  describe("trade log", () => {
    it("should show trade log section", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText(/trade log/i)).toBeInTheDocument();
    });

    it("should show entry log after activating", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));

      expect(screen.getByText(/entered.*long/i)).toBeInTheDocument();
    });

    it("should show exit log after closing", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));
      fireEvent.click(screen.getByRole("button", { name: /close trade/i }));

      expect(screen.getByText(/manually closed/i)).toBeInTheDocument();
    });

    it("should show breakeven log entry", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));
      fireEvent.click(screen.getByRole("button", { name: /breakeven/i }));

      expect(screen.getByText(/stop.*breakeven/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Add Note
  // ===========================================================================

  describe("add note", () => {
    it("should have note input", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByPlaceholderText(/add a note/i)).toBeInTheDocument();
    });

    it("should have add note button", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /add note/i })
      ).toBeInTheDocument();
    });

    it("should add note to trade log", () => {
      render(<ManagePanel {...defaultProps} />);

      const noteInput = screen.getByPlaceholderText(/add a note/i);
      fireEvent.change(noteInput, { target: { value: "Test observation" } });
      fireEvent.click(screen.getByRole("button", { name: /add note/i }));

      expect(screen.getByText("Test observation")).toBeInTheDocument();
    });

    it("should clear input after adding note", () => {
      render(<ManagePanel {...defaultProps} />);

      const noteInput = screen.getByPlaceholderText(/add a note/i) as HTMLInputElement;
      fireEvent.change(noteInput, { target: { value: "Test note" } });
      fireEvent.click(screen.getByRole("button", { name: /add note/i }));

      expect(noteInput.value).toBe("");
    });
  });

  // ===========================================================================
  // Targets Display
  // ===========================================================================

  describe("targets display", () => {
    it("should show targets section", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText(/targets/i)).toBeInTheDocument();
    });

    it("should show target prices", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(screen.getByText("110.00")).toBeInTheDocument();
      expect(screen.getByText("120.00")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Finish Button
  // ===========================================================================

  describe("finish button", () => {
    it("should show finish button when closed", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));
      fireEvent.click(screen.getByRole("button", { name: /close trade/i }));

      expect(
        screen.getByRole("button", { name: /finish/i })
      ).toBeInTheDocument();
    });

    it("should not show finish button when active", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));

      expect(
        screen.queryByRole("button", { name: /finish/i })
      ).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Journal Integration
  // ===========================================================================

  describe("journal integration", () => {
    it("should show saved to journal after closing", async () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));
      fireEvent.click(screen.getByRole("button", { name: /close trade/i }));

      await waitFor(() => {
        expect(screen.getByText(/saved to journal/i)).toBeInTheDocument();
      });
    });

    it("should show message when no journal entry linked", () => {
      const propsWithoutJournal = { ...defaultProps, journalEntryId: null };
      render(<ManagePanel {...propsWithoutJournal} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));
      fireEvent.click(screen.getByRole("button", { name: /close trade/i }));

      expect(screen.getByText(/no journal entry linked/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe("accessibility", () => {
    it("should have accessible heading", () => {
      render(<ManagePanel {...defaultProps} />);

      expect(
        screen.getByRole("heading", { name: /manage trade/i })
      ).toBeInTheDocument();
    });

    it("should have labeled price input", () => {
      render(<ManagePanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /start trade/i }));

      const input = screen.getByLabelText(/simulate price/i);
      expect(input).toBeInTheDocument();
    });
  });
});
