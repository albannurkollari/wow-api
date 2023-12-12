// HEADERS
export const DEFAULT_HEADERS = {
  headers: { "cache-control": "no-cache" },
  method: "GET",
  mode: "cors",
  credentials: "omit",
} as const;

// PARAMETER NAMES
export const ACCESS_TOKEN = "access_token";
export const LOCALE = "locale";
export const LOCALES = {
  EN_GB: "en_GB",
  EN_US: "en_US",
} as const;
export const NAMESPACE = "namespace";
export const NAMESPACES = {
  DYNAMIC: "dynamic",
  STATIC: "static",
  PROFILE: "profile",
} as const;

export const TIME_LEFT_ENUM = { SHORT: 1, MEDIUM: 2, LONG: 3, VERY_LONG: 4 } as const;
