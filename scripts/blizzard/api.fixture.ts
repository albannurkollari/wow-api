import { vi } from "vitest";

import type { TokenProvider } from "./auth.ts";
import type { ApiResponse, BlizzardClient } from "./client.ts";
import type { RateLimiter } from "./rate-limiter.ts";

/** Two consecutive hourly auction snapshots, as Blizzard sends them in `Last-Modified`. */
export const SNAPSHOT_TIMES = {
  current: "Sun, 15 Nov 2026 10:22:12 GMT",
  next: "Sun, 15 Nov 2026 11:22:12 GMT",
} as const;

export const buildTokenResponse = (accessToken: string, expiresIn = 86399) =>
  Response.json({ access_token: accessToken, expires_in: expiresIn });

export const buildOkResponse = <T>(data: T, lastModified?: string): ApiResponse<T> => ({
  status: 200,
  lastModified,
  data,
});

/** Answers each call with the next queued response, in order. */
export const createFakeFetch = (...responses: Response[]) => {
  const fetch = vi.fn<typeof globalThis.fetch>();
  responses.forEach((response) => fetch.mockResolvedValueOnce(response));

  return fetch;
};

export const createFakeTokens = () => ({
  get: vi.fn<TokenProvider["get"]>(async () => "token"),
  invalidate: vi.fn<TokenProvider["invalidate"]>(),
});

/** Runs tasks straight away and records penalties instead of waiting them out. */
export const createFakeLimiter = () => ({
  schedule: <T>(task: () => Promise<T>) => task(),
  penalize: vi.fn<RateLimiter["penalize"]>(),
});

/** Answers each path from its own queue of canned responses and fails on anything unqueued. */
export const createFakeClient = () => {
  const responses = new Map<string, ApiResponse<unknown>[]>();
  const get = vi.fn<(path: string, options?: unknown) => Promise<ApiResponse<unknown>>>(
    async (path) => {
      const response = responses.get(path)?.shift();
      if (!response) throw new Error(`No response queued for ${path}`);

      return response;
    },
  );
  const queue = (path: string, ...queued: ApiResponse<unknown>[]) =>
    responses.set(path, [...(responses.get(path) ?? []), ...queued]);

  return { client: { get } as unknown as BlizzardClient, get, queue };
};
