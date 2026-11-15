import { describe, expect, it, vi } from "vitest";

import { SAMPLE_ALERT } from "./alert.fixture.ts";
import { createConsoleNotifier } from "./console.ts";
import { createNotifiers, notifyAll, requireEnv } from "./registry.ts";
import type { Notifier } from "./types.ts";

const createFakeNotifier = (name: string, send = vi.fn<Notifier["send"]>(async () => {})) => ({
  name,
  send,
});

describe("createNotifiers", () => {
  const factories = {
    first: () => createFakeNotifier("first"),
    second: () => createFakeNotifier("second"),
  };

  it("builds every listed notifier, ignoring spaces and empty entries", () => {
    const notifiers = createNotifiers(" first, ,second ", {}, factories);

    expect(notifiers.map(({ name }) => name)).toEqual(["first", "second"]);
  });

  it("names the available notifiers when one is unknown", () => {
    expect(() => createNotifiers("first,sms", {}, factories)).toThrow(
      'Unknown notifier "sms". Available: first, second',
    );
  });
});

describe("notifyAll", () => {
  it("delivers to every notifier even when one fails", async () => {
    const failing = createFakeNotifier(
      "failing",
      vi.fn<Notifier["send"]>(async () => {
        throw new Error("offline");
      }),
    );
    const working = createFakeNotifier("working");

    const failures = await notifyAll([failing, working], SAMPLE_ALERT);

    expect(working.send).toHaveBeenCalledWith(SAMPLE_ALERT);
    expect(failures).toEqual([{ notifier: "failing", error: new Error("offline") }]);
  });
});

describe("requireEnv", () => {
  it("returns the value or says which key is missing", () => {
    expect(requireEnv({ KEY: "value" }, "KEY")).toBe("value");
    expect(() => requireEnv({}, "KEY")).toThrow("Missing KEY in .env.local");
  });
});

describe("createConsoleNotifier", () => {
  it("prints the title, lines and footer", async () => {
    const log = vi.fn<(message: string) => void>();

    await createConsoleNotifier(log).send(SAMPLE_ALERT);

    expect(log).toHaveBeenCalledWith("Title\none\ntwo\nFooter");
  });
});
