export const hello = "world";

export interface RetryOptions {
  /** Maximum number of attempts (default: 4) */
  maxAttempts?: number;
  /** Initial delay in ms before the first retry (default: 200) */
  initialDelayMs?: number;
  /** Multiplicative backoff factor (default: 2) */
  factor?: number;
  /** Maximum delay cap in ms (default: 10_000) */
  maxDelayMs?: number;
  /** Optional AbortSignal to cancel pending retries */
  signal?: AbortSignal;
}

const DEFAULT_OPTS: Required<Omit<RetryOptions, "signal">> = {
  maxAttempts: 4,
  initialDelayMs: 200,
  factor: 2,
  maxDelayMs: 10_000,
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

export async function retry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions,
): Promise<T> {
  const { maxAttempts, initialDelayMs, factor, maxDelayMs } = {
    ...DEFAULT_OPTS,
    ...opts,
  };
  const { signal } = opts ?? {};

  let attempt = 0;
  let delayMs = initialDelayMs;

  while (true) {
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }

    attempt++;
    try {
      // Wrap the call so synchronous throws are caught alongside rejected promises
      return await Promise.resolve().then(() => fn());
    } catch (err) {
      if (attempt >= maxAttempts) {
        throw err;
      }
      await sleep(delayMs, signal);
      delayMs = Math.min(delayMs * factor, maxDelayMs);
    }
  }
}
