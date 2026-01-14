/**
 * Tests for DiscoveryModePanel component
 *
 * TDD: Tests define expected behavior for the unified discovery panel
 * that toggles between single-symbol and multi-symbol scanning modes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiscoveryModePanel } from "./DiscoveryModePanel";
import type { TradeOpportunity as DiscoveryOpportunity } from "@/hooks/use-trade-discovery";
import type { TradeOpportunity as ScannerOpportunity } from "@/types/workflow-v2";

// Mock child components
vi.mock("./DiscoveryPanel", () => ({
  DiscoveryPanel: vi.fn(({ opportunities, isLoading, symbol }) => (
    <div data-testid="discovery-panel">
      <span data-testid="discovery-symbol">{symbol}</span>
      <span data-testid="discovery-loading">{isLoading ? "loading" : "ready"}</span>
      <span data-testid="discovery-count">{opportunities.length}</span>
    </div>
  )),
}));

vi.mock("./OpportunitiesPanel", () => ({
  OpportunitiesPanel: vi.fn(({ opportunities, isLoading, onSelectOpportunity }) => (
    <div data-testid="opportunities-panel">
      <span data-testid="opportunities-loading">{isLoading ? "loading" : "ready"}</span>
      <span data-testid="opportunities-count">{opportunities.length}</span>
      {opportunities.map((opp: ScannerOpportunity, idx: number) => (
        <button
          key={idx}
          data-testid={`select-${opp.symbol}`}
          onClick={() => onSelectOpportunity(opp)}
        >
          Select {opp.symbol}
        </button>
      ))}
    </div>
  )),
}));

// Mock useOpportunities hook
const mockUseOpportunities = vi.fn();
vi.mock("@/hooks/use-opportunities", () => ({
  useOpportunities: (props: { enabled: boolean }) => mockUseOpportunities(props),
}));

// Helper to create mock discovery opportunity
const createMockDiscoveryOpportunity = (
  symbol: string,
  direction: "long" | "short"
): DiscoveryOpportunity => ({
  id: `test-${symbol}-${direction}`,
  symbol: symbol as DiscoveryOpportunity["symbol"],
  higherTimeframe: "1D",
  lowerTimeframe: "4H",
  direction,
  confidence: 75,
  tradingStyle: "swing",
  description: `${direction} opportunity`,
  reasoning: "Test reasoning",
  isActive: true,
  entryZone: direction === "long" ? "support" : "resistance",
  signal: {
    id: `signal-${symbol}`,
    type: direction === "long" ? "LONG" : "SHORT",
    higherTF: "1D",
    lowerTF: "4H",
    pairName: "1D/4H",
    tradingStyle: "swing",
    description: "Test signal",
    reasoning: "Test",
    confidence: 75,
    entryZone: "support",
    isActive: true,
  },
  higherTrend: {
    timeframe: "1D",
    trend: direction === "long" ? "bullish" : "bearish",
    confidence: 75,
    swing: { signal: "bullish" },
    rsi: { signal: "bullish", value: 55 },
    macd: { signal: "bullish" },
    isLoading: false,
    error: null,
  },
  lowerTrend: {
    timeframe: "4H",
    trend: "bearish",
    confidence: 65,
    swing: { signal: "bearish" },
    rsi: { signal: "bearish", value: 35 },
    macd: { signal: "bearish" },
    isLoading: false,
    error: null,
  },
  category: "with_trend",
  trendPhase: "correction",
});

// Helper to create mock scanner opportunity
const createMockScannerOpportunity = (
  symbol: string,
  direction: "long" | "short"
): ScannerOpportunity => ({
  symbol: symbol as ScannerOpportunity["symbol"],
  higher_timeframe: "1D",
  lower_timeframe: "4H",
  direction,
  confidence: 80,
  category: "with_trend",
  phase: "correction",
  description: `${direction} setup in 1D trend`,
});

describe("DiscoveryModePanel", () => {
  const defaultProps = {
    opportunities: [] as DiscoveryOpportunity[],
    isLoading: false,
    hasError: false,
    errors: [],
    onRefresh: vi.fn(),
    symbol: "DJI" as const,
    onSelectOpportunity: vi.fn(),
    onSymbolChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock return for useOpportunities
    mockUseOpportunities.mockReturnValue({
      opportunities: [],
      symbolsScanned: ["DJI", "SPX", "NDX"],
      scanTimeMs: 100,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
  });

  // ===========================================================================
  // Mode Toggle Rendering
  // ===========================================================================

  describe("mode toggle rendering", () => {
    it("should render mode toggle buttons", () => {
      render(<DiscoveryModePanel {...defaultProps} />);

      expect(screen.getByRole("button", { name: /single/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /scan/i })).toBeInTheDocument();
    });

    it("should show Single Symbol as default active mode", () => {
      render(<DiscoveryModePanel {...defaultProps} />);

      const singleButton = screen.getByRole("button", { name: /single/i });
      // Active button should have secondary variant styling
      expect(singleButton).toHaveAttribute("data-variant", "secondary");
    });

    it("should show DiscoveryPanel by default", () => {
      render(<DiscoveryModePanel {...defaultProps} />);

      expect(screen.getByTestId("discovery-panel")).toBeInTheDocument();
      expect(screen.queryByTestId("opportunities-panel")).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Mode Switching
  // ===========================================================================

  describe("mode switching", () => {
    it("should switch to scan mode when clicking Scan Watchlist", () => {
      render(<DiscoveryModePanel {...defaultProps} />);

      const scanButton = screen.getByRole("button", { name: /scan/i });
      fireEvent.click(scanButton);

      expect(screen.getByTestId("opportunities-panel")).toBeInTheDocument();
      expect(screen.queryByTestId("discovery-panel")).not.toBeInTheDocument();
    });

    it("should switch back to single mode when clicking Single Symbol", () => {
      render(<DiscoveryModePanel {...defaultProps} />);

      // Switch to scan mode
      fireEvent.click(screen.getByRole("button", { name: /scan/i }));
      expect(screen.getByTestId("opportunities-panel")).toBeInTheDocument();

      // Switch back to single mode
      fireEvent.click(screen.getByRole("button", { name: /single/i }));
      expect(screen.getByTestId("discovery-panel")).toBeInTheDocument();
    });

    it("should update button variant when mode changes", () => {
      render(<DiscoveryModePanel {...defaultProps} />);

      const singleButton = screen.getByRole("button", { name: /single/i });
      const scanButton = screen.getByRole("button", { name: /scan/i });

      // Initially single is active
      expect(singleButton).toHaveAttribute("data-variant", "secondary");
      expect(scanButton).toHaveAttribute("data-variant", "ghost");

      // Switch to scan mode
      fireEvent.click(scanButton);

      expect(singleButton).toHaveAttribute("data-variant", "ghost");
      expect(scanButton).toHaveAttribute("data-variant", "secondary");
    });
  });

  // ===========================================================================
  // Single Mode (DiscoveryPanel)
  // ===========================================================================

  describe("single mode", () => {
    it("should pass opportunities to DiscoveryPanel", () => {
      const opportunities = [createMockDiscoveryOpportunity("DJI", "long")];

      render(<DiscoveryModePanel {...defaultProps} opportunities={opportunities} />);

      expect(screen.getByTestId("discovery-count")).toHaveTextContent("1");
    });

    it("should pass loading state to DiscoveryPanel", () => {
      render(<DiscoveryModePanel {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId("discovery-loading")).toHaveTextContent("loading");
    });

    it("should pass symbol to DiscoveryPanel", () => {
      render(<DiscoveryModePanel {...defaultProps} symbol="SPX" />);

      expect(screen.getByTestId("discovery-symbol")).toHaveTextContent("SPX");
    });
  });

  // ===========================================================================
  // Scan Mode (OpportunitiesPanel)
  // ===========================================================================

  describe("scan mode", () => {
    it("should enable useOpportunities when in scan mode", () => {
      render(<DiscoveryModePanel {...defaultProps} />);

      // In single mode, should be disabled
      expect(mockUseOpportunities).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false })
      );

      // Switch to scan mode
      fireEvent.click(screen.getByRole("button", { name: /scan/i }));

      expect(mockUseOpportunities).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: true })
      );
    });

    it("should pass scanner opportunities to OpportunitiesPanel", () => {
      const scannerOpps = [
        createMockScannerOpportunity("DJI", "long"),
        createMockScannerOpportunity("SPX", "short"),
      ];

      mockUseOpportunities.mockReturnValue({
        opportunities: scannerOpps,
        symbolsScanned: ["DJI", "SPX", "NDX"],
        scanTimeMs: 150,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(<DiscoveryModePanel {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /scan/i }));

      expect(screen.getByTestId("opportunities-count")).toHaveTextContent("2");
    });

    it("should pass loading state from scanner to OpportunitiesPanel", () => {
      mockUseOpportunities.mockReturnValue({
        opportunities: [],
        symbolsScanned: [],
        scanTimeMs: 0,
        isLoading: true,
        error: null,
        refresh: vi.fn(),
      });

      render(<DiscoveryModePanel {...defaultProps} />);
      fireEvent.click(screen.getByRole("button", { name: /scan/i }));

      expect(screen.getByTestId("opportunities-loading")).toHaveTextContent("loading");
    });
  });

  // ===========================================================================
  // Opportunity Selection from Scanner
  // ===========================================================================

  describe("scanner opportunity selection", () => {
    it("should call onSymbolChange when selecting opportunity with different symbol", () => {
      const scannerOpps = [createMockScannerOpportunity("SPX", "long")];
      const onSymbolChange = vi.fn();

      mockUseOpportunities.mockReturnValue({
        opportunities: scannerOpps,
        symbolsScanned: ["DJI", "SPX"],
        scanTimeMs: 100,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(
        <DiscoveryModePanel
          {...defaultProps}
          symbol="DJI"
          onSymbolChange={onSymbolChange}
        />
      );

      // Switch to scan mode
      fireEvent.click(screen.getByRole("button", { name: /scan/i }));

      // Select the SPX opportunity
      fireEvent.click(screen.getByTestId("select-SPX"));

      expect(onSymbolChange).toHaveBeenCalledWith("SPX");
    });

    it("should not call onSymbolChange when selecting opportunity with same symbol", () => {
      const scannerOpps = [createMockScannerOpportunity("DJI", "long")];
      const onSymbolChange = vi.fn();

      mockUseOpportunities.mockReturnValue({
        opportunities: scannerOpps,
        symbolsScanned: ["DJI"],
        scanTimeMs: 100,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(
        <DiscoveryModePanel
          {...defaultProps}
          symbol="DJI"
          onSymbolChange={onSymbolChange}
        />
      );

      // Switch to scan mode
      fireEvent.click(screen.getByRole("button", { name: /scan/i }));

      // Select the DJI opportunity
      fireEvent.click(screen.getByTestId("select-DJI"));

      expect(onSymbolChange).not.toHaveBeenCalled();
    });

    it("should call onSelectOpportunity with converted opportunity", () => {
      const scannerOpps = [createMockScannerOpportunity("DJI", "long")];
      const onSelectOpportunity = vi.fn();

      mockUseOpportunities.mockReturnValue({
        opportunities: scannerOpps,
        symbolsScanned: ["DJI"],
        scanTimeMs: 100,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(
        <DiscoveryModePanel
          {...defaultProps}
          onSelectOpportunity={onSelectOpportunity}
        />
      );

      // Switch to scan mode
      fireEvent.click(screen.getByRole("button", { name: /scan/i }));

      // Select the opportunity
      fireEvent.click(screen.getByTestId("select-DJI"));

      expect(onSelectOpportunity).toHaveBeenCalled();

      // Verify the converted opportunity has camelCase properties
      const convertedOpp = onSelectOpportunity.mock.calls[0][0];
      expect(convertedOpp).toHaveProperty("higherTimeframe", "1D");
      expect(convertedOpp).toHaveProperty("lowerTimeframe", "4H");
      expect(convertedOpp).toHaveProperty("direction", "long");
      expect(convertedOpp).toHaveProperty("confidence", 80);
      expect(convertedOpp).toHaveProperty("category", "with_trend");
      expect(convertedOpp).toHaveProperty("trendPhase", "correction");
    });

    it("should convert long direction to bullish trends", () => {
      const scannerOpps = [createMockScannerOpportunity("DJI", "long")];
      const onSelectOpportunity = vi.fn();

      mockUseOpportunities.mockReturnValue({
        opportunities: scannerOpps,
        symbolsScanned: ["DJI"],
        scanTimeMs: 100,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(
        <DiscoveryModePanel
          {...defaultProps}
          onSelectOpportunity={onSelectOpportunity}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /scan/i }));
      fireEvent.click(screen.getByTestId("select-DJI"));

      const convertedOpp = onSelectOpportunity.mock.calls[0][0];
      expect(convertedOpp.higherTrend.trend).toBe("bullish");
      expect(convertedOpp.entryZone).toBe("support");
    });

    it("should convert short direction to bearish trends", () => {
      const scannerOpps = [createMockScannerOpportunity("SPX", "short")];
      const onSelectOpportunity = vi.fn();

      mockUseOpportunities.mockReturnValue({
        opportunities: scannerOpps,
        symbolsScanned: ["SPX"],
        scanTimeMs: 100,
        isLoading: false,
        error: null,
        refresh: vi.fn(),
      });

      render(
        <DiscoveryModePanel
          {...defaultProps}
          onSelectOpportunity={onSelectOpportunity}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /scan/i }));
      fireEvent.click(screen.getByTestId("select-SPX"));

      const convertedOpp = onSelectOpportunity.mock.calls[0][0];
      expect(convertedOpp.higherTrend.trend).toBe("bearish");
      expect(convertedOpp.entryZone).toBe("resistance");
    });
  });

  // ===========================================================================
  // Watchlist Symbols
  // ===========================================================================

  describe("watchlist symbols", () => {
    it("should scan predefined watchlist symbols", () => {
      render(<DiscoveryModePanel {...defaultProps} />);

      expect(mockUseOpportunities).toHaveBeenCalledWith(
        expect.objectContaining({
          symbols: ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"],
        })
      );
    });
  });
});
