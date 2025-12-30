"use client";

import { useState, useEffect, useRef } from "react";
import { CandlestickChart, CandlestickChartHandle, ChartType } from "@/components/trading";
import { useSettings, COLOR_SCHEMES, ColorScheme, DEFAULT_SETTINGS } from "@/hooks/use-settings";
import { useMarketData } from "@/hooks/use-market-data";
import { usePivotAnalysis } from "@/hooks/use-pivot-analysis";
import {
  Timeframe,
  MarketSymbol,
  DataSource,
  FibonacciVisibility,
} from "@/lib/chart-constants";
import {
  ChartControls,
  ChartHeader,
  ChartToolbar,
  DataSourceSelector,
  FibonacciControls,
  FibonacciLevelsPanel,
  MarketSelector,
  PivotPointsPanel,
  PriceSummary,
  RefreshStatus,
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
  const [showPivots, setShowPivots] = useState(true);
  const [showPivotLines, setShowPivotLines] = useState(true);
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);
  const [settingsApplied, setSettingsApplied] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

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
        /* eslint-enable react-hooks/set-state-in-effect */
      }
      setSettingsApplied(true);
    }
  }, [settings, settingsApplied]);

  // Use market data hook
  const {
    data,
    isLoading,
    fetchError,
    lastUpdated,
    countdown,
    autoRefreshEnabled,
    marketStatus,
    setAutoRefreshEnabled,
    refreshNow,
  } = useMarketData(symbol, timeframe, dataSource, hasMounted);

  // Use pivot analysis hook
  const {
    pivotPoints,
    pivotA,
    pivotB,
    pivotC,
    high,
    low,
    range,
    priceLines,
    lineOverlays,
    useManualPivots,
    manualHigh,
    manualLow,
    setUseManualPivots,
    setManualHigh,
    setManualLow,
    applyDetectedPivots,
  } = usePivotAnalysis(data, fibVisibility, showPivots, showPivotLines, upColor, downColor);

  // Calculate price changes
  const currentPrice = data[data.length - 1]?.close ?? high;
  const startPrice = data[0]?.open ?? 0;
  const priceChange = currentPrice - startPrice;
  const percentChange = startPrice > 0 ? ((priceChange / startPrice) * 100).toFixed(2) : "0.00";

  // Toggle handlers
  const toggleFibType = (type: keyof FibonacciVisibility) => {
    setFibVisibility((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const toggleAllFib = () => {
    const allVisible = Object.values(fibVisibility).every(Boolean);
    setFibVisibility({
      retracement: !allVisible,
      extension: !allVisible,
      expansion: !allVisible,
      projection: !allVisible,
    });
  };

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

          {/* Timeframe, Chart Type, and Color Selection */}
          <ChartControls
            timeframe={timeframe}
            chartType={chartType}
            colorScheme={colorScheme}
            onTimeframeChange={setTimeframe}
            onChartTypeChange={setChartType}
            onColorSchemeChange={setColorScheme}
          />

          {/* Pivot Points Controls */}
          <PivotPointsPanel
            pivotPoints={pivotPoints}
            high={high}
            low={low}
            showPivots={showPivots}
            showPivotLines={showPivotLines}
            useManualPivots={useManualPivots}
            manualHigh={manualHigh}
            manualLow={manualLow}
            onTogglePivots={() => setShowPivots(!showPivots)}
            onTogglePivotLines={() => setShowPivotLines(!showPivotLines)}
            onToggleManualPivots={() => setUseManualPivots(!useManualPivots)}
            onManualHighChange={setManualHigh}
            onManualLowChange={setManualLow}
            onApplyDetectedPivots={applyDetectedPivots}
          />

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
            <div className="rounded-lg border overflow-hidden">
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
              />
            </div>
          </div>

          {/* Fibonacci Levels Panel */}
          <FibonacciLevelsPanel
            visibility={fibVisibility}
            high={high}
            low={low}
            range={range}
            pivotA={pivotA}
            pivotB={pivotB}
            pivotC={pivotC}
          />
        </div>
      </div>
    </div>
  );
}
