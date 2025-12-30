/**
 * Shared utility functions for trading components.
 */

/**
 * Format a price value with appropriate decimal precision.
 *
 * - Prices >= 1000: 2 decimal places (e.g., stock prices)
 * - Prices >= 1: 4 decimal places (e.g., forex majors)
 * - Prices < 1: 5 decimal places (e.g., forex minors, crypto)
 */
export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toFixed(2);
  } else if (price >= 1) {
    return price.toFixed(4);
  } else {
    return price.toFixed(5);
  }
}
