import dotenv from "dotenv";
import { File } from "./file";

import { CONNECTED_REALMS, CONNECTED_REALM_IDS } from "../src/constants/servers";

// Constants
import { ACCESS_TOKEN, NAMESPACE, NAMESPACES, LOCALE, LOCALES } from "../src/constants/api";
import { colors } from "./logging";

dotenv.config({ path: ".env.local" });

type StartQueriesProps = {
  itemIDs: number[];
  queryType: WoWQueryFlag;
  isCommodity?: boolean;
  debugLevel?: number;
};
type ItemAuctionsProps = { auctions: any[]; itemID: number } & Pick<
  StartQueriesProps,
  "isCommodity"
>;
type GetAllAuctionsProps = RealmsWithId & Pick<StartQueriesProps, "debugLevel" | "isCommodity">;

const getCommonParams = (accessToken: string, namespace: Namespace, region: Region) =>
  new URLSearchParams({
    [NAMESPACE]: `${namespace}-${region}`,
    [LOCALE]: LOCALES.EN_GB,
    [ACCESS_TOKEN]: accessToken,
  }).toString();

const craftWoWURLWithToken = (
  type: WoWQuery,
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

const grabCheapestItemFromAuctions = ({
  auctions = [],
  itemID,
  isCommodity,
}: ItemAuctionsProps) => {
  let smallestBuyoutItem = null;
  let smallestBuyout = Number.POSITIVE_INFINITY;

  for (const auction of auctions) {
    if (auction.item.id === itemID) {
      const priceProp = isCommodity ? "unit_price" : "buyout";

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

const getAllAuctions = async ({
  id,
  realms,
  isCommodity,
  debugLevel = 0,
}: Partial<GetAllAuctionsProps> = {}): Promise<RealmsWithId & { auctions: any[] }> => {
  const method = isCommodity ? "commodities" : "auctions";
  const url = craftWoWURLWithToken(method, { crID: id });
  debugLevel > 0 && colors.brightYellow(url, true);

  try {
    const data = await (await fetch(url)).json();

    return { ...data, id, realms };
  } catch (err) {
    console.error(`\x1b[91mError fetching:\x1b[0m ${url}`);
    console.error(`\x1b[91mReason:\x1b[0m ${err.message}\n`);

    return { auctions: [], id: 0, realms: [""] };
  }
};

const grabItemInfo = async (id: number, rawInfo = false): Promise<ItemInfo> => {
  try {
    const url = craftWoWURLWithToken("item", { itemID: id });
    const result = await (await fetch(url)).json();
    const { name, description } = result;

    if (rawInfo) return result;

    return { id, name, description, prices: {} };
  } catch (error) {}
};

export const startQueries = async (props: StartQueriesProps) => {
  const { itemIDs, queryType, isCommodity, debugLevel } = props;

  switch (queryType) {
    case "-a":
    case "-c": {
      let item: ItemInfo | undefined;
      let items: ItemInfo[] | undefined;

      if (!!itemIDs?.length) {
        items = await Promise.all(itemIDs.map((id) => grabItemInfo(id)));
      } else {
        item = await grabItemInfo(itemIDs[0]);
      }

      const itemsColl = !!items ? items : [item];
      const itemsPrices = {} as Record<string, (RealmsBuyoutPrice & { id: number })[]>;
      const auctionRealms = isCommodity ? [CONNECTED_REALMS[0]] : CONNECTED_REALMS;
      const auctionsData = await Promise.all(auctionRealms.map(getAllAuctions));
      const hasPrevAuctionsData = File.utils.folderHasItems("./data/auctions");

      if (!!auctionsData.length && hasPrevAuctionsData) {
        await File.async.remove("./data/auctions", {
          log: {
            pre: "Deleting previous auctions data...",
            fail: "Error deleting previous auctions data!",
            success: "Previous auctions data deleted successfully!",
          },
        });
      }

      auctionsData.forEach(({ id, auctions, realms }) => {
        if (!id || !auctions.length) return;

        itemsColl.forEach((item) => {
          try {
            const auction = grabCheapestItemFromAuctions({ auctions, itemID: item.id as number });

            if (!itemsPrices[item.id]) {
              itemsPrices[item.id] = [];
            }

            if (!!auction?.buyout) {
              itemsPrices[item.id].push({ id, buyout: auction.buyout / 10000, realms });
            }
          } catch (error) {
            console.error("Error parsing auction item!");
            console.error(error, "\n");
          }
        });
      });

      let amountOfGoldNeeded = 0;
      const itemsScanned: string[] = [];
      const itemsToPrint: Record<string, any>[] = [];

      for (const [itemId, item] of Object.entries(itemsPrices)) {
        const [{ id: crId, ...cheapest }] = item.sort((a, b) => a.buyout - b.buyout);
        const currentItemInfo = itemsColl.find((item) => item.id === parseInt(itemId));
        const allServerPrices = item.reduce(
          (acc, { id, ...rest }) => ({ ...acc, [id]: rest }),
          {} as Record<string, RealmsBuyoutPrice>,
        );

        if (currentItemInfo) {
          currentItemInfo.prices = { cheapest, all: allServerPrices };
          const item = {
            id: currentItemInfo.id,
            name: currentItemInfo.name,
            price: cheapest.buyout,
            realms: cheapest.realms,
          };
          const [firstRealm] = item.realms;
          const filePath = File.utils.getName(
            `${firstRealm}--${item.name}-${Math.round(item.price)}`,
          );

          amountOfGoldNeeded += Math.round(item.price);
          const isFileWritten = await File.async.write(currentItemInfo, filePath, true);
          isFileWritten && itemsScanned.push(filePath);
          isFileWritten && itemsToPrint.push({ ...item, realms: item.realms[0], filePath });
        }
      }

      itemsToPrint.sort(({ price: a, realms: c }, { price: b, realms: d }) =>
        a < b ? -1 : a > b ? 1 : c < d ? -1 : c > d ? 1 : 0,
      );

      colors.green("✅ Files created successfully!", true);
      console.table(itemsToPrint);
      console.log(
        colors.cyan("Total amount of gold needed: ") +
          colors.bgCyan(`${amountOfGoldNeeded}g`) +
          colors.cyan(" ."),
      );
      break;
    }
    case "-i":
      {
        const item = await grabItemInfo(itemIDs[0], true);

        File.async.write(item, File.utils.getName(`${itemIDs[0]}-${item.name}`));
      }
      break;
    case "-r": {
      try {
        const realmsResponse = await Promise.allSettled<{ id: number; realms: string[] }>(
          CONNECTED_REALM_IDS.map((crID) => {
            const url = craftWoWURLWithToken("realms", { crID });

            return fetch(url)
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
