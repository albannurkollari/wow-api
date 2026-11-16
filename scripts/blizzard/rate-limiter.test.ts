import { describe, expect, it, vi } from "vitest";

import { useFakeClock } from "../clock.fixture.ts";
import { type RateLimiter, createRateLimiter } from "./rate-limiter.ts";

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Schedules `count` instant tasks and resolves with when each started, relative to now. */
const recordStartTimes = async (limiter: RateLimiter, count: number, runFor: number) => {
  const startedAt: number[] = [];
  const t0 = Date.now();
  const tasks = Array.from({ length: count }, () =>
    limiter.schedule(async () => {
      startedAt.push(Date.now() - t0);
    }),
  );

  await vi.advanceTimersByTimeAsync(runFor);
  await Promise.all(tasks);

  return startedAt;
};

describe("createRateLimiter", () => {
  useFakeClock();

  it("spaces task starts evenly by the per-second rate", async () => {
    const limiter = createRateLimiter({ maxPerSecond: 5, maxConcurrent: 10 });

    expect(await recordStartTimes(limiter, 3, 1000)).toEqual([0, 200, 400]);
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

    limiter.penalize(1000);

    expect(await recordStartTimes(limiter, 2, 3000)).toEqual([1000, 1500]);
  });
});
