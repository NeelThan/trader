/**
 * Tests for ExecutionPanel component
 *
 * TDD: Tests define expected behavior for trade execution UI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExecutionPanel } from "./ExecutionPanel";
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
  category: "with_trend",
  trendPhase: "correction",
};

// Mock sizing data
const createMockSizing = (overrides: Partial<SizingData> = {}): SizingData => ({
  accountBalance: 10000,
  riskPercentage: 2,
  entryPrice: 42100,
  stopLoss: 41800,
  targets: [42700, 43000],
  positionSize: 0.67,
  riskAmount: 200,
  riskRewardRatio: 2,
  stopDistance: 300,
  recommendation: "good",
  isValid: true,
  guardrailWarnings: [],
  ...overrides,
});

describe("ExecutionPanel", () => {
  const defaultProps = {
    opportunity: mockOpportunity,
    sizing: createMockSizing(),
    onBack: vi.fn(),
    onExecute: vi.fn(),
    isExecuting: false,
    error: null as string | null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.onExecute.mockResolvedValue(true);
  });

  // ===========================================================================
  // Header
  // ===========================================================================

  describe("header", () => {
    it("should render back button", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    it("should call onBack when back button is clicked", () => {
      render(<ExecutionPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /back/i }));
      expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it("should show Execute Trade title", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByRole("heading", { name: "Execute Trade" })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Trade Summary
  // ===========================================================================

  describe("trade summary", () => {
    it("should show symbol", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByText("DJI")).toBeInTheDocument();
    });

    it("should show trade direction", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByText("LONG")).toBeInTheDocument();
    });

    it("should show timeframe", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByText("4H")).toBeInTheDocument();
    });

    it("should use green styling for long trades", () => {
      render(<ExecutionPanel {...defaultProps} />);

      const directionText = screen.getByText("LONG");
      expect(directionText).toHaveClass("text-green-400");
    });

    it("should use red styling for short trades", () => {
      const shortOpportunity = { ...mockOpportunity, direction: "short" as const };
      render(<ExecutionPanel {...defaultProps} opportunity={shortOpportunity} />);

      const directionText = screen.getByText("SHORT");
      expect(directionText).toHaveClass("text-red-400");
    });
  });

  // ===========================================================================
  // Trade Details
  // ===========================================================================

  describe("trade details", () => {
    it("should show entry price", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByText(/entry/i)).toBeInTheDocument();
      expect(screen.getByText("42100.00")).toBeInTheDocument();
    });

    it("should show stop loss", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByText(/stop loss/i)).toBeInTheDocument();
      expect(screen.getByText("41800.00")).toBeInTheDocument();
    });

    it("should show targets", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByText(/target 1/i)).toBeInTheDocument();
      expect(screen.getByText("42700.00")).toBeInTheDocument();
      expect(screen.getByText(/target 2/i)).toBeInTheDocument();
      expect(screen.getByText("43000.00")).toBeInTheDocument();
    });

    it("should show position size", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByText(/position size/i)).toBeInTheDocument();
      expect(screen.getByText("0.67")).toBeInTheDocument();
    });

    it("should show risk amount", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByText(/risk amount/i)).toBeInTheDocument();
      // Dollar sign and amount may be in same or separate elements
      expect(screen.getByText(/\$?200/)).toBeInTheDocument();
    });

    it("should show R:R ratio", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByText(/r:r/i)).toBeInTheDocument();
      expect(screen.getByText("2.00")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Recommendation Badge
  // ===========================================================================

  describe("recommendation badge", () => {
    it("should show excellent badge", () => {
      render(
        <ExecutionPanel
          {...defaultProps}
          sizing={createMockSizing({ recommendation: "excellent" })}
        />
      );

      expect(screen.getByText("Excellent")).toBeInTheDocument();
    });

    it("should show good badge", () => {
      render(
        <ExecutionPanel
          {...defaultProps}
          sizing={createMockSizing({ recommendation: "good" })}
        />
      );

      expect(screen.getByText("Good")).toBeInTheDocument();
    });

    it("should show marginal badge", () => {
      render(
        <ExecutionPanel
          {...defaultProps}
          sizing={createMockSizing({ recommendation: "marginal" })}
        />
      );

      expect(screen.getByText("Marginal")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Execute Button
  // ===========================================================================

  describe("execute button", () => {
    it("should show execute button", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /execute trade/i })
      ).toBeInTheDocument();
    });

    it("should call onExecute when clicked", async () => {
      render(<ExecutionPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /execute trade/i }));

      await waitFor(() => {
        expect(defaultProps.onExecute).toHaveBeenCalled();
      });
    });

    it("should be disabled when isExecuting is true", () => {
      render(<ExecutionPanel {...defaultProps} isExecuting={true} />);

      const button = screen.getByRole("button", { name: /executing/i });
      expect(button).toBeDisabled();
    });

    it("should show executing text when isExecuting", () => {
      render(<ExecutionPanel {...defaultProps} isExecuting={true} />);

      // Button text changes to "Executing..."
      expect(screen.getByRole("button", { name: /executing/i })).toBeInTheDocument();
    });

    it("should disable back button when executing", () => {
      render(<ExecutionPanel {...defaultProps} isExecuting={true} />);

      expect(screen.getByRole("button", { name: /back/i })).toBeDisabled();
    });
  });

  // ===========================================================================
  // Error State
  // ===========================================================================

  describe("error state", () => {
    it("should show error message when error exists", () => {
      render(<ExecutionPanel {...defaultProps} error="Failed to execute trade" />);

      expect(screen.getByText("Failed to execute trade")).toBeInTheDocument();
    });

    it("should style error message as error", () => {
      render(<ExecutionPanel {...defaultProps} error="Network error" />);

      const errorElement = screen.getByText("Network error");
      expect(errorElement).toHaveClass("text-red-400");
    });

    it("should not show error when null", () => {
      render(<ExecutionPanel {...defaultProps} error={null} />);

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Paper Trading Mode
  // ===========================================================================

  describe("paper trading mode", () => {
    it("should show paper trading notice", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByText(/paper trading/i)).toBeInTheDocument();
    });

    it("should explain that trade will be journaled", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(screen.getByText(/journal/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Confirmation
  // ===========================================================================

  describe("confirmation", () => {
    it("should show confirmation text before execute", () => {
      render(<ExecutionPanel {...defaultProps} />);

      expect(
        screen.getByText(/confirm.*details.*before.*executing/i)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe("accessibility", () => {
    it("should have accessible error alert", () => {
      render(<ExecutionPanel {...defaultProps} error="Test error" />);

      const errorElement = screen.getByRole("alert");
      expect(errorElement).toBeInTheDocument();
    });
  });
});
