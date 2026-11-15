import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createRateLimiter } from "./rate-limiter.ts";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("spaces task starts evenly by the per-second rate", async () => {
    const limiter = createRateLimiter({ maxPerSecond: 5, maxConcurrent: 10 });
    const startedAt: number[] = [];
    const t0 = Date.now();

    const tasks = [1, 2, 3].map(() =>
      limiter.schedule(async () => {
        startedAt.push(Date.now() - t0);
      }),
    );
    await vi.advanceTimersByTimeAsync(1000);
    await Promise.all(tasks);

    expect(startedAt).toEqual([0, 200, 400]);
  });

  it("never runs more tasks at once than allowed", async () => {
    const limiter = createRateLimiter({ maxPerSecond: 100, maxConcurrent: 2 });
    let active = 0;
    let peak = 0;

    const tasks = Array.from({ length: 6 }, () =>
      limiter.schedule(async () => {
        active++;
        peak = Math.max(peak, active);
        await wait(500);
        active--;
      }),
    );
    await vi.advanceTimersByTimeAsync(5000);
    await Promise.all(tasks);

    expect(peak).toBe(2);
  });

  it("pauses and halves the rate after a penalty", async () => {
    const limiter = createRateLimiter({ maxPerSecond: 4, maxConcurrent: 10 });
    const startedAt: number[] = [];
    const t0 = Date.now();

    limiter.penalize(1000);
    const tasks = [1, 2].map(() =>
      limiter.schedule(async () => {
        startedAt.push(Date.now() - t0);
      }),
    );
    await vi.advanceTimersByTimeAsync(3000);
    await Promise.all(tasks);

    expect(startedAt).toEqual([1000, 1500]);
  });
});
