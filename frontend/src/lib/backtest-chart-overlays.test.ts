import { describe, it, expect } from "vitest";
import {
  tradesToMarkers,
  tradeToOverlayLines,
  BACKTEST_COLORS,
} from "./backtest-chart-overlays";
import type { BacktestTrade } from "@/types/backtest";

const LONG_TRADE: BacktestTrade = {
  entry_time: "2025-02-10",
  entry_price: 44000,
  direction: "long",
  position_size: 10,
  stop_loss: 43500,
  targets: [44800, 45200],
  trade_category: "with_trend",
  confluence_score: 4,
  status: "target_hit",
  exit_time: "2025-02-15",
  exit_price: 44800,
  exit_reason: "target_1",
  pnl: 800,
  r_multiple: 1.6,
};

const SHORT_TRADE: BacktestTrade = {
  entry_time: "2025-03-01",
  entry_price: 46000,
  direction: "short",
  position_size: 10,
  stop_loss: 46500,
  targets: [45200],
  trade_category: "counter_trend",
  confluence_score: 3,
  status: "stopped_out",
  exit_time: "2025-03-05",
  exit_price: 46500,
  exit_reason: "stop_loss",
  pnl: -500,
  r_multiple: -1.0,
};

const OPEN_TRADE: BacktestTrade = {
  ...LONG_TRADE,
  status: "open",
  exit_time: null,
  exit_price: null,
  exit_reason: null,
  pnl: 200,
  r_multiple: 0.4,
};

describe("tradesToMarkers", () => {
  it("should return empty array for empty trades", () => {
    expect(tradesToMarkers([])).toEqual([]);
  });

  it("should create entry marker for long trade", () => {
    const markers = tradesToMarkers([LONG_TRADE]);
    const entryMarker = markers.find((m) => m.text?.includes("LONG"));

    expect(entryMarker).toBeDefined();
    expect(entryMarker?.shape).toBe("arrowUp");
    expect(entryMarker?.position).toBe("belowBar");
    expect(entryMarker?.color).toBe(BACKTEST_COLORS.longEntry);
    expect(entryMarker?.time).toBe("2025-02-10");
  });

  it("should create entry marker for short trade", () => {
    const markers = tradesToMarkers([SHORT_TRADE]);
    const entryMarker = markers.find((m) => m.text?.includes("SHORT"));

    expect(entryMarker).toBeDefined();
    expect(entryMarker?.shape).toBe("arrowDown");
    expect(entryMarker?.position).toBe("aboveBar");
    expect(entryMarker?.color).toBe(BACKTEST_COLORS.shortEntry);
  });

  it("should create exit marker for target hit", () => {
    const markers = tradesToMarkers([LONG_TRADE]);
    const exitMarker = markers.find((m) => m.text?.includes("T1"));

    expect(exitMarker).toBeDefined();
    expect(exitMarker?.shape).toBe("circle");
    expect(exitMarker?.color).toBe(BACKTEST_COLORS.targetHit);
    expect(exitMarker?.time).toBe("2025-02-15");
  });

  it("should create exit marker for stop loss", () => {
    const markers = tradesToMarkers([SHORT_TRADE]);
    const exitMarker = markers.find((m) => m.text?.includes("SL"));

    expect(exitMarker).toBeDefined();
    expect(exitMarker?.shape).toBe("square");
    expect(exitMarker?.color).toBe(BACKTEST_COLORS.stopLoss);
  });

  it("should skip exit marker for open trades", () => {
    const markers = tradesToMarkers([OPEN_TRADE]);
    expect(markers).toHaveLength(1); // Entry only
  });

  it("should handle multiple trades", () => {
    const markers = tradesToMarkers([LONG_TRADE, SHORT_TRADE]);
    expect(markers).toHaveLength(4); // 2 entries + 2 exits
  });
});

describe("tradeToOverlayLines", () => {
  it("should return empty array for null trade", () => {
    expect(tradeToOverlayLines(null)).toEqual([]);
  });

  it("should create entry price line for long trade", () => {
    const lines = tradeToOverlayLines(LONG_TRADE);
    const entryLine = lines.find((l) => l.title?.includes("Entry"));

    expect(entryLine).toBeDefined();
    expect(entryLine?.price).toBe(44000);
    expect(entryLine?.color).toBe(BACKTEST_COLORS.longEntry);
    expect(entryLine?.lineStyle).toBe(0); // Solid
  });

  it("should create stop loss price line", () => {
    const lines = tradeToOverlayLines(LONG_TRADE);
    const stopLine = lines.find((l) => l.title?.includes("Stop"));

    expect(stopLine).toBeDefined();
    expect(stopLine?.price).toBe(43500);
    expect(stopLine?.color).toBe(BACKTEST_COLORS.stopLoss);
    expect(stopLine?.lineStyle).toBe(2); // Dashed
  });

  it("should create target price lines", () => {
    const lines = tradeToOverlayLines(LONG_TRADE);
    const targetLines = lines.filter((l) => l.title?.includes("Target"));

    expect(targetLines).toHaveLength(2);
    expect(targetLines[0].price).toBe(44800);
    expect(targetLines[1].price).toBe(45200);
    expect(targetLines[0].color).toBe(BACKTEST_COLORS.targetHit);
  });

  it("should use short colour for short trade entry", () => {
    const lines = tradeToOverlayLines(SHORT_TRADE);
    const entryLine = lines.find((l) => l.title?.includes("Entry"));

    expect(entryLine?.color).toBe(BACKTEST_COLORS.shortEntry);
  });
});
