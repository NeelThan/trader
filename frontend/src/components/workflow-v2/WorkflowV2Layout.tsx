"use client";

/**
 * WorkflowV2Layout - Chart-centric layout
 *
 * Main layout with chart always visible on the left (60%),
 * and a sidebar panel on the right (40%) for workflow phases.
 * Responsive: sidebar becomes bottom sheet on mobile.
 */

import { useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CandlestickChart, CandlestickChartHandle } from "@/components/trading";
import { useMarketDataSubscription } from "@/hooks/use-market-data-subscription";
import { useSettings, COLOR_SCHEMES } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import type { UseTradeDiscoveryResult, TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";
import type { WorkflowPhase } from "@/app/workflow-v2/page";
import { MARKET_CONFIG } from "@/lib/chart-constants";

const SYMBOLS: MarketSymbol[] = ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"];
const DEFAULT_CHART_COLORS = { up: "#22c55e", down: "#ef4444" } as const;

type WorkflowV2LayoutProps = {
  symbol: MarketSymbol;
  onSymbolChange: (symbol: MarketSymbol) => void;
  phase: WorkflowPhase;
  opportunity: TradeOpportunity | null;
  discovery: UseTradeDiscoveryResult;
  children: React.ReactNode;
};

const PHASE_LABELS: Record<WorkflowPhase, string> = {
  discover: "Discover",
  validate: "Validate",
  size: "Size",
  execute: "Execute",
  manage: "Manage",
};

export function WorkflowV2Layout({
  symbol,
  onSymbolChange,
  phase,
  opportunity,
  discovery,
  children,
}: WorkflowV2LayoutProps) {
  const chartRef = useRef<CandlestickChartHandle>(null);
  const { settings } = useSettings();
  const chartColors = COLOR_SCHEMES[settings.colorScheme] ?? DEFAULT_CHART_COLORS;

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((prev) => !prev), []);

  // Get chart timeframe from opportunity or default to 1D
  const chartTimeframe: Timeframe = opportunity?.lowerTimeframe ?? "1D";

  // Fetch market data for chart
  const { data: marketData, isLoading: isLoadingData } = useMarketDataSubscription(
    symbol,
    chartTimeframe,
    "yahoo",
    { autoRefresh: true }
  );

  // Summary stats
  const stats = useMemo(() => ({
    activeCount: discovery.activeOpportunities.length,
    totalCount: discovery.opportunities.length,
  }), [discovery.activeOpportunities, discovery.opportunities]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-2 sm:px-4">
          {/* Left section */}
          <div className="flex items-center gap-2 sm:gap-4">
            <h1 className="text-base sm:text-lg font-semibold">Workflow</h1>
            <Badge variant="secondary" className="text-xs hidden sm:inline-flex">v2</Badge>
          </div>

          {/* Center section */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Symbol Selector */}
            <Select value={symbol} onValueChange={(v) => onSymbolChange(v as MarketSymbol)}>
              <SelectTrigger className="w-[80px] sm:w-[120px]">
                <SelectValue>{symbol}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SYMBOLS.map((s) => (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s}</span>
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {MARKET_CONFIG[s].name}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Phase indicator */}
            <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-muted rounded-md">
              <span className="text-xs text-muted-foreground hidden sm:inline">Phase:</span>
              <span className="text-xs sm:text-sm font-medium">{PHASE_LABELS[phase]}</span>
            </div>

            {/* Active opportunity - hide on very small screens */}
            {opportunity && (
              <Badge
                variant="outline"
                className="capitalize hidden xs:inline-flex"
                style={{
                  borderColor: opportunity.direction === "long" ? chartColors.up : chartColors.down,
                  color: opportunity.direction === "long" ? chartColors.up : chartColors.down,
                }}
              >
                {opportunity.higherTimeframe} {opportunity.direction.toUpperCase()}
              </Badge>
            )}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Stats - hide on mobile */}
            <span className="text-xs sm:text-sm text-muted-foreground hidden md:inline">
              {stats.activeCount} active / {stats.totalCount} opportunities
            </span>

            {/* Mobile sidebar toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="lg:hidden"
              aria-label={isSidebarOpen ? "Close panel" : "Open panel"}
            >
              <PanelIcon isOpen={isSidebarOpen} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
        {/* Chart Area - full width on mobile, 60% on desktop */}
        <div className="flex-1 p-2 sm:p-4 overflow-hidden min-h-[300px] lg:min-h-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="py-2 sm:py-3 shrink-0">
              <CardTitle className="text-sm sm:text-base flex items-center justify-between">
                <span>
                  {symbol} - {chartTimeframe}
                </span>
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => chartRef.current?.zoomIn()}
                    className="p-1 sm:p-1.5 rounded hover:bg-muted/50"
                    title="Zoom In"
                  >
                    <ZoomInIcon />
                  </button>
                  <button
                    onClick={() => chartRef.current?.zoomOut()}
                    className="p-1 sm:p-1.5 rounded hover:bg-muted/50"
                    title="Zoom Out"
                  >
                    <ZoomOutIcon />
                  </button>
                  <button
                    onClick={() => chartRef.current?.resetView()}
                    className="p-1 sm:p-1.5 rounded hover:bg-muted/50"
                    title="Reset View"
                  >
                    <ResetIcon />
                  </button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {isLoadingData && marketData.length === 0 ? (
                <Skeleton className="h-full w-full" />
              ) : marketData.length > 0 ? (
                <CandlestickChart
                  ref={chartRef}
                  data={marketData}
                  upColor={chartColors.up}
                  downColor={chartColors.down}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar - slide-over on mobile, fixed width on desktop */}
        <div
          className={cn(
            // Base styles
            "bg-card border-l border-border overflow-y-auto transition-transform duration-300",
            // Mobile: slide-over from right
            "fixed top-14 right-0 bottom-0 w-[min(400px,90vw)] z-50",
            isSidebarOpen ? "translate-x-0" : "translate-x-full",
            // Desktop: always visible, no transform
            "lg:static lg:translate-x-0 lg:w-[400px] lg:z-0"
          )}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-3 border-b border-border lg:hidden">
            <span className="font-medium">{PHASE_LABELS[phase]}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(false)}
              aria-label="Close panel"
            >
              <CloseIcon />
            </Button>
          </div>

          <div className="p-3 sm:p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Icon components
function ZoomInIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
    </svg>
  );
}

function ZoomOutIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
    </svg>
  );
}

function PanelIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {isOpen ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6h16M4 12h16m-7 6h7" />
      )}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
