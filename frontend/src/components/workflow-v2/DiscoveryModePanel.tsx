"use client";

/**
 * DiscoveryModePanel - Unified discovery with single-symbol and multi-symbol modes
 *
 * Provides a toggle between:
 * - Single Symbol: Shows opportunities for the currently selected symbol
 * - Scan All: Scans multiple symbols from user's watchlist
 *
 * Both modes now use the backend API for consistent opportunity detection.
 * Per ADR-20260101, frontend is a dumb client - all calculations done by backend.
 *
 * Supports showing potential (unconfirmed with-trend) opportunities via toggle.
 * Watchlist is persisted to localStorage via useWorkflowV2Storage hook.
 */

import { useState, useMemo } from "react";
import { Scan, Target, Eye, EyeOff, Plus, X, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { DiscoveryPanel } from "./DiscoveryPanel";
import { OpportunitiesPanel } from "./OpportunitiesPanel";
import { useOpportunities } from "@/hooks/use-opportunities";
import { useWorkflowV2Storage } from "@/hooks/use-workflow-v2-storage";
import type { TradeOpportunity as DiscoveryOpportunity } from "@/hooks/use-trade-discovery";
import type { TradeOpportunity as ScannerOpportunity } from "@/types/workflow-v2";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";
import { TIMEFRAME_PAIR_PRESETS, MARKET_CONFIG } from "@/lib/chart-constants";

// All available symbols for watchlist
const ALL_SYMBOLS: MarketSymbol[] = ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"];

// Default watchlist if user has none
const DEFAULT_WATCHLIST: MarketSymbol[] = ["DJI", "SPX", "NDX"];

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
  const [includePotential, setIncludePotential] = useState(false);

  // Watchlist from persistent storage
  const {
    storage,
    addToWatchlist,
    removeFromWatchlist,
  } = useWorkflowV2Storage();

  // Use stored watchlist or default if empty
  const watchlist = useMemo(() => {
    return storage.watchlist.length > 0 ? storage.watchlist : DEFAULT_WATCHLIST;
  }, [storage.watchlist]);

  // Symbols available to add (not already in watchlist)
  const availableSymbols = useMemo(() => {
    return ALL_SYMBOLS.filter((s) => !watchlist.includes(s));
  }, [watchlist]);

  // Single-symbol scanner (uses backend API for consistent opportunity detection)
  const singleScanner = useOpportunities({
    symbols: [symbol],
    timeframePairs: DEFAULT_TIMEFRAME_PAIRS,
    enabled: mode === "single",
    includePotential,
  });

  // Multi-symbol scanner - uses user's watchlist
  const multiScanner = useOpportunities({
    symbols: watchlist,
    timeframePairs: DEFAULT_TIMEFRAME_PAIRS,
    enabled: mode === "scan",
    includePotential,
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

      {/* Show Potential Toggle */}
      <div className="flex items-center justify-between px-2 py-1 bg-muted/30 rounded-md">
        <div className="flex items-center gap-2">
          {includePotential ? (
            <Eye className="w-4 h-4 text-muted-foreground" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
          <Label htmlFor="show-potential" className="text-sm text-muted-foreground cursor-pointer">
            Show potential setups
          </Label>
        </div>
        <Switch
          id="show-potential"
          checked={includePotential}
          onCheckedChange={setIncludePotential}
          aria-label="Show potential opportunities awaiting confirmation"
        />
      </div>

      {/* Watchlist Management - only shown in scan mode */}
      {mode === "scan" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Watchlist</span>
              <span className="text-xs text-muted-foreground">
                ({watchlist.length} symbols)
              </span>
            </div>
            {/* Add Symbol Dropdown */}
            {availableSymbols.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1">
                    <Plus className="w-3 h-3" />
                    <span className="hidden sm:inline">Add</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Add Symbol</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableSymbols.map((sym) => (
                    <DropdownMenuItem
                      key={sym}
                      onClick={() => addToWatchlist(sym)}
                      className="cursor-pointer"
                    >
                      <span className="font-medium">{sym}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {MARKET_CONFIG[sym].name}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {/* Watchlist Symbols */}
          <div className="flex flex-wrap gap-1.5">
            {watchlist.map((sym) => (
              <Badge
                key={sym}
                variant="secondary"
                className="gap-1 pr-1 hover:bg-secondary/80"
              >
                <span>{sym}</span>
                <button
                  onClick={() => removeFromWatchlist(sym)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                  aria-label={`Remove ${sym} from watchlist`}
                  disabled={watchlist.length <= 1}
                  title={watchlist.length <= 1 ? "Cannot remove last symbol" : `Remove ${sym}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

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
