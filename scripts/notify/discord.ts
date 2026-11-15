import type { Notifier } from "./types.ts";

type DiscordNotifierOptions = {
  webhookUrl: string;
  username?: string;
  fetch?: typeof fetch;
};

// Discord rejects embeds over these lengths.
const MAX_TITLE = 256;
const MAX_DESCRIPTION = 4096;
const MAX_FOOTER = 2048;

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

export const createDiscordNotifier = ({
  webhookUrl,
  username = "AH Watch",
  fetch: doFetch = fetch,
}: DiscordNotifierOptions): Notifier => ({
  name: "discord",
  send: async ({ title, lines, footer }) => {
    const embed = {
      title: truncate(title, MAX_TITLE),
      description: truncate(lines.join("\n"), MAX_DESCRIPTION),
      ...(footer && { footer: { text: truncate(footer, MAX_FOOTER) } }),
    };
    const response = await doFetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, embeds: [embed] }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${await response.text()}`);
    }
  },
});
