type RateLimiterOptions = {
  maxPerSecond: number;
  maxConcurrent: number;
};

export type RateLimiter = {
  schedule: <T>(task: () => Promise<T>) => Promise<T>;
  penalize: (pauseMs: number) => void;
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const createRateLimiter = ({
  maxPerSecond,
  maxConcurrent,
}: RateLimiterOptions): RateLimiter => {
  let perSecond = maxPerSecond;
  let nextStartAt = 0;
  let pausedUntil = 0;
  let active = 0;
  const waiting: (() => void)[] = [];

  const acquire = async () => {
    if (active < maxConcurrent) active++;
    // A released slot is handed straight to the next waiter, so `active` stays accurate.
    else await new Promise<void>((resolve) => waiting.push(resolve));

    // Reserve a start time up front so concurrent callers stay evenly spaced.
    const startAt = Math.max(Date.now(), nextStartAt, pausedUntil);
    nextStartAt = startAt + 1000 / perSecond;
    await sleep(startAt - Date.now());

    // A 429 may have arrived while this task was waiting for its turn.
    while (Date.now() < pausedUntil) await sleep(pausedUntil - Date.now());
  };

  const release = () => {
    const next = waiting.shift();

    if (next) next();
    else active--;
  };

  return {
    schedule: async (task) => {
      await acquire();

      try {
        return await task();
      } finally {
        release();
      }
    },
    penalize: (pauseMs) => {
      pausedUntil = Math.max(pausedUntil, Date.now() + pauseMs);
      perSecond = Math.max(1, perSecond / 2);
    },
  };
};
