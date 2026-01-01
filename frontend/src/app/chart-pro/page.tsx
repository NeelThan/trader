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
} from "@/components/chart-pro";
import { useMarketDataSubscription } from "@/hooks/use-market-data-subscription";
import { useMACD } from "@/hooks/use-macd";
import { useRSI } from "@/hooks/use-rsi";
import { useSwingMarkers } from "@/hooks/use-swing-markers";
import { useMultiTFLevels } from "@/hooks/use-multi-tf-levels";
import { usePersistedVisibilityConfig } from "@/hooks/use-persisted-visibility-config";
import { usePersistedSwingSettings } from "@/hooks/use-persisted-swing-settings";
import { useEditablePivots } from "@/hooks/use-editable-pivots";
import { useDataMode } from "@/hooks/use-data-mode";
import { useSettings, COLOR_SCHEMES } from "@/hooks/use-settings";
import { generateSwingLineOverlays } from "@/lib/chart-pro/swing-overlays";
import {
  Timeframe,
  MarketSymbol,
  TIMEFRAME_CONFIG,
  MARKET_CONFIG,
} from "@/lib/chart-constants";
import {
  type StrategySource,
  isLevelVisible,
  DIRECTION_COLORS,
} from "@/lib/chart-pro/strategy-types";

const SYMBOLS: MarketSymbol[] = ["DJI", "SPX", "NDX", "BTCUSD", "EURUSD", "GOLD"];
const TIMEFRAMES: Timeframe[] = ["1M", "1W", "1D", "4H", "1H", "15m", "1m"];

type ChartType = "candlestick" | "bar" | "heikin-ashi";

export default function ChartProPage() {
  const [symbol, setSymbol] = useState<MarketSymbol>("DJI");
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
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
  const [showIndicatorsPanel, setShowIndicatorsPanel] = useState(true);
  const [showLevelsTable, setShowLevelsTable] = useState(true);

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
  const chartColors = COLOR_SCHEMES[settings.colorScheme];

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

  // Log for debugging
  if (enabledTimeframeCount > 0 && allLevels.length > 0) {
    const longLevels = allLevels.filter(l => l.direction === "long");
    const shortLevels = allLevels.filter(l => l.direction === "short");
    const visibleLongLevels = allLevels.filter(l => l.direction === "long" && isLevelVisible(l, visibilityConfig));
    const visibleShortLevels = allLevels.filter(l => l.direction === "short" && isLevelVisible(l, visibilityConfig));

    console.log("[ChartPro Debug]", {
      enabledTimeframes: enabledTimeframeCount,
      fetchedLevels: allLevels.length,
      longLevels: longLevels.length,
      shortLevels: shortLevels.length,
      visibleLongLevels: visibleLongLevels.length,
      visibleShortLevels: visibleShortLevels.length,
      sampleLong: longLevels[0],
      sampleShort: shortLevels[0],
    });
  }

  // Handler to toggle visibility for a specific ratio in the visibility config
  const handleToggleLevelVisibility = useCallback((level: { timeframe: string; strategy: string; direction: string; ratio: number }) => {
    const tf = level.timeframe as Timeframe;
    const strategy = level.strategy as StrategySource;
    const direction = level.direction as "long" | "short";

    setVisibilityConfig({
      timeframes: visibilityConfig.timeframes.map(tfConfig => {
        if (tfConfig.timeframe !== tf) return tfConfig;

        return {
          ...tfConfig,
          strategies: tfConfig.strategies.map(stratConfig => {
            if (stratConfig.strategy !== strategy) return stratConfig;

            return {
              ...stratConfig,
              [direction]: {
                ...stratConfig[direction],
                ratios: stratConfig[direction].ratios.map(r => {
                  // Use tolerance for float comparison
                  if (Math.abs(r.ratio - level.ratio) < 0.0001) {
                    return { ...r, visible: !r.visible };
                  }
                  return r;
                }),
              },
            };
          }),
        };
      }),
    });
  }, [visibilityConfig, setVisibilityConfig]);

  // Get visible levels based on visibility config
  const visibleLevels = useMemo(() => {
    return allLevels.filter((level) => isLevelVisible(level, visibilityConfig));
  }, [allLevels, visibilityConfig]);

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

  // Convert swing markers to chart markers (only when swing detection is enabled)
  // Include ABC labels when pivots are part of the Fibonacci pattern
  const chartMarkers = useMemo<ChartMarker[]>(() => {
    if (!swingEnabled || !swingResult?.markers) return [];

    return swingResult.markers.map((marker) => {
      // Determine color and position based on swing type
      const isHigh = marker.swingType === "HH" || marker.swingType === "LH";
      const isBullish = marker.swingType === "HH" || marker.swingType === "HL";

      // Find matching editable pivot to get ABC label
      const matchingPivot = editablePivots.find(
        (p) => p.index === marker.index
      );
      const abcLabel = matchingPivot?.abcLabel;

      // Build marker text: show ABC label if present, with swing type in parentheses
      const text = abcLabel
        ? `${abcLabel} (${marker.swingType})`
        : marker.swingType;

      return {
        time: marker.time,
        position: isHigh ? "aboveBar" : "belowBar",
        color: isBullish ? chartColors.up : chartColors.down,
        shape: isHigh ? "arrowDown" : "arrowUp",
        text,
        size: 1,
      } as ChartMarker;
    });
  }, [swingResult, swingEnabled, editablePivots, chartColors]);

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
            <div className="flex items-center gap-3">
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
                {isSimulated ? "📦 Cached" : "🔴 Live"}
              </button>

              <Select value={symbol} onValueChange={(v) => setSymbol(v as MarketSymbol)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SYMBOLS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v as Timeframe)}>
                <SelectTrigger className="w-[100px]">
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
              <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="candlestick">Candlestick</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="heikin-ashi">Heikin Ashi</SelectItem>
                </SelectContent>
              </Select>
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
          </div>

          {/* Backend Status */}
          {isBackendUnavailable && (
            <div className="p-4 rounded-lg bg-orange-500/20 border border-orange-500/30 text-orange-400">
              Backend Offline - Cannot load market data
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

          {/* OHLC Summary Bar */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-xs text-muted-foreground mr-2">Symbol:</span>
                    <span className="font-semibold">{symbol}</span>
                    <span className="text-xs text-muted-foreground ml-1">
                      ({MARKET_CONFIG[symbol].name})
                    </span>
                  </div>
                  <Badge variant="outline">{timeframe}</Badge>
                </div>
                {currentOHLC && (
                  <div className="flex items-center gap-6 text-sm font-mono">
                    <span className="text-xs text-muted-foreground">(Last Bar)</span>
                    <div>
                      <span className="text-muted-foreground mr-1">O:</span>
                      <span>{formatPrice(currentOHLC.open)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground mr-1">H:</span>
                      <span className="text-green-400">{formatPrice(currentOHLC.high)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground mr-1">L:</span>
                      <span className="text-red-400">{formatPrice(currentOHLC.low)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground mr-1">C:</span>
                      <span className={currentOHLC.close >= currentOHLC.open ? "text-green-400" : "text-red-400"}>
                        {formatPrice(currentOHLC.close)}
                      </span>
                    </div>
                  </div>
                )}
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
                    lineOverlays={swingLineOverlays}
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

/**
 * Simple MACD histogram chart using SVG
 */
function MACDChart({ macdData, chartColors }: { macdData: { histogram: (number | null)[] } | null; chartColors: { up: string; down: string } }) {
  if (!macdData || !macdData.histogram) return null;

  // Get last 50 histogram values
  const histogramValues = macdData.histogram
    .slice(-50)
    .map((v) => v ?? 0);

  if (histogramValues.length === 0) return null;

  const maxAbs = Math.max(...histogramValues.map(Math.abs), 0.0001);
  const height = 100;
  const width = 100;
  const barWidth = width / histogramValues.length;

  return (
    <div className="mt-4">
      <div className="text-xs text-muted-foreground mb-2">MACD Histogram (last 50 bars)</div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[100px] border border-border rounded"
        preserveAspectRatio="none"
      >
        {/* Zero line */}
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="currentColor"
          strokeOpacity="0.3"
          strokeWidth="0.5"
        />

        {/* Histogram bars */}
        {histogramValues.map((value, i) => {
          const normalizedValue = (value / maxAbs) * (height / 2 - 5);
          const barHeight = Math.abs(normalizedValue);
          const y = value >= 0 ? height / 2 - barHeight : height / 2;

          return (
            <rect
              key={i}
              x={i * barWidth}
              y={y}
              width={barWidth - 0.5}
              height={barHeight}
              fill={value >= 0 ? chartColors.up : chartColors.down}
              opacity={0.8}
            />
          );
        })}
      </svg>
    </div>
  );
}

function StatusItem({ label, status }: { label: string; status: "done" | "pending" | "in-progress" }) {
  return (
    <div className="flex items-center gap-2">
      {status === "done" && (
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
      {status === "pending" && (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth={2} />
        </svg>
      )}
      {status === "in-progress" && (
        <svg className="w-4 h-4 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      <span className="text-sm">{label}</span>
    </div>
  );
}
