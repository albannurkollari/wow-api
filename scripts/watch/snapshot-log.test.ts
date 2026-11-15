import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SNAPSHOT_TIMES } from "../blizzard/api.fixture.ts";
import { useFakeClock } from "../clock.fixture.ts";
import { createSnapshotLog } from "./snapshot-log.ts";

const SEEN_AT = new Date("2026-11-15T10:22:40.000Z");

describe("createSnapshotLog", () => {
  useFakeClock();

  let dir: string;
  let filePath: string;
  const readRows = async () => (await readFile(filePath, "utf-8")).trimEnd().split("\n");

  beforeEach(async () => {
    vi.setSystemTime(SEEN_AT);
    dir = await mkdtemp(join(tmpdir(), "snapshot-log-"));
    filePath = join(dir, "snapshots.csv");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes a header, then the publish and seen times of each snapshot", async () => {
    const log = createSnapshotLog(filePath);

    await log(SNAPSHOT_TIMES.current);
    await log(SNAPSHOT_TIMES.next);

    expect(await readRows()).toEqual([
      "published_at,seen_at",
      "2026-11-15T10:22:12.000Z,2026-11-15T10:22:40.000Z",
      "2026-11-15T11:22:12.000Z,2026-11-15T10:22:40.000Z",
    ]);
  });

  it("keeps adding to the same file across restarts", async () => {
    await createSnapshotLog(filePath)(SNAPSHOT_TIMES.current);
    await createSnapshotLog(filePath)(SNAPSHOT_TIMES.next);

    expect(await readRows()).toHaveLength(3);
  });

  it("leaves the publish time empty when Blizzard sends none", async () => {
    await createSnapshotLog(filePath)(undefined);

    expect((await readRows())[1]).toBe(",2026-11-15T10:22:40.000Z");
  });
});
