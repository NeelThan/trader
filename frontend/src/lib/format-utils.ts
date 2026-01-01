/**
 * Format Utilities
 *
 * Shared formatting functions for prices, times, and other display values.
 * Consolidates duplicated formatting logic across components.
 */

import type { MarketSymbol } from "@/lib/chart-constants";

/**
 * Get numeric timestamp from time value
 * Handles both string (ISO) and number (Unix) formats
 */
export function getTimestamp(time: string | number): number {
  return typeof time === "string" ? new Date(time).getTime() : time;
}

/**
 * Format time for display in tables and UI
 * Handles Unix timestamps, ISO strings, and date strings
 */
export function formatTime(time: string | number): string {
  if (typeof time === "number") {
    // Unix timestamp (seconds)
    return new Date(time * 1000).toLocaleDateString();
  }
  if (time.includes("T")) {
    // ISO string
    return new Date(time).toLocaleDateString();
  }
  // Already formatted
  return time;
}

/**
 * Format time with more precision (includes time of day)
 */
export function formatDateTime(time: string | number): string {
  if (typeof time === "number") {
    return new Date(time * 1000).toLocaleString();
  }
  if (time.includes("T")) {
    return new Date(time).toLocaleString();
  }
  return time;
}

/**
 * Format price based on value magnitude
 * Automatically adjusts decimal places based on price level
 */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toFixed(2);
  }
  if (price >= 1) {
    return price.toFixed(4);
  }
  return price.toFixed(6);
}

/**
 * Format price with symbol-aware precision
 * Uses appropriate decimal places for each market
 */
export function formatPriceForSymbol(price: number, symbol: MarketSymbol): string {
  switch (symbol) {
    case "EURUSD":
      return price.toFixed(5);
    case "BTCUSD":
      return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
    case "DJI":
    case "SPX":
    case "NDX":
      if (price >= 10000) {
        return price.toLocaleString(undefined, { maximumFractionDigits: 0 });
      }
      return price.toFixed(2);
    case "GOLD":
      return price.toFixed(2);
    default:
      return formatPrice(price);
  }
}

/**
 * Format percentage value
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(decimals)}%`;
}

/**
 * Format large numbers with K/M/B suffixes
 */
export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toFixed(2);
}

/**
 * Format bytes for display (cache sizes, etc.)
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms <= 0) return "expired";

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
