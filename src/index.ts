export const hello = "world";

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Delay before the first retry in milliseconds. Default: 100 */
  initialDelayMs?: number;
  /** Upper bound on delay between retries in milliseconds. Default: 10000 */
  maxDelayMs?: number;
  /** Multiplier applied to the delay after each failure. Default: 2 */
  backoffFactor?: number;
  /** Optional AbortSignal; cancels any pending retry delay and rejects immediately */
  signal?: AbortSignal;
}

/**
 * Calls `fn`, retrying with exponential backoff on failure.
 * Handles both synchronous throws and rejected promises from `fn`.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 100,
    maxDelayMs = 10_000,
    backoffFactor = 2,
    signal,
  } = opts;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw new Error("Retry cancelled");
    }

    try {
      return await fn();
    } catch (err) {
      lastError = err;

      const isLastAttempt = attempt === maxAttempts - 1;
      if (!isLastAttempt) {
        const delay = Math.min(
          initialDelayMs * Math.pow(backoffFactor, attempt),
          maxDelayMs
        );

        await new Promise<void>((resolve, reject) => {
          if (signal?.aborted) {
            reject(new Error("Retry cancelled"));
            return;
          }

          const timer = setTimeout(resolve, delay);

          signal?.addEventListener(
            "abort",
            () => {
              clearTimeout(timer);
              reject(new Error("Retry cancelled"));
            },
            { once: true }
          );
        });
      }
    }
  }

  throw lastError;
}
