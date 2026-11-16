import { afterEach, beforeEach, vi } from "vitest";

/** Runs every test in the calling `describe` on fake timers, so waits and `Date.now()` are test-controlled. */
export const useFakeClock = () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
};
