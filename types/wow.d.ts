declare type Namespace = "dynamic" | "static" | "profile";
declare type Region = "eu" | "us";
declare type WoWQuery = "auctions" | "commodities" | "item" | "realms";
declare type WoWQueryFlag = "-a" | "-c" | "-i" | "-r";
declare type WoWURLOptions = {
  crID?: number;
  itemID?: number;
  region?: Region;
};
declare type RealmsWithId = { id: number; realms: string[] };
declare type RealmsBuyoutPrice = { buyout: number; realms?: string[] };
declare type ItemInfo = {
  id: number | string;
  isCommodity?: boolean;
  name: string;
  description: string;
  prices: { cheapest?: RealmsBuyoutPrice | number; all?: Record<string, RealmsBuyoutPrice> };
};
declare type ItemInfo = {
  id: number | string;
  isCommodity?: boolean;
  name: string;
  description: string;
  prices: { cheapest?: RealmsBuyoutPrice | number; all?: Record<string, RealmsBuyoutPrice> };
};
