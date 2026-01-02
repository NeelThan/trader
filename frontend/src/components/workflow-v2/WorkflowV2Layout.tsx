"use client";

/**
 * WorkflowV2Layout - Chart-centric layout with full analysis features
 *
 * Main layout with chart always visible on the left (60%),
 * and a sidebar panel on the right (40%) for workflow phases.
 * Includes: Multi-TF levels, swing markers, RSI/MACD, trend alignment.
 * Responsive: sidebar becomes bottom sheet on mobile.
 */

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
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
import { CandlestickChart, CandlestickChartHandle, PriceLine, LineOverlay, type ChartType } from "@/components/trading";
import { RSIPane, MACDChart, PivotPointsEditor } from "@/components/chart-pro";
import { useMarketDataSubscription } from "@/hooks/use-market-data-subscription";
import { useSettings, COLOR_SCHEMES } from "@/hooks/use-settings";
import { useMultiTFLevels } from "@/hooks/use-multi-tf-levels";
import { useSwingMarkers } from "@/hooks/use-swing-markers";
import { useChartMarkers } from "@/hooks/use-chart-markers";
import { usePersistedEditablePivots } from "@/hooks/use-persisted-editable-pivots";
import { useMACD } from "@/hooks/use-macd";
import { useRSI } from "@/hooks/use-rsi";
import { useTrendAlignment } from "@/hooks/use-trend-alignment";
import { usePersistedVisibilityConfig } from "@/hooks/use-persisted-visibility-config";
import { usePersistedSwingSettings } from "@/hooks/use-persisted-swing-settings";
import { generateSwingLineOverlays } from "@/lib/chart-pro/swing-overlays";
import {
  isLevelVisible,
  DIRECTION_COLORS,
  TIMEFRAME_COLORS,
  FIBONACCI_RATIOS,
  ALL_STRATEGIES,
} from "@/lib/chart-pro/strategy-types";
import { cn } from "@/lib/utils";
import { TimeframeSettingsPopover } from "./TimeframeSettingsPopover";
import { DataSourcePanel, DataSourceIndicator, type DataMode } from "./DataSourcePanel";
import type { UseTradeDiscoveryResult, TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";
import type { WorkflowPhase } from "@/app/workflow-v2/page";
import { MARKET_CONFIG, TIMEFRAME_CONFIG } from "@/lib/chart-constants";

const SYMBOLS: MarketSymbol[] = ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"];
const TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "1m"];
const DEFAULT_CHART_COLORS = { up: "#22c55e", down: "#ef4444" } as const;

type WorkflowV2LayoutProps = {
  symbol: MarketSymbol;
  onSymbolChange: (symbol: MarketSymbol) => void;
  timeframe: Timeframe;
  onTimeframeChange: (timeframe: Timeframe) => void;
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
  timeframe,
  onTimeframeChange,
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

  // Chart display toggles
  const [showIndicators, setShowIndicators] = useState(false);
  const [showSwingMarkers, setShowSwingMarkers] = useState(true);
  const [showFibLevels, setShowFibLevels] = useState(true);
  const [showPivotEditor, setShowPivotEditor] = useState(false);
  const [showTradeView, setShowTradeView] = useState(false);
  const [chartType, setChartType] = useState<ChartType>("bar");

  // Reset trade view when opportunity changes or phase goes back to discover
  useEffect(() => {
    if (!opportunity || phase === "discover") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: reset on state change
      setShowTradeView(false);
    }
  }, [opportunity, phase]);

  // Data source mode
  const [dataMode, setDataMode] = useState<DataMode>("live");
  const [hasSimulatedData, setHasSimulatedData] = useState(false);
  const [simulatedDataTimestamp, setSimulatedDataTimestamp] = useState<Date | null>(null);

  // Check for simulated data on mount
  useEffect(() => {
    const stored = localStorage.getItem(`workflow-v2-simulated-${symbol}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setHasSimulatedData(true);
        setSimulatedDataTimestamp(new Date(parsed.timestamp));
      } catch {
        setHasSimulatedData(false);
      }
    } else {
      setHasSimulatedData(false);
      setSimulatedDataTimestamp(null);
    }
  }, [symbol]);

  // Fetch market data for chart
  const {
    data: marketData,
    isLoading: isLoadingData,
    isCached,
    isRateLimited,
    isBackendUnavailable,
    isUsingSimulatedData,
    countdown,
    lastUpdated,
    refreshNow,
  } = useMarketDataSubscription(
    symbol,
    timeframe,
    dataMode === "simulated" ? "simulated" : "yahoo",
    { autoRefresh: dataMode === "live" }
  );

  // Save current market data as simulated data
  const handleSaveAsSimulated = useCallback(() => {
    if (marketData.length === 0) return;

    const simulatedData = {
      symbol,
      timeframe,
      data: marketData,
      timestamp: Date.now(),
    };

    localStorage.setItem(
      `workflow-v2-simulated-${symbol}`,
      JSON.stringify(simulatedData)
    );

    setHasSimulatedData(true);
    setSimulatedDataTimestamp(new Date());
  }, [marketData, symbol, timeframe]);

  // Visibility configuration for Fibonacci levels (persisted)
  // Note: Chart Pro config starts with all disabled. We enable common TFs for Workflow V2
  const { visibilityConfig, setVisibilityConfig, isLoaded: isVisibilityLoaded } = usePersistedVisibilityConfig();

  // Enable sensible defaults for Workflow V2 on first load
  const [hasInitializedVisibility, setHasInitializedVisibility] = useState(false);

  // Effect to set default visibility if none configured
  useEffect(() => {
    if (isVisibilityLoaded && !hasInitializedVisibility) {
      // Check if any timeframes are enabled
      const anyEnabled = visibilityConfig.timeframes.some(tf => tf.enabled);
      if (!anyEnabled) {
        // Enable 1D, 4H, 1H with both long and short retracements
        const updatedConfig = {
          ...visibilityConfig,
          timeframes: visibilityConfig.timeframes.map(tf => {
            if (["1D", "4H", "1H"].includes(tf.timeframe)) {
              return {
                ...tf,
                enabled: true,
                strategies: tf.strategies.map(s => ({
                  ...s,
                  long: { ...s.long, enabled: true },
                  short: { ...s.short, enabled: true },
                })),
              };
            }
            return tf;
          }),
        };
        setVisibilityConfig(updatedConfig);
      }
      setHasInitializedVisibility(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only run when loaded state changes
  }, [isVisibilityLoaded, hasInitializedVisibility]);

  // Check if a timeframe is enabled for Fib levels
  const isTimeframeEnabled = useCallback((tf: Timeframe): boolean => {
    return visibilityConfig.timeframes.find(t => t.timeframe === tf)?.enabled ?? false;
  }, [visibilityConfig]);

  // Toggle timeframe visibility for Fib levels
  const toggleTimeframeVisibility = useCallback((tf: Timeframe) => {
    const tfIndex = visibilityConfig.timeframes.findIndex(t => t.timeframe === tf);

    if (tfIndex >= 0) {
      // Toggle existing timeframe
      const currentTf = visibilityConfig.timeframes[tfIndex];
      const isEnabled = currentTf.enabled;

      const newTimeframes = visibilityConfig.timeframes.map((t, idx) => {
        if (idx !== tfIndex) return t;

        if (isEnabled) {
          // Disabling - just toggle off
          return { ...t, enabled: false };
        } else {
          // Enabling - enable with all strategies and both directions
          return {
            ...t,
            enabled: true,
            strategies: t.strategies.map(s => ({
              ...s,
              long: { ...s.long, enabled: true },
              short: { ...s.short, enabled: true },
            })),
          };
        }
      });

      setVisibilityConfig({ timeframes: newTimeframes });
    } else {
      // Add new timeframe config with all strategies enabled
      const newTfConfig = {
        timeframe: tf,
        enabled: true,
        strategies: ALL_STRATEGIES.map(strategy => ({
          strategy,
          long: {
            enabled: true,
            ratios: FIBONACCI_RATIOS[strategy].map(ratio => ({ ratio, visible: true })),
          },
          short: {
            enabled: true,
            ratios: FIBONACCI_RATIOS[strategy].map(ratio => ({ ratio, visible: true })),
          },
        })),
      };
      setVisibilityConfig({ timeframes: [...visibilityConfig.timeframes, newTfConfig] });
    }
  }, [visibilityConfig, setVisibilityConfig]);

  // Swing settings (persisted)
  const { getTimeframeSettings } = usePersistedSwingSettings();
  const swingSettings = useMemo(
    () => getTimeframeSettings(timeframe),
    [getTimeframeSettings, timeframe]
  );

  // Get swing markers (HH/HL/LH/LL)
  const minBarsForSwing = swingSettings.settings.lookback * 2 + 1;
  const { result: swingResult, isLoading: isLoadingSwings } = useSwingMarkers({
    data: marketData,
    lookback: swingSettings.settings.lookback,
    enabled: showSwingMarkers && swingSettings.enabled && marketData.length >= minBarsForSwing,
    symbol,
    timeframe,
    useCache: true,
  });

  // Editable pivots with persistence (user modifications survive refresh)
  const apiPivots = useMemo(() => swingResult?.pivots ?? [], [swingResult?.pivots]);
  const {
    pivots: editablePivots,
    updatePivotPrice,
    resetPivot,
    resetAllPivots,
    hasModifications: hasPivotModifications,
    modifiedCount: pivotModifiedCount,
    isLoaded: isPivotsLoaded,
  } = usePersistedEditablePivots(apiPivots, symbol, timeframe);

  // Swing line overlays
  const swingLineOverlays = useMemo<LineOverlay[]>(() => {
    if (!showSwingMarkers || !swingSettings.enabled || !swingSettings.settings.showLines) {
      return [];
    }
    return generateSwingLineOverlays(editablePivots, {
      lookback: swingSettings.settings.lookback,
      showLines: swingSettings.settings.showLines,
    });
  }, [editablePivots, showSwingMarkers, swingSettings]);

  // Chart markers from swing detection
  const chartMarkers = useChartMarkers({
    swingEnabled: showSwingMarkers && swingSettings.enabled,
    markers: swingResult?.markers,
    marketData,
    editablePivots,
  });

  // Multi-TF Fibonacci levels
  const { allLevels, isLoading: isLoadingLevels } = useMultiTFLevels({
    symbol,
    visibilityConfig,
    enabled: showFibLevels,
    dataMode: "live",
  });

  // Get visible levels based on visibility config and trade view mode
  const visibleLevels = useMemo(() => {
    if (!showFibLevels) return [];

    // In trade view mode, only show levels for the opportunity's timeframes and direction
    if (showTradeView && opportunity) {
      const tradeTimeframes = [opportunity.higherTimeframe, opportunity.lowerTimeframe];
      const tradeDirection = opportunity.direction;

      return allLevels.filter((level) => {
        // Must be in one of the trade's timeframes
        if (!tradeTimeframes.includes(level.timeframe)) return false;
        // Must match the trade direction
        if (level.direction !== tradeDirection) return false;
        // Still respect the visibility config for specific ratios
        return isLevelVisible(level, visibilityConfig);
      });
    }

    return allLevels.filter((level) => isLevelVisible(level, visibilityConfig));
  }, [allLevels, visibilityConfig, showFibLevels, showTradeView, opportunity]);

  // Convert levels to price lines
  const strategyPriceLines = useMemo<PriceLine[]>(() => {
    return visibleLevels.map((level) => ({
      price: level.price,
      color: level.direction === "long" ? DIRECTION_COLORS.long : DIRECTION_COLORS.short,
      lineWidth: level.heat > 50 ? 2 : 1,
      lineStyle: level.strategy === "RETRACEMENT" ? 2 : 1,
      axisLabelVisible: true,
      title: `${level.timeframe} ${level.label} ${level.direction === "long" ? "L" : "S"}`,
    }));
  }, [visibleLevels]);

  // RSI indicator
  const { rsiData, isLoading: isLoadingRSI } = useRSI({
    data: marketData,
    enabled: showIndicators && marketData.length >= 15,
  });

  // MACD indicator
  const { macdData, isLoading: isLoadingMACD } = useMACD({
    data: marketData,
    enabled: showIndicators && marketData.length >= 26,
  });

  // Trend alignment
  const { trends: trendData, overall: overallTrend, isLoading: isLoadingTrend } = useTrendAlignment({
    symbol,
    enabled: true,
  });

  // Current MACD values
  const currentMACD = useMemo(() => {
    if (!macdData || macdData.macd.length === 0) return null;
    const lastMacd = macdData.macd.filter((v) => v !== null).slice(-1)[0];
    const lastSignal = macdData.signal.filter((v) => v !== null).slice(-1)[0];
    const lastHistogram = macdData.histogram.filter((v) => v !== null).slice(-1)[0];
    return {
      macd: lastMacd ?? 0,
      signal: lastSignal ?? 0,
      histogram: lastHistogram ?? 0,
    };
  }, [macdData]);

  // Summary stats
  const stats = useMemo(() => ({
    activeCount: discovery.activeOpportunities.length,
    totalCount: discovery.opportunities.length,
    bullishTrends: trendData.filter(t => t.trend === "bullish").length,
    bearishTrends: trendData.filter(t => t.trend === "bearish").length,
  }), [discovery.activeOpportunities, discovery.opportunities, trendData]);

  // Current OHLC values for display
  const currentOHLC = useMemo(() => {
    if (marketData.length === 0) return null;
    const bar = marketData[marketData.length - 1];
    return {
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
    };
  }, [marketData]);

  // Format price based on symbol
  const formatPrice = useCallback((price: number) => {
    if (symbol === "EURUSD") return price.toFixed(5);
    if (price >= 10000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return price.toFixed(2);
  }, [symbol]);

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

          {/* Center section - simplified */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Trend alignment summary */}
            {!isLoadingTrend && (
              <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded text-xs">
                <span style={{ color: chartColors.up }}>{stats.bullishTrends}</span>
                <span className="text-muted-foreground">/</span>
                <span style={{ color: chartColors.down }}>{stats.bearishTrends}</span>
                <span className="text-muted-foreground ml-1">
                  {overallTrend.direction === "bullish" ? "Bull" : overallTrend.direction === "bearish" ? "Bear" : "Mix"}
                </span>
              </div>
            )}

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
            {/* Data source controls */}
            <DataSourcePanel
              dataMode={dataMode}
              onDataModeChange={setDataMode}
              isRateLimited={isRateLimited}
              isBackendUnavailable={isBackendUnavailable}
              onSaveAsSimulated={handleSaveAsSimulated}
              hasSimulatedData={hasSimulatedData}
              simulatedDataTimestamp={simulatedDataTimestamp}
            />

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
        <div className="flex-1 p-2 sm:p-4 overflow-hidden min-h-[300px] lg:min-h-0 flex flex-col gap-2">
          {/* Main Chart */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardContent className="py-2 sm:py-3 shrink-0 border-b">
              <div className="flex flex-col gap-2">
                {/* Controls Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Symbol Selector */}
                  <Select value={symbol} onValueChange={(v) => onSymbolChange(v as MarketSymbol)}>
                    <SelectTrigger className="w-[80px] sm:w-[90px] h-8">
                      <SelectValue>{symbol}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {SYMBOLS.map((s) => (
                        <SelectItem key={s} value={s}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium w-16">{s}</span>
                            <span className="text-xs text-muted-foreground">
                              {MARKET_CONFIG[s].name}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Timeframe Selector */}
                  <Select value={timeframe} onValueChange={(v) => onTimeframeChange(v as Timeframe)}>
                    <SelectTrigger className="w-[70px] sm:w-[80px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map((tf) => (
                        <SelectItem key={tf} value={tf}>
                          {TIMEFRAME_CONFIG[tf].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Separator */}
                  <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

                  {/* Chart type selector */}
                  <div className="flex items-center gap-0.5 bg-muted/50 rounded p-0.5">
                    <button
                      onClick={() => setChartType("bar")}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors",
                        chartType === "bar"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="OHLC Bars"
                    >
                      Bar
                    </button>
                    <button
                      onClick={() => setChartType("candlestick")}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors",
                        chartType === "candlestick"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Candlesticks"
                    >
                      Candle
                    </button>
                    <button
                      onClick={() => setChartType("heikin-ashi")}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors",
                        chartType === "heikin-ashi"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Heikin-Ashi"
                    >
                      HA
                    </button>
                  </div>

                  <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

                  {/* Feature toggles */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowSwingMarkers(!showSwingMarkers)}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors",
                        showSwingMarkers
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      title="Toggle swing markers (HH/HL/LH/LL)"
                    >
                      HH/LL
                    </button>
                    <button
                      onClick={() => setShowFibLevels(!showFibLevels)}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors",
                        showFibLevels
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      title="Toggle Fibonacci levels"
                    >
                      Fib
                    </button>
                    <button
                      onClick={() => setShowIndicators(!showIndicators)}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors",
                        showIndicators
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      title="Toggle indicators (RSI & MACD)"
                    >
                      Ind
                    </button>
                    <button
                      onClick={() => setShowPivotEditor(!showPivotEditor)}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors relative",
                        showPivotEditor
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      title="Toggle pivot points editor"
                    >
                      Pivot
                      {hasPivotModifications && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
                      )}
                    </button>
                    {/* Trade View toggle - only show when opportunity selected */}
                    {opportunity && phase !== "discover" && (
                      <button
                        onClick={() => setShowTradeView(!showTradeView)}
                        className={cn(
                          "px-2 py-1 text-xs rounded transition-colors",
                          showTradeView
                            ? opportunity.direction === "long"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                        title={`Toggle trade view (${opportunity.direction.toUpperCase()} ${opportunity.higherTimeframe}→${opportunity.lowerTimeframe})`}
                      >
                        Trade
                      </button>
                    )}
                  </div>

                  {/* Timeframe visibility toggles - only show when Fib is enabled */}
                  {showFibLevels && (
                    <>
                      <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
                      <div className="flex items-center gap-0.5">
                        {TIMEFRAMES.map((tf) => {
                          const enabled = isTimeframeEnabled(tf);
                          const color = TIMEFRAME_COLORS[tf];
                          return (
                            <TimeframeSettingsPopover
                              key={tf}
                              timeframe={tf}
                              isEnabled={enabled}
                              visibilityConfig={visibilityConfig}
                              onVisibilityChange={setVisibilityConfig}
                              onToggleTimeframe={() => toggleTimeframeVisibility(tf)}
                            >
                              <button
                                className={cn(
                                  "px-1.5 py-0.5 text-[10px] sm:text-xs rounded transition-all",
                                  enabled
                                    ? "font-medium"
                                    : "text-muted-foreground/50 hover:text-muted-foreground"
                                )}
                                style={{
                                  backgroundColor: enabled ? `${color}20` : undefined,
                                  color: enabled ? color : undefined,
                                  borderBottom: enabled ? `2px solid ${color}` : "2px solid transparent",
                                }}
                                title={`Configure ${tf} Fibonacci levels (click to open settings)`}
                              >
                                {tf}
                              </button>
                            </TimeframeSettingsPopover>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Status badges */}
                  <div className="flex items-center gap-1 text-xs ml-auto">
                    {/* Trade view indicator */}
                    {showTradeView && opportunity && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] px-1.5 py-0",
                          opportunity.direction === "long"
                            ? "border-green-500/50 text-green-400 bg-green-500/10"
                            : "border-red-500/50 text-red-400 bg-red-500/10"
                        )}
                      >
                        {opportunity.direction.toUpperCase()} {opportunity.higherTimeframe}→{opportunity.lowerTimeframe}
                      </Badge>
                    )}
                    {showFibLevels && visibleLevels.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {visibleLevels.length} Fib
                      </Badge>
                    )}
                    {showSwingMarkers && chartMarkers.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {chartMarkers.length} Swing
                      </Badge>
                    )}
                    {(isLoadingLevels || isLoadingSwings) && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 animate-pulse">
                        Loading...
                      </Badge>
                    )}
                  </div>

                  {/* Zoom controls */}
                  <div className="flex items-center gap-1">
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

                  {/* OHLC Values */}
                  {currentOHLC && (
                    <div className="hidden md:flex items-center gap-3 ml-2 text-sm font-mono">
                      <div>
                        <span className="text-muted-foreground mr-1">O:</span>
                        <span>{formatPrice(currentOHLC.open)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground mr-1">H:</span>
                        <span style={{ color: chartColors.up }}>{formatPrice(currentOHLC.high)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground mr-1">L:</span>
                        <span style={{ color: chartColors.down }}>{formatPrice(currentOHLC.low)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground mr-1">C:</span>
                        <span style={{ color: currentOHLC.close >= currentOHLC.open ? chartColors.up : chartColors.down }}>
                          {formatPrice(currentOHLC.close)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {isLoadingData && marketData.length === 0 ? (
                <Skeleton className="h-full w-full" />
              ) : marketData.length > 0 ? (
                <CandlestickChart
                  ref={chartRef}
                  data={marketData}
                  chartType={chartType}
                  markers={chartMarkers}
                  priceLines={strategyPriceLines}
                  lineOverlays={swingLineOverlays}
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

          {/* Indicators Panel - RSI and MACD */}
          {showIndicators && (
            <Card className="shrink-0">
              <CardContent className="p-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* RSI */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">RSI (14)</span>
                      {isLoadingRSI && <span className="text-xs text-muted-foreground">Loading...</span>}
                    </div>
                    {isLoadingRSI ? (
                      <Skeleton className="h-[80px] w-full" />
                    ) : rsiData ? (
                      <RSIPane rsiData={rsiData} chartColors={chartColors} />
                    ) : (
                      <div className="h-[80px] flex items-center justify-center text-xs text-muted-foreground">
                        Need 15+ bars
                      </div>
                    )}
                  </div>

                  {/* MACD */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium flex items-center gap-1">
                        MACD (12,26,9)
                        {currentMACD && (
                          <span
                            className="text-[10px] px-1 py-0.5 rounded"
                            style={{
                              backgroundColor:
                                currentMACD.histogram > 0
                                  ? `${chartColors.up}20`
                                  : `${chartColors.down}20`,
                              color: currentMACD.histogram > 0 ? chartColors.up : chartColors.down,
                            }}
                          >
                            {currentMACD.histogram > 0 ? "Bull" : "Bear"}
                          </span>
                        )}
                      </span>
                      {isLoadingMACD && <span className="text-xs text-muted-foreground">Loading...</span>}
                    </div>
                    {isLoadingMACD ? (
                      <Skeleton className="h-[80px] w-full" />
                    ) : macdData ? (
                      <MACDChart macdData={macdData} chartColors={chartColors} />
                    ) : (
                      <div className="h-[80px] flex items-center justify-center text-xs text-muted-foreground">
                        Need 26+ bars
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pivot Points Editor - Editable pivot points with persistence */}
          {showPivotEditor && (
            <PivotPointsEditor
              timeframe={timeframe}
              pivots={editablePivots}
              updatePivotPrice={updatePivotPrice}
              resetPivot={resetPivot}
              resetAllPivots={resetAllPivots}
              hasModifications={hasPivotModifications}
              modifiedCount={pivotModifiedCount}
              isLoading={isLoadingSwings || !isPivotsLoaded}
            />
          )}
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
