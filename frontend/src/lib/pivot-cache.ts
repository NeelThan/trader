/**
 * Pivot Cache
 *
 * Provides localStorage-based caching for detected pivot points.
 * Includes TTL-based expiration per timeframe to ensure data freshness.
 * Caches are keyed by symbol + timeframe + lookback since different
 * lookback values produce different pivot detections.
 */

import type { Timeframe, MarketSymbol } from "@/lib/chart-constants";
import type { PivotPoint, SwingMarker } from "@/hooks/use-swing-markers";

/**
 * TTL (time-to-live) per timeframe in milliseconds
 * Shorter timeframes need more frequent updates
 */
export const PIVOT_TTL: Record<Timeframe, number> = {
  "1M": 24 * 60 * 60 * 1000, // 1 day
  "1W": 4 * 60 * 60 * 1000, // 4 hours
  "1D": 60 * 60 * 1000, // 1 hour
  "4H": 15 * 60 * 1000, // 15 min
  "1H": 5 * 60 * 1000, // 5 min
  "15m": 60 * 1000, // 1 min
  "5m": 45 * 1000, // 45 sec
  "3m": 30 * 1000, // 30 sec
  "1m": 30 * 1000, // 30 sec
};

/**
 * Cached pivot data entry
 */
export type CachedPivotData = {
  symbol: MarketSymbol;
  timeframe: Timeframe;
  lookback: number;
  pivots: PivotPoint[];
  markers: SwingMarker[];
  cachedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (cachedAt + TTL)
};

/**
 * Cache metadata for quick lookup
 */
export type PivotCacheMetadata = {
  entries: Array<{
    symbol: MarketSymbol;
    timeframe: Timeframe;
    lookback: number;
    cachedAt: number;
    expiresAt: number;
    pivotCount: number;
    markerCount: number;
  }>;
  lastUpdated: number;
};

const CACHE_VERSION = 1;
const CACHE_PREFIX = `pivot-cache-v${CACHE_VERSION}`;
const METADATA_KEY = `${CACHE_PREFIX}-metadata`;

/**
 * Generate cache key for a symbol+timeframe+lookback combination
 */
function getCacheKey(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  lookback: number
): string {
  return `${CACHE_PREFIX}-${symbol}-${timeframe}-${lookback}`;
}

/**
 * Load cache metadata
 */
export function getPivotCacheMetadata(): PivotCacheMetadata {
  if (typeof window === "undefined") {
    return { entries: [], lastUpdated: Date.now() };
  }

  try {
    const stored = localStorage.getItem(METADATA_KEY);
    if (!stored) {
      return { entries: [], lastUpdated: Date.now() };
    }
    return JSON.parse(stored);
  } catch {
    return { entries: [], lastUpdated: Date.now() };
  }
}

/**
 * Save cache metadata
 */
function savePivotCacheMetadata(metadata: PivotCacheMetadata): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Cache pivot data for a symbol+timeframe+lookback
 */
export function cachePivots(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  lookback: number,
  pivots: PivotPoint[],
  markers: SwingMarker[]
): void {
  if (typeof window === "undefined") return;
  if (!pivots || pivots.length === 0) return;

  const key = getCacheKey(symbol, timeframe, lookback);
  const now = Date.now();
  const ttl = PIVOT_TTL[timeframe];

  const entry: CachedPivotData = {
    symbol,
    timeframe,
    lookback,
    pivots,
    markers,
    cachedAt: now,
    expiresAt: now + ttl,
  };

  try {
    localStorage.setItem(key, JSON.stringify(entry));

    // Update metadata
    const metadata = getPivotCacheMetadata();
    const existingIndex = metadata.entries.findIndex(
      (e) =>
        e.symbol === symbol &&
        e.timeframe === timeframe &&
        e.lookback === lookback
    );

    const metaEntry = {
      symbol,
      timeframe,
      lookback,
      cachedAt: now,
      expiresAt: now + ttl,
      pivotCount: pivots.length,
      markerCount: markers.length,
    };

    if (existingIndex >= 0) {
      metadata.entries[existingIndex] = metaEntry;
    } else {
      metadata.entries.push(metaEntry);
    }

    metadata.lastUpdated = now;
    savePivotCacheMetadata(metadata);
  } catch {
    // Ignore cache storage errors (e.g., quota exceeded)
  }
}

/**
 * Get cached pivot data for a symbol+timeframe+lookback
 * Returns null if not found or expired
 */
export function getCachedPivots(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  lookback: number
): CachedPivotData | null {
  if (typeof window === "undefined") return null;

  const key = getCacheKey(symbol, timeframe, lookback);

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const cached: CachedPivotData = JSON.parse(stored);

    // Validate structure
    if (!cached.pivots || !Array.isArray(cached.pivots)) return null;
    if (!cached.markers || !Array.isArray(cached.markers)) return null;

    // Check expiration
    const now = Date.now();
    if (now > cached.expiresAt) {
      // Expired - remove from cache
      clearCachedPivots(symbol, timeframe, lookback);
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

/**
 * Check if valid cached data exists for a symbol+timeframe+lookback
 */
export function hasCachedPivots(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  lookback: number
): boolean {
  const cached = getCachedPivots(symbol, timeframe, lookback);
  return cached !== null && cached.pivots.length > 0;
}

/**
 * Get cache TTL remaining in milliseconds
 * Returns null if not cached or expired
 */
export function getCacheTTLRemaining(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  lookback: number
): number | null {
  const cached = getCachedPivots(symbol, timeframe, lookback);
  if (!cached) return null;

  const now = Date.now();
  const remaining = cached.expiresAt - now;
  return remaining > 0 ? remaining : null;
}

/**
 * Get cache age in milliseconds
 */
export function getCacheAge(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  lookback: number
): number | null {
  if (typeof window === "undefined") return null;

  const key = getCacheKey(symbol, timeframe, lookback);

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const cached: CachedPivotData = JSON.parse(stored);
    return Date.now() - cached.cachedAt;
  } catch {
    return null;
  }
}

/**
 * Clear cached data for a specific symbol+timeframe+lookback
 */
export function clearCachedPivots(
  symbol: MarketSymbol,
  timeframe: Timeframe,
  lookback: number
): void {
  if (typeof window === "undefined") return;

  const key = getCacheKey(symbol, timeframe, lookback);

  try {
    localStorage.removeItem(key);

    // Update metadata
    const metadata = getPivotCacheMetadata();
    metadata.entries = metadata.entries.filter(
      (e) =>
        !(
          e.symbol === symbol &&
          e.timeframe === timeframe &&
          e.lookback === lookback
        )
    );
    metadata.lastUpdated = Date.now();
    savePivotCacheMetadata(metadata);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all cached pivots for a symbol+timeframe (any lookback)
 */
export function clearCachedPivotsForTimeframe(
  symbol: MarketSymbol,
  timeframe: Timeframe
): void {
  if (typeof window === "undefined") return;

  try {
    const metadata = getPivotCacheMetadata();

    // Find and remove all entries for this symbol+timeframe
    const toRemove = metadata.entries.filter(
      (e) => e.symbol === symbol && e.timeframe === timeframe
    );

    for (const entry of toRemove) {
      const key = getCacheKey(entry.symbol, entry.timeframe, entry.lookback);
      localStorage.removeItem(key);
    }

    // Update metadata
    metadata.entries = metadata.entries.filter(
      (e) => !(e.symbol === symbol && e.timeframe === timeframe)
    );
    metadata.lastUpdated = Date.now();
    savePivotCacheMetadata(metadata);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all cached pivot data
 */
export function clearAllCachedPivots(): void {
  if (typeof window === "undefined") return;

  try {
    const metadata = getPivotCacheMetadata();

    // Remove all cache entries
    for (const entry of metadata.entries) {
      const key = getCacheKey(entry.symbol, entry.timeframe, entry.lookback);
      localStorage.removeItem(key);
    }

    // Clear metadata
    localStorage.removeItem(METADATA_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all expired cache entries
 */
export function clearExpiredPivotCache(): number {
  if (typeof window === "undefined") return 0;

  try {
    const metadata = getPivotCacheMetadata();
    const now = Date.now();
    let clearedCount = 0;

    const expired = metadata.entries.filter((e) => now > e.expiresAt);

    for (const entry of expired) {
      const key = getCacheKey(entry.symbol, entry.timeframe, entry.lookback);
      localStorage.removeItem(key);
      clearedCount++;
    }

    if (clearedCount > 0) {
      metadata.entries = metadata.entries.filter((e) => now <= e.expiresAt);
      metadata.lastUpdated = now;
      savePivotCacheMetadata(metadata);
    }

    return clearedCount;
  } catch {
    return 0;
  }
}

/**
 * Get total cache size in bytes (approximate)
 */
export function getPivotCacheSize(): number {
  if (typeof window === "undefined") return 0;

  let totalSize = 0;

  try {
    const metadata = getPivotCacheMetadata();

    for (const entry of metadata.entries) {
      const key = getCacheKey(entry.symbol, entry.timeframe, entry.lookback);
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
 * @deprecated Use formatBytes from @/lib/format-utils instead
 */
export { formatBytes as formatPivotCacheSize } from "@/lib/format-utils";

/**
 * Get available cached pivots info
 */
export function getAvailableCachedPivots(): Array<{
  symbol: MarketSymbol;
  timeframe: Timeframe;
  lookback: number;
  pivotCount: number;
  markerCount: number;
  cachedAt: number;
  expiresAt: number;
  ttlRemaining: number;
  isExpired: boolean;
}> {
  const metadata = getPivotCacheMetadata();
  const now = Date.now();

  return metadata.entries.map((entry) => ({
    ...entry,
    ttlRemaining: Math.max(0, entry.expiresAt - now),
    isExpired: now > entry.expiresAt,
  }));
}

/**
 * Format TTL for display
 * @deprecated Use formatDuration from @/lib/format-utils instead
 */
export { formatDuration as formatTTL } from "@/lib/format-utils";
