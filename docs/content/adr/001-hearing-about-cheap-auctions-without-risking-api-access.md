---
title: Hearing About Cheap Auctions Without Risking API Access
status: Accepted
date: 2026-11-15
audience: Engineering
summary: A local watcher checks once a minute for a new hourly auction snapshot, reads every EU auction house only when one appears, and pushes cheap listings to Discord.
---

# Hearing About Cheap Auctions Without Risking API Access

## Status

Accepted (2026-11-15).

## Context

We want to buy specific items, such as Pattern: Sunfire Silk Spellthread, below a price we choose, on any EU realm.

- The Blizzard API doesn't show the auction house live. It publishes a snapshot of every auction house about once an hour, so a listing can sell before we ever see it. On 2026-11-15 a Spellthread listed at 2,000 gold on Blackrock had vanished by the next snapshot, while the cheapest one in game was about 70,000 gold.
- Cheap listings sell fast, so a lead is only useful if it reaches us within minutes, wherever we are.
- EU has about 92 connected realms plus the region-wide commodity market, too many to check by hand.
- Blizzard allows 36,000 requests per hour and 100 per second for each API client. Going over can get API access suspended (Terms of Use 2.17), and developers report `429` replies well below those numbers. We want to stay nowhere near the limit. [Blizzard API limits](../../blizzard-api-limits.md) has the details.
- Each snapshot response carries a `Last-Modified` date, and Blizzard replies with an empty `304 Not Modified` until a new snapshot exists. Every connected realm shares the same snapshot time.

## Decision

We will run a watcher on our own machine that waits for each new snapshot, checks it against a personal watchlist, and pushes what it finds to our phones.

1. **We watch a short, personal list.** `watchlist.json` names each item, the most we'd pay per item in gold, and whether it sells on the commodity market.
2. **We ask whether a new snapshot exists, not for the data.** Once a minute (`POLL_INTERVAL_SECONDS`, never under 30 seconds) the watcher sends one conditional request for a single realm. Until Blizzard publishes, the answer is an empty `304`.
3. **We read every auction house only when a new snapshot is out.** Then it downloads each EU connected realm once, plus the commodity market when the list includes commodities. It never does this more than once every 10 minutes.
4. **We stay at about 0.4 % of the hourly limit.** That comes to about 155 requests per hour. The watcher sends at most 5 requests per second and keeps at most 4 in flight. After a `429` it waits as long as Blizzard asks (or a minute) and halves its pace.
5. **We hear about each listing once, in one message per snapshot.** The message groups listings at or under the price by item and realm, cheapest first. The watcher remembers which listings it has reported for 48 hours, the longest an auction can run. Each message credits Blizzard as the source of the data (Terms of Use 2.13).
6. **Any number of receivers, Discord first.** Every receiver takes the same alert. Discord gets it through a channel webhook, and the Discord app turns it into a phone push notification. The console is the default receiver. `NOTIFIERS` lists the active ones, and adding a receiver such as SMS or WhatsApp doesn't change the watcher.
7. **The keys stay with us.** The client ID, client secret and webhook URL live in `.env.local`, which git ignores (Terms of Use 2.12).

## Consequences

- An alert reaches us within about a minute of Blizzard publishing a snapshot, and the first sweep of a fresh snapshot takes about 20 seconds.
- An alert is a lead, not a guarantee. The snapshot can already be up to an hour old, so the listing may have sold.
- About 99.6 % of the hourly limit stays free for our other scripts, such as `pnpm query`.
- Alerts only arrive while the watcher runs, so the machine must stay on.
- Reported listings live in memory. After a restart the watcher may report the current snapshot's listings again.
- The webhook URL is a secret: anyone who has it can post to the channel.

## Alternatives considered

- **Download every auction house every minute.** Rejected. That's about 5,500 large requests per hour, 15 % of the limit, for data that changes once an hour.
- **Download everything on a fixed hourly timer.** Rejected. Blizzard's publishing time drifts, so a fixed timer can see a snapshot up to an hour after it appears.
- **Third-party price sites and in-game addons.** Rejected. They're built on the same hourly data or need the game running, and they don't push alerts for our own prices.
- **A Discord bot instead of a webhook.** Rejected for now. A bot needs a token and a connection that stays open, and alerts only need to go one way.
- **SMS or WhatsApp first.** Deferred. Both cost money per message and need an account with a provider, while Discord push notifications cost nothing. The receiver design leaves room for them.
- **Host the watcher online.** Deferred. It would run around the clock, but our keys would live on someone else's machine, and it would cost money.

## Not decided here

- Regions other than EU.
- Keeping reported listings across restarts.
- Where the watcher runs around the clock.
- Receivers beyond the console and Discord.
- Price history or trends.
