"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CandlestickChart, CandlestickChartHandle, ChartType } from "@/components/trading";
import { useSettings, COLOR_SCHEMES, ColorScheme, DEFAULT_SETTINGS } from "@/hooks/use-settings";
import { useMarketData } from "@/hooks/use-market-data";
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
  BackendStatus,
  ChartControls,
  ChartHeader,
  ChartToolbar,
  DataSourceSelector,
  FibonacciControls,
  FibonacciCalculationsPanel,
  HarmonicPatternPanel,
  MarketSelector,
  PivotPointsPanel,
  PriceSummary,
  RefreshStatus,
  SignalDetectionPanel,
  TrendAlignmentPanel,
  type AllFibonacciConfigs,
  type FibonacciPivots,
} from "@/components/chart";

export default function ChartDemoPage() {
  const { settings } = useSettings();
  const chartRef = useRef<CandlestickChartHandle>(null);

  // Initialize state with defaults (same as DEFAULT_SETTINGS to prevent hydration mismatch)
  const [symbol, setSymbol] = useState<MarketSymbol>("DJI");
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [chartType, setChartType] = useState<ChartType>("candlestick");
  const [colorScheme, setColorScheme] = useState<ColorScheme>("blue-red");
  const [dataSource, setDataSource] = useState<DataSource>("yahoo");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [fibVisibility, setFibVisibility] = useState<FibonacciVisibility>({
    retracement: true,
    extension: true,
    expansion: true,
    projection: true,
  });

  // Independent Fibonacci configs with separate pivot points for each type
  const [fibConfigs, setFibConfigs] = useState<AllFibonacciConfigs>({
    retracement: { enabled: true, pivots: { high: 0, low: 0 }, useAutoDetect: true },
    extension: { enabled: true, pivots: { high: 0, low: 0 }, useAutoDetect: true },
    expansion: { enabled: true, pivots: { high: 0, low: 0 }, useAutoDetect: true },
    projection: { enabled: true, pivots: { high: 0, low: 0, pointA: 0, pointB: 0, pointC: 0 }, useAutoDetect: true },
  });

  const [showPivots, setShowPivots] = useState(false);
  const [showPivotLines, setShowPivotLines] = useState(false);
  const [showPivotPanel, setShowPivotPanel] = useState(false);
  const [showTrendPanel, setShowTrendPanel] = useState(false);
  const [pivotConfig, setPivotConfig] = useState<PivotConfig>(DEFAULT_PIVOT_CONFIG);
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const [settingsApplied, setSettingsApplied] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [useBackendAPI, setUseBackendAPI] = useState(true);

  // Track when component has mounted to avoid hydration mismatch.
  // This is intentional - we need to detect client-side mounting to prevent
  // hydration errors from random data generation.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional mount detection
    setHasMounted(true);
  }, []);

  // Get colors from selected scheme
  const { up: upColor, down: downColor } = COLOR_SCHEMES[colorScheme];

  // Apply settings from localStorage after hydration (only once).
  // This syncs external storage (localStorage) with React state - a valid use case for effects.
  useEffect(() => {
    if (!settingsApplied) {
      const hasCustomSettings =
        settings.defaultSymbol !== DEFAULT_SETTINGS.defaultSymbol ||
        settings.defaultTimeframe !== DEFAULT_SETTINGS.defaultTimeframe ||
        settings.chartType !== DEFAULT_SETTINGS.chartType ||
        settings.colorScheme !== DEFAULT_SETTINGS.colorScheme ||
        settings.theme !== DEFAULT_SETTINGS.theme ||
        settings.showPivots !== DEFAULT_SETTINGS.showPivots ||
        settings.showPivotLines !== DEFAULT_SETTINGS.showPivotLines ||
        settings.fibRetracement !== DEFAULT_SETTINGS.fibRetracement ||
        settings.fibExtension !== DEFAULT_SETTINGS.fibExtension ||
        settings.fibExpansion !== DEFAULT_SETTINGS.fibExpansion ||
        settings.fibProjection !== DEFAULT_SETTINGS.fibProjection;

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
  }, [settings, settingsApplied]);

  // Use market data hook
  const {
    data,
    isLoading,
    isLoadingMore,
    fetchError,
    lastUpdated,
    countdown,
    autoRefreshEnabled,
    marketStatus,
    setAutoRefreshEnabled,
    refreshNow,
    loadMoreData,
  } = useMarketData(symbol, timeframe, dataSource, hasMounted);

  // Use trend analysis hook for multi-timeframe alignment
  const trendAnalysis = useTrendAnalysis({
    symbol,
    enabled: hasMounted && showTrendPanel,
  });

  // Use pivot analysis hook (first pass to get high/low)
  const pivotAnalysis = usePivotAnalysis(
    data,
    fibVisibility,
    showPivots,
    showPivotLines,
    upColor,
    downColor,
    null,
    pivotConfig
  );

  const {
    pivotPoints,
    pivotA,
    pivotB,
    pivotC,
    high,
    low,
    range,
    useManualPivots,
    manualHigh,
    manualLow,
    setUseManualPivots,
    setManualHigh,
    setManualLow,
    applyDetectedPivots,
  } = pivotAnalysis;

  // Fetch Fibonacci levels from backend API
  const { retracement, extension, isBackendAvailable } = useFibonacciAPI({
    high: high > 0 ? high : null,
    low: low > 0 ? low : null,
    direction: "buy", // TODO: Determine direction from trend analysis
    enabled: useBackendAPI && high > 0 && low > 0,
  });

  // Build backend levels object for the pivot analysis hook
  const backendLevels: BackendLevels | null =
    useBackendAPI && isBackendAvailable && (retracement.length > 0 || extension.length > 0)
      ? { retracement, extension }
      : null;

  // Use pivot analysis hook with backend levels for price lines
  const { priceLines, lineOverlays } = usePivotAnalysis(
    data,
    fibVisibility,
    showPivots,
    showPivotLines,
    upColor,
    downColor,
    backendLevels,
    pivotConfig
  );

  // Calculate price changes
  const currentPrice = data[data.length - 1]?.close ?? high;
  const startPrice = data[0]?.open ?? 0;
  const priceChange = currentPrice - startPrice;
  const percentChange = startPrice > 0 ? ((priceChange / startPrice) * 100).toFixed(2) : "0.00";

  // Toggle handlers - sync both fibVisibility and fibConfigs
  const toggleFibType = (type: keyof FibonacciVisibility) => {
    setFibVisibility((prev) => ({ ...prev, [type]: !prev[type] }));
    setFibConfigs((prev) => ({
      ...prev,
      [type]: { ...prev[type], enabled: !prev[type].enabled },
    }));
  };

  const toggleAllFib = () => {
    const allVisible = Object.values(fibVisibility).every(Boolean);
    const newValue = !allVisible;
    setFibVisibility({
      retracement: newValue,
      extension: newValue,
      expansion: newValue,
      projection: newValue,
    });
    setFibConfigs((prev) => ({
      retracement: { ...prev.retracement, enabled: newValue },
      extension: { ...prev.extension, enabled: newValue },
      expansion: { ...prev.expansion, enabled: newValue },
      projection: { ...prev.projection, enabled: newValue },
    }));
  };

  // Build auto-detected pivots from pivot analysis
  const autoDetectedPivots: FibonacciPivots = useMemo(() => ({
    high,
    low,
    pointA: pivotA?.price ?? high,
    pointB: pivotB?.price ?? low,
    pointC: pivotC?.price ?? low,
  }), [high, low, pivotA, pivotB, pivotC]);

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-background text-foreground p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <ChartHeader
            symbol={symbol}
            timeframe={timeframe}
            theme={theme}
            onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
          />

          {/* Data Source Selection */}
          <DataSourceSelector
            dataSource={dataSource}
            onSelect={setDataSource}
            isLoading={isLoading}
            error={fetchError}
          />

          {/* Backend API Status */}
          <BackendStatus
            useBackend={useBackendAPI}
            onToggle={() => setUseBackendAPI(!useBackendAPI)}
          />

          {/* Yahoo Finance Refresh Status */}
          {dataSource === "yahoo" && (
            <RefreshStatus
              isLoading={isLoading}
              autoRefreshEnabled={autoRefreshEnabled}
              countdown={countdown}
              lastUpdated={lastUpdated}
              marketStatus={marketStatus}
              timeframe={timeframe}
              onToggleAutoRefresh={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              onRefreshNow={refreshNow}
            />
          )}

          {/* Market Selection */}
          <MarketSelector symbol={symbol} onSelect={setSymbol} />

          {/* Trend Alignment Panel Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={showTrendPanel ? "default" : "outline"}
              size="sm"
              onClick={() => setShowTrendPanel(!showTrendPanel)}
            >
              {showTrendPanel ? "Hide" : "Show"} Trend Alignment
            </Button>
            {!showTrendPanel && (
              <span className="text-xs text-muted-foreground">
                Multi-timeframe trend analysis for trade direction
              </span>
            )}
          </div>
          {showTrendPanel && (
            <TrendAlignmentPanel
              alignments={trendAnalysis.alignments}
              selectedPair={trendAnalysis.selectedPair}
              isLoading={trendAnalysis.isLoading}
              error={trendAnalysis.error}
              onSelectPair={trendAnalysis.setSelectedPair}
              onRefresh={trendAnalysis.refresh}
            />
          )}

          {/* Timeframe, Chart Type, and Color Selection */}
          <ChartControls
            timeframe={timeframe}
            chartType={chartType}
            colorScheme={colorScheme}
            onTimeframeChange={setTimeframe}
            onChartTypeChange={setChartType}
            onColorSchemeChange={setColorScheme}
          />

          {/* Pivot Points Controls - Hidden by default, toggle with button */}
          <div className="flex items-center gap-2">
            <Button
              variant={showPivotPanel ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPivotPanel(!showPivotPanel)}
            >
              {showPivotPanel ? "Hide" : "Show"} Pivot Controls
            </Button>
            {!showPivotPanel && (
              <span className="text-xs text-muted-foreground">
                Individual Fibonacci panels have their own pivot point settings
              </span>
            )}
          </div>
          {showPivotPanel && (
            <PivotPointsPanel
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
            />
          )}

          {/* Fibonacci Controls */}
          <FibonacciControls
            visibility={fibVisibility}
            onToggle={toggleFibType}
            onToggleAll={toggleAllFib}
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
            </div>
          </div>

          {/* Fibonacci Calculations Panel - with independent pivot points */}
          <FibonacciCalculationsPanel
            configs={fibConfigs}
            autoDetectedPivots={autoDetectedPivots}
            onConfigsChange={setFibConfigs}
          />

          {/* Signal Detection Panel */}
          <SignalDetectionPanel
            data={data}
            fibonacciLevels={priceLines.map((line) => line.price)}
            enabled={useBackendAPI}
          />

          {/* Harmonic Pattern Panel */}
          <HarmonicPatternPanel
            enabled={useBackendAPI}
            defaultX={pivotA?.price}
            defaultA={pivotB?.price}
            defaultB={pivotC?.price}
          />
        </div>
      </div>
    </div>
  );
}
