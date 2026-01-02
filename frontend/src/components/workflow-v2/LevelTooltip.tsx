"use client";

/**
 * LevelTooltip - Shows Fibonacci level details on hover/crosshair
 *
 * Displays level information when the crosshair price is near a level.
 * Shows: timeframe, strategy, ratio, direction, price, confluence info.
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { StrategyLevel } from "@/lib/chart-pro/strategy-types";
import { TIMEFRAME_COLORS, DIRECTION_COLORS } from "@/lib/chart-pro/strategy-types";

type LevelTooltipProps = {
  /** Current crosshair price */
  crosshairPrice: number | null;
  /** All visible levels */
  levels: StrategyLevel[];
  /** Tolerance percentage for matching (default 0.3%) */
  tolerance?: number;
  /** Format price for display */
  formatPrice?: (price: number) => string;
};

/**
 * Find levels near the crosshair price
 */
function findNearbyLevels(
  price: number,
  levels: StrategyLevel[],
  tolerancePercent: number
): StrategyLevel[] {
  const tolerance = price * (tolerancePercent / 100);
  return levels.filter((level) => Math.abs(level.price - price) <= tolerance);
}

/**
 * Get strategy display name
 */
function getStrategyName(strategy: string): string {
  const names: Record<string, string> = {
    RETRACEMENT: "Retracement",
    EXTENSION: "Extension",
    PROJECTION: "Projection",
    EXPANSION: "Expansion",
  };
  return names[strategy] || strategy;
}

export function LevelTooltip({
  crosshairPrice,
  levels,
  tolerance = 0.3,
  formatPrice = (p) => p.toFixed(2),
}: LevelTooltipProps) {
  const nearbyLevels = useMemo(() => {
    if (!crosshairPrice || levels.length === 0) return [];
    return findNearbyLevels(crosshairPrice, levels, tolerance);
  }, [crosshairPrice, levels, tolerance]);

  if (nearbyLevels.length === 0) return null;

  return (
    <div className="absolute top-2 left-2 z-50 pointer-events-none">
      <div className="bg-card/95 backdrop-blur-sm border rounded-lg shadow-lg p-2 space-y-1.5 max-w-xs">
        <div className="text-xs text-muted-foreground">
          {nearbyLevels.length === 1 ? "Level" : `${nearbyLevels.length} Levels`} at crosshair
        </div>
        {nearbyLevels.slice(0, 5).map((level, idx) => (
          <div
            key={`${level.id}-${idx}`}
            className="flex items-center gap-2 text-xs"
          >
            {/* Timeframe badge */}
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 h-4"
              style={{
                borderColor: TIMEFRAME_COLORS[level.timeframe] || "#888",
                color: TIMEFRAME_COLORS[level.timeframe] || "#888",
              }}
            >
              {level.timeframe}
            </Badge>

            {/* Strategy */}
            <span className="text-muted-foreground">
              {getStrategyName(level.strategy)}
            </span>

            {/* Ratio */}
            <span className="font-medium">{level.label}</span>

            {/* Direction */}
            <span
              className="text-[10px] uppercase"
              style={{
                color:
                  level.direction === "long"
                    ? DIRECTION_COLORS.long
                    : DIRECTION_COLORS.short,
              }}
            >
              {level.direction}
            </span>

            {/* Price */}
            <span className="ml-auto font-mono text-muted-foreground">
              {formatPrice(level.price)}
            </span>
          </div>
        ))}
        {nearbyLevels.length > 5 && (
          <div className="text-[10px] text-muted-foreground">
            +{nearbyLevels.length - 5} more levels
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Confluence Zone - represents a cluster of nearby levels
 */
export type ConfluenceZone = {
  /** Zone ID */
  id: string;
  /** Low price of zone */
  lowPrice: number;
  /** High price of zone */
  highPrice: number;
  /** Center price */
  centerPrice: number;
  /** Number of levels in this zone */
  levelCount: number;
  /** Direction bias (more longs or shorts) */
  direction: "long" | "short" | "neutral";
  /** Strength based on level count (0-100) */
  strength: number;
  /** Levels in this zone */
  levels: StrategyLevel[];
};

/**
 * Calculate confluence zones from levels
 */
export function calculateConfluenceZones(
  levels: StrategyLevel[],
  tolerancePercent: number = 0.5
): ConfluenceZone[] {
  if (levels.length === 0) return [];

  // Sort levels by price
  const sorted = [...levels].sort((a, b) => a.price - b.price);

  const zones: ConfluenceZone[] = [];
  let currentZone: StrategyLevel[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const level = sorted[i];
    const prevLevel = sorted[i - 1];
    const tolerance = prevLevel.price * (tolerancePercent / 100);

    if (level.price - prevLevel.price <= tolerance) {
      // Within tolerance, add to current zone
      currentZone.push(level);
    } else {
      // New zone starts
      if (currentZone.length >= 2) {
        // Only create zone if 2+ levels
        zones.push(createZone(currentZone, zones.length));
      }
      currentZone = [level];
    }
  }

  // Don't forget the last zone
  if (currentZone.length >= 2) {
    zones.push(createZone(currentZone, zones.length));
  }

  return zones;
}

function createZone(levels: StrategyLevel[], index: number): ConfluenceZone {
  const prices = levels.map((l) => l.price);
  const lowPrice = Math.min(...prices);
  const highPrice = Math.max(...prices);
  const centerPrice = (lowPrice + highPrice) / 2;

  const longCount = levels.filter((l) => l.direction === "long").length;
  const shortCount = levels.filter((l) => l.direction === "short").length;

  let direction: "long" | "short" | "neutral";
  if (longCount > shortCount) {
    direction = "long";
  } else if (shortCount > longCount) {
    direction = "short";
  } else {
    direction = "neutral";
  }

  // Strength: more levels = stronger (cap at 100)
  const strength = Math.min(100, levels.length * 20);

  return {
    id: `zone-${index}`,
    lowPrice,
    highPrice,
    centerPrice,
    levelCount: levels.length,
    direction,
    strength,
    levels,
  };
}

/**
 * ConfluenceZoneIndicator - Shows zones in a sidebar panel
 */
type ConfluenceZoneIndicatorProps = {
  zones: ConfluenceZone[];
  formatPrice?: (price: number) => string;
};

export function ConfluenceZoneIndicator({
  zones,
  formatPrice = (p) => p.toFixed(2),
}: ConfluenceZoneIndicatorProps) {
  if (zones.length === 0) return null;

  // Get zone type label
  const getZoneType = (direction: ConfluenceZone["direction"]) => {
    switch (direction) {
      case "long":
        return "Support";
      case "short":
        return "Resistance";
      default:
        return "Neutral";
    }
  };

  // Get zone color
  const getZoneColor = (direction: ConfluenceZone["direction"]) => {
    switch (direction) {
      case "long":
        return DIRECTION_COLORS.long;
      case "short":
        return DIRECTION_COLORS.short;
      default:
        return "#a855f7"; // purple
    }
  };

  return (
    <div className="space-y-2">
      {zones.map((zone, index) => {
        const zoneColor = getZoneColor(zone.direction);
        const zoneType = getZoneType(zone.direction);
        const zoneLabel = `Z${index + 1}`;

        return (
          <div
            key={zone.id}
            className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
            style={{ borderLeft: `3px solid ${zoneColor}` }}
          >
            {/* Zone number badge */}
            <div
              className="flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold"
              style={{ backgroundColor: `${zoneColor}30`, color: zoneColor }}
            >
              {zoneLabel}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: zoneColor }}
                >
                  {zoneType}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  ({zone.levelCount} levels)
                </span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                {formatPrice(zone.lowPrice)} – {formatPrice(zone.highPrice)}
              </div>
            </div>
            {/* Strength indicator */}
            <div className="flex flex-col items-end">
              <div
                className="w-10 h-1.5 rounded-full bg-muted overflow-hidden"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${zone.strength}%`,
                    backgroundColor: zoneColor,
                  }}
                />
              </div>
              <span className="text-[8px] text-muted-foreground mt-0.5">
                {zone.strength}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
