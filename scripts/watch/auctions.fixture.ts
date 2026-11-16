import { SNAPSHOT_TIMES, buildOkResponse } from "../blizzard/api.fixture.ts";
import type { Auction, Deal } from "./deals.ts";
import type { WatchedItem } from "./watchlist.ts";

export const ITEMS = { spellthread: 258123, mycobloom: 210796 } as const;

export const ITEM_NAMES: ReadonlyMap<number, string> = new Map([
  [ITEMS.spellthread, "Pattern: Sunfire Silk Spellthread"],
  [ITEMS.mycobloom, "Mycobloom"],
]);

export const WATCHED = {
  spellthread: { id: ITEMS.spellthread, maxPrice: 30000, commodity: false },
  mycobloom: { id: ITEMS.mycobloom, maxPrice: 15, commodity: true },
} satisfies Record<string, WatchedItem>;

/** Where a deal was found, in the shape deals carry it. */
export const PLACES = {
  blackrock: { connectedRealmId: 581, realms: ["blackrock"] },
  dentargTarrenMill: { connectedRealmId: 1084, realms: ["dentarg", "tarren-mill"] },
  commodityMarket: { connectedRealmId: undefined, realms: [] },
};

/** The same realms in the shape the watcher is configured with. */
export const CONNECTED_REALMS = [PLACES.blackrock, PLACES.dentargTarrenMill].map(
  ({ connectedRealmId, realms }) => ({ id: connectedRealmId, realms }),
);

/** Real Spellthread buyouts in copper, seen on Blackrock on 2026-11-15. */
/** When an alert for the current snapshot goes out, 26 minutes after Blizzard published it. */
export const ALERTED_AT = new Date("2026-11-15T10:48:12Z");

export const COPPER = { bargain: 20_008_800, market: 699_989_100 } as const;

export const buildAuction = (overrides: Partial<Auction> = {}): Auction => ({
  id: 1,
  item: { id: ITEMS.spellthread },
  quantity: 1,
  time_left: "VERY_LONG",
  ...overrides,
});

export const buildDeal = (overrides: Partial<Deal> = {}): Deal => ({
  ...PLACES.blackrock,
  auctionId: 1,
  itemId: ITEMS.spellthread,
  price: 2000.88,
  quantity: 1,
  timeLeft: "VERY_LONG",
  ...overrides,
});

export const buildAuctionSnapshot = (
  auctions: Auction[],
  lastModified: string = SNAPSHOT_TIMES.current,
) => buildOkResponse({ auctions }, lastModified);
