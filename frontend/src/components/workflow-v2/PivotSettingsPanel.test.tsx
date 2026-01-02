/**
 * Tests for PivotSettingsPanel component
 *
 * TDD: Tests define expected behavior for pivot management UI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PivotSettingsPanel } from "./PivotSettingsPanel";
import type { ManagedPivot } from "@/hooks/use-pivot-manager";
import type { Timeframe } from "@/lib/chart-constants";

// Mock data
const mockPivots: ManagedPivot[] = [
  {
    id: "1D-high-10-2024-01-01",
    index: 10,
    price: 42500,
    type: "high",
    timestamp: "2024-01-01T00:00:00Z",
    isManual: false,
  },
  {
    id: "1D-low-5-2024-01-01",
    index: 5,
    price: 41000,
    type: "low",
    timestamp: "2024-01-01T00:00:00Z",
    isManual: true,
  },
];

const mockPivotsWithLabels: ManagedPivot[] = [
  { ...mockPivots[0], abcLabel: "B" as const },
  { ...mockPivots[1], abcLabel: "A" as const },
];

describe("PivotSettingsPanel", () => {
  const defaultProps = {
    timeframe: "1D" as Timeframe,
    pivots: mockPivots,
    pivotsWithLabels: mockPivotsWithLabels,
    isLocked: false,
    trendDirection: "ranging" as const,
    onAddPivot: vi.fn(),
    onUpdatePivotPrice: vi.fn(),
    onRemovePivot: vi.fn(),
    onClearPivots: vi.fn(),
    onLockChange: vi.fn(),
    onTrendDirectionChange: vi.fn(),
    onDetectPivots: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Rendering
  // ===========================================================================

  describe("rendering", () => {
    it("should render timeframe header", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      expect(screen.getByText("1D")).toBeInTheDocument();
    });

    it("should render pivot list", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      expect(screen.getByText("42500")).toBeInTheDocument();
      expect(screen.getByText("41000")).toBeInTheDocument();
    });

    it("should show ABC labels when available", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      expect(screen.getByText("A")).toBeInTheDocument();
      expect(screen.getByText("B")).toBeInTheDocument();
    });

    it("should show manual indicator for manual pivots", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      // The manual pivot should have a visual indicator
      expect(screen.getAllByTestId("pivot-row")).toHaveLength(2);
    });

    it("should render empty state when no pivots", () => {
      render(<PivotSettingsPanel {...defaultProps} pivots={[]} pivotsWithLabels={[]} />);
      expect(screen.getByText(/no pivots/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Lock/Unlock
  // ===========================================================================

  describe("lock/unlock", () => {
    it("should render lock toggle", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      expect(screen.getByRole("checkbox", { name: /lock/i })).toBeInTheDocument();
    });

    it("should reflect locked state", () => {
      render(<PivotSettingsPanel {...defaultProps} isLocked={true} />);
      expect(screen.getByRole("checkbox", { name: /lock/i })).toBeChecked();
    });

    it("should call onLockChange when toggled", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      const checkbox = screen.getByRole("checkbox", { name: /lock/i });
      fireEvent.click(checkbox);
      expect(defaultProps.onLockChange).toHaveBeenCalledWith(true);
    });
  });

  // ===========================================================================
  // Trend Direction
  // ===========================================================================

  describe("trend direction", () => {
    it("should render trend direction selector", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      expect(screen.getByRole("combobox", { name: /trend/i })).toBeInTheDocument();
    });

    it("should reflect current trend direction", () => {
      render(<PivotSettingsPanel {...defaultProps} trendDirection="long" />);
      expect(screen.getByRole("combobox", { name: /trend/i })).toHaveValue("long");
    });

    it("should call onTrendDirectionChange when changed", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      const select = screen.getByRole("combobox", { name: /trend/i });
      fireEvent.change(select, { target: { value: "short" } });
      expect(defaultProps.onTrendDirectionChange).toHaveBeenCalledWith("short");
    });
  });

  // ===========================================================================
  // Pivot Actions
  // ===========================================================================

  describe("pivot actions", () => {
    it("should render detect button", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      expect(screen.getByRole("button", { name: /detect/i })).toBeInTheDocument();
    });

    it("should call onDetectPivots when detect clicked", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /detect/i }));
      expect(defaultProps.onDetectPivots).toHaveBeenCalled();
    });

    it("should render clear button", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
    });

    it("should call onClearPivots when clear clicked", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /clear/i }));
      expect(defaultProps.onClearPivots).toHaveBeenCalled();
    });

    it("should render remove button for each pivot", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      expect(removeButtons).toHaveLength(2);
    });

    it("should call onRemovePivot when remove clicked", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      fireEvent.click(removeButtons[0]);
      expect(defaultProps.onRemovePivot).toHaveBeenCalledWith(mockPivots[0].id);
    });
  });

  // ===========================================================================
  // Price Editing
  // ===========================================================================

  describe("price editing", () => {
    it("should allow editing pivot price", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      // Click on price to enter edit mode
      const priceButton = screen.getByRole("button", { name: "42500" });
      fireEvent.click(priceButton);
      // Now input should be visible
      const priceInput = screen.getByRole("spinbutton");
      expect(priceInput).toBeInTheDocument();
    });

    it("should call onUpdatePivotPrice when price changed", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      // Click on price to enter edit mode
      const priceButton = screen.getByRole("button", { name: "42500" });
      fireEvent.click(priceButton);
      // Edit the price
      const priceInput = screen.getByRole("spinbutton");
      fireEvent.change(priceInput, { target: { value: "43000" } });
      fireEvent.blur(priceInput);
      expect(defaultProps.onUpdatePivotPrice).toHaveBeenCalledWith(
        mockPivots[0].id,
        43000
      );
    });
  });

  // ===========================================================================
  // Collapsed State
  // ===========================================================================

  describe("collapsed state", () => {
    it("should be collapsible", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      const header = screen.getByRole("button", { name: /1D/i });
      expect(header).toBeInTheDocument();
    });

    it("should toggle content visibility on header click", () => {
      render(<PivotSettingsPanel {...defaultProps} />);
      const header = screen.getByRole("button", { name: /1D/i });

      // Initially visible
      expect(screen.getByText("42500")).toBeInTheDocument();

      // Click to collapse
      fireEvent.click(header);

      // Content should be hidden
      expect(screen.queryByText("42500")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe("loading state", () => {
    it("should show loading indicator when detecting", () => {
      render(<PivotSettingsPanel {...defaultProps} isLoading={true} />);
      expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    });

    it("should disable detect button when loading", () => {
      render(<PivotSettingsPanel {...defaultProps} isLoading={true} />);
      expect(screen.getByRole("button", { name: /detect/i })).toBeDisabled();
    });
  });
});
