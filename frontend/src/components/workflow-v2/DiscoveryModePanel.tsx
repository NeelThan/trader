"use client";

/**
 * DiscoveryModePanel - Unified discovery with single-symbol and multi-symbol modes
 *
 * Provides a toggle between:
 * - Single Symbol: Shows opportunities for the currently selected symbol
 * - Scan All: Scans multiple symbols from watchlist
 *
 * Both modes now use the backend API for consistent opportunity detection.
 * Per ADR-20260101, frontend is a dumb client - all calculations done by backend.
 */

import { useState, useMemo } from "react";
import { Scan, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { OpportunitiesPanel } from "./OpportunitiesPanel";
import { useOpportunities } from "@/hooks/use-opportunities";
import type { TradeOpportunity as DiscoveryOpportunity } from "@/hooks/use-trade-discovery";
import type { TradeOpportunity as ScannerOpportunity } from "@/types/workflow-v2";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";
import { TIMEFRAME_PAIR_PRESETS } from "@/lib/chart-constants";

// Watchlist symbols to scan
const WATCHLIST_SYMBOLS: MarketSymbol[] = ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"];

// Default timeframe pairs for scanning
const DEFAULT_TIMEFRAME_PAIRS = TIMEFRAME_PAIR_PRESETS.slice(0, 4).map(p => ({
  higher: p.higherTF,
  lower: p.lowerTF,
}));

type DiscoveryMode = "single" | "scan";

type DiscoveryModePanelProps = {
  // Legacy single-symbol mode props (from DiscoveryPanel) - kept for backwards compat
  opportunities: DiscoveryOpportunity[];
  isLoading: boolean;
  hasError?: boolean;
  errors?: { timeframe: Timeframe; error: string }[];
  onRefresh?: () => void;
  // Common props
  symbol: MarketSymbol;
  onSelectOpportunity: (opportunity: DiscoveryOpportunity) => void;
  onSymbolChange: (symbol: MarketSymbol) => void;
};

/**
 * Convert scanner opportunity (snake_case from API) to discovery opportunity (camelCase)
 */
function convertScannerToDiscovery(
  scanner: ScannerOpportunity,
  symbol: MarketSymbol
): DiscoveryOpportunity {
  const id = `scan-${scanner.symbol}-${scanner.higher_timeframe}-${scanner.lower_timeframe}-${Date.now()}`;
  const isLong = scanner.direction === "long";

  return {
    id,
    symbol,
    higherTimeframe: scanner.higher_timeframe as Timeframe,
    lowerTimeframe: scanner.lower_timeframe as Timeframe,
    direction: scanner.direction,
    confidence: scanner.confidence,
    tradingStyle: "swing", // Default for scanner results
    description: scanner.description,
    reasoning: `${scanner.category.replace("_", " ")} setup in ${scanner.phase} phase`,
    isActive: true,
    entryZone: isLong ? "support" : "resistance",
    signal: {
      id,
      type: isLong ? "LONG" : "SHORT",
      higherTF: scanner.higher_timeframe as Timeframe,
      lowerTF: scanner.lower_timeframe as Timeframe,
      pairName: `${scanner.higher_timeframe}/${scanner.lower_timeframe}`,
      tradingStyle: "swing",
      description: scanner.description,
      reasoning: `${scanner.category.replace("_", " ")} opportunity`,
      confidence: scanner.confidence,
      entryZone: isLong ? "support" : "resistance",
      isActive: true,
    },
    higherTrend: {
      timeframe: scanner.higher_timeframe as Timeframe,
      trend: isLong ? "bullish" : "bearish",
      confidence: scanner.confidence,
      swing: { signal: isLong ? "bullish" : "bearish" },
      rsi: { signal: isLong ? "bullish" : "bearish", value: isLong ? 55 : 45 },
      macd: { signal: isLong ? "bullish" : "bearish" },
      isLoading: false,
      error: null,
    },
    lowerTrend: {
      timeframe: scanner.lower_timeframe as Timeframe,
      trend: scanner.phase === "correction" ? (isLong ? "bearish" : "bullish") : (isLong ? "bullish" : "bearish"),
      confidence: 65,
      swing: { signal: scanner.phase === "correction" ? (isLong ? "bearish" : "bullish") : (isLong ? "bullish" : "bearish") },
      rsi: { signal: scanner.phase === "correction" ? (isLong ? "bearish" : "bullish") : (isLong ? "bullish" : "bearish"), value: isLong ? 35 : 65 },
      macd: { signal: scanner.phase === "correction" ? (isLong ? "bearish" : "bullish") : (isLong ? "bullish" : "bearish") },
      isLoading: false,
      error: null,
    },
    category: scanner.category,
    trendPhase: scanner.phase,
  };
}

export function DiscoveryModePanel({
  opportunities: _legacyOpportunities, // Kept for backwards compat, but we now use backend
  isLoading: _legacyIsLoading,
  hasError,
  errors,
  onRefresh,
  symbol,
  onSelectOpportunity,
  onSymbolChange,
}: DiscoveryModePanelProps) {
  const [mode, setMode] = useState<DiscoveryMode>("single");

  // Single-symbol scanner (uses backend API for consistent opportunity detection)
  const singleScanner = useOpportunities({
    symbols: [symbol],
    timeframePairs: DEFAULT_TIMEFRAME_PAIRS,
    enabled: mode === "single",
  });

  // Multi-symbol scanner
  const multiScanner = useOpportunities({
    symbols: WATCHLIST_SYMBOLS,
    timeframePairs: DEFAULT_TIMEFRAME_PAIRS,
    enabled: mode === "scan",
  });

  // Convert backend opportunities to DiscoveryOpportunity format for single mode
  const singleOpportunities = useMemo(() => {
    return singleScanner.opportunities.map((opp) =>
      convertScannerToDiscovery(opp, opp.symbol as MarketSymbol)
    );
  }, [singleScanner.opportunities]);

  // Handle selecting an opportunity from the scanner
  const handleScannerSelect = (scannerOpp: ScannerOpportunity) => {
    // Change the symbol to match the selected opportunity
    const oppSymbol = scannerOpp.symbol as MarketSymbol;
    if (oppSymbol !== symbol) {
      onSymbolChange(oppSymbol);
    }
    // Convert and select the opportunity
    const converted = convertScannerToDiscovery(scannerOpp, oppSymbol);
    onSelectOpportunity(converted);
  };

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 p-1 bg-muted/50 rounded-lg">
        <Button
          variant={mode === "single" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMode("single")}
          className="flex-1 gap-2"
        >
          <Target className="w-4 h-4" />
          <span className="hidden sm:inline">Single Symbol</span>
          <span className="sm:hidden">Single</span>
        </Button>
        <Button
          variant={mode === "scan" ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setMode("scan")}
          className="flex-1 gap-2"
        >
          <Scan className="w-4 h-4" />
          <span className="hidden sm:inline">Scan Watchlist</span>
          <span className="sm:hidden">Scan</span>
        </Button>
      </div>

      {/* Panel Content */}
      {mode === "single" ? (
        <DiscoveryPanel
          opportunities={singleOpportunities}
          isLoading={singleScanner.isLoading}
          hasError={hasError || !!singleScanner.error}
          errors={errors}
          onRefresh={singleScanner.refresh}
          onSelectOpportunity={onSelectOpportunity}
          symbol={symbol}
        />
      ) : (
        <OpportunitiesPanel
          opportunities={multiScanner.opportunities}
          symbolsScanned={multiScanner.symbolsScanned}
          scanTimeMs={multiScanner.scanTimeMs}
          isLoading={multiScanner.isLoading}
          error={multiScanner.error}
          onRefresh={multiScanner.refresh}
          onSelectOpportunity={handleScannerSelect}
        />
      )}
    </div>
  );
}
