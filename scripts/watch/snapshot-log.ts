import { access, appendFile } from "node:fs/promises";

const HEADER = "published_at,seen_at\n";

/** Appends each snapshot's publish time and the moment we saw it, to learn Blizzard's refresh schedule. */
export const createSnapshotLog = (filePath: string) => {
  let ready: Promise<void> | undefined;
  const ensureHeader = () => (ready ??= access(filePath).catch(() => appendFile(filePath, HEADER)));

  return async (lastModified: string | undefined) => {
    await ensureHeader();
    const publishedAt = lastModified ? new Date(lastModified).toISOString() : "";
    await appendFile(filePath, `${publishedAt},${new Date().toISOString()}\n`);
  };
};
