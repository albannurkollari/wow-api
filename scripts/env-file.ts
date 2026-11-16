/** Sets one `KEY=value` line in a dotenv file's text, leaving every other line exactly as written. */
export const setEnvValue = (text: string, key: string, value: string) => {
  const line = `${key}=${value}`;
  // Global, because dotenv reads the last of any duplicate keys.
  const pattern = new RegExp(`^${key}=.*$`, "gm");

  if (pattern.test(text)) return text.replace(pattern, () => line);

  return `${text}${text && !text.endsWith("\n") ? "\n" : ""}${line}\n`;
};
