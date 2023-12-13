import { mkdir, writeFile } from "node:fs/promises";
import * as prettier from "prettier";
import dotenv from "dotenv";

import { CONNECTED_REALMS, CONNECTED_REALM_IDS } from "../src/constants/servers";

import { kebabCase } from "change-case";

// Constants
import {
  ACCESS_TOKEN,
  DEFAULT_HEADERS,
  NAMESPACE,
  NAMESPACES,
  LOCALE,
  LOCALES,
} from "../src/constants/api";
import path from "node:path";

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
type RealmsWithId = { buyout: number; realms?: string[] };
type ItemInfo = {
  id: number | string;
  isCommodity?: boolean;
  name: string;
  description: string;
  prices: { cheapest?: RealmsWithId | number; servers?: Record<string, RealmsWithId> };
};

const getCommonParams = (accessToken: string, namespace: Namespace, region: Region) =>
  new URLSearchParams({
    [NAMESPACE]: `${namespace}-${region}`,
    [LOCALE]: LOCALES.EN_GB,
    [ACCESS_TOKEN]: accessToken,
  }).toString();

const craftWoWURLWithToken = (
  type: WoWQueryType,
  accessToken = process.env.CURRENT_ACCESS_TOKEN,
  { crID, itemID = LOCAL_ITEM_ID, region = "eu" }: WoWURLOptions = {},
) => {
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

const writeToFile = (() => {
  async function handleWriteFile(filePath: string, content: string) {
    try {
      const directoryPath = path.dirname(filePath);

      await mkdir(directoryPath, { recursive: true });
      await writeFile(filePath, content, { encoding: "utf-8" });

      console.log(`✅ File created successfully!\n ${filePath}`);
    } catch (err) {
      console.error("❌ Error writing to file:", err);
    }
  }

  return (jsonData = {}, fileName: string) =>
    prettier
      .resolveConfig("./.prettierrc.json")
      .then((options) => prettier.format(JSON.stringify(jsonData), { ...options, parser: "json" }))
      .then((data) => handleWriteFile(fileName, data));
})();

const getAllAuctions = (...args: any[]) => {
  const method = IS_COMMODITY ? "commodities" : "auctions";
  const url = craftWoWURLWithToken(method, ...args);
  DEBUG_LEVEL > 0 && console.log(url);

  return fetch(url, DEFAULT_HEADERS)
    .then((response) => response.json())
    .catch(console.error);
};

const grabItemInfo = async (rawInfo = false): Promise<ItemInfo> => {
  try {
    const url = craftWoWURLWithToken("item", process.env.CURRENT_ACCESS_TOKEN);
    const result = await (await fetch(url, DEFAULT_HEADERS)).json();
    const { name, description } = result;

    if (rawInfo) return result;

    return {
      id: LOCAL_ITEM_ID,
      name,
      description,
      prices: { ...(!IS_COMMODITY && { servers: {} }) },
    };
  } catch (error) {}
};

const startQueries = async () => {
  switch (QUERY_TYPE) {
    case "-a": {
      const item = await grabItemInfo();
      console.log(`--> Fetching prices across all EU servers for item:\n ${item.name}!\n`);

      await Promise.all(
        CONNECTED_REALMS.map(({ id: crID, realms }) =>
          getAllAuctions(process.env.CURRENT_ACCESS_TOKEN, { crID }).then((data) => {
            try {
              const auction = grabCheapestItemFromAuctions(data);

              if (!!auction?.buyout) {
                item.prices.servers[crID] = {
                  buyout: auction.buyout / 10000,
                  realms: [...realms],
                };
              }
            } catch (error) {
              console.error("Error grabbing cheapest item from auctions!");
              console.error(error);
            }
          }),
        ),
      );

      const cheapest = Object.values(item.prices.servers).sort((a, b) => a.buyout - b.buyout)?.[0];
      item.prices.cheapest = cheapest;

      writeToFile(item, `./data/auctions/${LOCAL_ITEM_ID}-${kebabCase(item.name)}.json`);
      break;
    }
    case "-c": {
      const item = await grabItemInfo();
      console.log(`--> Fetching prices across all EU servers for item:\n ${item.name}!\n`);

      const data = await getAllAuctions(process.env.CURRENT_ACCESS_TOKEN);
      const auction = grabCheapestItemFromAuctions(data);

      if (!!auction?.buyout) {
        item.prices.cheapest = auction.buyout / 10000;
      }

      writeToFile(item, `./data/commodities/${LOCAL_ITEM_ID}-${kebabCase(item.name)}.json`);
      break;
    }
    case "-i":
      const item = await grabItemInfo(true);

      writeToFile(item, `./data/items/${LOCAL_ITEM_ID}-${kebabCase(item.name)}.json`);
      break;
    case "-r": {
      try {
        const realmsResponse = await Promise.allSettled<{ id: number; realms: string[] }>(
          CONNECTED_REALM_IDS.map((crID) => {
            const url = craftWoWURLWithToken("realms", process.env.CURRENT_ACCESS_TOKEN, { crID });

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

        writeToFile(realmsData, "./data/realms.json");
      } catch (error) {
        console.log(error);
      }

      break;
    }
    default:
      throw new Error("Invalid or unsupported WoW API query type!");
  }
};

if (process.argv.length === 3) {
  LOCAL_ITEM_ID = parseInt(process.argv.at(-1));
} else if (process.argv.length === 4) {
  LOCAL_ITEM_ID = parseInt(process.argv.at(-2));
  QUERY_TYPE = process.argv.at(-1) as WoWQueryTypeFlag;
  IS_COMMODITY = QUERY_TYPE === "-c";
  DEBUG_LEVEL = !IS_COMMODITY ? parseInt(process.argv.at(-1)) : 0;
} else if (process.argv.length === 5) {
  LOCAL_ITEM_ID = parseInt(process.argv.at(-3));
  QUERY_TYPE = process.argv.at(-2) as WoWQueryTypeFlag;
  IS_COMMODITY = QUERY_TYPE === "-c";
  DEBUG_LEVEL = parseInt(process.argv.at(-1)) || 0;
}

startQueries();
