import { describe, expect, it } from "vitest";

import { parseWatchlist } from "./watchlist.ts";

describe("parseWatchlist", () => {
  it("reads items and treats them as realm auctions by default", () => {
    const watchlist = parseWatchlist({
      items: [
        { id: 258123, maxPrice: 30000, note: "Pattern: Sunfire Silk Spellthread" },
        { id: 210796, maxPrice: 12.5, commodity: true },
      ],
    });

    expect(watchlist).toEqual([
      { id: 258123, maxPrice: 30000, commodity: false },
      { id: 210796, maxPrice: 12.5, commodity: true },
    ]);
  });

  it.each([
    [null, 'The watchlist needs a non-empty "items" array'],
    [{ items: [] }, 'The watchlist needs a non-empty "items" array'],
    [{ items: [{ id: "258123", maxPrice: 1 }] }, "items[0].id must be a positive whole item ID"],
    [{ items: [{ id: 1.5, maxPrice: 1 }] }, "items[0].id must be a positive whole item ID"],
    [{ items: [{ id: 1 }] }, "items[0].maxPrice must be a positive amount of gold"],
    [{ items: [{ id: 1, maxPrice: 0 }] }, "items[0].maxPrice must be a positive amount of gold"],
    [
      { items: [{ id: 1, maxPrice: 1, commodity: "yes" }] },
      "items[0].commodity must be true or false",
    ],
  ])("rejects %j", (raw, message) => {
    expect(() => parseWatchlist(raw)).toThrow(message);
  });
});
