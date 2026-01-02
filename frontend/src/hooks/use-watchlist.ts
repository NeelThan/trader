/**
 * Watchlist Hook
 *
 * Manages watchlist of symbols and scans for opportunities across all symbols.
 * Provides aggregated view of opportunities with filtering and sorting.
 */

import { useState, useCallback, useMemo } from "react";
import type { MarketSymbol } from "@/lib/chart-constants";
import { MARKET_CONFIG } from "@/lib/chart-constants";
import { useWorkflowV2Storage } from "./use-workflow-v2-storage";
import { useTradeDiscovery, type TradeOpportunity } from "./use-trade-discovery";

/**
 * Filter options for opportunities
 */
export type OpportunityFilter = {
  direction?: "long" | "short";
  minConfidence?: number;
  symbols?: MarketSymbol[];
};

/**
 * Summary statistics for watchlist opportunities
 */
export type WatchlistSummary = {
  totalOpportunities: number;
  bySymbol: Partial<Record<MarketSymbol, number>>;
  longCount: number;
  shortCount: number;
  bestOpportunity: TradeOpportunity | null;
};

export type UseWatchlistResult = {
  /** Current watchlist */
  watchlist: MarketSymbol[];
  /** Symbols not in watchlist */
  availableSymbols: MarketSymbol[];
  /** Add symbol to watchlist */
  addSymbol: (symbol: MarketSymbol) => void;
  /** Remove symbol from watchlist */
  removeSymbol: (symbol: MarketSymbol) => void;
  /** Set entire watchlist */
  setWatchlist: (symbols: MarketSymbol[]) => void;

  /** All opportunities from all watchlist symbols */
  allOpportunities: TradeOpportunity[];
  /** Filtered opportunities */
  filteredOpportunities: TradeOpportunity[];
  /** Opportunities for active symbol only */
  activeOpportunities: TradeOpportunity[];

  /** Currently active/selected symbol */
  activeSymbol: MarketSymbol;
  /** Set active symbol */
  setActiveSymbol: (symbol: MarketSymbol) => void;

  /** Current filter */
  filter: OpportunityFilter;
  /** Set filter */
  setFilter: (filter: OpportunityFilter) => void;
  /** Clear all filters */
  clearFilter: () => void;

  /** Summary statistics */
  summary: WatchlistSummary;

  /** Loading states */
  isLoading: boolean;
  loadingSymbols: MarketSymbol[];

  /** Refresh all symbols */
  refresh: () => void;
  /** Last refresh timestamp */
  lastRefresh: Date | null;
};

/**
 * All available market symbols
 */
const ALL_SYMBOLS: MarketSymbol[] = Object.keys(MARKET_CONFIG) as MarketSymbol[];

/**
 * Hook to manage watchlist and scan for opportunities
 */
export function useWatchlist(): UseWatchlistResult {
  const storage = useWorkflowV2Storage();
  const watchlist = storage.storage.watchlist;

  const [activeSymbol, setActiveSymbol] = useState<MarketSymbol>(
    watchlist[0] || "DJI"
  );
  const [filter, setFilter] = useState<OpportunityFilter>({});
  const [lastRefresh, setLastRefresh] = useState<Date | null>(new Date());

  // Get discoveries for each symbol in watchlist
  const dji = useTradeDiscovery({ symbol: "DJI" });
  const spx = useTradeDiscovery({ symbol: "SPX" });
  const ndx = useTradeDiscovery({ symbol: "NDX" });
  const btcusd = useTradeDiscovery({ symbol: "BTCUSD" });
  const eurusd = useTradeDiscovery({ symbol: "EURUSD" });
  const gold = useTradeDiscovery({ symbol: "GOLD" });

  // Map symbol to discovery result - memoized for stable reference
  const discoveryMap = useMemo(
    (): Record<MarketSymbol, ReturnType<typeof useTradeDiscovery>> => ({
      DJI: dji,
      SPX: spx,
      NDX: ndx,
      BTCUSD: btcusd,
      EURUSD: eurusd,
      GOLD: gold,
    }),
    [dji, spx, ndx, btcusd, eurusd, gold]
  );

  // Available symbols (not in watchlist)
  const availableSymbols = useMemo(() => {
    return ALL_SYMBOLS.filter((s) => !watchlist.includes(s));
  }, [watchlist]);

  // Aggregate opportunities from all watchlist symbols
  const allOpportunities = useMemo(() => {
    const opps: TradeOpportunity[] = [];

    for (const symbol of watchlist) {
      const discovery = discoveryMap[symbol];
      if (discovery?.opportunities) {
        opps.push(...discovery.opportunities);
      }
    }

    // Sort by confidence descending
    return opps.sort((a, b) => b.confidence - a.confidence);
  }, [watchlist, discoveryMap]);

  // Filter opportunities
  const filteredOpportunities = useMemo(() => {
    let result = [...allOpportunities];

    if (filter.direction) {
      result = result.filter((o) => o.direction === filter.direction);
    }

    if (filter.minConfidence !== undefined) {
      result = result.filter((o) => o.confidence >= filter.minConfidence!);
    }

    if (filter.symbols && filter.symbols.length > 0) {
      result = result.filter((o) => filter.symbols!.includes(o.symbol as MarketSymbol));
    }

    return result;
  }, [allOpportunities, filter]);

  // Opportunities for active symbol
  const activeOpportunities = useMemo(() => {
    return allOpportunities.filter((o) => o.symbol === activeSymbol);
  }, [allOpportunities, activeSymbol]);

  // Summary statistics
  const summary = useMemo((): WatchlistSummary => {
    const bySymbol: Partial<Record<MarketSymbol, number>> = {};
    let longCount = 0;
    let shortCount = 0;

    for (const opp of allOpportunities) {
      const symbol = opp.symbol as MarketSymbol;
      bySymbol[symbol] = (bySymbol[symbol] || 0) + 1;

      if (opp.direction === "long") {
        longCount++;
      } else {
        shortCount++;
      }
    }

    return {
      totalOpportunities: allOpportunities.length,
      bySymbol,
      longCount,
      shortCount,
      bestOpportunity: allOpportunities[0] || null,
    };
  }, [allOpportunities]);

  // Loading state
  const loadingSymbols = useMemo(() => {
    return watchlist.filter((s) => discoveryMap[s]?.isLoading);
  }, [watchlist, discoveryMap]);

  const isLoading = loadingSymbols.length > 0;

  // Watchlist management
  const addSymbol = useCallback(
    (symbol: MarketSymbol) => {
      storage.addToWatchlist(symbol);
    },
    [storage]
  );

  const removeSymbol = useCallback(
    (symbol: MarketSymbol) => {
      storage.removeFromWatchlist(symbol);
    },
    [storage]
  );

  const setWatchlistFn = useCallback(
    (symbols: MarketSymbol[]) => {
      storage.setWatchlist(symbols);
    },
    [storage]
  );

  // Clear filter
  const clearFilter = useCallback(() => {
    setFilter({});
  }, []);

  // Refresh
  const refresh = useCallback(() => {
    setLastRefresh(new Date());
    // The useTradeDiscovery hooks will re-fetch based on their own logic
  }, []);

  return {
    watchlist,
    availableSymbols,
    addSymbol,
    removeSymbol,
    setWatchlist: setWatchlistFn,

    allOpportunities,
    filteredOpportunities,
    activeOpportunities,

    activeSymbol,
    setActiveSymbol,

    filter,
    setFilter,
    clearFilter,

    summary,

    isLoading,
    loadingSymbols,

    refresh,
    lastRefresh,
  };
}
