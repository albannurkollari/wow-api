# Blizzard API limits

What the Blizzard API allows us to request, and the budget the auction house watcher keeps to. Checked on 2026-11-15.

## Request limits

| Window     | Limit            | When exceeded                                    |
| ---------- | ---------------- | ------------------------------------------------ |
| Per second | 100 requests     | `429` for the rest of that second                |
| Per hour   | 36,000 requests  | "Slower service until traffic decreases"         |

- The limits apply to the whole API client (client ID and secret), across every endpoint. A new access token does not reset them.
- Responses carry no remaining-quota header. The only signal is a `429`.
- Developers on the API forum report `429`s at only 4–5 requests per second, so staying under the documented numbers is not enough. We stay far below them.
- Whether `304 Not Modified` replies count toward the quota is not documented. We assume they do.

Source: [Getting Started → Throttling](https://community.developer.battle.net/documentation/guides/getting-started).

## Access tokens

- Client credentials tokens last 24 hours (`expires_in: 86399`).
- Every API response includes a `blizzard-token-expires` header.
- Blizzard publishes no limit on requesting tokens.

Source: [Client Credentials Flow](https://community.developer.battle.net/documentation/guides/using-oauth/client-credentials-flow).

## Auction house data

- "Auction house data updates at a set interval. The value was initially set at 1 hour; however, it might change over time without notice."
- A single connected realm's response can exceed 10 MB.
- Responses carry `Last-Modified` and honour `If-Modified-Since`, returning an empty `304` until a new snapshot exists.
- On 2026-11-15 every connected realm we checked shared the same `Last-Modified`, so one realm is enough to tell when a new snapshot is out.

Source: [WoW Game Data APIs → Auction House API](https://community.developer.battle.net/documentation/world-of-warcraft/game-data-apis).

## Terms of Use

From the [Blizzard Developer API Terms of Use](https://www.blizzard.com/en-us/legal/a2989b50-5f16-43b1-abec-2ae17cc09dd6/blizzard-developer-api-terms-of-use) (last updated 2019-10-01):

- **2.17** 36,000 calls per hour. Exceeding it, or degrading the APIs, can get API access suspended or terminated.
- **2.12** Keep the client ID and secret confidential.
- **2.13** Credit Blizzard as the source of the data.
- **2.9** Do not sell or transfer the data to third parties.
- **2.18** Refresh or drop cached data within 30 days.

Nothing in the terms links API use to a game account. The risk of overuse is losing API access.

## Watcher budget

| Activity                                                   | Requests per hour |
| ---------------------------------------------------------- | ----------------- |
| One `If-Modified-Since` check on a sentinel realm per min  | 60                |
| Full download of every connected realm per snapshot        | ~92               |
| Commodities download per snapshot (when watched)           | 1                 |
| Token renewal                                              | < 1               |
| **Total**                                                  | **~155 (≈0.4%)**  |

The client never sends more than 5 requests per second or keeps more than 4 in flight. After a `429` it pauses for the time Blizzard asks for (or 60 seconds) and halves its rate.
