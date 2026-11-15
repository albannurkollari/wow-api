# WoW APIs consumer web app

This repo is only for demonstration purposes, on how to consume WoW APIs for collective data.
Make sure to install dependencies via `pnpm`.

```bash
$ pnpm i
```

Installing also sets up the [lefthook](https://lefthook.dev) git hooks: staged files get formatted
and linted on commit, and the typecheck and tests run on push.

| Script                      | What it does                                          |
| --------------------------- | ----------------------------------------------------- |
| `pnpm dev`                  | Start the Vite dev server                             |
| `pnpm build`                | Typecheck, then build for production                  |
| `pnpm typecheck`            | Typecheck the app and the Node scripts                |
| `pnpm test`                 | Run the Vitest suites (`test:watch`, `test:coverage`) |
| `pnpm lint`                 | Type-aware lint with oxlint (`lint:fix` to autofix)   |
| `pnpm format`               | Format with oxfmt (`format:check` to only check)      |
| `pnpm setClientAccessToken` | Fetch a Battle.net client token into `.env.local`     |
| `pnpm query <ids> [-a\|-c\|-i\|-r]` | Query auctions, commodities, items or realms  |
| `pnpm watch:ah [--once]`    | Watch every EU auction house and alert on cheap listings |

## Auction house watcher

`pnpm watch:ah` keeps running and checks once a minute whether Blizzard has published a new
auction snapshot (about once an hour). When it has, it reads every EU connected realm, and the
commodity market if you watch commodities, and alerts you about listings at or under your prices.
Each listing is reported once. `--once` runs a single check and exits.

It stays far inside the API limits, see [docs/blizzard-api-limits.md](docs/blizzard-api-limits.md).

1. Copy `watchlist.example.json` to `watchlist.json` and list your items. `maxPrice` is in gold
   per item; set `"commodity": true` for items sold on the region-wide commodity market.
2. Add to `.env.local`:

   | Variable                | Default          | Purpose                                     |
   | ----------------------- | ---------------- | ------------------------------------------- |
   | `CLIENT_ID`             |                  | Battle.net API client ID                    |
   | `CLIENT_SECRET`         |                  | Battle.net API client secret                |
   | `NOTIFIERS`             | `console`        | Comma-separated receivers: `console`, `discord` |
   | `DISCORD_WEBHOOK_URL`   |                  | Webhook for the `discord` receiver          |
   | `WATCHLIST`             | `watchlist.json` | Path to the watchlist                       |
   | `POLL_INTERVAL_SECONDS` | `60`             | Seconds between checks (at least 30)        |

   The watcher fetches and renews its own access token from the client ID and secret.

### Discord

In your server, open the channel's settings → Integrations → Webhooks → New Webhook, copy its URL
into `DISCORD_WEBHOOK_URL`, and set `NOTIFIERS=console,discord`. For phone push notifications, set
that channel's notifications to "All Messages" in the Discord app.

### Adding a receiver

Receivers live in `scripts/notify/`. Implement the `Notifier` type from `types.ts` (a name and a
`send(alert)` function) and register a factory for it in `registry.ts`. It can then be listed in
`NOTIFIERS` next to the others.

## Last but not least

![unagi](https://media4.giphy.com/media/JOe7JxOiMg61ogl6fH/giphy.gif)
