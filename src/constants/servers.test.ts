import { describe, expect, it } from "vitest";

import { CONNECTED_REALMS, CONNECTED_REALM_IDS } from "./servers.ts";

describe("connected realms", () => {
  it("lists every connected realm id exactly once", () => {
    expect(new Set(CONNECTED_REALM_IDS).size).toBe(CONNECTED_REALM_IDS.length);
  });

  it("keeps CONNECTED_REALM_IDS in sync with CONNECTED_REALMS", () => {
    const byId = (a: number, b: number) => a - b;
    const realmIds = CONNECTED_REALMS.map(({ id }) => id);

    expect(realmIds.toSorted(byId)).toEqual(CONNECTED_REALM_IDS.toSorted(byId));
  });

  it("has at least one realm slug per connected realm", () => {
    for (const { realms } of CONNECTED_REALMS) {
      expect(realms.length).toBeGreaterThan(0);
    }
  });
});
