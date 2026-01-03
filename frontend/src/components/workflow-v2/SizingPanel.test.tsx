/**
 * Tests for SizingPanel component
 *
 * TDD: Tests define expected behavior for position sizing UI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SizingPanel } from "./SizingPanel";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { SizingData, CapturedValidation } from "@/hooks/use-trade-execution";
import type { ValidationResult } from "@/hooks/use-trade-validation";

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

// Mock validation result
const mockValidation: ValidationResult = {
  checks: [],
  passedCount: 4,
  totalCount: 5,
  isValid: true,
  passPercentage: 80,
  entryLevels: [],
  targetLevels: [],
  suggestedEntry: 42100,
  suggestedStop: 41800,
  suggestedTargets: [42700, 43000],
};

// Mock captured validation
const mockCapturedValidation: CapturedValidation = {
  entry: 42100,
  stop: 41800,
  targets: [42700, 43000],
};

describe("SizingPanel", () => {
  const defaultProps = {
    opportunity: mockOpportunity,
    sizing: createMockSizing(),
    validation: mockValidation,
    capturedValidation: mockCapturedValidation,
    hasCapturedSuggestions: true,
    onUpdateSizing: vi.fn(),
    onRestoreSuggested: vi.fn(),
    onBack: vi.fn(),
    onProceed: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Header
  // ===========================================================================

  describe("header", () => {
    it("should render back button", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    it("should call onBack when back button is clicked", () => {
      render(<SizingPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /back/i }));
      expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it("should show Position Sizing title", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByText("Position Sizing")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Opportunity Summary
  // ===========================================================================

  describe("opportunity summary", () => {
    it("should show trade direction", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByText("LONG")).toBeInTheDocument();
    });

    it("should show symbol", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByText("DJI")).toBeInTheDocument();
    });

    it("should use green styling for long trades", () => {
      render(<SizingPanel {...defaultProps} />);

      const directionText = screen.getByText("LONG");
      expect(directionText).toHaveClass("text-green-400");
    });

    it("should use red styling for short trades", () => {
      const shortOpportunity = { ...mockOpportunity, direction: "short" as const };
      render(<SizingPanel {...defaultProps} opportunity={shortOpportunity} />);

      const directionText = screen.getByText("SHORT");
      expect(directionText).toHaveClass("text-red-400");
    });
  });

  // ===========================================================================
  // Account Settings
  // ===========================================================================

  describe("account settings", () => {
    it("should show Account Settings heading", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByText("Account Settings")).toBeInTheDocument();
    });

    it("should show account balance input", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByLabelText(/account balance/i)).toBeInTheDocument();
    });

    it("should display account balance value", () => {
      render(<SizingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/account balance/i);
      expect(input).toHaveValue(10000);
    });

    it("should show risk percentage input", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByLabelText(/risk/i)).toBeInTheDocument();
    });

    it("should display risk percentage value", () => {
      render(<SizingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/risk.*%/i);
      expect(input).toHaveValue(2);
    });

    it("should call onUpdateSizing when account balance changes", () => {
      render(<SizingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/account balance/i);
      fireEvent.change(input, { target: { value: "25000" } });

      expect(defaultProps.onUpdateSizing).toHaveBeenCalledWith({
        accountBalance: 25000,
      });
    });

    it("should call onUpdateSizing when risk percentage changes", () => {
      render(<SizingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/risk.*%/i);
      fireEvent.change(input, { target: { value: "1" } });

      expect(defaultProps.onUpdateSizing).toHaveBeenCalledWith({
        riskPercentage: 1,
      });
    });
  });

  // ===========================================================================
  // Trade Parameters
  // ===========================================================================

  describe("trade parameters", () => {
    it("should show Trade Parameters heading", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByText("Trade Parameters")).toBeInTheDocument();
    });

    it("should show entry price input", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByLabelText(/entry/i)).toBeInTheDocument();
    });

    it("should display entry price value", () => {
      render(<SizingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/entry/i);
      expect(input).toHaveValue(42100);
    });

    it("should show stop loss input", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByLabelText(/stop loss/i)).toBeInTheDocument();
    });

    it("should display stop loss value", () => {
      render(<SizingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/stop loss/i);
      expect(input).toHaveValue(41800);
    });

    it("should show targets", () => {
      render(<SizingPanel {...defaultProps} />);

      // Targets are labeled as T1, T2, etc.
      expect(screen.getByText(/T1/)).toBeInTheDocument();
      expect(screen.getByDisplayValue("42700")).toBeInTheDocument();
    });

    it("should call onUpdateSizing when entry changes", () => {
      render(<SizingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/entry/i);
      fireEvent.change(input, { target: { value: "42200" } });

      expect(defaultProps.onUpdateSizing).toHaveBeenCalledWith({
        entryPrice: 42200,
      });
    });

    it("should call onUpdateSizing when stop loss changes", () => {
      render(<SizingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/stop loss/i);
      fireEvent.change(input, { target: { value: "41700" } });

      expect(defaultProps.onUpdateSizing).toHaveBeenCalledWith({
        stopLoss: 41700,
      });
    });
  });

  // ===========================================================================
  // Calculated Values
  // ===========================================================================

  describe("calculated values", () => {
    it("should show Calculated Values heading", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByText("Calculated Values")).toBeInTheDocument();
    });

    it("should show position size", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByText(/position size/i)).toBeInTheDocument();
      expect(screen.getByText("0.67")).toBeInTheDocument();
    });

    it("should show risk amount", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByText(/risk amount/i)).toBeInTheDocument();
      expect(screen.getByText("$200")).toBeInTheDocument();
    });

    it("should show stop distance", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByText(/stop distance/i)).toBeInTheDocument();
      expect(screen.getByText("300")).toBeInTheDocument();
    });

    it("should show R:R ratio", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByText(/r:r ratio/i)).toBeInTheDocument();
      expect(screen.getByText("2.00")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Recommendation Badge
  // ===========================================================================

  describe("recommendation badge", () => {
    it("should show excellent badge with green color", () => {
      render(
        <SizingPanel
          {...defaultProps}
          sizing={createMockSizing({ recommendation: "excellent" })}
        />
      );

      const badge = screen.getByText("Excellent");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-green-500");
    });

    it("should show good badge with blue color", () => {
      render(
        <SizingPanel
          {...defaultProps}
          sizing={createMockSizing({ recommendation: "good" })}
        />
      );

      const badge = screen.getByText("Good");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-blue-500");
    });

    it("should show marginal badge with amber color", () => {
      render(
        <SizingPanel
          {...defaultProps}
          sizing={createMockSizing({ recommendation: "marginal" })}
        />
      );

      const badge = screen.getByText("Marginal");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-amber-500");
    });

    it("should show poor badge with red color", () => {
      render(
        <SizingPanel
          {...defaultProps}
          sizing={createMockSizing({ recommendation: "poor" })}
        />
      );

      const badge = screen.getByText("Poor");
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass("bg-red-500");
    });
  });

  // ===========================================================================
  // Proceed Button
  // ===========================================================================

  describe("proceed button", () => {
    it("should show proceed button", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /proceed to execution/i })
      ).toBeInTheDocument();
    });

    it("should call onProceed when clicked", () => {
      render(<SizingPanel {...defaultProps} />);

      fireEvent.click(
        screen.getByRole("button", { name: /proceed to execution/i })
      );
      expect(defaultProps.onProceed).toHaveBeenCalled();
    });

    it("should be enabled when sizing is valid", () => {
      render(<SizingPanel {...defaultProps} />);

      const button = screen.getByRole("button", { name: /proceed to execution/i });
      expect(button).not.toBeDisabled();
    });

    it("should be disabled when entry or stop not set", () => {
      render(
        <SizingPanel
          {...defaultProps}
          sizing={createMockSizing({ entryPrice: 0, stopLoss: 0, isValid: false })}
        />
      );

      const button = screen.getByRole("button", { name: /proceed to execution/i });
      expect(button).toBeDisabled();
    });

    it("should show warning when R:R is poor", () => {
      render(
        <SizingPanel
          {...defaultProps}
          sizing={createMockSizing({ recommendation: "poor", riskRewardRatio: 1.2, isValid: false })}
        />
      );

      expect(
        screen.getByText(/Low R:R ratio/i)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Risk Warning
  // ===========================================================================

  describe("risk warning", () => {
    it("should show warning when risk is too high", () => {
      render(
        <SizingPanel
          {...defaultProps}
          sizing={createMockSizing({
            riskPercentage: 5,
            riskAmount: 500,
          })}
        />
      );

      expect(
        screen.getByText(/high risk/i)
      ).toBeInTheDocument();
    });

    it("should not show warning for normal risk", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.queryByText(/high risk/i)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Input Validation
  // ===========================================================================

  describe("input validation", () => {
    it("should not allow negative account balance", () => {
      render(<SizingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/account balance/i);
      fireEvent.change(input, { target: { value: "-1000" } });

      // Should not call with negative value
      expect(defaultProps.onUpdateSizing).not.toHaveBeenCalled();
    });

    it("should not allow risk percentage above 100", () => {
      render(<SizingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/risk.*%/i);
      fireEvent.change(input, { target: { value: "150" } });

      // Should not call with value > 100
      expect(defaultProps.onUpdateSizing).not.toHaveBeenCalled();
    });

    it("should not allow negative entry price", () => {
      render(<SizingPanel {...defaultProps} />);

      const input = screen.getByLabelText(/entry/i);
      fireEvent.change(input, { target: { value: "-100" } });

      expect(defaultProps.onUpdateSizing).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe("accessibility", () => {
    it("should have proper input labels", () => {
      render(<SizingPanel {...defaultProps} />);

      expect(screen.getByLabelText(/account balance/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/risk.*%/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/entry/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/stop loss/i)).toBeInTheDocument();
    });
  });
});
