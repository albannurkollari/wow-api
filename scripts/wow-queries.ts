import dotenv from "dotenv";
import { File } from "./file";

import { CONNECTED_REALMS, CONNECTED_REALM_IDS } from "../src/constants/servers";

// Constants
import {
  ACCESS_TOKEN,
  DEFAULT_HEADERS,
  LOCALE,
  LOCALES,
  NAMESPACE,
  NAMESPACES,
} from "../src/constants/api";

dotenv.config({ path: ".env.local" });

type Namespace = "dynamic" | "static" | "profile";
type Region = "eu" | "us";
type WoWQueryType = "auctions" | "commodities" | "item" | "realms";
type WoWQueryTypeFlag = "-a" | "-c" | "-i" | "-r";
type WoWURLOptions = {
  crID?: number;
  itemID?: number;
  region?: Region;
};
type RealmsWithId = { id: number; realms: string[] };
type RealmsBuyoutPrice = { buyout: number; realms?: string[] };
type ItemInfo = {
  id: number | string;
  isCommodity?: boolean;
  name: string;
  description: string;
  prices: { cheapest?: RealmsBuyoutPrice | number; all?: Record<string, RealmsBuyoutPrice> };
};

const getCommonParams = (accessToken: string, namespace: Namespace, region: Region) =>
  new URLSearchParams({
    [NAMESPACE]: `${namespace}-${region}`,
    [LOCALE]: LOCALES.EN_GB,
    [ACCESS_TOKEN]: accessToken,
  }).toString();

const craftWoWURLWithToken = (
  type: WoWQueryType,
  { crID, itemID, region = "eu" }: WoWURLOptions = {},
) => {
  const accessToken = process.env.CURRENT_ACCESS_TOKEN;
  const _url = new URL(`https://${region}.api.blizzard.com/`);
  const basePath = "/data/wow";

  switch (type) {
    case "auctions": {
      _url.pathname = `${basePath}/connected-realm/${crID}/auctions`;
      _url.search = getCommonParams(accessToken, NAMESPACES.DYNAMIC, region);
      break;
    }
    case "commodities": {
      _url.pathname = `${basePath}/auctions/commodities`;
      _url.search = getCommonParams(accessToken, NAMESPACES.DYNAMIC, region);
      break;
    }
    case "item": {
      _url.pathname = `${basePath}/item/${itemID}`;
      _url.search = getCommonParams(accessToken, NAMESPACES.STATIC, region);
      break;
    }
    case "realms": {
      _url.pathname = `${basePath}/connected-realm/${crID}`;
      _url.search = getCommonParams(accessToken, NAMESPACES.DYNAMIC, region);
      break;
    }
  }

  return _url.toString();
};

let LOCAL_ITEM_ID = 0;
let LOCAL_ITEM_IDS: number[] | null = null;
let IS_COMMODITY = false;
let QUERY_TYPE: WoWQueryTypeFlag = "-a";
let DEBUG_LEVEL = 0;

const grabCheapestItemFromAuctions = ({ auctions = [] } = {}, itemID = LOCAL_ITEM_ID) => {
  let smallestBuyoutItem = null;
  let smallestBuyout = Number.POSITIVE_INFINITY;

  for (const auction of auctions) {
    if (auction.item.id === itemID) {
      const priceProp = IS_COMMODITY ? "unit_price" : "buyout";

      if (auction[priceProp] < smallestBuyout) {
        smallestBuyout = auction.buyout;
        smallestBuyoutItem = auction;
      }
    }
  }

  if (smallestBuyoutItem?.hasOwnProperty("unit_price")) {
    smallestBuyoutItem.buyout = smallestBuyoutItem.unit_price;
    delete smallestBuyoutItem.unit_price;
  }

  return smallestBuyoutItem as { buyout: number };
};

const getAllAuctions = ({ id, realms }: Partial<RealmsWithId> = {}): Promise<
  RealmsWithId & { auctions: any[] }
> => {
  const method = IS_COMMODITY ? "commodities" : "auctions";
  const url = craftWoWURLWithToken(method, { crID: id });
  DEBUG_LEVEL > 0 && console.log(url);

  return fetch(url, DEFAULT_HEADERS)
    .then((response) => response.json())
    .then((data) => ({ ...data, id, realms }))
    .catch(console.error);
};

const grabItemInfo = async (id: number = LOCAL_ITEM_ID, rawInfo = false): Promise<ItemInfo> => {
  try {
    const url = craftWoWURLWithToken("item", { itemID: id });
    const result = await (await fetch(url, DEFAULT_HEADERS)).json();
    const { name, description } = result;

    if (rawInfo) return result;

    return { id, name, description, prices: {} };
  } catch (error) {}
};

const startQueries = async () => {
  switch (QUERY_TYPE) {
    case "-a":
    case "-c": {
      let item: ItemInfo | undefined;
      let items: ItemInfo[] | undefined;

      if (!!LOCAL_ITEM_IDS?.length) {
        items = await Promise.all(LOCAL_ITEM_IDS.map((id) => grabItemInfo(id)));
        items.forEach((item) => {
          console.log(`--> Fetching prices across all EU servers for item:\n ${item.name}!\n`);
        });
      } else {
        item = await grabItemInfo();
        console.log(`--> Fetching prices across all EU servers for item:\n ${item.name}!\n`);
      }

      const itemsColl = !!items ? items : [item];
      const itemsPrices = {} as Record<string, (RealmsBuyoutPrice & { id: number })[]>;
      const auctionRealms = IS_COMMODITY ? [CONNECTED_REALMS[0]] : CONNECTED_REALMS;
      const auctionsData = await Promise.all(auctionRealms.map(getAllAuctions));

      auctionsData.forEach(({ id, auctions, realms }) => {
        itemsColl.forEach((item) => {
          try {
            const auction = grabCheapestItemFromAuctions({ auctions }, item.id as number);

            if (!itemsPrices[item.id]) {
              itemsPrices[item.id] = [];
            }

            if (!!auction?.buyout) {
              itemsPrices[item.id].push({ id, buyout: auction.buyout / 10000, realms });
            }
          } catch (error) {
            console.error("Error parsing auction item!");
            console.error(error);
          }
        });
      });

      for (const [itemId, item] of Object.entries(itemsPrices)) {
        const [{ id: crId, ...cheapest }] = item.sort((a, b) => a.buyout - b.buyout);
        const currentItemInfo = itemsColl.find((item) => item.id === parseInt(itemId));
        const allServerPrices = item.reduce(
          (acc, { id, ...rest }) => ({ ...acc, [id]: rest }),
          {} as Record<string, RealmsBuyoutPrice>,
        );

        if (currentItemInfo) {
          currentItemInfo.prices = { cheapest, all: allServerPrices };

          File.async.write(
            currentItemInfo,
            File.utils.getName(`${itemId}-${currentItemInfo.name}`),
          );
        }
      }
      break;
    }
    case "-i":
      {
        const item = await grabItemInfo(LOCAL_ITEM_ID, true);

        File.async.write(item, File.utils.getName(`${LOCAL_ITEM_ID}-${item.name}`));
      }
      break;
    case "-r": {
      try {
        const realmsResponse = await Promise.allSettled<{ id: number; realms: string[] }>(
          CONNECTED_REALM_IDS.map((crID) => {
            const url = craftWoWURLWithToken("realms", { crID });

            return fetch(url, DEFAULT_HEADERS)
              .then((res) => res.json())
              .then((res) => ({ id: res.id, realms: res.realms.map(({ slug }) => slug) }));
          }),
        );
        const result = realmsResponse as {
          status: "fulfilled" | "rejected";
          value: { id: number; realms: string[] };
        }[];

        const realmsData = result
          .filter((item) => item.status === "fulfilled")
          .map((item) => item.value);

        File.async.write(realmsData, "./data/realms.json");
      } catch (error) {
        console.log(error);
      }

      break;
    }
    default:
      throw new Error("Invalid or unsupported WoW API query type!");
  }
};

const parseLocalItemId = (itemId: string) => {
  if (/^(\d{6,6})(,\d{6,6})+?$/) {
    LOCAL_ITEM_IDS = itemId.split(",").map((id) => parseInt(id));
  } else {
    LOCAL_ITEM_ID = parseInt(itemId);
  }
};

if (process.argv.length === 3) {
  parseLocalItemId(process.argv.at(-1));
} else if (process.argv.length === 4) {
  parseLocalItemId(process.argv.at(-2));
  QUERY_TYPE = process.argv.at(-1) as WoWQueryTypeFlag;
  IS_COMMODITY = QUERY_TYPE === "-c";
  DEBUG_LEVEL = !IS_COMMODITY ? parseInt(process.argv.at(-1)) : 0;
} else if (process.argv.length === 5) {
  parseLocalItemId(process.argv.at(-3));
  QUERY_TYPE = process.argv.at(-2) as WoWQueryTypeFlag;
  IS_COMMODITY = QUERY_TYPE === "-c";
  DEBUG_LEVEL = parseInt(process.argv.at(-1)) || 0;
}

startQueries();
