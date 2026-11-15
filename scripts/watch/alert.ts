import { capitalCase } from "change-case";

import type { Alert } from "../notify/types.ts";
import { formatGold } from "../report.ts";
import type { Deal } from "./deals.ts";

const TIME_LEFT: Record<string, string> = {
  SHORT: "under 30 min",
  MEDIUM: "30 min – 2 h",
  LONG: "2 – 12 h",
  VERY_LONG: "12 – 48 h",
};
const MAX_LINES = 20;

const formatAge = (ms: number) => {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
};

type DealGroup = { cheapest: Deal; available: number };

// The commodity market lists every seller's stack separately, which would flood the alert.
const groupByItemAndPlace = (deals: readonly Deal[]): DealGroup[] => {
  const groups = new Map<string, DealGroup>();

  for (const deal of deals) {
    const key = `${deal.itemId}@${deal.connectedRealmId ?? "commodities"}`;
    const group = groups.get(key);

    if (!group) groups.set(key, { cheapest: deal, available: deal.quantity });
    else {
      group.available += deal.quantity;
      if (deal.price < group.cheapest.price) group.cheapest = deal;
    }
  }

  return [...groups.values()].toSorted((a, b) => a.cheapest.price - b.cheapest.price);
};

const describeGroup = (
  { cheapest: { itemId, price, connectedRealmId, realms, timeLeft }, available }: DealGroup,
  itemNames: ReadonlyMap<number, string>,
) => {
  const name = itemNames.get(itemId) ?? `Item ${itemId}`;
  const where =
    connectedRealmId === undefined
      ? "the commodity market"
      : realms.map((realm) => capitalCase(realm)).join(" / ");

  return available === 1
    ? `${name}: ${formatGold(price)} on ${where}, ${TIME_LEFT[timeLeft] ?? timeLeft} left`
    : `${name}: from ${formatGold(price)} on ${where}, ${available.toLocaleString("en-GB")} available`;
};

export const formatDealsAlert = (
  deals: readonly Deal[],
  itemNames: ReadonlyMap<number, string>,
  snapshot?: string,
  now = new Date(),
): Alert => {
  const time = snapshot ? new Date(snapshot) : undefined;
  const groups = groupByItemAndPlace(deals);
  const lines = groups.slice(0, MAX_LINES).map((group) => describeGroup(group, itemNames));

  if (groups.length > MAX_LINES) lines.push(`…and ${groups.length - MAX_LINES} more`);

  return {
    // The age goes in the title because phone notifications show little else.
    title: [
      `🔔 ${deals.length} cheap listing${deals.length === 1 ? "" : "s"}`,
      time && `snapshot ${formatAge(now.getTime() - time.getTime())} old`,
    ]
      .filter(Boolean)
      .join(" · "),
    lines,
    // The Developer API Terms (2.13) require crediting Blizzard as the data source.
    footer: "Data from Blizzard Entertainment",
    time,
  };
};
