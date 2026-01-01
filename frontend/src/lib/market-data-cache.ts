/**
 * Market Data Cache
 *
 * Provides localStorage-based caching for market data (OHLC).
 * Enables switching between live API data and cached/simulated data
 * when rate limited or working offline.
 */

import type { Timeframe, MarketSymbol } from "@/lib/chart-constants";
import type { OHLCData } from "@/components/trading";

/**
 * Cached market data entry
 */
export type CachedMarketData = {
  symbol: MarketSymbol;
  timeframe: Timeframe;
  data: OHLCData[];
  cachedAt: string; // ISO timestamp
  source: string; // e.g., "yahoo"
};

/**
 * Cache metadata for quick lookup
 */
export type CacheMetadata = {
  entries: Array<{
    symbol: MarketSymbol;
    timeframe: Timeframe;
    cachedAt: string;
    barCount: number;
  }>;
  lastUpdated: string;
};

const CACHE_PREFIX = "market-data-cache";
const METADATA_KEY = `${CACHE_PREFIX}-metadata`;

/**
 * Generate cache key for a symbol+timeframe combination
 */
function getCacheKey(symbol: MarketSymbol, timeframe: Timeframe): string {
  return `${CACHE_PREFIX}-${symbol}-${timeframe}`;
}

/**
 * Load cache metadata
 */
export function getCacheMetadata(): CacheMetadata {
  if (typeof window === "undefined") {
    return { entries: [], lastUpdated: new Date().toISOString() };
  }

  try {
    const stored = localStorage.getItem(METADATA_KEY);
    if (!stored) {
      return { entries: [], lastUpdated: new Date().toISOString() };
    }
    return JSON.parse(stored);
  } catch {
    return { entries: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Save cache metadata
 */
function saveCacheMetadata(metadata: CacheMetadata): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Cache market data for a symbol+timeframe
 */
export function cacheMarketData(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  data: CachedMarketData["data"],
  source: string = "yahoo"
): void {
  if (typeof window === "undefined") return;
  if (!data || data.length === 0) return;

  const key = getCacheKey(symbol, timeframe);
  const cachedAt = new Date().toISOString();

  const entry: CachedMarketData = {
    symbol,
    timeframe,
    data,
    cachedAt,
    source,
  };

  try {
    localStorage.setItem(key, JSON.stringify(entry));

    // Update metadata
    const metadata = getCacheMetadata();
    const existingIndex = metadata.entries.findIndex(
      (e) => e.symbol === symbol && e.timeframe === timeframe
    );

    const metaEntry = {
      symbol,
      timeframe,
      cachedAt,
      barCount: data.length,
    };

    if (existingIndex >= 0) {
      metadata.entries[existingIndex] = metaEntry;
    } else {
      metadata.entries.push(metaEntry);
    }

    metadata.lastUpdated = cachedAt;
    saveCacheMetadata(metadata);

    console.log(`[MarketDataCache] Cached ${data.length} bars for ${symbol} ${timeframe}`);
  } catch (error) {
    console.warn("[MarketDataCache] Failed to cache data:", error);
  }
}

/**
 * Get cached market data for a symbol+timeframe
 */
export function getCachedMarketData(
  symbol: MarketSymbol,
  timeframe: Timeframe
): CachedMarketData | null {
  if (typeof window === "undefined") return null;

  const key = getCacheKey(symbol, timeframe);

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const cached: CachedMarketData = JSON.parse(stored);

    // Validate structure
    if (!cached.data || !Array.isArray(cached.data)) return null;

    return cached;
  } catch {
    return null;
  }
}

/**
 * Check if cached data exists for a symbol+timeframe
 */
export function hasCachedData(symbol: MarketSymbol, timeframe: Timeframe): boolean {
  const cached = getCachedMarketData(symbol, timeframe);
  return cached !== null && cached.data.length > 0;
}

/**
 * Get cache age in minutes
 */
export function getCacheAge(symbol: MarketSymbol, timeframe: Timeframe): number | null {
  const cached = getCachedMarketData(symbol, timeframe);
  if (!cached) return null;

  const cachedTime = new Date(cached.cachedAt).getTime();
  const now = Date.now();
  return Math.floor((now - cachedTime) / 1000 / 60);
}

/**
 * Clear cached data for a specific symbol+timeframe
 */
export function clearCachedData(symbol: MarketSymbol, timeframe: Timeframe): void {
  if (typeof window === "undefined") return;

  const key = getCacheKey(symbol, timeframe);

  try {
    localStorage.removeItem(key);

    // Update metadata
    const metadata = getCacheMetadata();
    metadata.entries = metadata.entries.filter(
      (e) => !(e.symbol === symbol && e.timeframe === timeframe)
    );
    metadata.lastUpdated = new Date().toISOString();
    saveCacheMetadata(metadata);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all cached market data
 */
export function clearAllCachedData(): void {
  if (typeof window === "undefined") return;

  try {
    const metadata = getCacheMetadata();

    // Remove all cache entries
    for (const entry of metadata.entries) {
      const key = getCacheKey(entry.symbol, entry.timeframe);
      localStorage.removeItem(key);
    }

    // Clear metadata
    localStorage.removeItem(METADATA_KEY);

    console.log("[MarketDataCache] Cleared all cached data");
  } catch {
    // Ignore errors
  }
}

/**
 * Get total cache size in bytes (approximate)
 */
export function getCacheSize(): number {
  if (typeof window === "undefined") return 0;

  let totalSize = 0;

  try {
    const metadata = getCacheMetadata();

    for (const entry of metadata.entries) {
      const key = getCacheKey(entry.symbol, entry.timeframe);
      const stored = localStorage.getItem(key);
      if (stored) {
        totalSize += stored.length * 2; // UTF-16 characters = 2 bytes each
      }
    }

    // Add metadata size
    const metaStored = localStorage.getItem(METADATA_KEY);
    if (metaStored) {
      totalSize += metaStored.length * 2;
    }
  } catch {
    // Ignore errors
  }

  return totalSize;
}

/**
 * Format cache size for display
 */
export function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Get available cached symbols and timeframes
 */
export function getAvailableCachedData(): Array<{
  symbol: MarketSymbol;
  timeframe: Timeframe;
  barCount: number;
  cachedAt: string;
  ageMinutes: number;
}> {
  const metadata = getCacheMetadata();
  const now = Date.now();

  return metadata.entries.map((entry) => ({
    ...entry,
    ageMinutes: Math.floor((now - new Date(entry.cachedAt).getTime()) / 1000 / 60),
  }));
}
