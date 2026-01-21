"use client";

/**
 * Chart Pro - Visual-First Trading Workflow
 *
 * Phase 4.5: Hierarchical visibility controls with LevelsTable.
 */

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CandlestickChart, CandlestickChartHandle, ChartMarker, PriceLine, LineOverlay } from "@/components/trading";
import {
  RSIPane,
  StrategyPanel,
  LevelsTable,
  SwingPivotPanel,
  TrendAlignmentPanel,
  SignalSuggestionsPanel,
  MACDChart,
  StatusItem,
  ReversalTimePanel,
} from "@/components/chart-pro";
import { useMarketDataSubscription } from "@/hooks/use-market-data-subscription";
import { useMACD } from "@/hooks/use-macd";
import { useRSI } from "@/hooks/use-rsi";
import { useSwingMarkers } from "@/hooks/use-swing-markers";
import { useMultiTFLevels } from "@/hooks/use-multi-tf-levels";
import { usePersistedVisibilityConfig } from "@/hooks/use-persisted-visibility-config";
import { usePersistedSwingSettings } from "@/hooks/use-persisted-swing-settings";
import { useEditablePivots } from "@/hooks/use-editable-pivots";
import { useChartMarkers } from "@/hooks/use-chart-markers";
import { useDataMode } from "@/hooks/use-data-mode";
import { useSettings, COLOR_SCHEMES } from "@/hooks/use-settings";
import { useTrendAlignment } from "@/hooks/use-trend-alignment";
import { useSignalSuggestions, type SignalFilters } from "@/hooks/use-signal-suggestions";
import { useTrendLines } from "@/hooks/use-trend-lines";
import { useReversalTime } from "@/hooks/use-reversal-time";
import { generateSwingLineOverlays, generateTrendLineOverlays } from "@/lib/chart-pro/swing-overlays";
import {
  Timeframe,
  MarketSymbol,
  TIMEFRAME_CONFIG,
  MARKET_CONFIG,
} from "@/lib/chart-constants";
import {
  type StrategySource,
  type TimeframeTrendData,
  type TimeframePivotAnalysis,
  isLevelVisible,
  toggleRatioVisibility,
  syncVisibilityWithTrend,
  getSyncSummary,
  analyzePivotsForSync,
  syncVisibilityWithPivots,
  getPivotSyncSummary,
  DIRECTION_COLORS,
} from "@/lib/chart-pro/strategy-types";

const SYMBOLS: MarketSymbol[] = ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"];
const TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "5m", "3m", "1m"];

// Default chart colors (fallback when settings haven't loaded)
const DEFAULT_CHART_COLORS = { up: "#22c55e", down: "#ef4444" } as const;

type ChartType = "candlestick" | "bar" | "heikin-ashi";

export default function ChartProPage() {
  const [symbol, setSymbol] = useState<MarketSymbol>("DJI");
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [hasMounted, setHasMounted] = useState(false);
  const chartRef = useRef<CandlestickChartHandle>(null);

  // Visibility configuration (hierarchical: Timeframe → Strategy → Direction → Ratios)
  // Persisted to localStorage so settings survive page navigation
  const {
    visibilityConfig,
    setVisibilityConfig,
    resetToDefaults,
    isLoaded: isConfigLoaded,
  } = usePersistedVisibilityConfig();

  // Swing settings (per-timeframe lookback and showLines)
  const {
    swingConfig,
    getTimeframeSettings,
    updateTimeframeLookback,
    updateTimeframeEnabled,
    updateTimeframeShowLines,
    resetToDefaults: resetSwingDefaults,
    isLoaded: isSwingConfigLoaded,
  } = usePersistedSwingSettings();

  // Get current timeframe swing settings (memoized for stable reference)
  const currentSwingSettings = useMemo(
    () => getTimeframeSettings(timeframe),
    [getTimeframeSettings, timeframe]
  );

  const [showStrategyPanel, setShowStrategyPanel] = useState(true);
  const [showTrendAlignment, setShowTrendAlignment] = useState(true);
  const [showSignalSuggestions, setShowSignalSuggestions] = useState(true);
  const [showIndicatorsPanel, setShowIndicatorsPanel] = useState(true);
  const [showLevelsTable, setShowLevelsTable] = useState(true);
  const [showTrendLines, setShowTrendLines] = useState(false);
  const [showReversalTime, setShowReversalTime] = useState(false);

  // Signal filters - default to showing Long signals (most common use case)
  const [signalFilters, setSignalFilters] = useState<SignalFilters>({
    showLong: true,
    showShort: true,
    showWait: false, // Hide wait signals by default
  });

  // Data mode - switch between live API and cached/simulated data
  const {
    mode: dataMode,
    toggleMode: toggleDataMode,
    isSimulated,
    availableData: cachedData,
    cacheSizeFormatted,
    clearCache,
    refreshCacheInfo,
  } = useDataMode();

  // Global settings for chart colors
  const { settings } = useSettings();
  // Ensure chartColors always has valid values (fallback to default if colorScheme is invalid)
  const chartColors = COLOR_SCHEMES[settings.colorScheme] ?? DEFAULT_CHART_COLORS;

  // Trend alignment across all timeframes
  const {
    trends: trendData,
    overall: overallTrend,
    isLoading: isLoadingTrend,
    refresh: refreshTrend,
  } = useTrendAlignment({
    symbol,
    enabled: true,
  });

  // Signal suggestions based on trend alignment
  const {
    signals: signalSuggestions,
    activeSignals,
    longCount,
    shortCount,
    waitCount,
  } = useSignalSuggestions({
    trends: trendData,
    overall: overallTrend,
    filters: signalFilters,
  });

  // Convert trend data to format needed for sync
  const trendDataForSync = useMemo<TimeframeTrendData[]>(() => {
    return trendData
      .filter((t) => !t.isLoading && !t.error)
      .map((t) => ({
        timeframe: t.timeframe,
        trend: t.trend,
        confidence: t.confidence,
      }));
  }, [trendData]);

  // Get sync summary for UI display
  const syncSummary = useMemo(() => {
    const summary = getSyncSummary(trendDataForSync);
    return {
      bullishCount: summary.bullishTimeframes.length,
      bearishCount: summary.bearishTimeframes.length,
      direction: summary.totalLevelsDirection,
    };
  }, [trendDataForSync]);

  // Handler to sync visibility config with detected trends
  const handleSyncWithTrend = useCallback(() => {
    const newConfig = syncVisibilityWithTrend(
      visibilityConfig,
      trendDataForSync,
      {
        includeRanging: false,
        minConfidence: 50, // Only include trends with 50%+ confidence
        strategies: ["RETRACEMENT", "EXTENSION"],
      }
    );
    setVisibilityConfig(newConfig);
  }, [visibilityConfig, trendDataForSync, setVisibilityConfig]);

  // Pivot analysis for smart sync - uses raw pivot/marker data from trend alignment
  const pivotAnalysis = useMemo<TimeframePivotAnalysis[]>(() => {
    return trendData
      .filter((t) => !t.isLoading && !t.error && t.pivots && t.markers && t.currentPrice)
      .map((t) =>
        analyzePivotsForSync(
          t.pivots!,
          t.markers!,
          t.currentPrice!,
          t.timeframe
        )
      );
  }, [trendData]);

  // Get pivot sync summary for UI display
  const pivotSyncSummary = useMemo(() => {
    return getPivotSyncSummary(pivotAnalysis, { minConfidence: 50 });
  }, [pivotAnalysis]);

  // Handler for pivot-based smart sync
  const handlePivotSync = useCallback(() => {
    const newConfig = syncVisibilityWithPivots(
      visibilityConfig,
      pivotAnalysis,
      { minConfidence: 50 }
    );
    setVisibilityConfig(newConfig);
  }, [visibilityConfig, pivotAnalysis, setVisibilityConfig]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Get market data
  const {
    data: marketData,
    isLoading: isLoadingData,
    provider,
    isBackendUnavailable,
  } = useMarketDataSubscription(symbol, timeframe, "yahoo", { autoRefresh: true });

  // Get MACD indicator
  const {
    macdData,
    isLoading: isLoadingMACD,
    error: macdError,
  } = useMACD({
    data: marketData,
    enabled: marketData.length >= 26,
  });

  // Get RSI indicator
  const {
    rsiData,
    isLoading: isLoadingRSI,
    error: rsiError,
  } = useRSI({
    data: marketData,
    enabled: marketData.length >= 15,
  });

  // Extract primitive values for stable dependencies
  const swingEnabled = currentSwingSettings.enabled;
  const swingLookback = currentSwingSettings.settings.lookback;
  const swingShowLines = currentSwingSettings.settings.showLines;
  const minBarsForSwing = swingLookback * 2 + 1;

  // Get swing markers (HH/HL/LH/LL) with per-timeframe settings and caching
  const {
    result: swingResult,
    isLoading: isLoadingSwings,
    error: swingError,
    isBackendUnavailable: isSwingBackendUnavailable,
    isFromCache: swingFromCache,
    cacheTTL: swingCacheTTL,
    forceRefresh: forceRefreshSwings,
  } = useSwingMarkers({
    data: marketData,
    lookback: swingLookback,
    enabled: swingEnabled && marketData.length >= minBarsForSwing,
    symbol,
    timeframe,
    useCache: true,
  });

  // Memoize pivots to avoid creating new array reference on every render
  const apiPivots = useMemo(() => swingResult?.pivots ?? [], [swingResult?.pivots]);

  // Editable pivots (allows manual adjustment of detected pivot prices)
  const {
    pivots: editablePivots,
    updatePivotPrice,
    resetPivot,
    resetAllPivots,
    hasModifications: hasPivotModifications,
    modifiedCount: pivotModifiedCount,
  } = useEditablePivots(apiPivots, timeframe);

  // Generate swing line overlays from editable pivots
  const swingLineOverlays = useMemo<LineOverlay[]>(() => {
    if (!swingEnabled || !swingShowLines) {
      return [];
    }
    return generateSwingLineOverlays(editablePivots, { lookback: swingLookback, showLines: swingShowLines });
  }, [editablePivots, swingEnabled, swingShowLines, swingLookback]);

  // Trend lines - HH and LL separate lines
  const {
    trendLines,
    overlays: trendLineOverlays,
    isLoading: isLoadingTrendLines,
  } = useTrendLines({
    data: marketData,
    lookback: swingLookback,
    enabled: showTrendLines && swingEnabled,
    projectBars: 20,
  });

  // Combine all line overlays for the chart
  const allLineOverlays = useMemo<LineOverlay[]>(() => {
    const overlays = [...swingLineOverlays];
    if (showTrendLines) {
      overlays.push(...trendLineOverlays);
    }
    return overlays;
  }, [swingLineOverlays, trendLineOverlays, showTrendLines]);

  // Get multi-TF Fibonacci levels (hook fetches its own market data per timeframe)
  const {
    allLevels,
    byTimeframe: levelsByTimeframe,
    uniqueLevels,
    loadingStates: levelsLoadingStates,
    errors: levelErrors,
    isLoading: isLoadingLevels,
  } = useMultiTFLevels({
    symbol,
    visibilityConfig,
    enabled: true,
    dataMode,
  });

  // Debug: Log fetching status
  const enabledTimeframeCount = visibilityConfig.timeframes.filter(tf => tf.enabled).length;
  const hasErrors = Object.values(levelErrors).some(e => e !== null);

  // Handler to toggle visibility for a specific ratio in the visibility config
  const handleToggleLevelVisibility = useCallback(
    (level: { timeframe: string; strategy: string; direction: string; ratio: number }) => {
      const newConfig = toggleRatioVisibility(
        visibilityConfig,
        level.timeframe as Timeframe,
        level.strategy as StrategySource,
        level.direction as "long" | "short",
        level.ratio
      );
      setVisibilityConfig(newConfig);
    },
    [visibilityConfig, setVisibilityConfig]
  );

  // Get visible levels based on visibility config
  const visibleLevels = useMemo(() => {
    return allLevels.filter((level) => isLevelVisible(level, visibilityConfig));
  }, [allLevels, visibilityConfig]);

  // Prepare Fibonacci levels for reversal time estimation
  const fibLevelsForTimeEstimate = useMemo(() => {
    return visibleLevels.map((level) => ({
      label: `${level.timeframe} ${level.label}`,
      price: level.price,
    }));
  }, [visibleLevels]);

  // Reversal time estimation
  const {
    velocity,
    estimates: timeEstimates,
    isLoading: isLoadingReversalTime,
  } = useReversalTime({
    data: marketData,
    fibLevels: fibLevelsForTimeEstimate,
    timeframe,
    enabled: showReversalTime && fibLevelsForTimeEstimate.length > 0,
  });

  // Convert strategy levels to price lines for chart
  const strategyPriceLines = useMemo<PriceLine[]>(() => {
    if (!visibleLevels.length) return [];

    return visibleLevels.map((level) => ({
      price: level.price,
      color: level.direction === "long" ? DIRECTION_COLORS.long : DIRECTION_COLORS.short,
      lineWidth: level.heat > 50 ? 2 : 1,
      lineStyle: level.strategy === "RETRACEMENT" ? 2 : 1, // Dashed for retracement
      axisLabelVisible: true,
      title: `${level.timeframe} ${level.label} ${level.direction === "long" ? "L" : "S"}`,
    }));
  }, [visibleLevels]);

  // Handle visibility config change (persisted to localStorage)
  const handleVisibilityChange = useCallback(
    (config: { timeframes: typeof visibilityConfig.timeframes }) => {
      setVisibilityConfig(config);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visibilityConfig.timeframes type is stable
    [setVisibilityConfig]
  );

  // Convert swing markers to chart markers (extracted to hook)
  const chartMarkers = useChartMarkers({
    swingEnabled,
    markers: swingResult?.markers,
    marketData,
    editablePivots,
  });

  // Get current OHLC values
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

  // Get current MACD values
  const currentMACD = useMemo(() => {
    if (!macdData || macdData.macd.length === 0) return null;

    // Get last non-null values
    const lastMacd = macdData.macd.filter((v) => v !== null).slice(-1)[0];
    const lastSignal = macdData.signal.filter((v) => v !== null).slice(-1)[0];
    const lastHistogram = macdData.histogram.filter((v) => v !== null).slice(-1)[0];

    return {
      macd: lastMacd ?? 0,
      signal: lastSignal ?? 0,
      histogram: lastHistogram ?? 0,
    };
  }, [macdData]);

  // Determine MACD signal
  const macdSignal = useMemo(() => {
    if (!currentMACD) return null;

    if (currentMACD.histogram > 0) {
      return { direction: "bullish", label: "Bullish", color: chartColors.up };
    } else if (currentMACD.histogram < 0) {
      return { direction: "bearish", label: "Bearish", color: chartColors.down };
    }
    return { direction: "neutral", label: "Neutral", color: undefined };
  }, [currentMACD, chartColors]);

  // Format price based on symbol
  const formatPrice = (price: number) => {
    if (symbol === "EURUSD") return price.toFixed(5);
    if (price >= 10000) return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return price.toFixed(2);
  };

  if (!hasMounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="flex gap-6">
        {/* Main Content */}
        <div className={`flex-1 space-y-6 transition-all duration-300 ${showStrategyPanel ? "mr-0" : ""}`}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Chart Pro
                <Badge variant="secondary" className="text-xs">
                  Phase 4.5
                </Badge>
              </h1>
              <p className="text-muted-foreground">
                Visual-first trading workflow with multi-timeframe analysis
              </p>
            </div>
            <button
              onClick={() => setShowStrategyPanel(!showStrategyPanel)}
              className="p-2 rounded-md hover:bg-muted/50 transition-colors"
              title={showStrategyPanel ? "Hide Strategy Panel" : "Show Strategy Panel"}
            >
              <svg
                className={`w-5 h-5 transition-transform ${showStrategyPanel ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          {/* Backend Status */}
          {(isBackendUnavailable || isSwingBackendUnavailable) && (
            <div className="p-4 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400">
              Backend Offline - Some features unavailable (swing detection, indicators)
            </div>
          )}

          {/* Debug Status - Shows when timeframes are enabled but no levels fetched */}
          {enabledTimeframeCount > 0 && allLevels.length === 0 && !isLoadingLevels && (
            <div className="p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm">
              <div className="font-medium mb-1">No Fibonacci levels fetched</div>
              <div className="text-xs text-yellow-400/80">
                {hasErrors ? (
                  <span>Errors occurred - check browser console (F12) for details</span>
                ) : (
                  <span>
                    Make sure the backend is running at localhost:8000.
                    {isSimulated && " You are in Cached mode - switch to Live if no cached data exists."}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Market Controls & OHLC Summary */}
          <Card>
            <CardContent className="py-3">
              <div className="flex flex-col gap-3">
                {/* Controls Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Symbol Dropdown */}
                  <Select value={symbol} onValueChange={(v) => setSymbol(v as MarketSymbol)}>
                    <SelectTrigger className="w-[90px]">
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

                  {/* Timeframe Dropdown */}
                  <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
                    <SelectTrigger className="w-[85px]">
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

                  {/* Chart Type Dropdown */}
                  <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                    <SelectTrigger className="w-[115px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="candlestick">Candlestick</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="heikin-ashi">Heikin Ashi</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Separator */}
                  <div className="h-6 w-px bg-border mx-1" />

                  {/* Data Mode Toggle */}
                  <button
                    onClick={toggleDataMode}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isSimulated
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                        : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                    }`}
                    title={
                      isSimulated
                        ? `Using cached data (${cachedData.length} entries, ${cacheSizeFormatted})`
                        : "Using live API data (click to use cached)"
                    }
                  >
                    {isSimulated ? "Cached" : "Live"}
                  </button>

                  {/* Trend Lines Toggle */}
                  <button
                    onClick={() => setShowTrendLines(!showTrendLines)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      showTrendLines
                        ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                        : "bg-muted/50 text-muted-foreground border border-muted hover:bg-muted"
                    }`}
                    title="Toggle HH/LL trend lines"
                  >
                    Trend Lines
                  </button>

                  {/* Reversal Time Toggle */}
                  <button
                    onClick={() => setShowReversalTime(!showReversalTime)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      showReversalTime
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                        : "bg-muted/50 text-muted-foreground border border-muted hover:bg-muted"
                    }`}
                    title="Show estimated time to reach levels"
                  >
                    Time Est.
                  </button>

                  {/* OHLC Values - pushed to the right */}
                  {currentOHLC && (
                    <div className="flex items-center gap-4 ml-auto text-sm font-mono">
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
          </Card>

          {/* Main Chart */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Price Chart</span>
                <div className="flex items-center gap-2">
                  {/* Chart Controls */}
                  <div className="flex items-center gap-1 mr-4">
                    <button
                      onClick={() => chartRef.current?.zoomIn()}
                      className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      title="Zoom In"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => chartRef.current?.zoomOut()}
                      className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      title="Zoom Out"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => chartRef.current?.resetView()}
                      className="p-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                      title="Reset View (fit all data)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                  <span className="text-sm font-normal text-muted-foreground">
                    {marketData.length} bars{provider && ` from ${provider}`}
                    {visibleLevels.length > 0 && ` | ${visibleLevels.length} levels`}
                  </span>
                </div>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Drag to pan left/right | Middle-click+drag for vertical pan | Ctrl+scroll for vertical zoom | Double-click price axis to auto-fit
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingData && marketData.length === 0 ? (
                <Skeleton className="h-[400px] w-full" />
              ) : marketData.length > 0 ? (
                <div className="h-[400px]">
                  <CandlestickChart
                    ref={chartRef}
                    data={marketData}
                    markers={chartMarkers}
                    priceLines={strategyPriceLines}
                    lineOverlays={allLineOverlays}
                    upColor={chartColors.up}
                    downColor={chartColors.down}
                    chartType={chartType}
                  />
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trend Alignment Panel */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Trend Alignment
                  {isLoadingTrend && (
                    <Badge variant="secondary" className="text-xs">
                      Loading...
                    </Badge>
                  )}
                </span>
                <button
                  onClick={() => setShowTrendAlignment(!showTrendAlignment)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showTrendAlignment ? "Hide" : "Show"}
                </button>
              </CardTitle>
            </CardHeader>
            {showTrendAlignment && (
              <CardContent className="pt-0">
                <TrendAlignmentPanel
                  trends={trendData}
                  overall={overallTrend}
                  isLoading={isLoadingTrend}
                  onRefresh={refreshTrend}
                  chartColors={chartColors}
                  onSyncWithLevels={handleSyncWithTrend}
                  syncSummary={syncSummary}
                  onPivotSync={handlePivotSync}
                  pivotSyncSummary={pivotSyncSummary}
                  pivotAnalysis={pivotAnalysis}
                />
              </CardContent>
            )}
          </Card>

          {/* Signal Suggestions Panel */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Signal Suggestions
                  {activeSignals.length > 0 && (
                    <Badge variant="default" className="text-xs bg-amber-500/20 text-amber-400 border-amber-500/30">
                      {activeSignals.length} Active
                    </Badge>
                  )}
                </span>
                <button
                  onClick={() => setShowSignalSuggestions(!showSignalSuggestions)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showSignalSuggestions ? "Hide" : "Show"}
                </button>
              </CardTitle>
            </CardHeader>
            {showSignalSuggestions && (
              <CardContent className="pt-0">
                <SignalSuggestionsPanel
                  signals={activeSignals}
                  filters={signalFilters}
                  onFiltersChange={setSignalFilters}
                  longCount={longCount}
                  shortCount={shortCount}
                  waitCount={waitCount}
                  chartColors={chartColors}
                  allLevels={allLevels}
                />
              </CardContent>
            )}
          </Card>

          {/* Indicators Panel */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Indicators
                  {(isLoadingRSI || isLoadingMACD) && (
                    <Badge variant="secondary" className="text-xs">
                      Loading...
                    </Badge>
                  )}
                </span>
                <button
                  onClick={() => setShowIndicatorsPanel(!showIndicatorsPanel)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showIndicatorsPanel ? "Hide" : "Show"}
                </button>
              </CardTitle>
            </CardHeader>
            {showIndicatorsPanel && (
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* RSI Indicator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">RSI (14)</span>
                      {rsiError && (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      )}
                    </div>
                    {isLoadingRSI ? (
                      <Skeleton className="h-[120px] w-full" />
                    ) : rsiError ? (
                      <div className="text-red-400 text-sm">{rsiError}</div>
                    ) : (
                      <RSIPane rsiData={rsiData} chartColors={chartColors} />
                    )}
                  </div>

                  {/* MACD Indicator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-2">
                        MACD (12, 26, 9)
                        {macdSignal && (
                          <Badge
                            variant="outline"
                            className={!macdSignal.color ? "text-gray-400" : ""}
                            style={{ color: macdSignal.color, borderColor: macdSignal.color }}
                          >
                            {macdSignal.label}
                          </Badge>
                        )}
                      </span>
                      {macdError && (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      )}
                    </div>
                    {isLoadingMACD ? (
                      <Skeleton className="h-[150px] w-full" />
                    ) : macdError ? (
                      <div className="text-red-400 text-sm">{macdError}</div>
                    ) : currentMACD ? (
                      <div className="space-y-4">
                        {/* MACD Values */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-3 rounded-lg bg-muted/30">
                            <div className="text-xs text-muted-foreground mb-1">MACD Line</div>
                            <div
                              className="text-xl font-mono font-semibold"
                              style={{ color: currentMACD.macd >= 0 ? chartColors.up : chartColors.down }}
                            >
                              {currentMACD.macd.toFixed(4)}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30">
                            <div className="text-xs text-muted-foreground mb-1">Signal Line</div>
                            <div
                              className="text-xl font-mono font-semibold"
                              style={{ color: currentMACD.signal >= 0 ? chartColors.up : chartColors.down }}
                            >
                              {currentMACD.signal.toFixed(4)}
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/30">
                            <div className="text-xs text-muted-foreground mb-1">Histogram</div>
                            <div
                              className="text-xl font-mono font-semibold"
                              style={{ color: currentMACD.histogram >= 0 ? chartColors.up : chartColors.down }}
                            >
                              {currentMACD.histogram.toFixed(4)}
                            </div>
                          </div>
                        </div>

                        {/* Simple MACD Visualization */}
                        <MACDChart macdData={macdData} chartColors={chartColors} />
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        Need at least 26 bars to calculate MACD
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Reversal Time Panel - shows when enabled */}
          {showReversalTime && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    Reversal Time Estimation
                    {isLoadingReversalTime && (
                      <Badge variant="secondary" className="text-xs">
                        Loading...
                      </Badge>
                    )}
                  </span>
                  <button
                    onClick={() => setShowReversalTime(false)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Hide
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ReversalTimePanel
                  velocity={velocity}
                  estimates={timeEstimates}
                  currentPrice={marketData.length > 0 ? marketData[marketData.length - 1].close : 0}
                  isLoading={isLoadingReversalTime}
                />
              </CardContent>
            </Card>
          )}

          {/* Levels Table */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Strategy Levels
                  {isLoadingLevels && (
                    <Badge variant="secondary" className="text-xs">
                      Loading...
                    </Badge>
                  )}
                </span>
                <button
                  onClick={() => setShowLevelsTable(!showLevelsTable)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showLevelsTable ? "Hide" : "Show"}
                </button>
              </CardTitle>
            </CardHeader>
            {showLevelsTable && (
              <CardContent>
                <LevelsTable
                  levels={allLevels}
                  visibilityConfig={visibilityConfig}
                  onToggleLevelVisibility={handleToggleLevelVisibility}
                  timeEstimates={showReversalTime ? timeEstimates : undefined}
                />
              </CardContent>
            )}
          </Card>

          {/* Implementation Status */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-base">Implementation Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatusItem label="MACD Indicator" status="done" />
                <StatusItem label="RSI Pane" status="done" />
                <StatusItem label="Swing Detection" status="done" />
                <StatusItem label="Multi-TF Levels" status="done" />
                <StatusItem label="Visibility Config" status="done" />
                <StatusItem label="Levels Table" status="done" />
                <StatusItem label="Swing Lines" status="done" />
                <StatusItem label="Pivot Editor" status="done" />
                <StatusItem label="Per-TF Settings" status="done" />
                <StatusItem label="Pivot Caching" status="done" />
                <StatusItem label="Trend Lines" status="done" />
                <StatusItem label="Time Estimates" status="done" />
                <StatusItem label="Confluence Heatmap" status="pending" />
                <StatusItem label="Monitor Zones" status="pending" />
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-blue-400">Phase 4.5 Complete:</span>{" "}
              Hierarchical visibility controls and levels table are now available.
              Use the Strategy Panel to select timeframes, strategies, and toggle long/short levels independently.
              {visibleLevels.length > 0 && ` Currently showing ${visibleLevels.length} levels.`}
            </p>
          </div>
        </div>

        {/* Strategy Panel Sidebar */}
        {showStrategyPanel && (
          <div className="w-80 shrink-0 space-y-4">
            {/* Swing & Pivot Panel - Combined settings and pivot points */}
            <SwingPivotPanel
              currentTimeframe={timeframe}
              swingConfig={swingConfig}
              getTimeframeSettings={getTimeframeSettings}
              updateTimeframeLookback={updateTimeframeLookback}
              updateTimeframeEnabled={updateTimeframeEnabled}
              updateTimeframeShowLines={updateTimeframeShowLines}
              resetToDefaults={resetSwingDefaults}
              isLoaded={isSwingConfigLoaded}
              pivots={editablePivots}
              updatePivotPrice={updatePivotPrice}
              resetPivot={resetPivot}
              resetAllPivots={resetAllPivots}
              hasModifications={hasPivotModifications}
              modifiedCount={pivotModifiedCount}
              isLoading={isLoadingSwings}
            />

            {/* Strategy Panel */}
            <Card className="max-h-[calc(100vh-24rem)] overflow-y-auto">
              <CardContent className="pt-4">
                <StrategyPanel
                  visibilityConfig={visibilityConfig}
                  byTimeframe={levelsByTimeframe}
                  loadingStates={levelsLoadingStates}
                  onVisibilityChange={handleVisibilityChange}
                  onReset={resetToDefaults}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
