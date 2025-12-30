"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  FibonacciControls,
  FibonacciCalculationsPanel,
  PivotPointsPanel,
  SignalDetectionPanel,
  HarmonicPatternPanel,
  TrendAlignmentPanel,
  SignalScanner,
  HarmonicScanner,
  type AllFibonacciConfigs,
  type FibonacciPivots,
} from "@/components/chart";
import { OHLCData } from "@/components/trading";
import { FibonacciVisibility, TimeframePair, TrendAlignment, PivotPoint, MarketSymbol } from "@/lib/chart-constants";
import { PivotConfig } from "@/hooks/use-pivot-analysis";

type AnalysisTabsProps = {
  // Data
  symbol: MarketSymbol;
  data: OHLCData[];
  fibonacciLevels: number[];

  // Fibonacci
  fibVisibility: FibonacciVisibility;
  fibConfigs: AllFibonacciConfigs;
  autoDetectedPivots: FibonacciPivots;
  onFibVisibilityChange: (type: keyof FibonacciVisibility) => void;
  onFibToggleAll: () => void;
  onFibConfigsChange: (configs: AllFibonacciConfigs) => void;

  // Pivots
  pivotPoints: PivotPoint[];
  high: number;
  low: number;
  showPivots: boolean;
  showPivotLines: boolean;
  useManualPivots: boolean;
  manualHigh: string;
  manualLow: string;
  pivotConfig: PivotConfig;
  onTogglePivots: () => void;
  onTogglePivotLines: () => void;
  onToggleManualPivots: () => void;
  onManualHighChange: (value: string) => void;
  onManualLowChange: (value: string) => void;
  onApplyDetectedPivots: () => void;
  onPivotConfigChange: (config: Partial<PivotConfig>) => void;

  // Trend Analysis
  trendAlignments: TrendAlignment[];
  selectedPair: TimeframePair | null;
  trendLoading: boolean;
  trendError: string | null;
  onSelectPair: (pair: TimeframePair) => void;
  onTrendRefresh: () => void;

  // Backend
  useBackendAPI: boolean;

  // Harmonics default values
  defaultX?: number;
  defaultA?: number;
  defaultB?: number;
};

export function AnalysisTabs({
  symbol,
  data,
  fibonacciLevels,
  fibVisibility,
  fibConfigs,
  autoDetectedPivots,
  onFibVisibilityChange,
  onFibToggleAll,
  onFibConfigsChange,
  pivotPoints,
  high,
  low,
  showPivots,
  showPivotLines,
  useManualPivots,
  manualHigh,
  manualLow,
  pivotConfig,
  onTogglePivots,
  onTogglePivotLines,
  onToggleManualPivots,
  onManualHighChange,
  onManualLowChange,
  onApplyDetectedPivots,
  onPivotConfigChange,
  trendAlignments,
  selectedPair,
  trendLoading,
  trendError,
  onSelectPair,
  onTrendRefresh,
  useBackendAPI,
  defaultX,
  defaultA,
  defaultB,
}: AnalysisTabsProps) {
  // Count actionable signals
  const longSignals = trendAlignments.filter((a) => a.action === "GO_LONG").length;
  const shortSignals = trendAlignments.filter((a) => a.action === "GO_SHORT").length;

  return (
    <Tabs defaultValue="fibonacci" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="fibonacci" className="text-xs sm:text-sm">
          Fibonacci
        </TabsTrigger>
        <TabsTrigger value="strategy" className="text-xs sm:text-sm">
          Trends
          {(longSignals > 0 || shortSignals > 0) && (
            <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary/20 text-[10px]">
              {longSignals + shortSignals}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="scanners" className="text-xs sm:text-sm">
          Scanners
        </TabsTrigger>
        <TabsTrigger value="pivots" className="text-xs sm:text-sm">
          Pivots
        </TabsTrigger>
      </TabsList>

      {/* Fibonacci Tab */}
      <TabsContent value="fibonacci" className="space-y-4 mt-4">
        <FibonacciControls
          visibility={fibVisibility}
          onToggle={onFibVisibilityChange}
          onToggleAll={onFibToggleAll}
        />
        <FibonacciCalculationsPanel
          configs={fibConfigs}
          autoDetectedPivots={autoDetectedPivots}
          onConfigsChange={onFibConfigsChange}
        />
      </TabsContent>

      {/* Trends Tab */}
      <TabsContent value="strategy" className="space-y-4 mt-4">
        <TrendAlignmentPanel
          alignments={trendAlignments}
          selectedPair={selectedPair}
          isLoading={trendLoading}
          error={trendError}
          onSelectPair={onSelectPair}
          onRefresh={onTrendRefresh}
        />
      </TabsContent>

      {/* Scanners Tab */}
      <TabsContent value="scanners" className="space-y-4 mt-4">
        <SignalScanner symbol={symbol} enabled={useBackendAPI} />
        <HarmonicScanner symbol={symbol} enabled={useBackendAPI} />
        <div className="p-3 rounded-lg bg-muted/30 border text-xs text-muted-foreground">
          <p className="font-medium mb-1">Manual Analysis</p>
          <p>Use these panels for manual signal detection and harmonic pattern validation:</p>
          <div className="mt-2 space-y-1">
            <SignalDetectionPanel
              data={data}
              fibonacciLevels={fibonacciLevels}
              enabled={useBackendAPI}
            />
            <HarmonicPatternPanel
              enabled={useBackendAPI}
              defaultX={defaultX}
              defaultA={defaultA}
              defaultB={defaultB}
            />
          </div>
        </div>
      </TabsContent>

      {/* Pivots Tab */}
      <TabsContent value="pivots" className="space-y-4 mt-4">
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
          onTogglePivots={onTogglePivots}
          onTogglePivotLines={onTogglePivotLines}
          onToggleManualPivots={onToggleManualPivots}
          onManualHighChange={onManualHighChange}
          onManualLowChange={onManualLowChange}
          onApplyDetectedPivots={onApplyDetectedPivots}
          onPivotConfigChange={onPivotConfigChange}
        />
      </TabsContent>
    </Tabs>
  );
}
