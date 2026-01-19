"use client";

/**
 * WorkflowV2Layout - Chart-centric layout with full analysis features
 *
 * Main layout with chart always visible on the left (60%),
 * and a sidebar panel on the right (40%) for workflow phases.
 * Includes: Multi-TF levels, swing markers, RSI/MACD, trend alignment.
 * Responsive: sidebar becomes bottom sheet on mobile.
 */

import { useMemo, useRef, useState, useCallback, useEffect, useReducer } from "react";
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
import { RSIPane, MACDChart, PivotPointsEditor, LevelsTable } from "@/components/chart-pro";
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
import { SwingSettingsPopover } from "./SwingSettingsPopover";
import { DataSourceControl, type DataMode } from "./DataSourceControl";
import { TrendAlignmentPanel, TrendIndicatorButton } from "./TrendAlignmentPanel";
import { LevelTooltip, ConfluenceZoneIndicator, calculateConfluenceZones } from "./LevelTooltip";
import type { UseTradeDiscoveryResult, TradeOpportunity } from "@/hooks/use-trade-discovery";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";
import type { WorkflowPhase } from "@/app/workflow-v2/page";
import { MARKET_CONFIG, TIMEFRAME_CONFIG, FIB_COLORS } from "@/lib/chart-constants";
import { calculatePsychologicalLevels } from "@/lib/market-utils";
import {
  layoutReducer,
  initialLayoutState,
  layoutActions,
  layoutSelectors,
} from "./workflow-layout-reducer";

const SYMBOLS: MarketSymbol[] = ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"];
const TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "5m", "3m", "1m"];
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

  // Consolidated UI state via reducer
  const [layoutState, dispatch] = useReducer(layoutReducer, initialLayoutState);

  // Destructure for convenience
  const { panels, chart, crosshairPrice, hiddenZones } = layoutState;

  // Convenience aliases for commonly used panel states
  const showIndicators = panels.indicators;
  const showSwingMarkers = panels.swingMarkers;
  const showFibLevels = panels.fibLevels;
  const showPivotEditor = panels.pivotEditor;
  const showTradeView = panels.tradeView;
  const showTrendPanel = panels.trendPanel;
  const showConfluenceZones = panels.confluenceZones;
  const showPsychologicalLevels = panels.psychologicalLevels;
  const showFibLabels = chart.fibLabels;
  const showFibLines = chart.fibLines;
  const showLevelsTable = panels.levelsTable;
  const chartType = chart.chartType;
  const isChartExpanded = panels.chartExpanded;
  const confluenceTolerance = chart.confluenceTolerance;
  const isSidebarOpen = panels.sidebar;

  // Toggle handlers using dispatch
  const toggleSidebar = useCallback(() => dispatch(layoutActions.togglePanel("sidebar")), []);

  // Reset trade view when opportunity changes or phase goes back to discover
  useEffect(() => {
    if (!opportunity || phase === "discover") {
      dispatch(layoutActions.resetTradeView());
    }
  }, [opportunity, phase]);

  // Close Fib-dependent panels when Fib is disabled
  useEffect(() => {
    if (!showFibLevels) {
      // Close zones and table panels since they depend on Fib being enabled
      if (panels.confluenceZones) {
        dispatch(layoutActions.setPanel("confluenceZones", false));
      }
      if (panels.levelsTable) {
        dispatch(layoutActions.setPanel("levelsTable", false));
      }
    }
  }, [showFibLevels, panels.confluenceZones, panels.levelsTable]);

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
  const {
    swingConfig,
    getTimeframeSettings,
    updateTimeframeLookback,
    updateTimeframeEnabled,
    updateTimeframeShowLines,
    resetToDefaults: resetSwingDefaults,
    isLoaded: isSwingSettingsLoaded,
  } = usePersistedSwingSettings();
  const swingSettings = useMemo(
    () => getTimeframeSettings(timeframe),
    [getTimeframeSettings, timeframe]
  );

  // Get swing markers (HH/HL/LH/LL)
  const minBarsForSwing = swingSettings.settings.lookback * 2 + 1;
  const { result: swingResult, isLoading: isLoadingSwings, isBackendUnavailable: isSwingBackendUnavailable } = useSwingMarkers({
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
  const { allLevels, byTimeframe, isLoading: isLoadingLevels } = useMultiTFLevels({
    symbol,
    visibilityConfig,
    enabled: showFibLevels,
    dataMode: "live",
  });

  // Get pivot data per timeframe for smart direction detection
  const pivotDataByTimeframe = useMemo(() => {
    const data: Record<string, { pivotHigh: number | null; pivotLow: number | null; pointA?: number; pointB?: number; pointC?: number }> = {};

    for (const tfData of byTimeframe) {
      // Get A from projection levels (which have all A, B, C)
      const projectionLevel = tfData.levels.find(l => l.pointA !== undefined);

      // Determine B and C based on swingEndpoint (which pivot is most recent)
      // swingEndpoint = "high" means C is the high, B is the low
      // swingEndpoint = "low" means C is the low, B is the high
      let pointB: number | undefined;
      let pointC: number | undefined;
      if (tfData.swingEndpoint && tfData.pivotHigh != null && tfData.pivotLow != null) {
        if (tfData.swingEndpoint === "high") {
          // Most recent pivot is HIGH → C is high, B is low (swing went UP)
          pointB = tfData.pivotLow;
          pointC = tfData.pivotHigh;
        } else {
          // Most recent pivot is LOW → C is low, B is high (swing went DOWN)
          pointB = tfData.pivotHigh;
          pointC = tfData.pivotLow;
        }
      }

      data[tfData.timeframe] = {
        pivotHigh: tfData.pivotHigh,
        pivotLow: tfData.pivotLow,
        pointA: projectionLevel?.pointA,
        pointB,
        pointC,
      };
    }
    return data;
  }, [byTimeframe]);

  // Debug: log pivot data (in useEffect to avoid hydration issues)
  useEffect(() => {
    if (byTimeframe.length > 0) {
      console.log("[Smart Detection Debug] byTimeframe:", byTimeframe.map(tf => ({
        tf: tf.timeframe,
        swingEndpoint: tf.swingEndpoint,
        pivotHigh: tf.pivotHigh,
        pivotLow: tf.pivotLow,
      })));
      console.log("[Smart Detection Debug] pivotDataByTimeframe:", pivotDataByTimeframe);
    }
  }, [byTimeframe, pivotDataByTimeframe]);

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

  // Convert levels to price lines (simplified labels for less clutter)
  // Returns empty when showFibLines is false (hides lines but keeps zones)
  // Labels are positioned on left side by timeframe (higher TF = more left)
  const strategyPriceLines = useMemo<PriceLine[]>(() => {
    if (!showFibLines) return [];
    return visibleLevels.map((level) => ({
      price: level.price,
      color: level.direction === "long" ? DIRECTION_COLORS.long : DIRECTION_COLORS.short,
      lineWidth: level.heat > 50 ? 2 : 1,
      lineStyle: level.strategy === "RETRACEMENT" ? 2 : 1,
      // Hide axis labels - we show markers on the left side instead
      axisLabelVisible: false,
      // Include all info for hover tooltip
      title: showFibLabels ? level.label : "",
      timeframe: level.timeframe,
      strategy: level.strategy,
      direction: level.direction,
    }));
  }, [visibleLevels, showFibLabels, showFibLines]);

  // Calculate confluence zones (clusters of levels)
  const confluenceZones = useMemo(() => {
    if (!showConfluenceZones || visibleLevels.length === 0) return [];
    return calculateConfluenceZones(visibleLevels, confluenceTolerance);
  }, [visibleLevels, showConfluenceZones, confluenceTolerance]);

  // Toggle zone visibility
  const toggleZoneVisibility = useCallback((zoneId: string) => {
    dispatch(layoutActions.toggleZoneVisibility(zoneId));
  }, []);

  // Show all zones
  const showAllZones = useCallback(() => {
    dispatch(layoutActions.showAllZones());
  }, []);

  // Confluence zone price lines - creates visual bands on chart
  // Filters out hidden zones
  const zonePriceLines = useMemo<PriceLine[]>(() => {
    if (!showConfluenceZones || confluenceZones.length === 0) return [];

    const lines: PriceLine[] = [];

    confluenceZones.forEach((zone, index) => {
      // Skip hidden zones
      if (hiddenZones.has(zone.id)) return;
      // Color based on direction bias
      const zoneColor =
        zone.direction === "long"
          ? "rgba(34, 197, 94, 0.5)" // green = support
          : zone.direction === "short"
            ? "rgba(239, 68, 68, 0.5)" // red = resistance
            : "rgba(168, 85, 247, 0.5)"; // purple = neutral

      // Descriptive label showing zone number, type, and level count
      const zoneType =
        zone.direction === "long"
          ? "S" // Support
          : zone.direction === "short"
            ? "R" // Resistance
            : "N"; // Neutral

      // Top boundary line
      lines.push({
        price: zone.highPrice,
        color: zoneColor,
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: false,
        title: "",
      });

      // Bottom boundary line
      lines.push({
        price: zone.lowPrice,
        color: zoneColor,
        lineWidth: 2,
        lineStyle: 0, // Solid
        axisLabelVisible: false,
        title: "",
      });

      // Center line with descriptive label: "Z1 S(4)" = Zone 1, Support, 4 levels
      lines.push({
        price: zone.centerPrice,
        color: zoneColor,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: `Z${index + 1} ${zoneType}(${zone.levelCount})`,
      });
    });

    return lines;
  }, [confluenceZones, showConfluenceZones, hiddenZones]);

  // Calculate psychological (round number) levels from visible price range
  const psychologicalPriceLines = useMemo<PriceLine[]>(() => {
    if (!showPsychologicalLevels || marketData.length === 0) return [];

    // Get the price range from market data
    const prices = marketData.flatMap((bar) => [bar.high, bar.low]);
    const dataLow = Math.min(...prices);
    const dataHigh = Math.max(...prices);

    if (dataLow <= 0 || dataHigh <= dataLow) return [];

    const levels = calculatePsychologicalLevels(dataLow, dataHigh, 8);
    return levels.map((price) => ({
      price,
      color: FIB_COLORS.psychological,
      lineWidth: 1,
      lineStyle: 1, // Dotted
      axisLabelVisible: true,
      title: `Ψ ${price.toLocaleString()}`,
    }));
  }, [showPsychologicalLevels, marketData]);

  // Combine all price lines
  const allPriceLines = useMemo<PriceLine[]>(() => {
    return [...strategyPriceLines, ...zonePriceLines, ...psychologicalPriceLines];
  }, [strategyPriceLines, zonePriceLines, psychologicalPriceLines]);

  // Crosshair move handler
  const handleCrosshairMove = useCallback((price: number | null) => {
    dispatch(layoutActions.setCrosshairPrice(price));
  }, []);

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
            {/* Unified data source control */}
            <DataSourceControl
              dataMode={dataMode}
              onDataModeChange={setDataMode}
              countdown={countdown}
              lastUpdated={lastUpdated}
              isRefreshing={isLoadingData}
              isCached={isCached}
              onRefresh={refreshNow}
              isRateLimited={isRateLimited}
              isBackendUnavailable={isBackendUnavailable || isSwingBackendUnavailable}
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
        {/* Chart Area - expands when isChartExpanded is true */}
        <div
          className={cn(
            "p-2 sm:p-4 overflow-y-auto flex flex-col gap-2 transition-all duration-300",
            isChartExpanded
              ? "flex-1 lg:w-full"
              : "flex-1 min-h-[300px] lg:min-h-0"
          )}
        >
          {/* Main Chart - taller height */}
          <Card className="flex flex-col min-h-[550px] lg:min-h-[750px]" style={{ flex: isChartExpanded ? "1 1 auto" : "3 1 0" }}>
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
                      onClick={() => dispatch(layoutActions.setChartType("bar"))}
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
                      onClick={() => dispatch(layoutActions.setChartType("candlestick"))}
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
                      onClick={() => dispatch(layoutActions.setChartType("heikin-ashi"))}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors",
                        chartType === "heikin-ashi"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                      title="Heikin-Ashi"
                    >
                      Heikin-Ashi
                    </button>
                  </div>

                  <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

                  {/* Swing Group - toggle + timeframes together */}
                  <div
                    className={cn(
                      "flex items-center gap-0.5 px-1 py-0.5 rounded-md border transition-colors",
                      showSwingMarkers
                        ? "border-primary/30 bg-primary/5"
                        : "border-transparent"
                    )}
                  >
                    <button
                      onClick={() => dispatch(layoutActions.togglePanel("swingMarkers"))}
                      className={cn(
                        "px-2 py-0.5 text-xs rounded transition-colors flex items-center gap-1",
                        showSwingMarkers
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      title="Toggle swing markers (HH/HL/LH/LL)"
                    >
                      Swing
                      {showSwingMarkers && chartMarkers.length > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                          {chartMarkers.length}
                        </Badge>
                      )}
                    </button>
                    {showSwingMarkers && (
                      <>
                        {/* Pivot toggle - only shows when Swing is enabled */}
                        <button
                          onClick={() => dispatch(layoutActions.togglePanel("pivotEditor"))}
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] rounded transition-colors relative",
                            showPivotEditor
                              ? "bg-amber-500/20 text-amber-400 font-medium"
                              : "text-muted-foreground/70 hover:text-muted-foreground"
                          )}
                          title="Edit pivot points"
                        >
                          Pivot
                          {hasPivotModifications && (
                            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                          )}
                        </button>
                        <div className="h-4 w-px bg-border/50 mx-0.5" />
                        {TIMEFRAMES.map((tf) => {
                          const tfSettings = getTimeframeSettings(tf);
                          const enabled = tfSettings.enabled;
                          const color = TIMEFRAME_COLORS[tf];
                          return (
                            <SwingSettingsPopover
                              key={tf}
                              timeframe={tf}
                              isEnabled={enabled}
                              settings={tfSettings}
                              onLookbackChange={(lookback) => updateTimeframeLookback(tf, lookback)}
                              onToggleEnabled={() => updateTimeframeEnabled(tf, !enabled)}
                              onShowLinesChange={(showLines) => updateTimeframeShowLines(tf, showLines)}
                            >
                              <button
                                className={cn(
                                  "px-1 py-0.5 text-[10px] rounded transition-all",
                                  enabled
                                    ? "font-medium"
                                    : "text-muted-foreground/50 hover:text-muted-foreground"
                                )}
                                style={{
                                  backgroundColor: enabled ? `${color}20` : undefined,
                                  color: enabled ? color : undefined,
                                  borderBottom: enabled ? `2px solid ${color}` : "2px solid transparent",
                                }}
                                title={`Configure ${tf} swing detection`}
                              >
                                {tf}
                              </button>
                            </SwingSettingsPopover>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {/* Fib Group - toggle + options + timeframes together */}
                  <div
                    className={cn(
                      "flex items-center gap-0.5 px-1 py-0.5 rounded-md border transition-colors",
                      showFibLevels
                        ? "border-primary/30 bg-primary/5"
                        : "border-transparent"
                    )}
                  >
                    <button
                      onClick={() => dispatch(layoutActions.togglePanel("fibLevels"))}
                      className={cn(
                        "px-2 py-0.5 text-xs rounded transition-colors flex items-center gap-1",
                        showFibLevels
                          ? "bg-primary/20 text-primary font-medium"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      title="Toggle Fibonacci levels"
                    >
                      Fib
                      {showFibLevels && visibleLevels.length > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-0.5">
                          {visibleLevels.length}
                        </Badge>
                      )}
                    </button>
                    {showFibLevels && (
                      <>
                        <div className="h-4 w-px bg-border/50 mx-0.5" />
                        <button
                          onClick={() => dispatch({ type: "TOGGLE_FIB_LINES" })}
                          className={cn(
                            "px-1 py-0.5 text-[10px] rounded transition-colors",
                            showFibLines
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground/50 hover:text-muted-foreground"
                          )}
                          title="Toggle lines"
                        >
                          L
                        </button>
                        <button
                          onClick={() => dispatch({ type: "TOGGLE_FIB_LABELS" })}
                          className={cn(
                            "px-1 py-0.5 text-[10px] rounded transition-colors",
                            showFibLabels
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground/50 hover:text-muted-foreground"
                          )}
                          title="Toggle labels"
                        >
                          T
                        </button>
                        <div className="h-4 w-px bg-border/50 mx-0.5" />
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
                              pivotData={pivotDataByTimeframe[tf]}
                            >
                              <button
                                className={cn(
                                  "px-1 py-0.5 text-[10px] rounded transition-all",
                                  enabled
                                    ? "font-medium"
                                    : "text-muted-foreground/50 hover:text-muted-foreground"
                                )}
                                style={{
                                  backgroundColor: enabled ? `${color}20` : undefined,
                                  color: enabled ? color : undefined,
                                  borderBottom: enabled ? `2px solid ${color}` : "2px solid transparent",
                                }}
                                title={`Configure ${tf} Fibonacci levels`}
                              >
                                {tf}
                              </button>
                            </TimeframeSettingsPopover>
                          );
                        })}
                        <div className="h-4 w-px bg-border/50 mx-0.5" />
                        <button
                          onClick={() => dispatch(layoutActions.togglePanel("confluenceZones"))}
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] rounded transition-colors",
                            showConfluenceZones
                              ? "bg-purple-500/20 text-purple-400 font-medium"
                              : "text-muted-foreground/50 hover:text-muted-foreground"
                          )}
                          title="Toggle confluence zones"
                        >
                          Zones
                        </button>
                        <button
                          onClick={() => dispatch(layoutActions.togglePanel("levelsTable"))}
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] rounded transition-colors",
                            showLevelsTable
                              ? "bg-blue-500/20 text-blue-400 font-medium"
                              : "text-muted-foreground/50 hover:text-muted-foreground"
                          )}
                          title="Toggle levels table"
                        >
                          Table
                        </button>
                        <button
                          onClick={() => dispatch(layoutActions.togglePanel("psychologicalLevels"))}
                          className={cn(
                            "px-1.5 py-0.5 text-[10px] rounded transition-colors",
                            showPsychologicalLevels
                              ? "bg-slate-500/20 text-slate-400 font-medium"
                              : "text-muted-foreground/50 hover:text-muted-foreground"
                          )}
                          title="Toggle psychological (round number) levels"
                        >
                          Ψ
                        </button>
                      </>
                    )}
                  </div>

                  <div className="h-6 w-px bg-border mx-0.5 hidden sm:block" />

                  {/* Other toggles */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => dispatch(layoutActions.togglePanel("indicators"))}
                      className={cn(
                        "px-2 py-1 text-xs rounded transition-colors",
                        showIndicators
                          ? "bg-primary/20 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      )}
                      title="Toggle RSI & MACD"
                    >
                      RSI
                    </button>
                    {/* Trade View toggle - only show when opportunity selected */}
                    {opportunity && phase !== "discover" && (
                      <button
                        onClick={() => dispatch(layoutActions.togglePanel("tradeView"))}
                        className={cn(
                          "px-2 py-1 text-xs rounded transition-colors",
                          showTradeView
                            ? opportunity.direction === "long"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                            : "text-muted-foreground hover:bg-muted"
                        )}
                        title={`Trade view (${opportunity.direction.toUpperCase()})`}
                      >
                        Trade
                      </button>
                    )}
                  </div>

                  {/* Trend indicator - clickable to show panel */}
                  {!isLoadingTrend && (
                    <TrendIndicatorButton
                      bullishCount={stats.bullishTrends}
                      bearishCount={stats.bearishTrends}
                      overall={overallTrend}
                      chartColors={chartColors}
                      onClick={() => dispatch(layoutActions.togglePanel("trendPanel"))}
                      isActive={showTrendPanel}
                    />
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
                        {visibleLevels.length} Fibonacci
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
                    <div className="h-4 w-px bg-border mx-0.5" />
                    <button
                      onClick={() => dispatch(layoutActions.togglePanel("chartExpanded"))}
                      className={cn(
                        "p-1 sm:p-1.5 rounded transition-colors",
                        isChartExpanded
                          ? "bg-primary/20 text-primary"
                          : "hover:bg-muted/50"
                      )}
                      title={isChartExpanded ? "Exit expanded view" : "Expand chart"}
                    >
                      <ExpandIcon isExpanded={isChartExpanded} />
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
            <CardContent className="flex-1 p-0 overflow-hidden relative">
              {isLoadingData && marketData.length === 0 ? (
                <Skeleton className="h-full w-full" />
              ) : marketData.length > 0 ? (
                <>
                  <CandlestickChart
                    ref={chartRef}
                    data={marketData}
                    chartType={chartType}
                    markers={chartMarkers}
                    priceLines={allPriceLines}
                    lineOverlays={swingLineOverlays}
                    upColor={chartColors.up}
                    downColor={chartColors.down}
                    onCrosshairMove={handleCrosshairMove}
                    fillContainer
                    showLeftSideLabels={showFibLabels}
                  />
                  {/* Level tooltip - shows when crosshair is near a Fib level */}
                  {showFibLevels && (
                    <LevelTooltip
                      crosshairPrice={crosshairPrice}
                      levels={visibleLevels}
                      formatPrice={formatPrice}
                      tolerance={0.2}
                    />
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Analysis Panels - horizontal grid layout, doesn't overlay chart */}
          {layoutSelectors.hasOpenAnalysisPanel(layoutState) && (
            <div className="shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-2">
              {/* Trend Alignment Panel */}
              {showTrendPanel && (
                <TrendAlignmentPanel
                  trends={trendData}
                  overall={overallTrend}
                  isLoading={isLoadingTrend}
                  chartColors={chartColors}
                />
              )}

              {/* Indicators Panel - RSI and MACD */}
              {showIndicators && (
                <Card className="shrink-0">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm">Indicators</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0">
                    <div className="space-y-3">
                      {/* RSI */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">RSI (14)</span>
                          {isLoadingRSI && <span className="text-xs text-muted-foreground">Loading...</span>}
                        </div>
                        {isLoadingRSI ? (
                          <Skeleton className="h-[60px] w-full" />
                        ) : rsiData ? (
                          <RSIPane rsiData={rsiData} chartColors={chartColors} />
                        ) : (
                          <div className="h-[60px] flex items-center justify-center text-xs text-muted-foreground">
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
                          <Skeleton className="h-[60px] w-full" />
                        ) : macdData ? (
                          <MACDChart macdData={macdData} chartColors={chartColors} />
                        ) : (
                          <div className="h-[60px] flex items-center justify-center text-xs text-muted-foreground">
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

              {/* Confluence Zones Panel - Shows clusters of Fib levels */}
              {showFibLevels && showConfluenceZones && (
                <Card className="shrink-0">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Confluence Zones</span>
                      <Badge variant="outline" className="text-[10px]">
                        {confluenceZones.length} zones
                      </Badge>
                    </CardTitle>
                    {/* Legend */}
                    <div className="flex items-center gap-3 mt-2 text-[10px]">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-muted-foreground">S = Support</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-muted-foreground">R = Resistance</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-muted-foreground">N = Neutral</span>
                      </div>
                    </div>
                    {/* Tolerance slider */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground">Tolerance:</span>
                      <input
                        type="range"
                        min="0.02"
                        max="0.5"
                        step="0.01"
                        value={confluenceTolerance}
                        onChange={(e) => dispatch(layoutActions.setConfluenceTolerance(parseFloat(e.target.value)))}
                        className="flex-1 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="text-[10px] font-mono w-12 text-right">{confluenceTolerance.toFixed(2)}%</span>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0 max-h-[200px] overflow-y-auto">
                    {confluenceZones.length > 0 ? (
                      <ConfluenceZoneIndicator
                        zones={confluenceZones}
                        formatPrice={formatPrice}
                        hiddenZones={hiddenZones}
                        onToggleZone={toggleZoneVisibility}
                        onShowAll={showAllZones}
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground text-center py-4">
                        No confluence zones found.
                        <br />
                        Enable more Fib levels to see clusters.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Levels Table Panel - Shows all Fib levels with calculations */}
              {showFibLevels && showLevelsTable && (
                <Card className="shrink-0 lg:col-span-3">
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Fibonacci Levels</span>
                      <Badge variant="outline" className="text-[10px]">
                        {visibleLevels.length} visible
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0 max-h-[350px] overflow-y-auto">
                    <LevelsTable
                      levels={allLevels}
                      visibilityConfig={visibilityConfig}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => dispatch(layoutActions.setPanel("sidebar", false))}
          />
        )}

        {/* Sidebar - slide-over on mobile, fixed width on desktop, hidden when expanded */}
        <div
          className={cn(
            // Base styles
            "bg-card border-l border-border overflow-y-auto transition-all duration-300",
            // Mobile: slide-over from right
            "fixed top-14 right-0 bottom-0 w-[min(400px,90vw)] z-50",
            isSidebarOpen ? "translate-x-0" : "translate-x-full",
            // Desktop: always visible, no transform (unless expanded)
            isChartExpanded
              ? "lg:w-0 lg:opacity-0 lg:pointer-events-none"
              : "lg:static lg:translate-x-0 lg:w-[400px] lg:z-0 lg:opacity-100"
          )}
        >
          {/* Mobile close button */}
          <div className="flex items-center justify-between p-3 border-b border-border lg:hidden">
            <span className="font-medium">{PHASE_LABELS[phase]}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch(layoutActions.setPanel("sidebar", false))}
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

function ExpandIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {isExpanded ? (
        // Collapse icon - arrows pointing inward
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 9L4 4m0 0v4m0-4h4m6 6l5 5m0 0v-4m0 4h-4M9 15l-5 5m0 0v-4m0 4h4m6-6l5-5m0 0v4m0-4h-4" />
      ) : (
        // Expand icon - arrows pointing outward
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      )}
    </svg>
  );
}
