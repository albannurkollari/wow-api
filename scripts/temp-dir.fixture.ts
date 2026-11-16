import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach } from "vitest";

/** Gives every test in the calling `describe` a fresh, empty folder; returns a path builder inside it. */
export const useTempDir = (prefix: string) => {
  let dir = "";

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), prefix));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  return (fileName: string) => join(dir, fileName);
};
