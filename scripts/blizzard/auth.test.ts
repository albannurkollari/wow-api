import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createTokenProvider } from "./auth.ts";

const tokenResponse = (accessToken: string, expiresIn = 86399) =>
  Response.json({ access_token: accessToken, expires_in: expiresIn });

describe("createTokenProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("requests a token with the client credentials", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => tokenResponse("first"));
    const tokens = createTokenProvider({ clientId: "id", clientSecret: "secret", fetch });

    expect(await tokens.get()).toBe("first");

    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.headers).toMatchObject({ authorization: `Basic ${btoa("id:secret")}` });
    expect(init.body).toBe("grant_type=client_credentials");
  });

  it("reuses the token and shares one request between concurrent callers", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => tokenResponse("first"));
    const tokens = createTokenProvider({ clientId: "id", clientSecret: "secret", fetch });

    await Promise.all([tokens.get(), tokens.get()]);
    await tokens.get();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("renews the token shortly before it expires", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(tokenResponse("first", 3600))
      .mockResolvedValueOnce(tokenResponse("second", 3600));
    const tokens = createTokenProvider({ clientId: "id", clientSecret: "secret", fetch });

    await tokens.get();
    vi.advanceTimersByTime(56 * 60_000);

    expect(await tokens.get()).toBe("second");
  });

  it("renews the token after it is invalidated", async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockResolvedValueOnce(tokenResponse("first"))
      .mockResolvedValueOnce(tokenResponse("second"));
    const tokens = createTokenProvider({ clientId: "id", clientSecret: "secret", fetch });

    await tokens.get();
    tokens.invalidate();

    expect(await tokens.get()).toBe("second");
  });

  it("fails loudly when the credentials are rejected", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(null, { status: 401, statusText: "Unauthorized" }),
    );
    const tokens = createTokenProvider({ clientId: "id", clientSecret: "wrong", fetch });

    await expect(tokens.get()).rejects.toThrow("Access token request failed: 401 Unauthorized");
  });
});
