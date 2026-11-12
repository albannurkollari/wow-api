import { describe, expect, it } from "vitest";

import { formatCheapestReport } from "./report.ts";

const item = { id: 258123, name: "Pattern: Sunfire Silk Spellthread" };

describe("formatCheapestReport", () => {
  it("names the cheapest price and the realms that list it", () => {
    const report = formatCheapestReport(item, {
      listings: [
        { id: 1618, buyout: 48179, realms: ["die-aldor"] },
        { id: 1084, buyout: 47998.91, realms: ["dentarg", "tarren-mill"] },
      ],
      totalRealms: 92,
    });

    expect(report).toBe(
      [
        "💰 Pattern: Sunfire Silk Spellthread (258123)",
        "   Cheapest: 47,998.91g on Dentarg / Tarren Mill (connected realm 1084)",
        "   Listed on 2 of 92 connected realms",
      ].join("\n"),
    );
  });

  it("reports region-wide commodities without realms", () => {
    const report = formatCheapestReport(item, {
      listings: [{ id: 1080, buyout: 12.5, realms: ["khadgar", "bloodhoof"] }],
      totalRealms: 92,
      isCommodity: true,
    });

    expect(report).toBe(
      [
        "💰 Pattern: Sunfire Silk Spellthread (258123)",
        "   Cheapest: 12.5g on the region-wide commodity market",
      ].join("\n"),
    );
  });

  it("says so when nothing is listed", () => {
    const report = formatCheapestReport(item, { listings: [], totalRealms: 92 });

    expect(report).toBe("❌ Pattern: Sunfire Silk Spellthread (258123): no listings found");
  });
});
