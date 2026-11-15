import type { Notifier } from "./types.ts";

export const createConsoleNotifier = (log: (message: string) => void = console.log): Notifier => ({
  name: "console",
  send: async ({ title, lines, footer }) => {
    log([title, ...lines, footer].filter(Boolean).join("\n"));
  },
});
