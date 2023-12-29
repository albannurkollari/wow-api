import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
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

dotenv.config({ path: ".env.local" });

export const writeToFile = (() => {
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
