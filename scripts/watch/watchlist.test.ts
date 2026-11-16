import { describe, expect, it } from "vitest";

import { ITEMS, WATCHED } from "./auctions.fixture.ts";
import { parseWatchlist } from "./watchlist.ts";

const NEEDS_ITEMS = 'The watchlist needs a non-empty "items" array';
const BAD_ID = "items[0].id must be a positive whole item ID";
const BAD_PRICE = "items[0].maxPrice must be a positive amount of gold";
const BAD_COMMODITY = "items[0].commodity must be true or false";

describe("parseWatchlist", () => {
  it("reads items and treats them as realm auctions by default", () => {
    const watchlist = parseWatchlist({
      items: [
        { id: ITEMS.spellthread, maxPrice: 30000, note: "Pattern: Sunfire Silk Spellthread" },
        { id: ITEMS.mycobloom, maxPrice: 15, commodity: true },
      ],
    });

    expect(watchlist).toEqual([WATCHED.spellthread, WATCHED.mycobloom]);
  });

  it.each([
    [null, NEEDS_ITEMS],
    [{ items: [] }, NEEDS_ITEMS],
    [{ items: [{ id: "258123", maxPrice: 1 }] }, BAD_ID],
    [{ items: [{ id: 1.5, maxPrice: 1 }] }, BAD_ID],
    [{ items: [{ id: 1 }] }, BAD_PRICE],
    [{ items: [{ id: 1, maxPrice: 0 }] }, BAD_PRICE],
    [{ items: [{ id: 1, maxPrice: 1, commodity: "yes" }] }, BAD_COMMODITY],
  ])("rejects %j", (raw, message) => {
    expect(() => parseWatchlist(raw)).toThrow(message);
  });
});
