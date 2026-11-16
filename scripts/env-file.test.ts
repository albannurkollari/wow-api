import { readFile, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import { loadEnv, requireEnv, saveEnvValue, setEnvValue } from "./env-file.ts";
import { useTempDir } from "./temp-dir.fixture.ts";

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

  it("replaces every copy of a duplicated key", () => {
    expect(setEnvValue("TOKEN=a\nTOKEN=b\n", "TOKEN", "new")).toBe("TOKEN=new\nTOKEN=new\n");
  });

  it("keeps Windows line endings", () => {
    expect(setEnvValue("TOKEN=old\r\nNOTIFIERS=console\r\n", "TOKEN", "new")).toBe(
      "TOKEN=new\r\nNOTIFIERS=console\r\n",
    );
  });

  it("writes values with $ patterns literally", () => {
    expect(setEnvValue("TOKEN=old\n", "TOKEN", "a$&b")).toBe("TOKEN=a$&b\n");
  });
});

describe("saveEnvValue", () => {
  const pathTo = useTempDir("env-file-");

  it("writes the value into the file and keeps the other lines as written", async () => {
    const filePath = pathTo(".env.local");
    await writeFile(filePath, ENV_TEXT);

    await saveEnvValue("CURRENT_ACCESS_TOKEN", "new", filePath);

    expect(await readFile(filePath, "utf-8")).toBe(
      ENV_TEXT.replace("CURRENT_ACCESS_TOKEN=old", "CURRENT_ACCESS_TOKEN=new"),
    );
  });

  it("creates the file when it does not exist yet", async () => {
    const filePath = pathTo(".env.local");

    await saveEnvValue("CURRENT_ACCESS_TOKEN", "new", filePath);

    expect(await readFile(filePath, "utf-8")).toBe("CURRENT_ACCESS_TOKEN=new\n");
  });
});

describe("loadEnv", () => {
  const pathTo = useTempDir("env-file-");
  const KEY = "ENV_FILE_TEST_VALUE";

  afterEach(() => {
    delete process.env[KEY];
  });

  it("loads the file's values unencoded", async () => {
    const filePath = pathTo(".env.local");
    await writeFile(filePath, `${KEY}=console,discord\n`);

    expect(loadEnv(filePath)[KEY]).toBe("console,discord");
  });

  it("lets a variable set in the shell take precedence", async () => {
    const filePath = pathTo(".env.local");
    await writeFile(filePath, `${KEY}=from-file\n`);
    process.env[KEY] = "from-shell";

    expect(loadEnv(filePath)[KEY]).toBe("from-shell");
  });
});

describe("requireEnv", () => {
  it("returns a value that is set and names the file when it is missing", () => {
    expect(requireEnv({ KEY: "value" }, "KEY")).toBe("value");
    expect(() => requireEnv({}, "KEY")).toThrow("Missing KEY in .env.local");
  });
});
