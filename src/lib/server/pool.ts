import "server-only";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }

  /** 429 and 5xx are worth another go; 4xx generally is not. */
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Retries with exponential backoff and full jitter. Honours Retry-After when the
 * caller passes one through on the error.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 4, baseMs = 400 }: { attempts?: number; baseMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = error instanceof HttpError ? error.retryable : true;
      if (!retryable || attempt === attempts - 1) break;
      const ceiling = baseMs * 2 ** attempt;
      await sleep(Math.random() * ceiling);
    }
  }
  throw lastError;
}

/**
 * Runs `worker` over `items` with bounded concurrency, yielding each result as
 * soon as it lands rather than waiting for the whole batch.
 */
export async function* mapPool<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): AsyncGenerator<{ index: number; value: R } | { index: number; error: unknown }> {
  const limit = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;
  const inFlight = new Map<
    number,
    Promise<{ index: number; value: R } | { index: number; error: unknown }>
  >();

  const launch = () => {
    if (cursor >= items.length) return;
    const index = cursor++;
    inFlight.set(
      index,
      worker(items[index], index).then(
        (value) => ({ index, value }),
        (error) => ({ index, error }),
      ),
    );
  };

  for (let i = 0; i < limit; i++) launch();

  while (inFlight.size > 0) {
    const settled = await Promise.race(inFlight.values());
    inFlight.delete(settled.index);
    launch();
    yield settled;
  }
}
