/**
 * Tests for ValidationPanel component
 *
 * TDD: Tests define expected behavior for trade validation UI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ValidationPanel } from "./ValidationPanel";
import type { TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { ValidationResult, ValidationCheck } from "@/hooks/use-trade-validation";

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

// Mock validation checks
const createMockChecks = (): ValidationCheck[] => [
  {
    name: "Trend Alignment",
    passed: true,
    status: "passed",
    explanation: "1D and 4H are aligned for long",
    details: "Confidence: 75%",
  },
  {
    name: "Entry Zone",
    passed: true,
    status: "passed",
    explanation: "Found 3 Fibonacci entry levels",
    details: "Best: R61.8% at 42100.00",
  },
  {
    name: "Target Zones",
    passed: true,
    status: "passed",
    explanation: "Found 2 extension targets",
    details: "First: E127.2% at 42700.00",
  },
  {
    name: "RSI Confirmation",
    passed: false,
    status: "failed",
    explanation: "RSI bearish conflicts with long bias",
    details: "RSI: 72.5",
  },
  {
    name: "MACD Confirmation",
    passed: true,
    status: "passed",
    explanation: "MACD bullish confirms long momentum",
  },
];

// Mock validation result
const createMockValidation = (
  overrides: Partial<ValidationResult> = {}
): ValidationResult => ({
  checks: createMockChecks(),
  passedCount: 4,
  totalCount: 5,
  isValid: true,
  passPercentage: 80,
  entryLevels: [],
  targetLevels: [],
  suggestedEntry: 42100,
  suggestedStop: 41800,
  suggestedTargets: [42700, 43000],
  ...overrides,
});

describe("ValidationPanel", () => {
  const defaultProps = {
    opportunity: mockOpportunity,
    validation: createMockValidation(),
    isLoading: false,
    onBack: vi.fn(),
    onProceed: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe("loading state", () => {
    it("should show loading indicator when validating", () => {
      render(<ValidationPanel {...defaultProps} isLoading={true} />);

      expect(screen.getByText(/validating trade/i)).toBeInTheDocument();
    });

    it("should hide content when loading", () => {
      render(<ValidationPanel {...defaultProps} isLoading={true} />);

      expect(screen.queryByText("Validation")).not.toBeInTheDocument();
      expect(screen.queryByText("Checklist")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Header
  // ===========================================================================

  describe("header", () => {
    it("should render back button", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByRole("button", { name: /back/i })).toBeInTheDocument();
    });

    it("should call onBack when back button is clicked", () => {
      render(<ValidationPanel {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /back/i }));
      expect(defaultProps.onBack).toHaveBeenCalled();
    });

    it("should show Validation title", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("Validation")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Opportunity Summary
  // ===========================================================================

  describe("opportunity summary", () => {
    it("should show trade direction", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("LONG")).toBeInTheDocument();
    });

    it("should show timeframe pair", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("1D → 4H")).toBeInTheDocument();
    });

    it("should show opportunity description", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("Buy the pullback to Fib support")).toBeInTheDocument();
    });

    it("should use green styling for long trades", () => {
      render(<ValidationPanel {...defaultProps} />);

      const directionText = screen.getByText("LONG");
      expect(directionText).toHaveClass("text-green-400");
    });

    it("should use red styling for short trades", () => {
      const shortOpportunity = { ...mockOpportunity, direction: "short" as const };
      render(
        <ValidationPanel {...defaultProps} opportunity={shortOpportunity} />
      );

      const directionText = screen.getByText("SHORT");
      expect(directionText).toHaveClass("text-red-400");
    });
  });

  // ===========================================================================
  // Validation Progress
  // ===========================================================================

  describe("validation progress", () => {
    it("should show validation score heading", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("Validation Score")).toBeInTheDocument();
    });

    it("should show passed/total count", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("4/5 passed")).toBeInTheDocument();
    });

    it("should show Ready to Trade badge when valid", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("Ready to Trade")).toBeInTheDocument();
    });

    it("should show Needs Improvement badge when invalid", () => {
      const invalidValidation = createMockValidation({
        isValid: false,
        passedCount: 2,
        passPercentage: 40,
      });
      render(
        <ValidationPanel {...defaultProps} validation={invalidValidation} />
      );

      expect(screen.getByText("Needs Improvement")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Validation Checklist
  // ===========================================================================

  describe("validation checklist", () => {
    it("should show Checklist heading", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("Checklist")).toBeInTheDocument();
    });

    it("should render all validation checks", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("Trend Alignment")).toBeInTheDocument();
      expect(screen.getByText("Entry Zone")).toBeInTheDocument();
      expect(screen.getByText("Target Zones")).toBeInTheDocument();
      expect(screen.getByText("RSI Confirmation")).toBeInTheDocument();
      expect(screen.getByText("MACD Confirmation")).toBeInTheDocument();
    });

    it("should show check explanations", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(
        screen.getByText("1D and 4H are aligned for long")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Found 3 Fibonacci entry levels")
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Suggested Levels
  // ===========================================================================

  describe("suggested levels", () => {
    it("should show Suggested Levels heading", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("Suggested Levels")).toBeInTheDocument();
    });

    it("should show suggested entry price", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("Entry")).toBeInTheDocument();
      expect(screen.getByText("42100.00")).toBeInTheDocument();
    });

    it("should show suggested stop loss", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("Stop Loss")).toBeInTheDocument();
      expect(screen.getByText("41800.00")).toBeInTheDocument();
    });

    it("should show suggested targets", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(screen.getByText("Target 1")).toBeInTheDocument();
      expect(screen.getByText("42700.00")).toBeInTheDocument();
      expect(screen.getByText("Target 2")).toBeInTheDocument();
      expect(screen.getByText("43000.00")).toBeInTheDocument();
    });

    it("should not show levels section when no suggestions", () => {
      const noLevelsValidation = createMockValidation({
        suggestedEntry: null,
        suggestedStop: null,
        suggestedTargets: [],
      });
      render(
        <ValidationPanel {...defaultProps} validation={noLevelsValidation} />
      );

      expect(screen.queryByText("Suggested Levels")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Proceed Button
  // ===========================================================================

  describe("proceed button", () => {
    it("should show proceed button", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /proceed to position sizing/i })
      ).toBeInTheDocument();
    });

    it("should call onProceed when clicked", () => {
      render(<ValidationPanel {...defaultProps} />);

      fireEvent.click(
        screen.getByRole("button", { name: /proceed to position sizing/i })
      );
      expect(defaultProps.onProceed).toHaveBeenCalled();
    });

    it("should be enabled when validation is valid", () => {
      render(<ValidationPanel {...defaultProps} />);

      const button = screen.getByRole("button", {
        name: /proceed to position sizing/i,
      });
      expect(button).not.toBeDisabled();
    });

    it("should be disabled when validation is invalid", () => {
      const invalidValidation = createMockValidation({ isValid: false });
      render(
        <ValidationPanel {...defaultProps} validation={invalidValidation} />
      );

      const button = screen.getByRole("button", {
        name: /proceed to position sizing/i,
      });
      expect(button).toBeDisabled();
    });

    it("should show help text when invalid", () => {
      const invalidValidation = createMockValidation({ isValid: false });
      render(
        <ValidationPanel {...defaultProps} validation={invalidValidation} />
      );

      expect(
        screen.getByText(/at least 60% of checks must pass/i)
      ).toBeInTheDocument();
    });

    it("should not show help text when valid", () => {
      render(<ValidationPanel {...defaultProps} />);

      expect(
        screen.queryByText(/at least 60% of checks must pass/i)
      ).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Check Icons
  // ===========================================================================

  describe("check icons", () => {
    it("should show passed checks with check icon", () => {
      const { container } = render(<ValidationPanel {...defaultProps} />);

      // Check for SVG elements with green color class
      const greenIcons = container.querySelectorAll(".text-green-400");
      expect(greenIcons.length).toBeGreaterThan(0);
    });

    it("should show failed checks with X icon", () => {
      const { container } = render(<ValidationPanel {...defaultProps} />);

      // Check for SVG elements with red color class
      const redIcons = container.querySelectorAll(".text-red-400");
      expect(redIcons.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Empty Validation
  // ===========================================================================

  describe("empty validation", () => {
    it("should handle empty checks array", () => {
      const emptyValidation = createMockValidation({
        checks: [],
        passedCount: 0,
        totalCount: 0,
        passPercentage: 0,
      });

      render(
        <ValidationPanel {...defaultProps} validation={emptyValidation} />
      );

      expect(screen.getByText("0/0 passed")).toBeInTheDocument();
    });
  });
});
