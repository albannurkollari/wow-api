import { setTimeout as sleep } from "node:timers/promises";

import { CONNECTED_REALMS } from "../src/constants/servers.ts";
import { createTokenProvider } from "./blizzard/auth.ts";
import { createBlizzardClient } from "./blizzard/client.ts";
import { createRateLimiter } from "./blizzard/rate-limiter.ts";
import { loadEnv, requireEnv } from "./env-file.ts";
import { createNotifiers, notifyAll } from "./notify/registry.ts";
import type { Alert } from "./notify/types.ts";
import { formatGold } from "./report.ts";
import { createSnapshotLog } from "./watch/snapshot-log.ts";
import { createAuctionWatcher } from "./watch/watcher.ts";
import { loadWatchlist } from "./watch/watchlist.ts";

const env = loadEnv();
const once = process.argv.includes("--once");
// Polling faster gains nothing: a new snapshot only appears about once an hour.
const MIN_POLL_SECONDS = 30;
const pollMs = Math.max(MIN_POLL_SECONDS, Number(env.POLL_INTERVAL_SECONDS) || 60) * 1000;

const log = (message: string) =>
  console.log(`[${new Date().toLocaleTimeString("en-GB")}] ${message}`);

const tokens = createTokenProvider({
  clientId: requireEnv(env, "CLIENT_ID"),
  clientSecret: requireEnv(env, "CLIENT_SECRET"),
  log,
});
// Far below Blizzard's 100 per second, see docs/blizzard-api-limits.md.
const limiter = createRateLimiter({ maxPerSecond: 5, maxConcurrent: 4 });
const client = createBlizzardClient({ tokens, limiter, log });
const notifiers = createNotifiers(env.NOTIFIERS ?? "console", env);
const watchlist = await loadWatchlist(env.WATCHLIST ?? "watchlist.json");

const notify = async (alert: Alert) => {
  for (const { notifier, error } of await notifyAll(notifiers, alert)) {
    console.error(`⚠️ ${notifier} could not deliver the alert:`, error);
  }
};

const itemNames = new Map(
  await Promise.all(
    watchlist.map(async ({ id }) => {
      const response = await client.get<{ name: string }>(`/item/${id}`, { namespace: "static" });
      return [id, response.status === 200 ? response.data.name : `Item ${id}`] as const;
    }),
  ),
);
const watched = watchlist.map(
  ({ id, maxPrice }) => `${itemNames.get(id)} at ≤ ${formatGold(maxPrice)}`,
);
const logSnapshot = createSnapshotLog(env.SNAPSHOT_LOG ?? "snapshots.csv");
const watcher = createAuctionWatcher({
  client,
  watchlist,
  connectedRealms: CONNECTED_REALMS,
  itemNames,
  notify,
  log,
  onSnapshot: (lastModified) =>
    logSnapshot(lastModified).catch((error: unknown) =>
      console.error("⚠️ Could not log the snapshot:", error),
    ),
});

console.log(
  `👀 Watching via ${notifiers.map(({ name }) => name).join(", ")}:\n ${watched.join("\n ")}`,
);

if (once) {
  await watcher.check();
} else {
  await notify({ title: "👀 Auction watch started", lines: watched });

  const stop = new AbortController();
  process.once("SIGINT", () => stop.abort());

  while (!stop.signal.aborted) {
    await watcher.check().catch((error: unknown) => console.error("⚠️ Check failed:", error));
    await sleep(pollMs, undefined, { signal: stop.signal }).catch(() => {});
  }

  console.log("👋 Stopped watching");
}
