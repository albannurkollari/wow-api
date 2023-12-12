import { writeFile } from "node:fs/promises";
import * as prettier from "prettier";

debugger;

// HEADERS
const CURRENT_ACCESS_TOKEN = "EU1I4GdxPvmlHkYYu5LHl1EK8yFH1R33xs";
const DEFAULT_HEADERS = {
  headers: { "cache-control": "no-cache" },
  method: "GET",
  mode: "cors",
  credentials: "omit",
};

// PARAMETER NAMES
const ACCESS_TOKEN = "access_token";
const LOCALE = "locale";
const LOCALES = {
  EN_GB: "en_GB",
  EN_US: "en_US",
};
const NAMESPACE = "namespace";
const NAMESPACES = {
  DYNAMIC: "dynamic",
  STATIC: "static",
  PROFILE: "profile",
};

const TIME_LEFT_ENUM = { SHORT: 1, MEDIUM: 2, LONG: 4, VERY_LONG: 4 };

const getCommonParams = (accessToken, namespace, region) =>
  new URLSearchParams({
    [NAMESPACE]: `${namespace}-${region}`,
    [LOCALE]: LOCALES.EN_GB,
    [ACCESS_TOKEN]: accessToken,
  }).toString();

const craftWoWURLWithToken = (
  type,
  accessToken = CURRENT_ACCESS_TOKEN,
  { crID, itemID, region } = { region: "eu", crID: 3674 },
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

      const url = craftWoWURLWithToken("item", CURRENT_ACCESS_TOKEN, {
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

        writeToFile(data, "pattern_shadowflame_tempered_patch");
      } catch (error) {
        debugger;
        console.error(error);
      }
    });

// https://eu.api.blizzard.com/data/wow/item/204968?namespace=static-eu&locale=en_GB&access_token=EU1I4GdxPvmlHkYYu5LHl1EK8yFH1R33xs
