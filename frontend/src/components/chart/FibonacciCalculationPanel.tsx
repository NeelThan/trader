"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  RETRACEMENT_RATIOS_BACKEND,
  EXTENSION_RATIOS_BACKEND,
  EXPANSION_RATIOS_BACKEND,
  PROJECTION_RATIOS_BACKEND,
  RETRACEMENT_RATIOS_EXTENDED,
  EXTENSION_RATIOS_EXTENDED,
  EXPANSION_RATIOS_EXTENDED,
  PROJECTION_RATIOS_EXTENDED,
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

export type Direction = "buy" | "sell";

type FibonacciCalculationPanelProps = {
  type: "retracement" | "extension" | "expansion" | "projection";
  config: FibonacciTypeConfig;
  autoDetectedPivots: FibonacciPivots;
  onConfigChange: (config: FibonacciTypeConfig) => void;
  expanded?: boolean;
  primaryDirection?: Direction;
};

const TYPE_CONFIG = {
  retracement: {
    title: "Retracement",
    color: "text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    backendRatios: RETRACEMENT_RATIOS_BACKEND,
    extendedRatios: RETRACEMENT_RATIOS_EXTENDED,
    buyFormula: "High - (Range × Ratio)",
    sellFormula: "Low + (Range × Ratio)",
    description: "Pullback levels within the trend",
  },
  extension: {
    title: "Extension",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    backendRatios: EXTENSION_RATIOS_BACKEND,
    extendedRatios: EXTENSION_RATIOS_EXTENDED,
    buyFormula: "Low - (Range × (Ratio - 1))",
    sellFormula: "High + (Range × (Ratio - 1))",
    description: "Levels beyond 100% of the range",
  },
  expansion: {
    title: "Expansion",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    backendRatios: EXPANSION_RATIOS_BACKEND,
    extendedRatios: EXPANSION_RATIOS_EXTENDED,
    buyFormula: "Low + (Range × Ratio)",
    sellFormula: "High - (Range × Ratio)",
    description: "Expansion from pivot point",
  },
  projection: {
    title: "Projection",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/30",
    backendRatios: PROJECTION_RATIOS_BACKEND,
    extendedRatios: PROJECTION_RATIOS_EXTENDED,
    buyFormula: "C + (|B-A| × Ratio)",
    sellFormula: "C - (|B-A| × Ratio)",
    description: "AB=CD pattern projection from point C",
  },
};

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(0);
  if (price >= 100) return price.toFixed(2);
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

type CalculatedLevel = {
  ratio: number;
  price: number;
  calculation: string;
};

function calculateLevelsForDirection(
  type: keyof typeof TYPE_CONFIG,
  high: number,
  low: number,
  direction: Direction,
  ratios: number[],
  pointA?: number,
  pointB?: number,
  pointC?: number
): CalculatedLevel[] {
  const range = high - low;

  if (type === "projection") {
    const a = pointA ?? high;
    const b = pointB ?? low;
    const c = pointC ?? low;
    const abRange = Math.abs(b - a);
    const dirMultiplier = direction === "buy" ? 1 : -1;

    return ratios.map((ratio) => ({
      ratio,
      price: c + dirMultiplier * abRange * ratio,
      calculation: `${formatPrice(c)} ${dirMultiplier > 0 ? "+" : "-"} (${formatPrice(abRange)} × ${ratio})`,
    }));
  }

  return ratios.map((ratio) => {
    let price: number;
    let calculation: string;

    if (type === "retracement") {
      if (direction === "buy") {
        // Uptrend retracement: looking for pullback levels to buy
        price = high - range * ratio;
        calculation = `${formatPrice(high)} - (${formatPrice(range)} × ${ratio})`;
      } else {
        // Downtrend retracement: looking for pullback levels to sell
        price = low + range * ratio;
        calculation = `${formatPrice(low)} + (${formatPrice(range)} × ${ratio})`;
      }
    } else if (type === "extension") {
      if (direction === "buy") {
        // Extension below low (target for shorts closing / reversal)
        price = low - range * (ratio - 1);
        calculation = `${formatPrice(low)} - (${formatPrice(range)} × ${(ratio - 1).toFixed(3)})`;
      } else {
        // Extension above high (target for longs closing / reversal)
        price = high + range * (ratio - 1);
        calculation = `${formatPrice(high)} + (${formatPrice(range)} × ${(ratio - 1).toFixed(3)})`;
      }
    } else {
      // expansion
      if (direction === "buy") {
        // Upward expansion from low
        price = low + range * ratio;
        calculation = `${formatPrice(low)} + (${formatPrice(range)} × ${ratio})`;
      } else {
        // Downward expansion from high
        price = high - range * ratio;
        calculation = `${formatPrice(high)} - (${formatPrice(range)} × ${ratio})`;
      }
    }

    return { ratio, price, calculation };
  });
}

type DirectionSectionProps = {
  direction: Direction;
  levels: CalculatedLevel[];
  formula: string;
  typeColor: string;
  isExpanded: boolean;
  isMinimized: boolean;
  onToggleMinimized: () => void;
};

function DirectionSection({
  direction,
  levels,
  formula,
  typeColor,
  isExpanded,
  isMinimized,
  onToggleMinimized,
}: DirectionSectionProps) {
  const directionColor = direction === "buy" ? "text-green-400" : "text-red-400";
  const directionBg = direction === "buy" ? "bg-green-500/10" : "bg-red-500/10";
  const directionLabel = direction === "buy" ? "BUY (Uptrend)" : "SELL (Downtrend)";

  return (
    <div className={`rounded-lg border ${isMinimized ? "border-dashed opacity-60" : ""}`}>
      <button
        onClick={onToggleMinimized}
        className={`w-full flex items-center justify-between p-2 ${directionBg} rounded-t-lg hover:opacity-80 transition-opacity`}
      >
        <span className={`text-sm font-medium ${directionColor}`}>
          {directionLabel}
        </span>
        <span className="text-xs text-muted-foreground">
          {isMinimized ? "Click to expand" : "Click to minimize"}
        </span>
      </button>

      {!isMinimized && (
        <div className="p-2 space-y-2">
          {isExpanded && (
            <div className="text-xs text-muted-foreground">
              <code className="bg-muted px-1 rounded">{formula}</code>
            </div>
          )}

          {isExpanded ? (
            // Expanded view: Ratio → Calculation → Price
            <>
              <div className="flex text-xs text-muted-foreground font-medium pb-1 border-b">
                <span className="w-14">Ratio</span>
                <span className="flex-1 pl-2">Calculation</span>
                <span className="w-24 text-right text-blue-400">= Price</span>
              </div>
              {levels.map(({ ratio, price, calculation }) => (
                <div
                  key={`${direction}-${ratio}`}
                  className="flex text-sm py-1 hover:bg-muted/50 rounded items-baseline"
                >
                  <span className={`w-14 font-medium ${typeColor}`}>
                    {(ratio * 100).toFixed(1)}%
                  </span>
                  <span className="flex-1 pl-2 text-xs text-muted-foreground font-mono">
                    {calculation}
                  </span>
                  <span className="w-24 text-right font-mono font-medium text-blue-400">
                    = {formatPrice(price)}
                  </span>
                </div>
              ))}
            </>
          ) : (
            // Collapsed view: just ratio and price
            <>
              <div className="flex text-xs text-muted-foreground font-medium pb-1 border-b">
                <span className="w-14">Ratio</span>
                <span className="flex-1 text-right text-blue-400">Price</span>
              </div>
              {levels.map(({ ratio, price }) => (
                <div
                  key={`${direction}-${ratio}`}
                  className="flex text-sm py-0.5 hover:bg-muted/50 rounded"
                >
                  <span className={`w-14 font-medium ${typeColor}`}>
                    {(ratio * 100).toFixed(1)}%
                  </span>
                  <span className="flex-1 text-right font-mono text-blue-400">
                    {formatPrice(price)}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function FibonacciCalculationPanel({
  type,
  config,
  autoDetectedPivots,
  onConfigChange,
  expanded = false,
  primaryDirection = "buy",
}: FibonacciCalculationPanelProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [showExtended, setShowExtended] = useState(false);
  const [buyMinimized, setBuyMinimized] = useState(primaryDirection === "sell");
  const [sellMinimized, setSellMinimized] = useState(primaryDirection === "buy");
  const typeConfig = TYPE_CONFIG[type];

  const activePivots = config.useAutoDetect ? autoDetectedPivots : config.pivots;
  const { high, low, pointA, pointB, pointC } = activePivots;
  const range = high - low;

  // Get ratios based on whether extended is enabled
  const ratios = showExtended
    ? [...typeConfig.backendRatios, ...typeConfig.extendedRatios].sort((a, b) => a - b)
    : typeConfig.backendRatios;

  // Calculate levels for both directions
  const buyLevels = calculateLevelsForDirection(type, high, low, "buy", ratios, pointA, pointB, pointC);
  const sellLevels = calculateLevelsForDirection(type, high, low, "sell", ratios, pointA, pointB, pointC);

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
          <div className="flex items-center gap-1">
            <Button
              variant={showExtended ? "default" : "outline"}
              size="sm"
              onClick={() => setShowExtended(!showExtended)}
              className="text-xs h-7"
            >
              {showExtended ? "All Ratios" : "+ More"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{typeConfig.description}</p>
      </CardHeader>

      <CardContent className="space-y-3">
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

        {/* BUY Direction Section */}
        <DirectionSection
          direction="buy"
          levels={buyLevels}
          formula={typeConfig.buyFormula}
          typeColor={typeConfig.color}
          isExpanded={isExpanded}
          isMinimized={buyMinimized}
          onToggleMinimized={() => setBuyMinimized(!buyMinimized)}
        />

        {/* SELL Direction Section */}
        <DirectionSection
          direction="sell"
          levels={sellLevels}
          formula={typeConfig.sellFormula}
          typeColor={typeConfig.color}
          isExpanded={isExpanded}
          isMinimized={sellMinimized}
          onToggleMinimized={() => setSellMinimized(!sellMinimized)}
        />
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
  primaryDirection?: Direction;
};

export function FibonacciCalculationsPanel({
  configs,
  autoDetectedPivots,
  onConfigsChange,
  primaryDirection = "buy",
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
          Each type uses independent pivot points • Both directions shown
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {configs.retracement.enabled && (
          <FibonacciCalculationPanel
            type="retracement"
            config={configs.retracement}
            autoDetectedPivots={autoDetectedPivots}
            onConfigChange={(c) => handleConfigChange("retracement", c)}
            primaryDirection={primaryDirection}
          />
        )}

        {configs.extension.enabled && (
          <FibonacciCalculationPanel
            type="extension"
            config={configs.extension}
            autoDetectedPivots={autoDetectedPivots}
            onConfigChange={(c) => handleConfigChange("extension", c)}
            primaryDirection={primaryDirection}
          />
        )}

        {configs.expansion.enabled && (
          <FibonacciCalculationPanel
            type="expansion"
            config={configs.expansion}
            autoDetectedPivots={autoDetectedPivots}
            onConfigChange={(c) => handleConfigChange("expansion", c)}
            primaryDirection={primaryDirection}
          />
        )}

        {configs.projection.enabled && (
          <FibonacciCalculationPanel
            type="projection"
            config={configs.projection}
            autoDetectedPivots={projectionPivots}
            onConfigChange={(c) => handleConfigChange("projection", c)}
            primaryDirection={primaryDirection}
          />
        )}
      </div>
    </div>
  );
}
