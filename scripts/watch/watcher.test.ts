import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ApiResponse, BlizzardClient } from "../blizzard/client.ts";
import type { Alert } from "../notify/types.ts";
import type { Auction } from "./deals.ts";
import { MIN_SWEEP_INTERVAL_MS, createAuctionWatcher } from "./watcher.ts";

const SNAPSHOT = "Sun, 15 Nov 2026 10:22:12 GMT";
const NEXT_SNAPSHOT = "Sun, 15 Nov 2026 11:22:12 GMT";
const SPELLTHREAD = 258123;
const MYCOBLOOM = 210796;

const connectedRealms = [
  { id: 581, realms: ["blackrock"] },
  { id: 1084, realms: ["dentarg", "tarren-mill"] },
];
const itemNames = new Map([[SPELLTHREAD, "Pattern: Sunfire Silk Spellthread"]]);

const listing = (id: number, buyout: number): Auction => ({
  id,
  item: { id: SPELLTHREAD },
  quantity: 1,
  buyout,
  time_left: "VERY_LONG",
});

const snapshot = (auctions: Auction[], lastModified = SNAPSHOT): ApiResponse<unknown> => ({
  status: 200,
  lastModified,
  data: { auctions },
});

const setup = (watchlist = [{ id: SPELLTHREAD, maxPrice: 30000, commodity: false }]) => {
  const responses = new Map<string, ApiResponse<unknown>[]>();
  const get = vi.fn<(path: string) => Promise<ApiResponse<unknown>>>(async (path) => {
    const response = responses.get(path)?.shift();
    if (!response) throw new Error(`No response queued for ${path}`);
    return response;
  });
  const client = { get } as unknown as BlizzardClient;
  const notify = vi.fn<(alert: Alert) => Promise<void>>(async () => {});
  const log = vi.fn<(message: string) => void>();
  const watcher = createAuctionWatcher({
    client,
    watchlist,
    connectedRealms,
    itemNames,
    notify,
    log,
  });
  const queue = (path: string, ...queued: ApiResponse<unknown>[]) =>
    responses.set(path, [...(responses.get(path) ?? []), ...queued]);

  return { watcher, get, notify, log, queue };
};

describe("createAuctionWatcher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sweeps every connected realm on a new snapshot and reports the deals", async () => {
    const { watcher, notify, queue } = setup();
    queue("/connected-realm/581/auctions", snapshot([listing(1, 20_008_800)]));
    queue(
      "/connected-realm/1084/auctions",
      snapshot([listing(2, 250_000_000), listing(3, 699_989_100)]),
    );

    expect(await watcher.check()).toBe(true);

    expect(notify).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith({
      title: "🔔 2 cheap listings",
      lines: [
        "Pattern: Sunfire Silk Spellthread: 2,000.88g on Blackrock, 12 – 48 h left",
        "Pattern: Sunfire Silk Spellthread: 25,000g on Dentarg / Tarren Mill, 12 – 48 h left",
      ],
      footer: `Snapshot ${SNAPSHOT} · Data from Blizzard Entertainment`,
    });
  });

  it("only asks the sentinel realm whether anything changed until a new snapshot appears", async () => {
    const { watcher, get, queue } = setup();
    queue("/connected-realm/581/auctions", snapshot([]), { status: 304 });
    queue("/connected-realm/1084/auctions", snapshot([]));

    await watcher.check();
    vi.advanceTimersByTime(MIN_SWEEP_INTERVAL_MS);
    get.mockClear();

    expect(await watcher.check()).toBe(false);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith("/connected-realm/581/auctions", {
      namespace: "dynamic",
      ifModifiedSince: SNAPSHOT,
    });
  });

  it("does not report the same listing twice", async () => {
    const { watcher, notify, queue } = setup();
    queue(
      "/connected-realm/581/auctions",
      snapshot([listing(1, 20_008_800)]),
      snapshot([listing(1, 20_008_800), listing(4, 100_000_000)], NEXT_SNAPSHOT),
    );
    queue("/connected-realm/1084/auctions", snapshot([]), snapshot([], NEXT_SNAPSHOT));

    await watcher.check();
    vi.advanceTimersByTime(MIN_SWEEP_INTERVAL_MS);
    await watcher.check();

    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenLastCalledWith(
      expect.objectContaining({
        title: "🔔 1 cheap listing",
        lines: ["Pattern: Sunfire Silk Spellthread: 10,000g on Blackrock, 12 – 48 h left"],
      }),
    );
  });

  it("stays quiet when nothing is under the watched prices", async () => {
    const { watcher, notify, queue } = setup();
    queue("/connected-realm/581/auctions", snapshot([listing(1, 699_989_100)]));
    queue("/connected-realm/1084/auctions", snapshot([]));

    await watcher.check();

    expect(notify).not.toHaveBeenCalled();
  });

  it("skips a realm that fails and still reports the rest", async () => {
    const { watcher, notify, log, queue } = setup();
    queue("/connected-realm/581/auctions", snapshot([listing(1, 20_008_800)]));

    await watcher.check();

    expect(log).toHaveBeenCalledWith(
      "⚠️ Skipped /connected-realm/1084/auctions: Error: No response queued for /connected-realm/1084/auctions",
    );
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("never sweeps twice within the minimum interval", async () => {
    const { watcher, get, queue } = setup();
    queue("/connected-realm/581/auctions", snapshot([]));
    queue("/connected-realm/1084/auctions", snapshot([]));

    await watcher.check();
    get.mockClear();
    vi.advanceTimersByTime(MIN_SWEEP_INTERVAL_MS - 1);

    expect(await watcher.check()).toBe(false);
    expect(get).not.toHaveBeenCalled();
  });

  it("watches only the commodity market when every item is a commodity", async () => {
    const { watcher, get, notify, queue } = setup([
      { id: MYCOBLOOM, maxPrice: 15, commodity: true },
    ]);
    queue(
      "/auctions/commodities",
      snapshot([
        { id: 9, item: { id: MYCOBLOOM }, quantity: 200, unit_price: 120_000, time_left: "LONG" },
      ]),
    );

    await watcher.check();

    expect(get).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: ["Item 210796: from 12g on the commodity market, 200 available"],
      }),
    );
  });
});
