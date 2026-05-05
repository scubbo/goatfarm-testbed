export const hello = "world";

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in milliseconds before the first retry (default: 100) */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds (default: 10_000) */
  maxDelayMs?: number;
  /** Optional signal to cancel pending retries */
  signal?: AbortSignal;
}

/**
 * Retries a failing async operation with exponential backoff.
 * Handles both synchronous throws and rejected promises from `fn`.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 100,
    maxDelayMs = 10_000,
    signal,
  } = opts;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }

    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (attempt < maxAttempts - 1) {
        const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, delay);
          signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
            },
            { once: true }
          );
        });
      }
    }
  }

  throw lastError;
}
