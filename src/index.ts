export const hello = "world";

export interface RetryOptions {
  /** Maximum number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Delay before the second attempt in milliseconds. Default: 200 */
  initialDelayMs?: number;
  /** Upper bound on inter-attempt delay in milliseconds. Default: 30 000 */
  maxDelayMs?: number;
  /** Exponential base applied to each successive delay. Default: 2 */
  factor?: number;
  /** Optional cancellation token; throws on abort. */
  signal?: AbortSignal;
}

function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new Error("Aborted"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new Error("Aborted"));
      },
      { once: true },
    );
  });
}

/**
 * Retries an async operation with exponential backoff.
 *
 * Both synchronous throws and rejected promises from `fn` are caught and
 * retried. If an AbortSignal is provided it is checked before each attempt
 * and during the inter-attempt wait; the abort reason is re-thrown when
 * triggered.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions,
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 200,
    maxDelayMs = 30_000,
    factor = 2,
    signal,
  } = opts ?? {};

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) {
      throw signal.reason ?? new Error("Aborted");
    }

    try {
      // Promise.resolve() turns a synchronous throw into a rejected promise
      // so the single catch handles both cases.
      return await Promise.resolve(fn());
    } catch (err) {
      lastError = err;

      if (attempt === maxAttempts - 1) break;

      const backoffMs = Math.min(
        initialDelayMs * factor ** attempt,
        maxDelayMs,
      );
      await abortableDelay(backoffMs, signal);
    }
  }

  throw lastError;
}
