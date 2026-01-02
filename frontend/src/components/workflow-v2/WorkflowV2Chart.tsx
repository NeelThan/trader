"use client";

/**
 * WorkflowV2Chart - Chart-centric display with multi-TF levels
 *
 * Wraps CandlestickChart with:
 * - Multi-timeframe Fibonacci levels
 * - Direction-based coloring (blue=long, red=short)
 * - Level labels with TF + ratio format
 * - Confluence zone highlighting
 */

import { useMemo, useRef, forwardRef, useImperativeHandle } from "react";
import {
  CandlestickChart,
  CandlestickChartHandle,
  type OHLCData,
  type PriceLine,
} from "@/components/trading";
import {
  useWorkflowV2Levels,
  WORKFLOW_DIRECTION_COLORS,
  type WorkflowLevel,
  type ConfluenceZone,
} from "@/hooks/use-workflow-v2-levels";
import type { MarketSymbol, Timeframe } from "@/lib/chart-constants";
import type { TimeframeVisibility, TradeDirection } from "@/types/workflow-v2";

export type WorkflowV2ChartProps = {
  /** Market data to display */
  data: OHLCData[];
  /** Symbol being displayed */
  symbol: MarketSymbol;
  /** Which timeframes to show levels for */
  timeframeVisibility: TimeframeVisibility;
  /** Candle colors */
  upColor?: string;
  downColor?: string;
  /** Filter levels by direction (null = show both) */
  directionFilter?: TradeDirection | null;
  /** Show confluence zones */
  showConfluence?: boolean;
  /** Show level labels */
  showLabels?: boolean;
  /** Additional price lines to display */
  additionalPriceLines?: PriceLine[];
  /** Crosshair move callback */
  onCrosshairMove?: (price: number | null) => void;
  /** Level click callback */
  onLevelClick?: (level: WorkflowLevel) => void;
  /** Confluence zone data callback */
  onConfluenceUpdate?: (zones: ConfluenceZone[]) => void;
  /** CSS class name */
  className?: string;
};

export type WorkflowV2ChartHandle = CandlestickChartHandle & {
  /** Get all current levels */
  getLevels: () => WorkflowLevel[];
  /** Get confluence zones */
  getConfluenceZones: () => ConfluenceZone[];
  /** Refresh levels */
  refreshLevels: () => void;
};

/**
 * Convert WorkflowLevel to PriceLine
 */
function levelToPriceLine(
  level: WorkflowLevel,
  showLabels: boolean,
  showConfluence: boolean
): PriceLine {
  const color = WORKFLOW_DIRECTION_COLORS[level.direction];

  // Thicker line for confluence levels
  const lineWidth = showConfluence && level.isConfluence ? 2 : 1;

  // Dashed for retracement, solid for extension
  const lineStyle = level.strategy === "retracement" ? 2 : 0;

  return {
    price: level.price,
    color,
    lineWidth: lineWidth as 1 | 2 | 3 | 4,
    lineStyle: lineStyle as 0 | 1 | 2 | 3 | 4,
    axisLabelVisible: showLabels,
    title: showLabels ? level.label : undefined,
  };
}

/**
 * Create confluence zone indicator lines
 */
function createConfluenceLines(zones: ConfluenceZone[]): PriceLine[] {
  return zones.map((zone) => ({
    price: zone.price,
    color: WORKFLOW_DIRECTION_COLORS[zone.direction],
    lineWidth: 3 as const,
    lineStyle: 0 as const, // solid
    axisLabelVisible: true,
    title: `⚡ ${zone.levels.length} levels`,
  }));
}

export const WorkflowV2Chart = forwardRef<
  WorkflowV2ChartHandle,
  WorkflowV2ChartProps
>(function WorkflowV2Chart(
  {
    data,
    symbol,
    timeframeVisibility,
    upColor = "#22c55e",
    downColor = "#ef4444",
    directionFilter = null,
    showConfluence = true,
    showLabels = true,
    additionalPriceLines = [],
    onCrosshairMove,
    onConfluenceUpdate,
    className,
  },
  ref
) {
  const chartRef = useRef<CandlestickChartHandle>(null);

  // Fetch levels using our hook
  const { levels, confluenceZones, isLoading, refresh } = useWorkflowV2Levels({
    symbol,
    timeframeVisibility,
    enabled: true,
    directionFilter,
  });

  // Notify parent of confluence zones
  useMemo(() => {
    onConfluenceUpdate?.(confluenceZones);
  }, [confluenceZones, onConfluenceUpdate]);

  // Convert levels to price lines
  const levelPriceLines = useMemo<PriceLine[]>(() => {
    if (isLoading) return [];

    // If showing confluence, only show confluence zone summary lines
    if (showConfluence && confluenceZones.length > 0) {
      const zonePrices = new Set(confluenceZones.map((z) => z.price));
      const nonZoneLevels = levels.filter(
        (l) => !confluenceZones.some((z) => z.levels.includes(l))
      );

      const regularLines = nonZoneLevels.map((level) =>
        levelToPriceLine(level, showLabels, showConfluence)
      );
      const confluenceLines = createConfluenceLines(confluenceZones);

      return [...regularLines, ...confluenceLines];
    }

    // Show all levels individually
    return levels.map((level) =>
      levelToPriceLine(level, showLabels, showConfluence)
    );
  }, [levels, confluenceZones, isLoading, showLabels, showConfluence]);

  // Combine with additional price lines
  const allPriceLines = useMemo<PriceLine[]>(() => {
    return [...levelPriceLines, ...additionalPriceLines];
  }, [levelPriceLines, additionalPriceLines]);

  // Handle crosshair move
  const handleCrosshairMove = (price: number | null) => {
    onCrosshairMove?.(price);
  };

  // Expose methods via ref
  useImperativeHandle(
    ref,
    () => ({
      resetView: () => chartRef.current?.resetView(),
      zoomIn: () => chartRef.current?.zoomIn(),
      zoomOut: () => chartRef.current?.zoomOut(),
      fitPriceScale: () => chartRef.current?.fitPriceScale(),
      scrollUp: () => chartRef.current?.scrollUp(),
      scrollDown: () => chartRef.current?.scrollDown(),
      getLevels: () => levels,
      getConfluenceZones: () => confluenceZones,
      refreshLevels: refresh,
    }),
    [levels, confluenceZones, refresh]
  );

  return (
    <CandlestickChart
      ref={chartRef}
      data={data}
      priceLines={allPriceLines}
      upColor={upColor}
      downColor={downColor}
      autoSize
      theme="dark"
      onCrosshairMove={handleCrosshairMove}
      className={className}
    />
  );
});

export default WorkflowV2Chart;
