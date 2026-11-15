import { describe, expect, it, vi } from "vitest";

import { useFakeClock } from "../clock.fixture.ts";
import { COPPER, ITEMS, PLACES, WATCHED, buildAuction, buildDeal } from "./auctions.fixture.ts";
import { createDealTracker, findDeals } from "./deals.ts";

const watchlist = [WATCHED.spellthread, WATCHED.mycobloom];

describe("findDeals", () => {
  it("returns listings at or below the item's price, converted to gold", () => {
    const auctions = [
      buildAuction({ id: 1, buyout: COPPER.bargain }),
      buildAuction({ id: 2, buyout: 300_000_000 }),
      buildAuction({ id: 3, buyout: COPPER.market }),
    ];

    expect(findDeals(auctions, watchlist, PLACES.blackrock)).toEqual([
      buildDeal({ auctionId: 1, price: 2000.88 }),
      buildDeal({ auctionId: 2, price: 30000 }),
    ]);
  });

  it("compares the price of a single item in a stack", () => {
    const auctions = [buildAuction({ buyout: 400_000_000, quantity: 2 })];

    expect(findDeals(auctions, watchlist, PLACES.blackrock)).toMatchObject([{ price: 20000 }]);
  });

  it("uses the unit price for commodities", () => {
    const auctions = [
      buildAuction({ item: { id: ITEMS.mycobloom }, unit_price: 120_000, quantity: 200 }),
    ];

    expect(findDeals(auctions, watchlist, PLACES.commodityMarket)).toMatchObject([
      { itemId: ITEMS.mycobloom, price: 12, quantity: 200 },
    ]);
  });

  it("skips bid-only auctions and items that aren't watched", () => {
    const auctions = [
      buildAuction({ buyout: undefined }),
      buildAuction({ item: { id: 1 }, buyout: 1 }),
    ];

    expect(findDeals(auctions, watchlist, PLACES.blackrock)).toEqual([]);
  });
});

describe("createDealTracker", () => {
  useFakeClock();

  const deal = (auctionId: number) => buildDeal({ auctionId });

  it("reports a listing only the first time it is seen", () => {
    const tracker = createDealTracker();

    expect(tracker.takeFresh([deal(1), deal(2)])).toEqual([deal(1), deal(2)]);
    expect(tracker.takeFresh([deal(2), deal(3)])).toEqual([deal(3)]);
  });

  it("keeps remembering a listing that skips a snapshot", () => {
    const tracker = createDealTracker();

    tracker.takeFresh([deal(1)]);
    tracker.takeFresh([]);

    expect(tracker.takeFresh([deal(1)])).toEqual([]);
  });

  it("forgets listings after the longest possible auction duration", () => {
    const tracker = createDealTracker();

    tracker.takeFresh([deal(1)]);
    vi.advanceTimersByTime(49 * 60 * 60_000);
    tracker.takeFresh([]);

    expect(tracker.takeFresh([deal(1)])).toEqual([deal(1)]);
  });
});
