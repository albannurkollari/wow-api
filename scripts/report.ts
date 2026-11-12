import { capitalCase } from "change-case";

type Listing = { id: number; buyout: number; realms?: string[] };
type ReportOptions = { listings: Listing[]; totalRealms: number; isCommodity?: boolean };

const formatGold = (gold: number) =>
  `${gold.toLocaleString("en-GB", { maximumFractionDigits: 2 })}g`;

export const formatCheapestReport = (
  { id, name }: { id: number | string; name: string },
  { listings, totalRealms, isCommodity = false }: ReportOptions,
) => {
  const title = `${name} (${id})`;

  if (!listings.length) return `❌ ${title}: no listings found`;

  const cheapest = listings.reduce((min, listing) => (listing.buyout < min.buyout ? listing : min));

  // Commodities share one region-wide market, so the realm they were fetched through is meaningless.
  if (isCommodity) {
    return [
      `💰 ${title}`,
      `   Cheapest: ${formatGold(cheapest.buyout)} on the region-wide commodity market`,
    ].join("\n");
  }

  const realms = (cheapest.realms ?? []).map((realm) => capitalCase(realm)).join(" / ");

  return [
    `💰 ${title}`,
    `   Cheapest: ${formatGold(cheapest.buyout)} on ${realms} (connected realm ${cheapest.id})`,
    `   Listed on ${listings.length} of ${totalRealms} connected realms`,
  ].join("\n");
};
