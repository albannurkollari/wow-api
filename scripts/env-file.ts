import { readFile, writeFile } from "node:fs/promises";
import dotenv from "dotenv";

export type Env = Record<string, string | undefined>;

/** Every script reads its keys and settings from this one file. */
export const ENV_FILE = ".env.local";

/** Loads the file into `process.env`. Variables already set in the shell take precedence. */
export const loadEnv = (filePath = ENV_FILE): Env => {
  dotenv.config({ path: filePath, quiet: true });

  return process.env;
};

export const requireEnv = (env: Env, key: string) => {
  const value = env[key];
  if (!value) throw new Error(`Missing ${key} in ${ENV_FILE}`);

  return value;
};

/** Sets one `KEY=value` line in a dotenv file's text, leaving every other line exactly as written. */
export const setEnvValue = (text: string, key: string, value: string) => {
  const line = `${key}=${value}`;
  // Global, because dotenv reads the last of any duplicate keys.
  const pattern = new RegExp(`^${key}=.*$`, "gm");

  if (pattern.test(text)) return text.replace(pattern, () => line);

  return `${text}${text && !text.endsWith("\n") ? "\n" : ""}${line}\n`;
};

/** Saves one value to the file, leaving every other line exactly as written. */
export const saveEnvValue = async (key: string, value: string, filePath = ENV_FILE) => {
  // Only a missing file counts as empty; any other read error must not lead to an overwrite.
  const text = await readFile(filePath, "utf-8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });

  await writeFile(filePath, setEnvValue(text, key, value), "utf-8");
};
