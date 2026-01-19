/**
 * Reducer for WorkflowV2Layout state management
 *
 * Consolidates all UI toggle states and chart settings into a single reducer
 * for cleaner state management and easier debugging.
 */

import type { ChartType } from "@/components/trading";

// =============================================================================
// State Types
// =============================================================================

export type PanelVisibility = {
  /** Mobile sidebar visibility */
  sidebar: boolean;
  /** RSI/MACD indicators panel */
  indicators: boolean;
  /** HH/HL/LH/LL swing markers (settings now in SwingSettingsPopover) */
  swingMarkers: boolean;
  /** Fibonacci price levels */
  fibLevels: boolean;
  /** Pivot points editor */
  pivotEditor: boolean;
  /** Trade-specific filtered view */
  tradeView: boolean;
  /** Trend alignment panel */
  trendPanel: boolean;
  /** Confluence zones panel */
  confluenceZones: boolean;
  /** Levels table panel */
  levelsTable: boolean;
  /** Chart expanded to full width */
  chartExpanded: boolean;
  /** Psychological (round number) levels */
  psychologicalLevels: boolean;
  /** Volume bars below price chart */
  volumePane: boolean;
};

export type ChartDisplaySettings = {
  /** Chart rendering type */
  chartType: ChartType;
  /** Show Fib level labels on chart */
  fibLabels: boolean;
  /** Show Fib level lines on chart */
  fibLines: boolean;
  /** Confluence zone tolerance percentage */
  confluenceTolerance: number;
};

export type WorkflowLayoutState = {
  panels: PanelVisibility;
  chart: ChartDisplaySettings;
  /** Current crosshair price (null when not hovering) */
  crosshairPrice: number | null;
  /** Set of hidden confluence zone IDs */
  hiddenZones: Set<string>;
  /** Visibility config has been initialized */
  visibilityInitialized: boolean;
};

// =============================================================================
// Initial State
// =============================================================================

export const initialLayoutState: WorkflowLayoutState = {
  panels: {
    sidebar: false,
    indicators: false,
    swingMarkers: true,
    fibLevels: true,
    pivotEditor: false,
    tradeView: false,
    trendPanel: false,
    confluenceZones: false,
    levelsTable: false,
    chartExpanded: false,
    psychologicalLevels: false,
    volumePane: false,
  },
  chart: {
    chartType: "bar",
    fibLabels: true,
    fibLines: true,
    confluenceTolerance: 0.2,
  },
  crosshairPrice: null,
  hiddenZones: new Set(),
  visibilityInitialized: false,
};

// =============================================================================
// Action Types
// =============================================================================

export type LayoutAction =
  // Panel toggles
  | { type: "TOGGLE_PANEL"; panel: keyof PanelVisibility }
  | { type: "SET_PANEL"; panel: keyof PanelVisibility; visible: boolean }
  | { type: "CLOSE_ALL_PANELS" }
  // Chart settings
  | { type: "SET_CHART_TYPE"; chartType: ChartType }
  | { type: "TOGGLE_FIB_LABELS" }
  | { type: "TOGGLE_FIB_LINES" }
  | { type: "SET_CONFLUENCE_TOLERANCE"; tolerance: number }
  // Crosshair
  | { type: "SET_CROSSHAIR_PRICE"; price: number | null }
  // Hidden zones
  | { type: "TOGGLE_ZONE_VISIBILITY"; zoneId: string }
  | { type: "SHOW_ALL_ZONES" }
  // Initialization
  | { type: "SET_VISIBILITY_INITIALIZED" }
  // Reset trade view (when opportunity changes)
  | { type: "RESET_TRADE_VIEW" };

// =============================================================================
// Reducer
// =============================================================================

export function layoutReducer(
  state: WorkflowLayoutState,
  action: LayoutAction
): WorkflowLayoutState {
  switch (action.type) {
    // Panel toggles
    case "TOGGLE_PANEL":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panel]: !state.panels[action.panel],
        },
      };

    case "SET_PANEL":
      return {
        ...state,
        panels: {
          ...state.panels,
          [action.panel]: action.visible,
        },
      };

    case "CLOSE_ALL_PANELS":
      return {
        ...state,
        panels: {
          ...state.panels,
          indicators: false,
          pivotEditor: false,
          trendPanel: false,
          confluenceZones: false,
          levelsTable: false,
        },
      };

    // Chart settings
    case "SET_CHART_TYPE":
      return {
        ...state,
        chart: {
          ...state.chart,
          chartType: action.chartType,
        },
      };

    case "TOGGLE_FIB_LABELS":
      return {
        ...state,
        chart: {
          ...state.chart,
          fibLabels: !state.chart.fibLabels,
        },
      };

    case "TOGGLE_FIB_LINES":
      return {
        ...state,
        chart: {
          ...state.chart,
          fibLines: !state.chart.fibLines,
        },
      };

    case "SET_CONFLUENCE_TOLERANCE":
      return {
        ...state,
        chart: {
          ...state.chart,
          confluenceTolerance: action.tolerance,
        },
      };

    // Crosshair
    case "SET_CROSSHAIR_PRICE":
      return {
        ...state,
        crosshairPrice: action.price,
      };

    // Hidden zones
    case "TOGGLE_ZONE_VISIBILITY": {
      const newHiddenZones = new Set(state.hiddenZones);
      if (newHiddenZones.has(action.zoneId)) {
        newHiddenZones.delete(action.zoneId);
      } else {
        newHiddenZones.add(action.zoneId);
      }
      return {
        ...state,
        hiddenZones: newHiddenZones,
      };
    }

    case "SHOW_ALL_ZONES":
      return {
        ...state,
        hiddenZones: new Set(),
      };

    // Initialization
    case "SET_VISIBILITY_INITIALIZED":
      return {
        ...state,
        visibilityInitialized: true,
      };

    // Reset trade view
    case "RESET_TRADE_VIEW":
      return {
        ...state,
        panels: {
          ...state.panels,
          tradeView: false,
        },
      };

    default:
      return state;
  }
}

// =============================================================================
// Action Creators (for convenience)
// =============================================================================

export const layoutActions = {
  togglePanel: (panel: keyof PanelVisibility): LayoutAction => ({
    type: "TOGGLE_PANEL",
    panel,
  }),

  setPanel: (panel: keyof PanelVisibility, visible: boolean): LayoutAction => ({
    type: "SET_PANEL",
    panel,
    visible,
  }),

  setChartType: (chartType: ChartType): LayoutAction => ({
    type: "SET_CHART_TYPE",
    chartType,
  }),

  setConfluenceTolerance: (tolerance: number): LayoutAction => ({
    type: "SET_CONFLUENCE_TOLERANCE",
    tolerance,
  }),

  setCrosshairPrice: (price: number | null): LayoutAction => ({
    type: "SET_CROSSHAIR_PRICE",
    price,
  }),

  toggleZoneVisibility: (zoneId: string): LayoutAction => ({
    type: "TOGGLE_ZONE_VISIBILITY",
    zoneId,
  }),

  showAllZones: (): LayoutAction => ({
    type: "SHOW_ALL_ZONES",
  }),

  resetTradeView: (): LayoutAction => ({
    type: "RESET_TRADE_VIEW",
  }),
};

// =============================================================================
// Selectors (for computed values)
// =============================================================================

export const layoutSelectors = {
  /** Check if any analysis panel is open */
  hasOpenAnalysisPanel: (state: WorkflowLayoutState): boolean => {
    const { panels } = state;
    return (
      panels.indicators ||
      panels.pivotEditor ||
      panels.trendPanel ||
      panels.confluenceZones ||
      panels.levelsTable
    );
  },

  /** Get count of open panels */
  openPanelCount: (state: WorkflowLayoutState): number => {
    const { panels } = state;
    return [
      panels.indicators,
      panels.pivotEditor,
      panels.trendPanel,
      panels.confluenceZones,
      panels.levelsTable,
    ].filter(Boolean).length;
  },
};
