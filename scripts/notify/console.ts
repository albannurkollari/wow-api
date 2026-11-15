import type { Notifier } from "./types.ts";

export const createConsoleNotifier = (log: (message: string) => void = console.log): Notifier => ({
  name: "console",
  send: async ({ title, lines, footer, time }) => {
    log([title, ...lines, footer, time?.toLocaleString()].filter(Boolean).join("\n"));
  },
});
