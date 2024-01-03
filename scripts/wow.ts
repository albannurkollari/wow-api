import { FB_RARES_SUMMONING_ITEMS, ITEM_IDS } from "../src/constants/items";
import { startQueries } from "./wow-queries";

let LOCAL_ITEM_IDS: number[] | null = null;
let IS_COMMODITY = false;
let QUERY_TYPE: WoWQueryFlag = "-a";
let DEBUG_LEVEL = 0;

const parseLocalItemId = (itemId: string) => {
  if (/^(\d{5,6})(,\d{5,6})+?$/.test(itemId)) {
    LOCAL_ITEM_IDS = itemId.split(",").map((id) => parseInt(id));
  } else {
    LOCAL_ITEM_IDS = [parseInt(itemId)];
  }
};

if (process.argv.length === 2) {
  const allItemIdsString = Object.values(ITEM_IDS).map(String).join(",");

  parseLocalItemId(allItemIdsString);
} else if (process.argv.length === 3) {
  const thirdArg = process.argv.at(-1);
  if (thirdArg.includes("fb-rares")) {
    const allItemIdsString = Object.values(FB_RARES_SUMMONING_ITEMS).map(String).join(",");
    QUERY_TYPE = "-c" as WoWQueryFlag;
    IS_COMMODITY = QUERY_TYPE === "-c";

    parseLocalItemId(allItemIdsString);
  } else {
    parseLocalItemId(thirdArg);
  }
} else if (process.argv.length === 4) {
  parseLocalItemId(process.argv.at(-2));
  QUERY_TYPE = process.argv.at(-1) as WoWQueryFlag;
  IS_COMMODITY = QUERY_TYPE === "-c";
  DEBUG_LEVEL = !IS_COMMODITY ? parseInt(process.argv.at(-1)) : 0;
} else if (process.argv.length === 5) {
  parseLocalItemId(process.argv.at(-3));
  QUERY_TYPE = process.argv.at(-2) as WoWQueryFlag;
  IS_COMMODITY = QUERY_TYPE === "-c";
  DEBUG_LEVEL = parseInt(process.argv.at(-1)) || 0;
}

startQueries({
  itemIDs: LOCAL_ITEM_IDS,
  queryType: QUERY_TYPE,
  isCommodity: IS_COMMODITY,
  debugLevel: DEBUG_LEVEL,
});
