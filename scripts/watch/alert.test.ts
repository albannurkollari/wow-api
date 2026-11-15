import { describe, expect, it } from "vitest";

import { SNAPSHOT_TIMES } from "../blizzard/api.fixture.ts";
import { formatDealsAlert } from "./alert.ts";
import { ITEMS, ITEM_NAMES, PLACES, buildDeal } from "./auctions.fixture.ts";

const CREDIT = "Data from Blizzard Entertainment";

describe("formatDealsAlert", () => {
  it("lists deals cheapest first and credits Blizzard", () => {
    const alert = formatDealsAlert(
      [
        buildDeal({ ...PLACES.dentargTarrenMill, price: 25000, timeLeft: "SHORT" }),
        buildDeal({ ...PLACES.commodityMarket, itemId: ITEMS.mycobloom, price: 12, quantity: 200 }),
        buildDeal(),
      ],
      ITEM_NAMES,
      SNAPSHOT_TIMES.current,
    );

    expect(alert).toEqual({
      title: "🔔 3 cheap listings",
      lines: [
        "Mycobloom: from 12g on the commodity market, 200 available",
        "Pattern: Sunfire Silk Spellthread: 2,000.88g on Blackrock, 12 – 48 h left",
        "Pattern: Sunfire Silk Spellthread: 25,000g on Dentarg / Tarren Mill, under 30 min left",
      ],
      footer: `Snapshot ${SNAPSHOT_TIMES.current} · ${CREDIT}`,
    });
  });

  it("falls back to the item ID when the name is unknown", () => {
    const alert = formatDealsAlert([buildDeal({ itemId: 1 })], ITEM_NAMES);

    expect(alert.title).toBe("🔔 1 cheap listing");
    expect(alert.lines[0]).toMatch(/^Item 1: /);
    expect(alert.footer).toBe(CREDIT);
  });

  it("sums listings of the same item in the same place into one line", () => {
    const mycobloom = { ...PLACES.commodityMarket, itemId: ITEMS.mycobloom };
    const alert = formatDealsAlert(
      [
        buildDeal({ ...mycobloom, auctionId: 1, price: 3.38, quantity: 9 }),
        buildDeal({ ...mycobloom, auctionId: 2, price: 3.2, quantity: 1200 }),
        buildDeal({ auctionId: 3, price: 2000.88 }),
        buildDeal({ auctionId: 4, price: 2500 }),
      ],
      ITEM_NAMES,
    );

    expect(alert.title).toBe("🔔 4 cheap listings");
    expect(alert.lines).toEqual([
      "Mycobloom: from 3.2g on the commodity market, 1,209 available",
      "Pattern: Sunfire Silk Spellthread: from 2,000.88g on Blackrock, 2 available",
    ]);
  });

  it("caps the list and says how many were left out", () => {
    const deals = Array.from({ length: 23 }, (_, index) =>
      buildDeal({ auctionId: index, connectedRealmId: index }),
    );

    const { lines } = formatDealsAlert(deals, ITEM_NAMES);

    expect(lines).toHaveLength(21);
    expect(lines.at(-1)).toBe("…and 3 more");
  });
});
