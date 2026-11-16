import type { WatchedItem } from "./watchlist.ts";

export type Auction = {
  id: number;
  item: { id: number };
  quantity: number;
  buyout?: number;
  unit_price?: number;
  time_left: string;
};

export type AuctionSource = { connectedRealmId?: number; realms: readonly string[] };

export type Deal = AuctionSource & {
  auctionId: number;
  itemId: number;
  /** In gold, per item. */
  price: number;
  quantity: number;
  timeLeft: string;
};

const COPPER_PER_GOLD = 10_000;
// Auctions last at most 48 hours, so an ID unseen for longer can never come back.
const FORGET_AFTER_MS = 48 * 60 * 60_000;

const pricePerItem = ({ buyout, unit_price, quantity }: Auction) => {
  // Commodities are priced per unit; realm auctions price the whole stack and may be bid-only.
  if (unit_price !== undefined) return unit_price;
  if (buyout !== undefined) return buyout / quantity;
};

export const findDeals = (
  auctions: readonly Auction[],
  watchlist: readonly WatchedItem[],
  source: AuctionSource,
): Deal[] => {
  const maxPrices = new Map(watchlist.map(({ id, maxPrice }) => [id, maxPrice]));

  return auctions.flatMap((auction) => {
    const maxPrice = maxPrices.get(auction.item.id);
    const copper = pricePerItem(auction);
    if (maxPrice === undefined || copper === undefined) return [];

    const price = copper / COPPER_PER_GOLD;
    if (price > maxPrice) return [];

    return [
      {
        ...source,
        auctionId: auction.id,
        itemId: auction.item.id,
        price,
        quantity: auction.quantity,
        timeLeft: auction.time_left,
      },
    ];
  });
};

/** Remembers reported auctions so a listing that survives several snapshots is reported once. */
export const createDealTracker = () => {
  const lastSeenAt = new Map<number, number>();

  return {
    takeFresh: (deals: readonly Deal[]) => {
      const now = Date.now();
      const fresh = deals.filter(({ auctionId }) => !lastSeenAt.has(auctionId));

      deals.forEach(({ auctionId }) => lastSeenAt.set(auctionId, now));
      for (const [auctionId, seenAt] of lastSeenAt) {
        if (now - seenAt > FORGET_AFTER_MS) lastSeenAt.delete(auctionId);
      }

      return fresh;
    },
  };
};
