import { describe, expect, it, vi } from "vitest";

import {
  SNAPSHOT_TIMES,
  createFakeFetch,
  createFakeLimiter,
  createFakeTokens,
} from "./api.fixture.ts";
import { createBlizzardClient } from "./client.ts";

const setup = (...responses: Response[]) => {
  const fetch = createFakeFetch(...responses);
  const tokens = createFakeTokens();
  const limiter = createFakeLimiter();
  const log = vi.fn<(message: string) => void>();
  const client = createBlizzardClient({ tokens, limiter, fetch, log });

  const requestAt = (index: number) => {
    const [url, init] = fetch.mock.calls[index];
    return { url: (url as URL).href, headers: init?.headers as Record<string, string> };
  };

  return { client, fetch, tokens, limiter, log, requestAt };
};

const tooManyRequests = (headers?: Record<string, string>) =>
  new Response(null, { status: 429, statusText: "Too Many Requests", headers });

describe("createBlizzardClient", () => {
  it("sends the token as a Bearer header with the namespace and locale", async () => {
    const { client, requestAt } = setup(Response.json({ name: "Item" }));

    const response = await client.get("/item/258123", { namespace: "static" });

    expect(response).toEqual({ status: 200, lastModified: undefined, data: { name: "Item" } });
    expect(requestAt(0)).toEqual({
      url: "https://eu.api.blizzard.com/data/wow/item/258123?namespace=static-eu&locale=en_GB",
      headers: { authorization: "Bearer token" },
    });
  });

  it("asks only for changes since the last snapshot", async () => {
    const { client, requestAt } = setup(
      new Response(null, { status: 304, headers: { "last-modified": SNAPSHOT_TIMES.current } }),
    );

    const response = await client.get("/connected-realm/581/auctions", {
      namespace: "dynamic",
      ifModifiedSince: SNAPSHOT_TIMES.current,
    });

    expect(response).toEqual({ status: 304, lastModified: SNAPSHOT_TIMES.current });
    expect(requestAt(0).headers["if-modified-since"]).toBe(SNAPSHOT_TIMES.current);
  });

  it("renews the token once when it is rejected", async () => {
    const { client, tokens, fetch } = setup(
      new Response(null, { status: 401 }),
      Response.json({ ok: true }),
    );

    await client.get("/item/1", { namespace: "static" });

    expect(tokens.invalidate).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("backs off for as long as Blizzard asks after a 429", async () => {
    const { client, limiter } = setup(tooManyRequests({ "retry-after": "2" }), Response.json({}));

    await client.get("/item/1", { namespace: "static" });

    expect(limiter.penalize).toHaveBeenCalledWith(2000);
  });

  it("backs off for a minute when a 429 has no retry-after", async () => {
    const { client, limiter } = setup(tooManyRequests(), Response.json({}));

    await client.get("/item/1", { namespace: "static" });

    expect(limiter.penalize).toHaveBeenCalledWith(60_000);
  });

  it("gives up after repeated 429s", async () => {
    const { client, fetch } = setup(
      tooManyRequests(),
      tooManyRequests(),
      tooManyRequests(),
      tooManyRequests(),
    );

    await expect(client.get("/item/1", { namespace: "static" })).rejects.toThrow(
      "GET /item/1 failed: 429 Too Many Requests",
    );
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("logs every attempt with its status and duration", async () => {
    const { client, log } = setup(tooManyRequests({ "retry-after": "1" }), Response.json({}));

    await client.get("/item/1", { namespace: "static" });

    expect(log.mock.calls).toEqual([
      [expect.stringMatching(/^GET \/item\/1 → 429 in \d+ ms$/)],
      [expect.stringMatching(/^GET \/item\/1 → 200 in \d+ ms$/)],
    ]);
  });

  it("reports other errors with the response body", async () => {
    const { client } = setup(new Response("Not Found", { status: 404, statusText: "Not Found" }));

    await expect(client.get("/item/0", { namespace: "static" })).rejects.toThrow(
      "GET /item/0 failed: 404 Not Found Not Found",
    );
  });
});
