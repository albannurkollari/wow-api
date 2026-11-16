import { readFile, writeFile } from "node:fs/promises";
import dotenv from "dotenv";

import { createTokenProvider } from "./blizzard/auth.ts";
import { setEnvValue } from "./env-file.ts";
import { requireEnv } from "./notify/registry.ts";

const ENV_PATH = ".env.local";

dotenv.config({ path: ENV_PATH, quiet: true });

// Throws on a rejected request, so a failed login never reaches the file.
const token = await createTokenProvider({
  clientId: requireEnv(process.env, "CLIENT_ID"),
  clientSecret: requireEnv(process.env, "CLIENT_SECRET"),
}).get();

const envText = await readFile(ENV_PATH, "utf-8");
await writeFile(ENV_PATH, setEnvValue(envText, "CURRENT_ACCESS_TOKEN", token), "utf-8");

console.log("-----------------------------------------");
console.log("| ✅ New client token successfully set! |");
console.log("-----------------------------------------");
