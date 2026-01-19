"use client";

/**
 * Centralized Market Data Provider - Single Source of Truth.
 *
 * Provides shared market data across all components with:
 * - Multi-timeframe support via cache key ${symbol}:${timeframe}
 * - Request deduplication (concurrent requests share the same promise)
 * - TTL-based cache expiration using TIMEFRAME_CONFIG.refreshInterval
 * - Backend availability status shared across all subscribers
 */

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { OHLCData } from "@/components/trading";
import {
  Timeframe,
  MarketSymbol,
  MarketStatus,
  TIMEFRAME_CONFIG,
} from "@/lib/chart-constants";
import { generateMarketData } from "@/lib/market-utils";

// Cache key format: "SYMBOL:TIMEFRAME"
type CacheKey = `${MarketSymbol}:${Timeframe}`;

function createCacheKey(symbol: MarketSymbol, timeframe: Timeframe): CacheKey {
  return `${symbol}:${timeframe}`;
}

// Backend API response type
type BackendMarketDataResponse = {
  success: boolean;
  data: Array<{
    time: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  provider: string | null;
  cached: boolean;
  cache_expires_at: string | null;
  rate_limit_remaining: number | null;
  market_status: {
    state: string;
    state_display: string;
    is_open: boolean;
  } | null;
  error: string | null;
};

// Cache entry for each symbol+timeframe pair
export type CacheEntry = {
  data: OHLCData[];
  lastUpdated: Date;
  marketStatus: MarketStatus | null;
  provider: string | null;
  isCached: boolean;
  error: string | null;
};

// Store state
type MarketDataStore = {
  cache: Map<CacheKey, CacheEntry>;
  isBackendUnavailable: boolean;
  pendingRequests: Map<CacheKey, Promise<CacheEntry>>;
};

// Context value type
type MarketDataContextValue = {
  // Get data for a symbol+timeframe (returns cached if available)
  getData: (symbol: MarketSymbol, timeframe: Timeframe) => CacheEntry | null;

  // Fetch data (deduplicates concurrent requests)
  fetchData: (
    symbol: MarketSymbol,
    timeframe: Timeframe,
    forceRefresh?: boolean
  ) => Promise<CacheEntry>;

  // Check if data is stale (past TTL)
  isDataStale: (symbol: MarketSymbol, timeframe: Timeframe) => boolean;

  // Global backend status
  isBackendUnavailable: boolean;

  // Subscribe to store updates
  subscribe: (listener: () => void) => () => void;

  // Get snapshot for useSyncExternalStore
  getSnapshot: () => MarketDataStore;
};

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

// Create initial store state
function createStore(): MarketDataStore {
  return {
    cache: new Map(),
    isBackendUnavailable: false,
    pendingRequests: new Map(),
  };
}

export function MarketDataProvider({ children }: { children: ReactNode }) {
  // Store ref to persist across renders
  const storeRef = useRef<MarketDataStore>(createStore());
  const listenersRef = useRef<Set<() => void>>(new Set());

  // Notify all subscribers of state change
  const emitChange = useCallback(() => {
    listenersRef.current.forEach((listener) => listener());
  }, []);

  // Subscribe to store updates
  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  // Get current snapshot
  const getSnapshot = useCallback(() => {
    return storeRef.current;
  }, []);

  // Get cached data for symbol+timeframe
  const getData = useCallback(
    (symbol: MarketSymbol, timeframe: Timeframe): CacheEntry | null => {
      const key = createCacheKey(symbol, timeframe);
      return storeRef.current.cache.get(key) || null;
    },
    []
  );

  // Check if data is past TTL
  const isDataStale = useCallback(
    (symbol: MarketSymbol, timeframe: Timeframe): boolean => {
      const key = createCacheKey(symbol, timeframe);
      const entry = storeRef.current.cache.get(key);

      if (!entry) return true;

      const ttl = TIMEFRAME_CONFIG[timeframe].refreshInterval * 1000; // Convert to ms
      const age = Date.now() - entry.lastUpdated.getTime();
      return age >= ttl;
    },
    []
  );

  // Fetch data with request deduplication
  const fetchData = useCallback(
    async (
      symbol: MarketSymbol,
      timeframe: Timeframe,
      forceRefresh = false
    ): Promise<CacheEntry> => {
      const key = createCacheKey(symbol, timeframe);
      const store = storeRef.current;

      // Return pending request if already in flight
      const pending = store.pendingRequests.get(key);
      if (pending && !forceRefresh) {
        return pending;
      }

      // Return cached data if still fresh and not forcing refresh
      const cached = store.cache.get(key);
      if (cached && !forceRefresh && !isDataStale(symbol, timeframe)) {
        return Promise.resolve(cached);
      }

      // Create new fetch request
      const fetchPromise = (async (): Promise<CacheEntry> => {
        try {
          const params = new URLSearchParams({
            symbol,
            timeframe,
            periods: String(TIMEFRAME_CONFIG[timeframe].periods),
          });
          if (forceRefresh) {
            params.set("force_refresh", "true");
          }

          const response = await fetch(`/api/trader/market-data?${params}`);
          const result: BackendMarketDataResponse = await response.json();

          if (!response.ok || !result.success) {
            const errorMessage = result.error || "Failed to fetch market data";
            const isBackendUnavailableError =
              response.status === 503 ||
              errorMessage.includes("Backend unavailable") ||
              errorMessage.includes("Could not connect");

            // If backend is unavailable, generate fallback data
            if (isBackendUnavailableError) {
              console.warn("Backend unavailable (proxy error), using simulated data as fallback");
              store.isBackendUnavailable = true;

              // Generate fallback simulated data
              const fallbackData = generateMarketData(
                symbol,
                timeframe,
                TIMEFRAME_CONFIG[timeframe].periods
              );

              const entry: CacheEntry = {
                data: fallbackData,
                lastUpdated: new Date(),
                marketStatus: null,
                provider: "fallback",
                isCached: false,
                error: null, // Clear error since we have fallback data
              };

              store.cache.set(key, entry);
              emitChange();
              return entry;
            }

            // Return error entry but keep old data if available
            const entry: CacheEntry = {
              data: cached?.data || [],
              lastUpdated: new Date(),
              marketStatus: cached?.marketStatus || null,
              provider: cached?.provider || null,
              isCached: false,
              error: errorMessage,
            };

            store.cache.set(key, entry);
            emitChange();
            return entry;
          }

          // Build market status
          let marketStatus: MarketStatus | null = null;
          if (result.market_status) {
            marketStatus = {
              state: result.market_status.state,
              stateDisplay: result.market_status.state_display,
              isOpen: result.market_status.is_open,
              isPreMarket: false,
              isAfterHours: false,
              isClosed: !result.market_status.is_open,
            };
          }

          // Update cache
          const entry: CacheEntry = {
            data: result.data as OHLCData[],
            lastUpdated: new Date(),
            marketStatus,
            provider: result.provider,
            isCached: result.cached,
            error: null,
          };

          store.cache.set(key, entry);

          // Clear backend unavailable flag on success
          if (store.isBackendUnavailable) {
            store.isBackendUnavailable = false;
          }

          emitChange();
          return entry;
        } catch (error) {
          // Check if this is a connection error (backend unavailable)
          const isConnectionError =
            error instanceof TypeError &&
            (error.message.includes("fetch failed") ||
              error.message.includes("Failed to fetch"));

          if (isConnectionError) {
            console.warn("Backend unavailable, using simulated data as fallback");
            store.isBackendUnavailable = true;

            // Generate fallback simulated data
            const fallbackData = generateMarketData(
              symbol,
              timeframe,
              TIMEFRAME_CONFIG[timeframe].periods
            );

            const entry: CacheEntry = {
              data: fallbackData,
              lastUpdated: new Date(),
              marketStatus: null,
              provider: "fallback",
              isCached: false,
              error: null,
            };

            store.cache.set(key, entry);
            emitChange();
            return entry;
          }

          // Other errors
          const errorMessage =
            error instanceof Error ? error.message : "Failed to fetch market data";
          console.error("Market data fetch error:", errorMessage);

          const entry: CacheEntry = {
            data: cached?.data || [],
            lastUpdated: new Date(),
            marketStatus: cached?.marketStatus || null,
            provider: cached?.provider || null,
            isCached: false,
            error: errorMessage,
          };

          store.cache.set(key, entry);
          emitChange();
          return entry;
        } finally {
          // Remove from pending requests
          store.pendingRequests.delete(key);
        }
      })();

      // Store pending request for deduplication
      store.pendingRequests.set(key, fetchPromise);

      return fetchPromise;
    },
    [emitChange, isDataStale]
  );

  const contextValue: MarketDataContextValue = {
    getData,
    fetchData,
    isDataStale,
    isBackendUnavailable: storeRef.current.isBackendUnavailable,
    subscribe,
    getSnapshot,
  };

  return (
    <MarketDataContext.Provider value={contextValue}>
      {children}
    </MarketDataContext.Provider>
  );
}

// Hook to access the context
export function useMarketDataContext(): MarketDataContextValue {
  const context = useContext(MarketDataContext);
  if (!context) {
    throw new Error(
      "useMarketDataContext must be used within a MarketDataProvider"
    );
  }
  return context;
}

// Hook to subscribe to backend availability status
export function useIsBackendUnavailable(): boolean {
  const context = useMarketDataContext();

  return useSyncExternalStore(
    context.subscribe,
    () => context.getSnapshot().isBackendUnavailable,
    () => false // Server snapshot (always false during SSR)
  );
}
