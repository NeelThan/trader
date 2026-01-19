"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTheme } from "next-themes";
import { CandlestickChart, CandlestickChartHandle, ChartType } from "@/components/trading";
import { useSettings, COLOR_SCHEMES, ColorScheme, DEFAULT_SETTINGS } from "@/hooks/use-settings";
import { useMarketDataSubscription } from "@/hooks/use-market-data-subscription";
import { usePivotAnalysis, BackendLevels, PivotConfig, DEFAULT_PIVOT_CONFIG } from "@/hooks/use-pivot-analysis";
import { useFibonacciAPI } from "@/hooks/use-fibonacci-api";
import { useTrendAnalysis } from "@/hooks/use-trend-analysis";
import {
  Timeframe,
  MarketSymbol,
  DataSource,
  FibonacciVisibility,
} from "@/lib/chart-constants";
import {
  AnalysisTabs,
  ChartToolbar,
  PriceSummary,
  RefreshStatus,
  UnifiedHeader,
  type AllFibonacciConfigs,
  type FibonacciPivots,
} from "@/components/chart";

export default function ChartPage() {
  const { settings } = useSettings();
  const { resolvedTheme, setTheme } = useTheme();
  const chartRef = useRef<CandlestickChartHandle>(null);

  // Core state
  const [symbol, setSymbol] = useState<MarketSymbol>("DJI");
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [colorScheme, setColorScheme] = useState<ColorScheme>("blue-red");
  const [dataSource, setDataSource] = useState<DataSource>("yahoo");
  const [useBackendAPI, setUseBackendAPI] = useState(true);

  // Theme for chart (derived from next-themes)
  const theme = resolvedTheme === "light" ? "light" : "dark";

  // Fibonacci state
  const [fibVisibility, setFibVisibility] = useState<FibonacciVisibility>({
    retracement: true,
    extension: true,
    expansion: true,
    projection: true,
  });
  const [fibConfigs, setFibConfigs] = useState<AllFibonacciConfigs>({
    retracement: { enabled: true, pivots: { high: 0, low: 0 }, useAutoDetect: true },
    extension: { enabled: true, pivots: { high: 0, low: 0 }, useAutoDetect: true },
    expansion: { enabled: true, pivots: { high: 0, low: 0 }, useAutoDetect: true },
    projection: { enabled: true, pivots: { high: 0, low: 0, pointA: 0, pointB: 0, pointC: 0 }, useAutoDetect: true },
  });

  // Pivot state
  const [showPivots, setShowPivots] = useState(false);
  const [showPivotLines, setShowPivotLines] = useState(false);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>(DEFAULT_PIVOT_CONFIG);

  // UI state
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const [settingsApplied, setSettingsApplied] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Track mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional mount detection
    setHasMounted(true);
  }, []);

  // Get colors from scheme
  const { up: upColor, down: downColor } = COLOR_SCHEMES[colorScheme];

  // Apply settings from localStorage
  useEffect(() => {
    if (!settingsApplied) {
      const hasCustomSettings =
        settings.defaultSymbol !== DEFAULT_SETTINGS.defaultSymbol ||
        settings.defaultTimeframe !== DEFAULT_SETTINGS.defaultTimeframe ||
        settings.chartType !== DEFAULT_SETTINGS.chartType ||
        settings.colorScheme !== DEFAULT_SETTINGS.colorScheme ||
        settings.theme !== DEFAULT_SETTINGS.theme ||
        settings.showPivots !== DEFAULT_SETTINGS.showPivots ||
        settings.showPivotLines !== DEFAULT_SETTINGS.showPivotLines;

      if (hasCustomSettings) {
        /* eslint-disable react-hooks/set-state-in-effect -- Syncing external storage with state */
        setSymbol(settings.defaultSymbol);
        setTimeframe(settings.defaultTimeframe);
        setChartType(settings.chartType);
        setColorScheme(settings.colorScheme);
        setTheme(settings.theme);
        setFibVisibility({
          retracement: settings.fibRetracement,
          extension: settings.fibExtension,
          expansion: settings.fibExpansion,
          projection: settings.fibProjection,
        });
        setShowPivots(settings.showPivots);
        setShowPivotLines(settings.showPivotLines);
        setPivotConfig({
          lookback: settings.pivotLookback,
          count: settings.pivotCount,
          offset: settings.pivotOffset,
        });
        /* eslint-enable react-hooks/set-state-in-effect */
      }
      setSettingsApplied(true);
    }
  }, [settings, settingsApplied, setTheme]);

  // Market data (from centralized store)
  const {
    data,
    isLoading,
    isLoadingMore,
    fetchError,
    lastUpdated,
    countdown,
    autoRefreshEnabled,
    marketStatus,
    isRateLimited,
    isUsingSimulatedData,
    isBackendUnavailable,
    setAutoRefreshEnabled,
    refreshNow,
    loadMoreData,
  } = useMarketDataSubscription(symbol, timeframe, dataSource, { enabled: hasMounted });

  // Trend analysis
  const trendAnalysis = useTrendAnalysis({
    symbol,
    enabled: hasMounted,
  });

  // Pivot analysis (first pass) - uses chart data as single source of truth
  // When useBackendAPI is true, sends chart data to backend for pivot detection
  const pivotAnalysis = usePivotAnalysis(
    data,
    fibVisibility,
    showPivots,
    showPivotLines,
    upColor,
    downColor,
    null,
    pivotConfig,
    useBackendAPI // Enable backend pivot detection when backend API is enabled
  );

  const {
    pivotPoints,
    pivotA,
    pivotB,
    pivotC,
    high,
    low,
    useManualPivots,
    manualHigh,
    manualLow,
    setUseManualPivots,
    setManualHigh,
    setManualLow,
    applyDetectedPivots,
  } = pivotAnalysis;

  // Fibonacci API
  const { retracement, extension, isBackendAvailable } = useFibonacciAPI({
    high: high > 0 ? high : null,
    low: low > 0 ? low : null,
    direction: "buy",
    enabled: useBackendAPI && high > 0 && low > 0,
  });

  // Backend levels
  const backendLevels: BackendLevels | null =
    useBackendAPI && isBackendAvailable && (retracement.length > 0 || extension.length > 0)
      ? { retracement, extension }
      : null;

  // Pivot analysis with backend levels - uses same chart data
  const { priceLines, lineOverlays } = usePivotAnalysis(
    data,
    fibVisibility,
    showPivots,
    showPivotLines,
    upColor,
    downColor,
    backendLevels,
    pivotConfig,
    useBackendAPI // Enable backend pivot detection when backend API is enabled
  );

  // Price calculations
  const currentPrice = data[data.length - 1]?.close ?? high;
  const startPrice = data[0]?.open ?? 0;
  const priceChange = currentPrice - startPrice;
  const percentChange = startPrice > 0 ? ((priceChange / startPrice) * 100).toFixed(2) : "0.00";

  // Toggle handlers
  const toggleFibType = (type: keyof FibonacciVisibility) => {
    setFibVisibility((prev) => ({ ...prev, [type]: !prev[type] }));
    // Only update fibConfigs for types that have configs (not psychological)
    if (type !== "psychological") {
      setFibConfigs((prev) => ({
        ...prev,
        [type]: { ...prev[type], enabled: !prev[type].enabled },
      }));
    }
  };

  const toggleAllFib = () => {
    const allVisible = Object.values(fibVisibility).every(Boolean);
    const newValue = !allVisible;
    setFibVisibility({
      retracement: newValue,
      extension: newValue,
      expansion: newValue,
      projection: newValue,
      psychological: newValue,
    });
    setFibConfigs((prev) => ({
      retracement: { ...prev.retracement, enabled: newValue },
      extension: { ...prev.extension, enabled: newValue },
      expansion: { ...prev.expansion, enabled: newValue },
      projection: { ...prev.projection, enabled: newValue },
    }));
  };

  // Auto-detected pivots
  const autoDetectedPivots: FibonacciPivots = useMemo(() => ({
    high,
    low,
    pointA: pivotA?.price ?? high,
    pointB: pivotB?.price ?? low,
    pointC: pivotC?.price ?? low,
  }), [high, low, pivotA, pivotB, pivotC]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Unified Header: Market, Timeframe, Settings, Navigation */}
        <UnifiedHeader
          symbol={symbol}
          timeframe={timeframe}
          dataSource={dataSource}
          useBackendAPI={useBackendAPI}
          isUsingSimulatedData={isUsingSimulatedData}
          onSymbolChange={setSymbol}
          onTimeframeChange={setTimeframe}
          onDataSourceChange={setDataSource}
          onBackendToggle={() => setUseBackendAPI(!useBackendAPI)}
        />

          {/* Main Content: Chart + Analysis */}
          <div className="space-y-4">
            {/* Chart Section */}
            <div className="space-y-3">
              {/* Refresh Status (compact) - shown for all data sources */}
              <RefreshStatus
                isLoading={isLoading}
                autoRefreshEnabled={autoRefreshEnabled}
                countdown={countdown}
                lastUpdated={lastUpdated}
                marketStatus={marketStatus}
                timeframe={timeframe}
                isRateLimited={isRateLimited}
                isUsingSimulatedData={isUsingSimulatedData}
                isBackendUnavailable={isBackendUnavailable}
                onToggleAutoRefresh={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                onRefreshNow={refreshNow}
              />

              {/* Price Summary */}
              <PriceSummary
                symbol={symbol}
                currentPrice={currentPrice}
                crosshairPrice={crosshairPrice}
                priceChange={priceChange}
                percentChange={percentChange}
                timeframe={timeframe}
              />

              {/* Chart with Toolbar */}
              <div className="space-y-2">
                <ChartToolbar
                  onZoomIn={() => chartRef.current?.zoomIn()}
                  onZoomOut={() => chartRef.current?.zoomOut()}
                  onResetView={() => chartRef.current?.resetView()}
                />
                <div className="rounded-lg border overflow-hidden relative">
                  <CandlestickChart
                    ref={chartRef}
                    data={data}
                    priceLines={priceLines}
                    lineOverlays={lineOverlays}
                    chartType={chartType}
                    height={500}
                    theme={theme}
                    upColor={upColor}
                    downColor={downColor}
                    onCrosshairMove={(price) => setCrosshairPrice(price)}
                    onLoadMore={loadMoreData}
                  />
                  {isLoadingMore && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-background/80 rounded text-sm text-muted-foreground">
                      Loading history...
                    </div>
                  )}
                  {fetchError && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/20 rounded text-sm text-red-400">
                      {fetchError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Analysis Panel (below chart) */}
            <div className="p-4 rounded-lg bg-card border">
              <AnalysisTabs
                  symbol={symbol}
                  data={data}
                  fibonacciLevels={priceLines.map((line) => line.price)}
                  fibVisibility={fibVisibility}
                  fibConfigs={fibConfigs}
                  autoDetectedPivots={autoDetectedPivots}
                  onFibVisibilityChange={toggleFibType}
                  onFibToggleAll={toggleAllFib}
                  onFibConfigsChange={setFibConfigs}
                  pivotPoints={pivotPoints}
                  high={high}
                  low={low}
                  showPivots={showPivots}
                  showPivotLines={showPivotLines}
                  useManualPivots={useManualPivots}
                  manualHigh={manualHigh}
                  manualLow={manualLow}
                  pivotConfig={pivotConfig}
                  onTogglePivots={() => setShowPivots(!showPivots)}
                  onTogglePivotLines={() => setShowPivotLines(!showPivotLines)}
                  onToggleManualPivots={() => setUseManualPivots(!useManualPivots)}
                  onManualHighChange={setManualHigh}
                  onManualLowChange={setManualLow}
                  onApplyDetectedPivots={applyDetectedPivots}
                  onPivotConfigChange={(config) => setPivotConfig((prev) => ({ ...prev, ...config }))}
                  trendAlignments={trendAnalysis.alignments}
                  selectedPair={trendAnalysis.selectedPair}
                  trendLoading={trendAnalysis.isLoading}
                  trendError={trendAnalysis.error}
                  onSelectPair={trendAnalysis.setSelectedPair}
                  onTrendRefresh={trendAnalysis.refresh}
                  useBackendAPI={useBackendAPI}
                  defaultX={pivotA?.price}
                  defaultA={pivotB?.price}
                  defaultB={pivotC?.price}
                />
            </div>
          </div>
        </div>
      </div>
  );
}
