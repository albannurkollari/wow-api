import { describe, expect, it, vi } from "vitest";

import { SNAPSHOT_TIMES, createFakeClient } from "../blizzard/api.fixture.ts";
import { useFakeClock } from "../clock.fixture.ts";
import type { Notifier } from "../notify/types.ts";
import {
  ALERTED_AT,
  CONNECTED_REALMS,
  COPPER,
  ITEMS,
  ITEM_NAMES,
  WATCHED,
  buildAuction,
  buildAuctionSnapshot,
} from "./auctions.fixture.ts";
import { MIN_SWEEP_INTERVAL_MS, createAuctionWatcher } from "./watcher.ts";
import type { WatchedItem } from "./watchlist.ts";

const BLACKROCK = "/connected-realm/581/auctions";
const DENTARG = "/connected-realm/1084/auctions";
const CREDIT = "Data from Blizzard Entertainment";

const listing = (id: number, buyout: number) => buildAuction({ id, buyout });

const setup = (watchlist: WatchedItem[] = [WATCHED.spellthread]) => {
  const { client, get, queue } = createFakeClient();
  const notify = vi.fn<Notifier["send"]>(async () => {});
  const log = vi.fn<(message: string) => void>();
  const onSnapshot = vi.fn<(lastModified: string | undefined) => Promise<void>>(async () => {});
  const watcher = createAuctionWatcher({
    client,
    watchlist,
    connectedRealms: CONNECTED_REALMS,
    itemNames: ITEM_NAMES,
    notify,
    onSnapshot,
    log,
  });

  return { watcher, get, notify, log, onSnapshot, queue };
};

describe("createAuctionWatcher", () => {
  useFakeClock();

  it("sweeps every connected realm on a new snapshot and reports the deals", async () => {
    vi.setSystemTime(ALERTED_AT);
    const { watcher, notify, queue } = setup();
    queue(BLACKROCK, buildAuctionSnapshot([listing(1, COPPER.bargain)]));
    queue(DENTARG, buildAuctionSnapshot([listing(2, 250_000_000), listing(3, COPPER.market)]));

    expect(await watcher.check()).toBe(true);

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({
      title: "🔔 2 cheap listings · snapshot 26 min old",
      lines: [
        "Pattern: Sunfire Silk Spellthread: 2,000.88g on Blackrock, 12 – 48 h left",
        "Pattern: Sunfire Silk Spellthread: 25,000g on Dentarg / Tarren Mill, 12 – 48 h left",
      ],
      footer: CREDIT,
      time: new Date(SNAPSHOT_TIMES.current),
    });
  });

  it("only asks the sentinel realm whether anything changed until a new snapshot appears", async () => {
    const { watcher, get, queue } = setup();
    queue(BLACKROCK, buildAuctionSnapshot([]), { status: 304 });
    queue(DENTARG, buildAuctionSnapshot([]));

    await watcher.check();
    vi.advanceTimersByTime(MIN_SWEEP_INTERVAL_MS);
    get.mockClear();

    expect(await watcher.check()).toBe(false);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith(BLACKROCK, {
      namespace: "dynamic",
      ifModifiedSince: SNAPSHOT_TIMES.current,
    });
  });

  it("reports each new snapshot once, before sweeping it", async () => {
    const { watcher, get, onSnapshot, queue } = setup();
    queue(BLACKROCK, buildAuctionSnapshot([]), { status: 304 });
    queue(DENTARG, buildAuctionSnapshot([]));

    await watcher.check();
    vi.advanceTimersByTime(MIN_SWEEP_INTERVAL_MS);
    await watcher.check();

    expect(onSnapshot).toHaveBeenCalledTimes(1);
    expect(onSnapshot).toHaveBeenCalledWith(SNAPSHOT_TIMES.current);
    expect(onSnapshot.mock.invocationCallOrder[0]).toBeLessThan(get.mock.invocationCallOrder[1]);
  });

  it("does not report the same listing twice", async () => {
    const { watcher, notify, queue } = setup();
    queue(
      BLACKROCK,
      buildAuctionSnapshot([listing(1, COPPER.bargain)]),
      buildAuctionSnapshot(
        [listing(1, COPPER.bargain), listing(4, 100_000_000)],
        SNAPSHOT_TIMES.next,
      ),
    );
    queue(DENTARG, buildAuctionSnapshot([]), buildAuctionSnapshot([], SNAPSHOT_TIMES.next));

    await watcher.check();
    vi.advanceTimersByTime(MIN_SWEEP_INTERVAL_MS);
    await watcher.check();

    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/^🔔 1 cheap listing · /),
        lines: ["Pattern: Sunfire Silk Spellthread: 10,000g on Blackrock, 12 – 48 h left"],
      }),
    );
  });

  it("stays quiet when nothing is under the watched prices", async () => {
    const { watcher, notify, queue } = setup();
    queue(BLACKROCK, buildAuctionSnapshot([listing(1, COPPER.market)]));
    queue(DENTARG, buildAuctionSnapshot([]));

    await watcher.check();

    expect(notify).not.toHaveBeenCalled();
  });

  it("skips a realm that fails and still reports the rest", async () => {
    const { watcher, notify, log, queue } = setup();
    queue(BLACKROCK, buildAuctionSnapshot([listing(1, COPPER.bargain)]));

    await watcher.check();

    expect(log).toHaveBeenCalledWith(
      `⚠️ Skipped ${DENTARG}: Error: No response queued for ${DENTARG}`,
    );
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("never sweeps twice within the minimum interval", async () => {
    const { watcher, get, queue } = setup();
    queue(BLACKROCK, buildAuctionSnapshot([]));
    queue(DENTARG, buildAuctionSnapshot([]));

    await watcher.check();
    get.mockClear();
    vi.advanceTimersByTime(MIN_SWEEP_INTERVAL_MS - 1);

    expect(await watcher.check()).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });

  it("watches only the commodity market when every item is a commodity", async () => {
    const { watcher, get, notify, queue } = setup([WATCHED.mycobloom]);
    queue(
      "/auctions/commodities",
      buildAuctionSnapshot([
        buildAuction({ item: { id: ITEMS.mycobloom }, quantity: 200, unit_price: 120_000 }),
      ]),
    );

    await watcher.check();

    expect(get).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: ["Mycobloom: from 12g on the commodity market, 200 available"],
      }),
    );
  });
});
