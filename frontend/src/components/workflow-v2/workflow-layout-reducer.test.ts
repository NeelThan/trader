/**
 * Tests for WorkflowV2Layout reducer
 *
 * Tests state management for UI panels, chart settings, and actions.
 */

import { describe, it, expect } from "vitest";
import {
  layoutReducer,
  initialLayoutState,
  layoutActions,
  layoutSelectors,
  type WorkflowLayoutState,
} from "./workflow-layout-reducer";

describe("layoutReducer", () => {
  // ===========================================================================
  // Initial State
  // ===========================================================================

  describe("initial state", () => {
    it("should have correct default panel visibility", () => {
      expect(initialLayoutState.panels.sidebar).toBe(false);
      expect(initialLayoutState.panels.indicators).toBe(false);
      expect(initialLayoutState.panels.swingMarkers).toBe(true);
      expect(initialLayoutState.panels.fibLevels).toBe(true);
      expect(initialLayoutState.panels.pivotEditor).toBe(false);
      expect(initialLayoutState.panels.tradeView).toBe(false);
      expect(initialLayoutState.panels.trendPanel).toBe(false);
      expect(initialLayoutState.panels.confluenceZones).toBe(false);
      expect(initialLayoutState.panels.swingSettings).toBe(false);
      expect(initialLayoutState.panels.levelsTable).toBe(false);
      expect(initialLayoutState.panels.chartExpanded).toBe(false);
    });

    it("should have correct default chart settings", () => {
      expect(initialLayoutState.chart.chartType).toBe("bar");
      expect(initialLayoutState.chart.fibLabels).toBe(true);
      expect(initialLayoutState.chart.fibLines).toBe(true);
      expect(initialLayoutState.chart.confluenceTolerance).toBe(0.2);
    });

    it("should have null crosshair price", () => {
      expect(initialLayoutState.crosshairPrice).toBeNull();
    });

    it("should have empty hidden zones", () => {
      expect(initialLayoutState.hiddenZones.size).toBe(0);
    });
  });

  // ===========================================================================
  // Panel Toggles
  // ===========================================================================

  describe("TOGGLE_PANEL", () => {
    it("should toggle sidebar", () => {
      const state = layoutReducer(initialLayoutState, layoutActions.togglePanel("sidebar"));
      expect(state.panels.sidebar).toBe(true);

      const state2 = layoutReducer(state, layoutActions.togglePanel("sidebar"));
      expect(state2.panels.sidebar).toBe(false);
    });

    it("should toggle indicators", () => {
      const state = layoutReducer(initialLayoutState, layoutActions.togglePanel("indicators"));
      expect(state.panels.indicators).toBe(true);
    });

    it("should toggle swing markers (initially true)", () => {
      const state = layoutReducer(initialLayoutState, layoutActions.togglePanel("swingMarkers"));
      expect(state.panels.swingMarkers).toBe(false);
    });

    it("should toggle multiple panels independently", () => {
      let state = layoutReducer(initialLayoutState, layoutActions.togglePanel("indicators"));
      state = layoutReducer(state, layoutActions.togglePanel("trendPanel"));
      state = layoutReducer(state, layoutActions.togglePanel("confluenceZones"));

      expect(state.panels.indicators).toBe(true);
      expect(state.panels.trendPanel).toBe(true);
      expect(state.panels.confluenceZones).toBe(true);
      expect(state.panels.pivotEditor).toBe(false);
    });
  });

  describe("SET_PANEL", () => {
    it("should set panel to true", () => {
      const state = layoutReducer(
        initialLayoutState,
        layoutActions.setPanel("sidebar", true)
      );
      expect(state.panels.sidebar).toBe(true);
    });

    it("should set panel to false", () => {
      const withSidebar: WorkflowLayoutState = {
        ...initialLayoutState,
        panels: { ...initialLayoutState.panels, sidebar: true },
      };
      const state = layoutReducer(withSidebar, layoutActions.setPanel("sidebar", false));
      expect(state.panels.sidebar).toBe(false);
    });
  });

  describe("CLOSE_ALL_PANELS", () => {
    it("should close all analysis panels", () => {
      const withPanels: WorkflowLayoutState = {
        ...initialLayoutState,
        panels: {
          ...initialLayoutState.panels,
          indicators: true,
          pivotEditor: true,
          trendPanel: true,
          confluenceZones: true,
          swingSettings: true,
          levelsTable: true,
        },
      };

      const state = layoutReducer(withPanels, { type: "CLOSE_ALL_PANELS" });

      expect(state.panels.indicators).toBe(false);
      expect(state.panels.pivotEditor).toBe(false);
      expect(state.panels.trendPanel).toBe(false);
      expect(state.panels.confluenceZones).toBe(false);
      expect(state.panels.swingSettings).toBe(false);
      expect(state.panels.levelsTable).toBe(false);
    });

    it("should not affect sidebar or other panels", () => {
      const withPanels: WorkflowLayoutState = {
        ...initialLayoutState,
        panels: {
          ...initialLayoutState.panels,
          sidebar: true,
          swingMarkers: true,
          fibLevels: true,
          indicators: true,
        },
      };

      const state = layoutReducer(withPanels, { type: "CLOSE_ALL_PANELS" });

      expect(state.panels.sidebar).toBe(true);
      expect(state.panels.swingMarkers).toBe(true);
      expect(state.panels.fibLevels).toBe(true);
    });
  });

  // ===========================================================================
  // Chart Settings
  // ===========================================================================

  describe("SET_CHART_TYPE", () => {
    it("should set chart type to candlestick", () => {
      const state = layoutReducer(
        initialLayoutState,
        layoutActions.setChartType("candlestick")
      );
      expect(state.chart.chartType).toBe("candlestick");
    });

    it("should set chart type to heikin-ashi", () => {
      const state = layoutReducer(
        initialLayoutState,
        layoutActions.setChartType("heikin-ashi")
      );
      expect(state.chart.chartType).toBe("heikin-ashi");
    });

    it("should set chart type to bar", () => {
      const withCandlestick: WorkflowLayoutState = {
        ...initialLayoutState,
        chart: { ...initialLayoutState.chart, chartType: "candlestick" },
      };
      const state = layoutReducer(withCandlestick, layoutActions.setChartType("bar"));
      expect(state.chart.chartType).toBe("bar");
    });
  });

  describe("TOGGLE_FIB_LABELS", () => {
    it("should toggle fib labels", () => {
      const state = layoutReducer(initialLayoutState, { type: "TOGGLE_FIB_LABELS" });
      expect(state.chart.fibLabels).toBe(false);

      const state2 = layoutReducer(state, { type: "TOGGLE_FIB_LABELS" });
      expect(state2.chart.fibLabels).toBe(true);
    });
  });

  describe("TOGGLE_FIB_LINES", () => {
    it("should toggle fib lines", () => {
      const state = layoutReducer(initialLayoutState, { type: "TOGGLE_FIB_LINES" });
      expect(state.chart.fibLines).toBe(false);

      const state2 = layoutReducer(state, { type: "TOGGLE_FIB_LINES" });
      expect(state2.chart.fibLines).toBe(true);
    });
  });

  describe("SET_CONFLUENCE_TOLERANCE", () => {
    it("should set confluence tolerance", () => {
      const state = layoutReducer(
        initialLayoutState,
        layoutActions.setConfluenceTolerance(0.5)
      );
      expect(state.chart.confluenceTolerance).toBe(0.5);
    });

    it("should allow small tolerance values", () => {
      const state = layoutReducer(
        initialLayoutState,
        layoutActions.setConfluenceTolerance(0.02)
      );
      expect(state.chart.confluenceTolerance).toBe(0.02);
    });
  });

  // ===========================================================================
  // Crosshair
  // ===========================================================================

  describe("SET_CROSSHAIR_PRICE", () => {
    it("should set crosshair price", () => {
      const state = layoutReducer(
        initialLayoutState,
        layoutActions.setCrosshairPrice(42100.5)
      );
      expect(state.crosshairPrice).toBe(42100.5);
    });

    it("should set crosshair price to null", () => {
      const withPrice: WorkflowLayoutState = {
        ...initialLayoutState,
        crosshairPrice: 42100.5,
      };
      const state = layoutReducer(withPrice, layoutActions.setCrosshairPrice(null));
      expect(state.crosshairPrice).toBeNull();
    });
  });

  // ===========================================================================
  // Hidden Zones
  // ===========================================================================

  describe("TOGGLE_ZONE_VISIBILITY", () => {
    it("should hide a zone", () => {
      const state = layoutReducer(
        initialLayoutState,
        layoutActions.toggleZoneVisibility("zone-1")
      );
      expect(state.hiddenZones.has("zone-1")).toBe(true);
    });

    it("should show a hidden zone", () => {
      const withHidden: WorkflowLayoutState = {
        ...initialLayoutState,
        hiddenZones: new Set(["zone-1"]),
      };
      const state = layoutReducer(
        withHidden,
        layoutActions.toggleZoneVisibility("zone-1")
      );
      expect(state.hiddenZones.has("zone-1")).toBe(false);
    });

    it("should handle multiple zones", () => {
      let state = layoutReducer(
        initialLayoutState,
        layoutActions.toggleZoneVisibility("zone-1")
      );
      state = layoutReducer(state, layoutActions.toggleZoneVisibility("zone-2"));
      state = layoutReducer(state, layoutActions.toggleZoneVisibility("zone-3"));

      expect(state.hiddenZones.size).toBe(3);
      expect(state.hiddenZones.has("zone-1")).toBe(true);
      expect(state.hiddenZones.has("zone-2")).toBe(true);
      expect(state.hiddenZones.has("zone-3")).toBe(true);
    });
  });

  describe("SHOW_ALL_ZONES", () => {
    it("should clear all hidden zones", () => {
      const withHidden: WorkflowLayoutState = {
        ...initialLayoutState,
        hiddenZones: new Set(["zone-1", "zone-2", "zone-3"]),
      };
      const state = layoutReducer(withHidden, layoutActions.showAllZones());
      expect(state.hiddenZones.size).toBe(0);
    });
  });

  // ===========================================================================
  // Reset Trade View
  // ===========================================================================

  describe("RESET_TRADE_VIEW", () => {
    it("should set trade view to false", () => {
      const withTradeView: WorkflowLayoutState = {
        ...initialLayoutState,
        panels: { ...initialLayoutState.panels, tradeView: true },
      };
      const state = layoutReducer(withTradeView, layoutActions.resetTradeView());
      expect(state.panels.tradeView).toBe(false);
    });
  });

  // ===========================================================================
  // Selectors
  // ===========================================================================

  describe("selectors", () => {
    describe("hasOpenAnalysisPanel", () => {
      it("should return false when no panels open", () => {
        expect(layoutSelectors.hasOpenAnalysisPanel(initialLayoutState)).toBe(false);
      });

      it("should return true when indicators open", () => {
        const state: WorkflowLayoutState = {
          ...initialLayoutState,
          panels: { ...initialLayoutState.panels, indicators: true },
        };
        expect(layoutSelectors.hasOpenAnalysisPanel(state)).toBe(true);
      });

      it("should return true when multiple panels open", () => {
        const state: WorkflowLayoutState = {
          ...initialLayoutState,
          panels: {
            ...initialLayoutState.panels,
            indicators: true,
            trendPanel: true,
          },
        };
        expect(layoutSelectors.hasOpenAnalysisPanel(state)).toBe(true);
      });
    });

    describe("openPanelCount", () => {
      it("should return 0 when no panels open", () => {
        expect(layoutSelectors.openPanelCount(initialLayoutState)).toBe(0);
      });

      it("should return correct count", () => {
        const state: WorkflowLayoutState = {
          ...initialLayoutState,
          panels: {
            ...initialLayoutState.panels,
            indicators: true,
            trendPanel: true,
            confluenceZones: true,
          },
        };
        expect(layoutSelectors.openPanelCount(state)).toBe(3);
      });
    });
  });
});
