import type { BlizzardClient } from "../blizzard/client.ts";
import type { Alert } from "../notify/types.ts";
import { formatDealsAlert } from "./alert.ts";
import {
  type Auction,
  type AuctionSource,
  type Deal,
  createDealTracker,
  findDeals,
} from "./deals.ts";
import type { WatchedItem } from "./watchlist.ts";

type ConnectedRealm = { id: number; realms: readonly string[] };
type Source = AuctionSource & { path: string; items: WatchedItem[] };

type WatcherOptions = {
  client: BlizzardClient;
  watchlist: WatchedItem[];
  connectedRealms: readonly ConnectedRealm[];
  itemNames: ReadonlyMap<number, string>;
  notify: (alert: Alert) => Promise<void>;
  log?: (message: string) => void;
};

// Snapshots come about once an hour; this floor caps the cost if that ever changes.
export const MIN_SWEEP_INTERVAL_MS = 10 * 60_000;

export const createAuctionWatcher = ({
  client,
  watchlist,
  connectedRealms,
  itemNames,
  notify,
  log = console.log,
}: WatcherOptions) => {
  const realmItems = watchlist.filter(({ commodity }) => !commodity);
  const commodityItems = watchlist.filter(({ commodity }) => commodity);
  const sources: Source[] = [
    ...(realmItems.length
      ? connectedRealms.map(({ id, realms }) => ({
          path: `/connected-realm/${id}/auctions`,
          connectedRealmId: id,
          realms,
          items: realmItems,
        }))
      : []),
    ...(commodityItems.length
      ? [{ path: "/auctions/commodities", realms: [], items: commodityItems }]
      : []),
  ];
  // Every connected realm gets a new snapshot at the same moment, so one of them is enough to watch.
  const [sentinel, ...others] = sources;
  const tracker = createDealTracker();
  let lastSnapshot: string | undefined;
  let lastSweepAt = Number.NEGATIVE_INFINITY;

  const fetchAuctions = (source: Source, ifModifiedSince?: string) =>
    client.get<{ auctions?: Auction[] }>(source.path, { namespace: "dynamic", ifModifiedSince });

  const dealsIn = (source: Source, auctions: Auction[] = []) =>
    findDeals(auctions, source.items, source);

  const sweepOthers = async (): Promise<Deal[]> => {
    const results = await Promise.allSettled(
      others.map(async (source) => {
        const response = await fetchAuctions(source);
        return response.status === 200 ? dealsIn(source, response.data.auctions) : [];
      }),
    );

    return results.flatMap((result, index) => {
      if (result.status === "fulfilled") return result.value;

      log(`⚠️ Skipped ${others[index].path}: ${String(result.reason)}`);
      return [];
    });
  };

  return {
    /** Returns whether a new snapshot was found and swept. */
    check: async () => {
      if (Date.now() - lastSweepAt < MIN_SWEEP_INTERVAL_MS) return false;

      const response = await fetchAuctions(sentinel, lastSnapshot);
      if (response.status === 304) return false;

      lastSweepAt = Date.now();
      lastSnapshot = response.lastModified;

      const deals = [...dealsIn(sentinel, response.data.auctions), ...(await sweepOthers())];
      const fresh = tracker.takeFresh(deals);

      log(
        `📦 Snapshot ${lastSnapshot ?? "(undated)"}: ${deals.length} listing(s) at or under your prices, ${fresh.length} new`,
      );
      if (fresh.length) await notify(formatDealsAlert(fresh, itemNames, lastSnapshot));

      return true;
    },
  };
};
