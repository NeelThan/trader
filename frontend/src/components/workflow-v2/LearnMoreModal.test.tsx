/**
 * Tests for LearnMoreModal component
 *
 * TDD: Tests define expected behavior for educational modal.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LearnMoreModal } from "./LearnMoreModal";
import type { EducationalTopic } from "./LearnMoreModal";

// Mock topic data
const mockTopic: EducationalTopic = {
  id: "fibonacci-retracement",
  title: "Fibonacci Retracement",
  category: "fibonacci",
  brief: "Measures pullback levels within a trend",
  detailed:
    "A Fibonacci retracement is used to identify potential support and resistance levels " +
    "during a market pullback. The levels are derived from the Fibonacci sequence.",
  keyPoints: [
    "38.2%, 50%, and 61.8% are the most important levels",
    "Use for entry during pullbacks in trending markets",
    "Wait for confirmation before entering at a level",
  ],
  formula: "Level = High - (Range × Ratio)",
  example: {
    scenario: "Uptrend with pullback",
    calculation: "High = $100, Low = $80, Range = $20",
    result: "61.8% level = $100 - ($20 × 0.618) = $87.64",
  },
  relatedTopics: ["fibonacci-extension", "trend-alignment"],
};

describe("LearnMoreModal", () => {
  const defaultProps = {
    topic: mockTopic,
    open: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  describe("basic rendering", () => {
    it("should render modal when open", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should not render when closed", () => {
      render(<LearnMoreModal {...defaultProps} open={false} />);

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should show topic title", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(screen.getByText("Fibonacci Retracement")).toBeInTheDocument();
    });

    it("should show category badge", () => {
      render(<LearnMoreModal {...defaultProps} />);

      // Find the badge by data-slot attribute
      const badges = screen.getAllByText(/fibonacci/i);
      const badge = badges.find((el) => el.getAttribute("data-slot") === "badge");
      expect(badge).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Content Sections
  // ===========================================================================

  describe("content sections", () => {
    it("should show brief description", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(
        screen.getByText(/measures pullback levels within a trend/i)
      ).toBeInTheDocument();
    });

    it("should show detailed explanation", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(
        screen.getByText(/fibonacci retracement is used to identify/i)
      ).toBeInTheDocument();
    });

    it("should show key points", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(
        screen.getByText(/38.2%, 50%, and 61.8% are the most important/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/use for entry during pullbacks/i)
      ).toBeInTheDocument();
    });

    it("should show formula when provided", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(
        screen.getByText(/Level = High - \(Range × Ratio\)/i)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Example Section
  // ===========================================================================

  describe("example section", () => {
    it("should show example scenario", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(screen.getByText(/uptrend with pullback/i)).toBeInTheDocument();
    });

    it("should show calculation", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(screen.getByText(/High = \$100, Low = \$80/i)).toBeInTheDocument();
    });

    it("should show result", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(screen.getByText(/\$87.64/)).toBeInTheDocument();
    });

    it("should handle topic without example", () => {
      const topicWithoutExample: EducationalTopic = {
        ...mockTopic,
        example: undefined,
      };

      render(<LearnMoreModal {...defaultProps} topic={topicWithoutExample} />);

      // Should still render without errors
      expect(screen.getByText("Fibonacci Retracement")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Related Topics
  // ===========================================================================

  describe("related topics", () => {
    it("should show related topics section", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(screen.getByText(/related topics/i)).toBeInTheDocument();
    });

    it("should show related topic links", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /fibonacci-extension/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /trend-alignment/i })
      ).toBeInTheDocument();
    });

    it("should call onNavigate when related topic clicked", async () => {
      const onNavigate = vi.fn();
      const user = userEvent.setup();

      render(
        <LearnMoreModal {...defaultProps} onNavigateTopic={onNavigate} />
      );

      await user.click(
        screen.getByRole("button", { name: /fibonacci-extension/i })
      );

      expect(onNavigate).toHaveBeenCalledWith("fibonacci-extension");
    });

    it("should handle topic without related topics", () => {
      const topicWithoutRelated: EducationalTopic = {
        ...mockTopic,
        relatedTopics: undefined,
      };

      render(<LearnMoreModal {...defaultProps} topic={topicWithoutRelated} />);

      expect(screen.queryByText(/related topics/i)).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Close Behavior
  // ===========================================================================

  describe("close behavior", () => {
    it("should show close button", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(
        screen.getByRole("button", { name: /close/i })
      ).toBeInTheDocument();
    });

    it("should call onClose when close button clicked", async () => {
      const user = userEvent.setup();
      render(<LearnMoreModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /close/i }));

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it("should call onClose when escape key pressed", async () => {
      const user = userEvent.setup();
      render(<LearnMoreModal {...defaultProps} />);

      await user.keyboard("{Escape}");

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Category Styling
  // ===========================================================================

  describe("category styling", () => {
    it("should show fibonacci category with correct styling", () => {
      render(<LearnMoreModal {...defaultProps} />);

      // Find the badge by data-slot attribute since "fibonacci" appears in content too
      const badges = screen.getAllByText(/fibonacci/i);
      const badge = badges.find((el) => el.getAttribute("data-slot") === "badge");
      expect(badge).toHaveClass("bg-blue-500/20");
    });

    it("should show trend category with correct styling", () => {
      const trendTopic: EducationalTopic = {
        ...mockTopic,
        id: "trend-hh",
        title: "Higher High Pattern",
        category: "trend",
        brief: "A higher high pattern",
        detailed: "Pattern explanation",
      };

      render(<LearnMoreModal {...defaultProps} topic={trendTopic} />);

      // Find the badge by its role (badge element has data-slot="badge")
      const badges = screen.getAllByText(/trend/i);
      const badge = badges.find((el) => el.getAttribute("data-slot") === "badge");
      expect(badge).toHaveClass("bg-green-500/20");
    });

    it("should show indicator category with correct styling", () => {
      const indicatorTopic: EducationalTopic = {
        ...mockTopic,
        id: "rsi-basics",
        title: "RSI Basics",
        category: "indicator",
        brief: "Understanding RSI",
        detailed: "RSI explanation",
      };

      render(<LearnMoreModal {...defaultProps} topic={indicatorTopic} />);

      // Find the badge by data-slot attribute
      const badges = screen.getAllByText(/indicator/i);
      const badge = badges.find((el) => el.getAttribute("data-slot") === "badge");
      expect(badge).toHaveClass("bg-purple-500/20");
    });

    it("should show risk category with correct styling", () => {
      const riskTopic: EducationalTopic = {
        ...mockTopic,
        id: "position-sizing",
        title: "Position Sizing",
        category: "risk",
        brief: "Sizing basics",
        detailed: "Sizing explanation",
      };

      render(<LearnMoreModal {...defaultProps} topic={riskTopic} />);

      // Find the badge by data-slot attribute
      const badges = screen.getAllByText(/risk/i);
      const badge = badges.find((el) => el.getAttribute("data-slot") === "badge");
      expect(badge).toHaveClass("bg-amber-500/20");
    });
  });

  // ===========================================================================
  // Visual Diagram
  // ===========================================================================

  describe("visual diagram", () => {
    it("should show diagram when provided", () => {
      const topicWithDiagram: EducationalTopic = {
        ...mockTopic,
        diagram: {
          type: "fibonacci-retracement",
          alt: "Fibonacci retracement levels diagram",
        },
      };

      render(<LearnMoreModal {...defaultProps} topic={topicWithDiagram} />);

      // Should have an image or svg with the alt text
      expect(
        screen.getByRole("img", { name: /fibonacci retracement levels/i })
      ).toBeInTheDocument();
    });

    it("should handle topic without diagram", () => {
      render(<LearnMoreModal {...defaultProps} />);

      // Should render without errors
      expect(screen.getByText("Fibonacci Retracement")).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  describe("accessibility", () => {
    it("should have proper dialog role", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    it("should have accessible title", () => {
      render(<LearnMoreModal {...defaultProps} />);

      expect(
        screen.getByRole("heading", { name: "Fibonacci Retracement" })
      ).toBeInTheDocument();
    });

    it("should trap focus within modal", async () => {
      const user = userEvent.setup();
      render(<LearnMoreModal {...defaultProps} />);

      // Tab through focusable elements
      await user.tab();
      const firstFocusable = document.activeElement;
      expect(firstFocusable).toBeInTheDocument();
    });
  });
});
