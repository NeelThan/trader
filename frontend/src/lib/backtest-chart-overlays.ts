/**
 * Pure functions to convert backtest trades into chart visual overlays.
 * Produces ChartMarker[] for entry/exit arrows and PriceLine[] for levels.
 */

import type { ChartMarker, PriceLine } from "@/components/trading/candlestick-chart";
import type { BacktestTrade } from "@/types/backtest";

export const BACKTEST_COLORS = {
  longEntry: "#22c55e",
  shortEntry: "#ef4444",
  targetHit: "#eab308",
  stopLoss: "#ef4444",
  trailingStop: "#f97316",
} as const;

const EXIT_REASON_LABELS: Record<string, string> = {
  target_1: "T1",
  target_2: "T2",
  target_3: "T3",
  stop_loss: "SL",
  trailing_stop: "TS",
  end_of_data: "EOD",
};

function isLong(trade: BacktestTrade): boolean {
  return trade.direction === "long";
}

function hasExit(trade: BacktestTrade): boolean {
  return trade.exit_time !== null && trade.exit_reason !== null;
}

function createEntryMarker(trade: BacktestTrade): ChartMarker {
  const long = isLong(trade);
  return {
    time: trade.entry_time,
    position: long ? "belowBar" : "aboveBar",
    color: long ? BACKTEST_COLORS.longEntry : BACKTEST_COLORS.shortEntry,
    shape: long ? "arrowUp" : "arrowDown",
    text: long ? "LONG" : "SHORT",
    size: 1,
  };
}

function exitMarkerColor(reason: string): string {
  if (reason.startsWith("target")) return BACKTEST_COLORS.targetHit;
  if (reason === "trailing_stop") return BACKTEST_COLORS.trailingStop;
  return BACKTEST_COLORS.stopLoss;
}

function exitMarkerShape(reason: string): ChartMarker["shape"] {
  if (reason.startsWith("target")) return "circle";
  if (reason === "stop_loss") return "square";
  return "circle";
}

function createExitMarker(trade: BacktestTrade): ChartMarker {
  const reason = trade.exit_reason!;
  const long = isLong(trade);
  return {
    time: trade.exit_time!,
    position: long ? "aboveBar" : "belowBar",
    color: exitMarkerColor(reason),
    shape: exitMarkerShape(reason),
    text: EXIT_REASON_LABELS[reason] ?? reason,
    size: 1,
  };
}

export function tradesToMarkers(trades: BacktestTrade[]): ChartMarker[] {
  const markers: ChartMarker[] = [];

  for (const trade of trades) {
    markers.push(createEntryMarker(trade));

    if (hasExit(trade)) {
      markers.push(createExitMarker(trade));
    }
  }

  return markers;
}

export function tradeToOverlayLines(trade: BacktestTrade | null): PriceLine[] {
  if (!trade) return [];

  const long = isLong(trade);
  const entryColor = long ? BACKTEST_COLORS.longEntry : BACKTEST_COLORS.shortEntry;

  const lines: PriceLine[] = [
    {
      price: trade.entry_price,
      color: entryColor,
      lineWidth: 2,
      lineStyle: 0,
      axisLabelVisible: true,
      title: `Entry ${trade.entry_price.toFixed(2)}`,
    },
    {
      price: trade.stop_loss,
      color: BACKTEST_COLORS.stopLoss,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `Stop ${trade.stop_loss.toFixed(2)}`,
    },
  ];

  trade.targets.forEach((target, index) => {
    lines.push({
      price: target,
      color: BACKTEST_COLORS.targetHit,
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `Target ${index + 1}`,
    });
  });

  return lines;
}
