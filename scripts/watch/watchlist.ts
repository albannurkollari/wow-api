import { readFile } from "node:fs/promises";

export type WatchedItem = {
  id: number;
  /** In gold, per item. */
  maxPrice: number;
  /** Commodities trade on one region-wide market instead of per connected realm. */
  commodity: boolean;
};

type RawItem = { id?: unknown; maxPrice?: unknown; commodity?: unknown };

export const parseWatchlist = (raw: unknown): WatchedItem[] => {
  const items = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(items) || !items.length) {
    throw new Error('The watchlist needs a non-empty "items" array');
  }

  return items.map((item: RawItem, index) => {
    const { id, maxPrice, commodity = false } = item ?? {};

    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) {
      throw new Error(`items[${index}].id must be a positive whole item ID`);
    }
    if (typeof maxPrice !== "number" || !(maxPrice > 0)) {
      throw new Error(`items[${index}].maxPrice must be a positive amount of gold`);
    }
    if (typeof commodity !== "boolean") {
      throw new Error(`items[${index}].commodity must be true or false`);
    }

    return { id, maxPrice, commodity };
  });
};

export const loadWatchlist = async (filePath: string) => {
  const content = await readFile(filePath, "utf-8").catch(() => {
    throw new Error(`Could not read ${filePath}. Copy watchlist.example.json to get started.`);
  });

  return parseWatchlist(JSON.parse(content));
};
