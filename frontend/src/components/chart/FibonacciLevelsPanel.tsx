"use client";

import { FibonacciLevels } from "@/components/trading";
import {
  FibonacciVisibility,
  PivotPoint,
  RETRACEMENT_RATIOS,
  EXTENSION_RATIOS,
  EXPANSION_RATIOS,
  PROJECTION_RATIOS,
} from "@/lib/chart-constants";

type FibonacciLevelsPanelProps = {
  visibility: FibonacciVisibility;
  high: number;
  low: number;
  range: number;
  pivotA: PivotPoint | null;
  pivotB: PivotPoint | null;
  pivotC: PivotPoint | null;
};

export function FibonacciLevelsPanel({
  visibility,
  high,
  low,
  range,
  pivotA,
  pivotB,
  pivotC,
}: FibonacciLevelsPanelProps) {
  const anyVisible = Object.values(visibility).some(Boolean);

  if (!anyVisible) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {visibility.retracement && (
        <div className="p-4 rounded-lg bg-card border">
          <h3 className="font-semibold mb-3 text-gray-400">Retracement</h3>
          <FibonacciLevels
            direction="sell"
            highPrice={high}
            lowPrice={low}
            levels={RETRACEMENT_RATIOS.map((ratio) => ({
              ratio,
              label: `${(ratio * 100).toFixed(2)}%`,
              price: high - range * ratio,
            }))}
          />
        </div>
      )}

      {visibility.extension && (
        <div className="p-4 rounded-lg bg-card border">
          <h3 className="font-semibold mb-3 text-blue-400">Extension</h3>
          <FibonacciLevels
            direction="sell"
            highPrice={high}
            lowPrice={low}
            levels={EXTENSION_RATIOS.map((ratio) => ({
              ratio,
              label: `${(ratio * 100).toFixed(2)}%`,
              price: high - range * ratio,
            }))}
          />
        </div>
      )}

      {visibility.expansion && (
        <div className="p-4 rounded-lg bg-card border">
          <h3 className="font-semibold mb-3 text-pink-400">Expansion</h3>
          <FibonacciLevels
            direction="buy"
            highPrice={low + range * Math.max(...EXPANSION_RATIOS)}
            lowPrice={low}
            levels={EXPANSION_RATIOS.map((ratio) => ({
              ratio,
              label: `${(ratio * 100).toFixed(2)}%`,
              price: low + range * ratio,
            }))}
          />
        </div>
      )}

      {visibility.projection && pivotA && pivotB && pivotC && (
        <div className="p-4 rounded-lg bg-card border">
          <h3 className="font-semibold mb-3 text-teal-400">
            Projection (A-B-C)
          </h3>
          <div className="text-xs text-muted-foreground mb-2">
            A: {pivotA.price.toFixed(2)} | B: {pivotB.price.toFixed(2)} | C:{" "}
            {pivotC.price.toFixed(2)}
          </div>
          <FibonacciLevels
            direction={pivotC.type === "low" ? "buy" : "sell"}
            highPrice={
              pivotC.type === "low"
                ? pivotC.price +
                  Math.abs(pivotB.price - pivotA.price) *
                    Math.max(...PROJECTION_RATIOS)
                : pivotC.price
            }
            lowPrice={
              pivotC.type === "low"
                ? pivotC.price
                : pivotC.price -
                  Math.abs(pivotB.price - pivotA.price) *
                    Math.max(...PROJECTION_RATIOS)
            }
            levels={PROJECTION_RATIOS.map((ratio) => {
              const abRange = Math.abs(pivotB.price - pivotA.price);
              const direction = pivotC.type === "low" ? 1 : -1;
              return {
                ratio,
                label: `${(ratio * 100).toFixed(2)}%`,
                price: pivotC.price + direction * abRange * ratio,
              };
            })}
          />
        </div>
      )}
    </div>
  );
}
