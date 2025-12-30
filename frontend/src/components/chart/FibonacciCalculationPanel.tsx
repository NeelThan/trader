"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  RETRACEMENT_RATIOS,
  EXTENSION_RATIOS,
  EXPANSION_RATIOS,
  PROJECTION_RATIOS,
} from "@/lib/chart-constants";

export type FibonacciPivots = {
  high: number;
  low: number;
  // For projection: A-B-C points
  pointA?: number;
  pointB?: number;
  pointC?: number;
};

export type FibonacciTypeConfig = {
  enabled: boolean;
  pivots: FibonacciPivots;
  useAutoDetect: boolean;
};

export type AllFibonacciConfigs = {
  retracement: FibonacciTypeConfig;
  extension: FibonacciTypeConfig;
  expansion: FibonacciTypeConfig;
  projection: FibonacciTypeConfig;
};

type FibonacciCalculationPanelProps = {
  type: "retracement" | "extension" | "expansion" | "projection";
  config: FibonacciTypeConfig;
  autoDetectedPivots: FibonacciPivots;
  onConfigChange: (config: FibonacciTypeConfig) => void;
  expanded?: boolean;
};

const TYPE_CONFIG = {
  retracement: {
    title: "Retracement",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    ratios: RETRACEMENT_RATIOS,
    formula: "High - (Range × Ratio)",
    description: "Pullback levels within the trend",
  },
  extension: {
    title: "Extension",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    ratios: EXTENSION_RATIOS,
    formula: "High - (Range × Ratio)",
    description: "Levels beyond 100% of the range",
  },
  expansion: {
    title: "Expansion",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    ratios: EXPANSION_RATIOS,
    formula: "Low + (Range × Ratio)",
    description: "Upward expansion from low",
  },
  projection: {
    title: "Projection",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
    ratios: PROJECTION_RATIOS,
    formula: "C + (|B-A| × Ratio × Direction)",
    description: "AB=CD pattern projection from point C",
  },
};

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

export function FibonacciCalculationPanel({
  type,
  config,
  autoDetectedPivots,
  onConfigChange,
  expanded = false,
}: FibonacciCalculationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const typeConfig = TYPE_CONFIG[type];

  const activePivots = config.useAutoDetect ? autoDetectedPivots : config.pivots;
  const { high, low, pointA, pointB, pointC } = activePivots;
  const range = high - low;

  // Calculate levels based on type
  const calculateLevels = () => {
    if (type === "projection") {
      const a = pointA ?? high;
      const b = pointB ?? low;
      const c = pointC ?? low;
      const abRange = Math.abs(b - a);
      // Direction: if C is a low, project upward; if C is a high, project downward
      const direction = c <= Math.min(a, b) ? 1 : -1;

      return typeConfig.ratios.map((ratio) => ({
        ratio,
        price: c + direction * abRange * ratio,
        calculation: `${formatPrice(c)} + (${direction > 0 ? "+" : "-"}${formatPrice(abRange)} × ${ratio})`,
        inputs: { a, b, c, abRange, direction },
      }));
    }

    return typeConfig.ratios.map((ratio) => {
      let price: number;
      let calculation: string;

      if (type === "expansion") {
        price = low + range * ratio;
        calculation = `${formatPrice(low)} + (${formatPrice(range)} × ${ratio})`;
      } else {
        // retracement and extension
        price = high - range * ratio;
        calculation = `${formatPrice(high)} - (${formatPrice(range)} × ${ratio})`;
      }

      return { ratio, price, calculation, inputs: { high, low, range } };
    });
  };

  const levels = calculateLevels();

  const handlePivotChange = (field: keyof FibonacciPivots, value: string) => {
    const numValue = parseFloat(value) || 0;
    onConfigChange({
      ...config,
      useAutoDetect: false,
      pivots: { ...config.pivots, [field]: numValue },
    });
  };

  const handleUseAutoDetect = () => {
    onConfigChange({
      ...config,
      useAutoDetect: true,
      pivots: autoDetectedPivots,
    });
  };

  if (!config.enabled) {
    return null;
  }

  return (
    <Card className={`${typeConfig.borderColor} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className={`text-base ${typeConfig.color}`}>
            {typeConfig.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{typeConfig.description}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pivot Points Section */}
        <div className={`p-3 rounded-lg ${typeConfig.bgColor}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Pivot Points</span>
            <Button
              variant={config.useAutoDetect ? "default" : "outline"}
              size="sm"
              onClick={handleUseAutoDetect}
              className="text-xs h-7"
            >
              {config.useAutoDetect ? "Auto-Detected" : "Use Auto"}
            </Button>
          </div>

          {type === "projection" ? (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Point A</Label>
                <Input
                  type="number"
                  value={activePivots.pointA ?? ""}
                  onChange={(e) => handlePivotChange("pointA", e.target.value)}
                  className="h-8 text-sm font-mono"
                  step="0.01"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Point B</Label>
                <Input
                  type="number"
                  value={activePivots.pointB ?? ""}
                  onChange={(e) => handlePivotChange("pointB", e.target.value)}
                  className="h-8 text-sm font-mono"
                  step="0.01"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Point C</Label>
                <Input
                  type="number"
                  value={activePivots.pointC ?? ""}
                  onChange={(e) => handlePivotChange("pointC", e.target.value)}
                  className="h-8 text-sm font-mono"
                  step="0.01"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">High</Label>
                <Input
                  type="number"
                  value={activePivots.high || ""}
                  onChange={(e) => handlePivotChange("high", e.target.value)}
                  className="h-8 text-sm font-mono"
                  step="0.01"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Low</Label>
                <Input
                  type="number"
                  value={activePivots.low || ""}
                  onChange={(e) => handlePivotChange("low", e.target.value)}
                  className="h-8 text-sm font-mono"
                  step="0.01"
                />
              </div>
            </div>
          )}

          {/* Range display */}
          {type !== "projection" && (
            <div className="mt-2 text-xs text-muted-foreground">
              Range: <span className="font-mono">{formatPrice(range)}</span>
            </div>
          )}
          {type === "projection" && (
            <div className="mt-2 text-xs text-muted-foreground">
              |A-B|:{" "}
              <span className="font-mono">
                {formatPrice(Math.abs((activePivots.pointB ?? 0) - (activePivots.pointA ?? 0)))}
              </span>
            </div>
          )}
        </div>

        {/* Formula */}
        {isExpanded && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Formula:</span>{" "}
            <code className="bg-muted px-1 rounded">{typeConfig.formula}</code>
          </div>
        )}

        {/* Levels Table */}
        <div className="space-y-1">
          <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium pb-1 border-b">
            <span>Ratio</span>
            <span className="text-right">Price</span>
            {isExpanded && <span className="text-right">Calculation</span>}
          </div>

          {levels.map(({ ratio, price, calculation }) => (
            <div
              key={ratio}
              className="grid grid-cols-3 text-sm py-1 hover:bg-muted/50 rounded"
            >
              <span className={`font-medium ${typeConfig.color}`}>
                {(ratio * 100).toFixed(1)}%
              </span>
              <span className="text-right font-mono">{formatPrice(price)}</span>
              {isExpanded && (
                <span className="text-right text-xs text-muted-foreground font-mono truncate">
                  {calculation}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Container component for all Fibonacci calculation panels
 */
type FibonacciCalculationsPanelProps = {
  configs: AllFibonacciConfigs;
  autoDetectedPivots: FibonacciPivots;
  onConfigsChange: (configs: AllFibonacciConfigs) => void;
};

export function FibonacciCalculationsPanel({
  configs,
  autoDetectedPivots,
  onConfigsChange,
}: FibonacciCalculationsPanelProps) {
  const anyEnabled = Object.values(configs).some((c) => c.enabled);

  if (!anyEnabled) {
    return null;
  }

  const handleConfigChange = (
    type: keyof AllFibonacciConfigs,
    config: FibonacciTypeConfig
  ) => {
    onConfigsChange({ ...configs, [type]: config });
  };

  // For projection, use A-B-C from auto-detected pivots
  const projectionPivots: FibonacciPivots = {
    ...autoDetectedPivots,
    pointA: autoDetectedPivots.pointA ?? autoDetectedPivots.high,
    pointB: autoDetectedPivots.pointB ?? autoDetectedPivots.low,
    pointC: autoDetectedPivots.pointC ?? autoDetectedPivots.low,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fibonacci Calculations</h2>
        <span className="text-xs text-muted-foreground">
          Each type uses independent pivot points
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.retracement.enabled && (
          <FibonacciCalculationPanel
            type="retracement"
            config={configs.retracement}
            autoDetectedPivots={autoDetectedPivots}
            onConfigChange={(c) => handleConfigChange("retracement", c)}
          />
        )}

        {configs.extension.enabled && (
          <FibonacciCalculationPanel
            type="extension"
            config={configs.extension}
            autoDetectedPivots={autoDetectedPivots}
            onConfigChange={(c) => handleConfigChange("extension", c)}
          />
        )}

        {configs.expansion.enabled && (
          <FibonacciCalculationPanel
            type="expansion"
            config={configs.expansion}
            autoDetectedPivots={autoDetectedPivots}
            onConfigChange={(c) => handleConfigChange("expansion", c)}
          />
        )}

        {configs.projection.enabled && (
          <FibonacciCalculationPanel
            type="projection"
            config={configs.projection}
            autoDetectedPivots={projectionPivots}
            onConfigChange={(c) => handleConfigChange("projection", c)}
          />
        )}
      </div>
    </div>
  );
}
