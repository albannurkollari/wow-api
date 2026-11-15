type TokenResponse = { access_token: string; expires_in: number };

type TokenProviderOptions = {
  clientId: string;
  clientSecret: string;
  fetch?: typeof fetch;
  log?: (message: string) => void;
};

export type TokenProvider = {
  get: () => Promise<string>;
  invalidate: () => void;
};

const TOKEN_URL = "https://oauth.battle.net/oauth/token";
// Renew early so a sweep that starts on an almost expired token doesn't fail halfway.
const RENEW_MARGIN_MS = 5 * 60_000;

export const createTokenProvider = ({
  clientId,
  clientSecret,
  fetch: doFetch = fetch,
  log = () => {},
}: TokenProviderOptions): TokenProvider => {
  let token: string | undefined;
  let expiresAt = 0;
  let pending: Promise<string> | undefined;

  const request = async () => {
    const response = await doFetch(TOKEN_URL, {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    log(`POST ${TOKEN_URL} → ${response.status}`);

    if (!response.ok) {
      throw new Error(`Access token request failed: ${response.status} ${response.statusText}`);
    }

    const { access_token, expires_in } = (await response.json()) as TokenResponse;
    token = access_token;
    expiresAt = Date.now() + expires_in * 1000;

    return access_token;
  };

  return {
    get: () => {
      if (token && Date.now() < expiresAt - RENEW_MARGIN_MS) return Promise.resolve(token);

      pending ??= request().finally(() => {
        pending = undefined;
      });

      return pending;
    },
    invalidate: () => {
      token = undefined;
    },
  };
};
