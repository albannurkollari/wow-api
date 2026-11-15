import type { TokenProvider } from "./auth.ts";
import type { RateLimiter } from "./rate-limiter.ts";

type Region = "eu" | "us";
type Namespace = "dynamic" | "static";

type ClientOptions = {
  tokens: TokenProvider;
  limiter: RateLimiter;
  region?: Region;
  locale?: string;
  fetch?: typeof fetch;
  log?: (message: string) => void;
};

type GetOptions = { namespace: Namespace; ifModifiedSince?: string };

export type ApiResponse<T> =
  | { status: 200; lastModified?: string; data: T }
  | { status: 304; lastModified?: string };

export type BlizzardClient = {
  get: <T>(path: string, options: GetOptions) => Promise<ApiResponse<T>>;
};

const MAX_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 60_000;

export const createBlizzardClient = ({
  tokens,
  limiter,
  region = "eu",
  locale = "en_GB",
  fetch: doFetch = fetch,
  log = () => {},
}: ClientOptions): BlizzardClient => {
  const send = async (path: string, { namespace, ifModifiedSince }: GetOptions) => {
    const url = new URL(`https://${region}.api.blizzard.com/data/wow${path}`);
    url.search = new URLSearchParams({ namespace: `${namespace}-${region}`, locale }).toString();

    const headers: Record<string, string> = { authorization: `Bearer ${await tokens.get()}` };
    if (ifModifiedSince) headers["if-modified-since"] = ifModifiedSince;

    // The body is read inside the slot so large auction dumps count toward the concurrency cap.
    return limiter.schedule(async () => {
      const startedAt = Date.now();
      const response = await doFetch(url, { headers });
      const data: unknown = response.ok ? await response.json() : await response.text();
      log(`GET ${path} → ${response.status} in ${Date.now() - startedAt} ms`);

      return { response, data };
    });
  };

  const get = async <T>(
    path: string,
    options: GetOptions,
    attempt = 0,
  ): Promise<ApiResponse<T>> => {
    const { response, data } = await send(path, options);
    const lastModified = response.headers.get("last-modified") ?? undefined;

    if (response.status === 304) return { status: 304, lastModified };

    if (response.status === 401 && attempt === 0) {
      tokens.invalidate();
      return get(path, options, attempt + 1);
    }

    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfterSeconds = Number(response.headers.get("retry-after"));
      limiter.penalize(retryAfterSeconds > 0 ? retryAfterSeconds * 1000 : DEFAULT_RETRY_AFTER_MS);
      return get(path, options, attempt + 1);
    }

    if (!response.ok) {
      const reason = typeof data === "string" ? data : "";
      throw new Error(
        `GET ${path} failed: ${response.status} ${response.statusText} ${reason}`.trim(),
      );
    }

    return { status: 200, lastModified, data: data as T };
  };

  return { get };
};
