import { describe, expect, it } from "vitest";

import { formatDealsAlert } from "./alert.ts";
import type { Deal } from "./deals.ts";

const itemNames = new Map([
  [258123, "Pattern: Sunfire Silk Spellthread"],
  [210796, "Mycobloom"],
]);

const deal = (overrides: Partial<Deal>): Deal => ({
  auctionId: 1,
  itemId: 258123,
  price: 2000.88,
  quantity: 1,
  timeLeft: "VERY_LONG",
  connectedRealmId: 581,
  realms: ["blackrock"],
  ...overrides,
});

describe("formatDealsAlert", () => {
  it("lists deals cheapest first and credits Blizzard", () => {
    const alert = formatDealsAlert(
      [
        deal({
          price: 25000,
          connectedRealmId: 1084,
          realms: ["dentarg", "tarren-mill"],
          timeLeft: "SHORT",
        }),
        deal({ itemId: 210796, price: 12, quantity: 200, connectedRealmId: undefined, realms: [] }),
        deal({}),
      ],
      itemNames,
      "Sun, 15 Nov 2026 10:22:12 GMT",
    );

    expect(alert).toEqual({
      title: "🔔 3 cheap listings",
      lines: [
        "Mycobloom: from 12g on the commodity market, 200 available",
        "Pattern: Sunfire Silk Spellthread: 2,000.88g on Blackrock, 12 – 48 h left",
        "Pattern: Sunfire Silk Spellthread: 25,000g on Dentarg / Tarren Mill, under 30 min left",
      ],
      footer: "Snapshot Sun, 15 Nov 2026 10:22:12 GMT · Data from Blizzard Entertainment",
    });
  });

  it("falls back to the item ID when the name is unknown", () => {
    const alert = formatDealsAlert([deal({ itemId: 1 })], itemNames);

    expect(alert.title).toBe("🔔 1 cheap listing");
    expect(alert.lines[0]).toMatch(/^Item 1: /);
    expect(alert.footer).toBe("Data from Blizzard Entertainment");
  });

  it("sums listings of the same item in the same place into one line", () => {
    const commodity = { itemId: 210796, connectedRealmId: undefined, realms: [] };
    const alert = formatDealsAlert(
      [
        deal({ ...commodity, auctionId: 1, price: 3.38, quantity: 9 }),
        deal({ ...commodity, auctionId: 2, price: 3.2, quantity: 1200 }),
        deal({ auctionId: 3, price: 2000.88 }),
        deal({ auctionId: 4, price: 2500 }),
      ],
      itemNames,
    );

    expect(alert.title).toBe("🔔 4 cheap listings");
    expect(alert.lines).toEqual([
      "Mycobloom: from 3.2g on the commodity market, 1,209 available",
      "Pattern: Sunfire Silk Spellthread: from 2,000.88g on Blackrock, 2 available",
    ]);
  });

  it("caps the list and says how many were left out", () => {
    const deals = Array.from({ length: 23 }, (_, index) =>
      deal({ auctionId: index, connectedRealmId: index }),
    );

    const { lines } = formatDealsAlert(deals, itemNames);

    expect(lines).toHaveLength(21);
    expect(lines.at(-1)).toBe("…and 3 more");
  });
});
