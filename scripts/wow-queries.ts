import { writeFile } from "node:fs/promises";
import * as prettier from "prettier";

// Constants
import {
  ACCESS_TOKEN,
  DEFAULT_HEADERS,
  NAMESPACE,
  NAMESPACES,
  LOCALE,
  LOCALES,
} from "#constants/api";

debugger;
type Namespace = "dynamic" | "static" | "profile";
type Region = "eu" | "us";
type WoWQueryType = "auctions" | "item";
type WoWURLOptions = {
  crID?: number;
  itemID?: number;
  region?: Region;
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
  { crID, itemID, region }: WoWURLOptions = { region: "eu", crID: 3674 },
) => {
  const _url = new URL(`https://${region}.api.blizzard.com/`);
  const basePath = "/data/wow";

  switch (type) {
    case "auctions": {
      _url.pathname = `${basePath}/connected-realm/${crID}/auctions`;
      _url.search = getCommonParams(accessToken, NAMESPACES.DYNAMIC, region);
      break;
    }
    case "item": {
      _url.pathname = `${basePath}/item/${itemID}`;
      _url.search = getCommonParams(accessToken, NAMESPACES.STATIC, region);
      break;
    }
  }

  return _url.toString();
};

// Pattern: Shadowflame-Tempered Armor Patch
const PATTERN_ITEM_ID = 204968;

const grabCheapestItemFromAuctions = ({ auctions = [] } = {}, itemId = PATTERN_ITEM_ID) => {
  let items = [];
  let theItem = {};

  for (let i = 0; i < auctions.length; i++) {
    const ahItem = auctions[i];

    if (ahItem.item.id === itemId) {
      items.push(ahItem);

      if (items.length > 1) {
        theItem = items.at(-2).buyout > ahItem.buyout ? ahItem : items.at(-2);
      }
    }
  }

  if (items.length === 1) {
    theItem = items[0];
  }

  return theItem;
};

const writeToFile = (jsonData = {}, filename) =>
  prettier
    .format(JSON.stringify(jsonData), { parser: "json" })
    .then((data) => writeFile(`wow_${filename || "random"}`, data, { encoding: "utf-8" }))
    .then(() => console.log("Success ✅"));

const getAllAuctions = () =>
  fetch(craftWoWURLWithToken("auctions"), DEFAULT_HEADERS)
    .then((response) => response.json())
    .catch(console.error);

const getShadowflameTemperedPatch = () =>
  getAllAuctions()
    .then(grabCheapestItemFromAuctions)
    .then(async ({ buyout } = { buyout: 10000 }) => {
      /* {
        "id": 116630933,
        "item": { "id": 204968, "context": 3 },
        "bid": 144007000,
        "buyout": 180008800,
        "quantity": 1,
        "time_left": "LONG"
      } */

      const url = craftWoWURLWithToken("item", process.env.CURRENT_ACCESS_TOKEN, {
        itemID: PATTERN_ITEM_ID,
        crID: 3674,
      });

      try {
        const itemInfo = await (await fetch(url, DEFAULT_HEADERS)).json();
        debugger;

        const requiredItemInfo = {
          name: itemInfo.name,
          description: itemInfo.description,
          price: buyout / 10000,
        };

        return requiredItemInfo;

        // writeToFile(
        //   JSON.stringify(requiredItemInfo, null, 2),
        //   "pattern_shadowflame_tempered_patch",
        // );
      } catch (error) {
        debugger;
        console.error(error);
      }
    });
