/**
 * Retry Utilities
 *
 * Provides retry logic with exponential backoff for API calls
 * and other async operations that may fail transiently.
 */

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG = {
  /** Maximum number of retry attempts */
  maxRetries: 3,
  /** Base delay between retries in milliseconds */
  baseDelayMs: 1000,
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: 5000,
};

export type RetryConfig = typeof DEFAULT_RETRY_CONFIG;

/**
 * Retry a function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the function if successful
 * @throws The last error if all retries fail
 *
 * @example
 * ```ts
 * const result = await withRetry(() => fetchData(url));
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryConfig> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Exponential backoff with jitter
      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt) + Math.random() * 100,
        config.maxDelayMs
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error("Unknown error during retry");
}

/**
 * Format retry error message with attempt count
 */
export function formatRetryError(message: string, config: RetryConfig = DEFAULT_RETRY_CONFIG): string {
  return `${message} (after ${config.maxRetries + 1} attempts)`;
}
