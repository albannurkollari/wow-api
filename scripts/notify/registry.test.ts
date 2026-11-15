import { describe, expect, it, vi } from "vitest";

import { createConsoleNotifier } from "./console.ts";
import { createNotifiers, notifyAll, requireEnv } from "./registry.ts";
import type { Alert, Notifier } from "./types.ts";

const alert: Alert = { title: "Title", lines: ["one", "two"], footer: "Footer" };

const fakeNotifier = (
  name: string,
  send: Notifier["send"] = vi.fn<Notifier["send"]>(async () => {}),
) => ({
  name,
  send,
});

describe("createNotifiers", () => {
  const factories = {
    first: () => fakeNotifier("first"),
    second: () => fakeNotifier("second"),
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
    const failing = fakeNotifier("failing", async () => {
      throw new Error("offline");
    });
    const working = fakeNotifier("working");

    const failures = await notifyAll([failing, working], alert);

    expect(working.send).toHaveBeenCalledWith(alert);
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

    await createConsoleNotifier(log).send(alert);

    expect(log).toHaveBeenCalledWith("Title\none\ntwo\nFooter");
  });
});
