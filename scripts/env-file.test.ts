import { describe, expect, it } from "vitest";

import { setEnvValue } from "./env-file.ts";

const ENV_TEXT = [
  "CLIENT_ID=id",
  "CURRENT_ACCESS_TOKEN=old",
  "NOTIFIERS=console,discord",
  "DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1/token",
  "",
].join("\n");

describe("setEnvValue", () => {
  it("replaces only the given key and keeps other values as written", () => {
    expect(setEnvValue(ENV_TEXT, "CURRENT_ACCESS_TOKEN", "new")).toBe(
      ENV_TEXT.replace("CURRENT_ACCESS_TOKEN=old", "CURRENT_ACCESS_TOKEN=new"),
    );
  });

  it("adds the key on its own line when it is missing", () => {
    expect(setEnvValue("CLIENT_ID=id", "CURRENT_ACCESS_TOKEN", "new")).toBe(
      "CLIENT_ID=id\nCURRENT_ACCESS_TOKEN=new\n",
    );
  });

  it("writes values with $ patterns literally", () => {
    expect(setEnvValue("TOKEN=old\n", "TOKEN", "a$&b")).toBe("TOKEN=a$&b\n");
  });
});
