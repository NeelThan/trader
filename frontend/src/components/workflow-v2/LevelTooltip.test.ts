/**
 * Tests for LevelTooltip and Confluence Zone calculations
 */

import { describe, it, expect } from "vitest";
import {
  calculateConfluenceZones,
  getConfluenceLabel,
  getConfluenceColor,
  type ConfluenceZone,
} from "./LevelTooltip";
import type { StrategyLevel } from "@/lib/chart-pro/strategy-types";

/**
 * Helper to create test levels
 */
function createLevel(
  price: number,
  direction: "long" | "short" = "long",
  timeframe: "1D" | "4H" | "1H" | "15m" | "1m" | "1W" | "1M" = "1D"
): StrategyLevel {
  return {
    id: `level-${price}`,
    price,
    direction,
    timeframe,
    strategy: "RETRACEMENT",
    type: "retracement",
    ratio: 0.618,
    label: "R61.8%",
    visible: true,
    heat: 50,
  };
}

describe("calculateConfluenceZones", () => {
  describe("basic functionality", () => {
    it("returns empty array for empty levels", () => {
      const zones = calculateConfluenceZones([]);
      expect(zones).toEqual([]);
    });

    it("returns empty array for single level (need 2+ for zone)", () => {
      const zones = calculateConfluenceZones([createLevel(100)]);
      expect(zones).toEqual([]);
    });

    it("creates zone when two levels are within tolerance", () => {
      const levels = [createLevel(100), createLevel(100.4)];
      const zones = calculateConfluenceZones(levels, 0.5); // 0.5% of 100 = 0.5
      expect(zones).toHaveLength(1);
      expect(zones[0].levelCount).toBe(2);
    });

    it("does not create zone when levels exceed tolerance", () => {
      const levels = [createLevel(100), createLevel(101)];
      const zones = calculateConfluenceZones(levels, 0.5); // 0.5% of 100 = 0.5
      expect(zones).toHaveLength(0);
    });
  });

  describe("tight tolerance (0.02% - new minimum)", () => {
    it("clusters very close levels at 0.02% tolerance", () => {
      // At 100, 0.02% = 0.02 difference allowed
      const levels = [
        createLevel(100.0),
        createLevel(100.015), // Within 0.02
        createLevel(100.019), // Within 0.02 of previous
      ];
      const zones = calculateConfluenceZones(levels, 0.02);
      expect(zones).toHaveLength(1);
      expect(zones[0].levelCount).toBe(3);
    });

    it("separates levels that exceed 0.02% tolerance", () => {
      const levels = [
        createLevel(100.0),
        createLevel(100.03), // 0.03% > 0.02%, too far
      ];
      const zones = calculateConfluenceZones(levels, 0.02);
      expect(zones).toHaveLength(0);
    });

    it("creates multiple zones with tight tolerance", () => {
      const levels = [
        // Zone 1
        createLevel(100.0),
        createLevel(100.01),
        // Gap
        createLevel(105.0),
        createLevel(105.01),
      ];
      const zones = calculateConfluenceZones(levels, 0.02);
      expect(zones).toHaveLength(2);
      expect(zones[0].levelCount).toBe(2);
      expect(zones[1].levelCount).toBe(2);
    });
  });

  describe("medium tolerance (0.2% - default)", () => {
    it("clusters levels at 0.2% tolerance", () => {
      // At 100, 0.2% = 0.2 difference allowed
      const levels = [
        createLevel(100.0),
        createLevel(100.15),
        createLevel(100.18),
      ];
      const zones = calculateConfluenceZones(levels, 0.2);
      expect(zones).toHaveLength(1);
      expect(zones[0].levelCount).toBe(3);
    });
  });

  describe("maximum tolerance (0.5%)", () => {
    it("clusters more levels at 0.5% tolerance", () => {
      // At 100, 0.5% = 0.5 difference allowed
      const levels = [
        createLevel(100.0),
        createLevel(100.3),
        createLevel(100.45),
      ];
      const zones = calculateConfluenceZones(levels, 0.5);
      expect(zones).toHaveLength(1);
      expect(zones[0].levelCount).toBe(3);
    });
  });

  describe("zone properties", () => {
    it("calculates correct zone bounds", () => {
      const levels = [createLevel(100), createLevel(100.2), createLevel(100.4)];
      const zones = calculateConfluenceZones(levels, 0.5);

      expect(zones[0].lowPrice).toBe(100);
      expect(zones[0].highPrice).toBe(100.4);
      expect(zones[0].centerPrice).toBe(100.2);
    });

    it("determines long direction when more long levels", () => {
      const levels = [
        createLevel(100, "long"),
        createLevel(100.1, "long"),
        createLevel(100.2, "short"),
      ];
      const zones = calculateConfluenceZones(levels, 0.5);
      expect(zones[0].direction).toBe("long");
    });

    it("determines short direction when more short levels", () => {
      const levels = [
        createLevel(100, "short"),
        createLevel(100.1, "short"),
        createLevel(100.2, "long"),
      ];
      const zones = calculateConfluenceZones(levels, 0.5);
      expect(zones[0].direction).toBe("short");
    });

    it("determines neutral direction when equal", () => {
      const levels = [createLevel(100, "long"), createLevel(100.1, "short")];
      const zones = calculateConfluenceZones(levels, 0.5);
      expect(zones[0].direction).toBe("neutral");
    });

    it("calculates strength based on level count", () => {
      // 2 levels = 40%, 3 = 60%, 4 = 80%, 5+ = 100%
      const twoLevels = [createLevel(100), createLevel(100.1)];
      expect(calculateConfluenceZones(twoLevels, 0.5)[0].strength).toBe(40);

      const threeLevels = [
        createLevel(100),
        createLevel(100.1),
        createLevel(100.2),
      ];
      expect(calculateConfluenceZones(threeLevels, 0.5)[0].strength).toBe(60);

      const fourLevels = [
        createLevel(100),
        createLevel(100.1),
        createLevel(100.2),
        createLevel(100.3),
      ];
      expect(calculateConfluenceZones(fourLevels, 0.5)[0].strength).toBe(80);

      const fiveLevels = [
        createLevel(100),
        createLevel(100.1),
        createLevel(100.2),
        createLevel(100.3),
        createLevel(100.4),
      ];
      expect(calculateConfluenceZones(fiveLevels, 0.5)[0].strength).toBe(100);
    });
  });

  describe("real-world scenarios", () => {
    it("handles DJI-like prices with tight tolerance", () => {
      // DJI around 42000 - 0.02% = 8.4 points
      const levels = [
        createLevel(42000),
        createLevel(42005), // Within 8.4
        createLevel(42008), // Within 8.4 of previous
      ];
      const zones = calculateConfluenceZones(levels, 0.02);
      expect(zones).toHaveLength(1);
      expect(zones[0].levelCount).toBe(3);
    });

    it("handles crypto-like prices with tight tolerance", () => {
      // BTC around 45000 - 0.02% = 9 points
      const levels = [
        createLevel(45000),
        createLevel(45007),
        createLevel(45015), // Just over 0.02% from 45007
      ];
      const zones = calculateConfluenceZones(levels, 0.02);
      // 45007 is within 0.02% of 45000
      // 45015 is ~0.018% from 45007, within tolerance
      expect(zones).toHaveLength(1);
    });

    it("separates distinct Fib clusters", () => {
      // Two distinct Fib areas
      const levels = [
        // 38.2% area
        createLevel(41800, "long"),
        createLevel(41810, "long"),
        // 61.8% area (far from above)
        createLevel(42500, "long"),
        createLevel(42520, "long"),
      ];
      const zones = calculateConfluenceZones(levels, 0.1);
      expect(zones).toHaveLength(2);
    });
  });
});

// ===========================================================================
// Confluence Display Helpers
// ===========================================================================

describe("getConfluenceLabel", () => {
  it("returns 'Standard' for heat 0-20", () => {
    expect(getConfluenceLabel(0)).toBe("Standard");
    expect(getConfluenceLabel(15)).toBe("Standard");
    expect(getConfluenceLabel(20)).toBe("Standard");
  });

  it("returns 'Important' for heat 21-40", () => {
    expect(getConfluenceLabel(21)).toBe("Important");
    expect(getConfluenceLabel(35)).toBe("Important");
    expect(getConfluenceLabel(40)).toBe("Important");
  });

  it("returns 'Significant' for heat 41-60", () => {
    expect(getConfluenceLabel(41)).toBe("Significant");
    expect(getConfluenceLabel(50)).toBe("Significant");
    expect(getConfluenceLabel(60)).toBe("Significant");
  });

  it("returns 'Major' for heat 61-80", () => {
    expect(getConfluenceLabel(61)).toBe("Major");
    expect(getConfluenceLabel(70)).toBe("Major");
    expect(getConfluenceLabel(80)).toBe("Major");
  });

  it("returns 'Critical' for heat 81+", () => {
    expect(getConfluenceLabel(81)).toBe("Critical");
    expect(getConfluenceLabel(90)).toBe("Critical");
    expect(getConfluenceLabel(100)).toBe("Critical");
  });
});

describe("getConfluenceColor", () => {
  it("returns gray for Standard (0-20)", () => {
    expect(getConfluenceColor(15)).toBe("#9ca3af");
  });

  it("returns blue for Important (21-40)", () => {
    expect(getConfluenceColor(35)).toBe("#3b82f6");
  });

  it("returns yellow for Significant (41-60)", () => {
    expect(getConfluenceColor(50)).toBe("#eab308");
  });

  it("returns orange for Major (61-80)", () => {
    expect(getConfluenceColor(70)).toBe("#f97316");
  });

  it("returns red for Critical (81+)", () => {
    expect(getConfluenceColor(90)).toBe("#ef4444");
  });
});
