import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type Auction, type Deal, createDealTracker, findDeals } from "./deals.ts";

const SPELLTHREAD = 258123;
const MYCOBLOOM = 210796;
const blackrock = { connectedRealmId: 581, realms: ["blackrock"] };

const auction = (overrides: Partial<Auction>): Auction => ({
  id: 1,
  item: { id: SPELLTHREAD },
  quantity: 1,
  time_left: "VERY_LONG",
  ...overrides,
});

describe("findDeals", () => {
  const watchlist = [
    { id: SPELLTHREAD, maxPrice: 30000, commodity: false },
    { id: MYCOBLOOM, maxPrice: 15, commodity: true },
  ];

  it("returns listings at or below the item's price, converted to gold", () => {
    const auctions = [
      auction({ id: 1, buyout: 20_008_800 }),
      auction({ id: 2, buyout: 300_000_000 }),
      auction({ id: 3, buyout: 699_989_100 }),
    ];

    expect(findDeals(auctions, watchlist, blackrock)).toEqual([
      {
        ...blackrock,
        auctionId: 1,
        itemId: SPELLTHREAD,
        price: 2000.88,
        quantity: 1,
        timeLeft: "VERY_LONG",
      },
      {
        ...blackrock,
        auctionId: 2,
        itemId: SPELLTHREAD,
        price: 30000,
        quantity: 1,
        timeLeft: "VERY_LONG",
      },
    ]);
  });

  it("compares the price of a single item in a stack", () => {
    const auctions = [auction({ buyout: 400_000_000, quantity: 2 })];

    expect(findDeals(auctions, watchlist, blackrock)).toMatchObject([{ price: 20000 }]);
  });

  it("uses the unit price for commodities", () => {
    const auctions = [auction({ item: { id: MYCOBLOOM }, unit_price: 120_000, quantity: 200 })];

    expect(findDeals(auctions, watchlist, { realms: [] })).toMatchObject([
      { itemId: MYCOBLOOM, price: 12, quantity: 200 },
    ]);
  });

  it("skips bid-only auctions and items that aren't watched", () => {
    const auctions = [auction({ buyout: undefined }), auction({ item: { id: 1 }, buyout: 1 })];

    expect(findDeals(auctions, watchlist, blackrock)).toEqual([]);
  });
});

describe("createDealTracker", () => {
  const deal = (auctionId: number) => ({ auctionId }) as Deal;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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
