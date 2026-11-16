import { describe, expect, it, vi } from "vitest";

import { useFakeClock } from "../clock.fixture.ts";
import { buildTokenResponse, createFakeFetch } from "./api.fixture.ts";
import { createTokenProvider } from "./auth.ts";

const createProvider = (fetch: typeof globalThis.fetch, clientSecret = "secret") =>
  createTokenProvider({ clientId: "id", clientSecret, fetch });

describe("createTokenProvider", () => {
  useFakeClock();

  it("requests a token with the client credentials", async () => {
    const fetch = createFakeFetch(buildTokenResponse("first"));

    expect(await createProvider(fetch).get()).toBe("first");

    const [, init] = fetch.mock.calls[0];
    expect(init?.headers).toMatchObject({ authorization: `Basic ${btoa("id:secret")}` });
    expect(init?.body).toBe("grant_type=client_credentials");
  });

  it("logs each token request", async () => {
    const log = vi.fn<(message: string) => void>();
    const tokens = createTokenProvider({
      clientId: "id",
      clientSecret: "secret",
      fetch: createFakeFetch(buildTokenResponse("first")),
      log,
    });

    await tokens.get();

    expect(log).toHaveBeenCalledWith("POST https://oauth.battle.net/oauth/token → 200");
  });

  it("hands every new token to onRenew", async () => {
    const onRenew = vi.fn<(token: string) => Promise<void>>(async () => {});
    const tokens = createTokenProvider({
      clientId: "id",
      clientSecret: "secret",
      fetch: createFakeFetch(buildTokenResponse("first"), buildTokenResponse("second")),
      onRenew,
    });

    await tokens.get();
    tokens.invalidate();
    await tokens.get();

    expect(onRenew.mock.calls).toEqual([["first"], ["second"]]);
  });

  it("reuses the token and shares one request between concurrent callers", async () => {
    const fetch = createFakeFetch(buildTokenResponse("first"));
    const tokens = createProvider(fetch);

    await Promise.all([tokens.get(), tokens.get()]);
    await tokens.get();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("renews the token shortly before it expires", async () => {
    const fetch = createFakeFetch(
      buildTokenResponse("first", 3600),
      buildTokenResponse("second", 3600),
    );
    const tokens = createProvider(fetch);

    await tokens.get();
    vi.advanceTimersByTime(56 * 60_000);

    expect(await tokens.get()).toBe("second");
  });

  it("renews the token after it is invalidated", async () => {
    const fetch = createFakeFetch(buildTokenResponse("first"), buildTokenResponse("second"));
    const tokens = createProvider(fetch);

    await tokens.get();
    tokens.invalidate();

    expect(await tokens.get()).toBe("second");
  });

  it("fails loudly when the credentials are rejected", async () => {
    const fetch = createFakeFetch(new Response(null, { status: 401, statusText: "Unauthorized" }));

    await expect(createProvider(fetch, "wrong").get()).rejects.toThrow(
      "Access token request failed: 401 Unauthorized",
    );
  });
});
