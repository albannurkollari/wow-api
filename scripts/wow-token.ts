import { createTokenProvider } from "./blizzard/auth.ts";
import { loadEnv, requireEnv, saveEnvValue } from "./env-file.ts";

const env = loadEnv();

// Throws on a rejected request, so a failed login never reaches the file.
const token = await createTokenProvider({
  clientId: requireEnv(env, "CLIENT_ID"),
  clientSecret: requireEnv(env, "CLIENT_SECRET"),
}).get();

await saveEnvValue("CURRENT_ACCESS_TOKEN", token);

console.log("-----------------------------------------");
console.log("| ✅ New client token successfully set! |");
console.log("-----------------------------------------");
