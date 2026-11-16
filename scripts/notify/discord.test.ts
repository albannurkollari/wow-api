import { describe, expect, it, vi } from "vitest";

import { SAMPLE_ALERT } from "./alert.fixture.ts";
import { createDiscordNotifier } from "./discord.ts";

const WEBHOOK_URL = "https://discord.com/api/webhooks/1/token";
const BARE_ALERT = { title: "Title", lines: [] };

const setup = (response = new Response(null, { status: 204 })) => {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => response);
  const notifier = createDiscordNotifier({ webhookUrl: WEBHOOK_URL, fetch });
  const sentBody = () => JSON.parse(fetch.mock.calls[0][1]?.body as string);

  return { notifier, fetch, sentBody };
};

describe("createDiscordNotifier", () => {
  it("posts the alert to the webhook as an embed", async () => {
    const { notifier, fetch, sentBody } = setup();

    await notifier.send(SAMPLE_ALERT);

    expect(fetch.mock.calls[0][0]).toBe(WEBHOOK_URL);
    expect(sentBody()).toEqual({
      username: "AH Watch",
      embeds: [{ title: "Title", description: "one\ntwo", footer: { text: "Footer" } }],
    });
  });

  it("leaves the footer out when there is none", async () => {
    const { notifier, sentBody } = setup();

    await notifier.send(BARE_ALERT);

    expect(sentBody().embeds[0]).not.toHaveProperty("footer");
  });

  it("sends the time for Discord to show in the reader's time zone", async () => {
    const { notifier, sentBody } = setup();

    await notifier.send({ ...BARE_ALERT, time: new Date("2026-11-15T19:22:12Z") });

    expect(sentBody().embeds[0].timestamp).toBe("2026-11-15T19:22:12.000Z");
  });

  it("trims text to Discord's embed limits", async () => {
    const { notifier, sentBody } = setup();

    await notifier.send({ title: "t".repeat(300), lines: ["d".repeat(5000)] });

    const [embed] = sentBody().embeds;
    expect(embed.title).toHaveLength(256);
    expect(embed.description).toHaveLength(4096);
    expect(embed.description.endsWith("…")).toBe(true);
  });

  it("fails with Discord's reason when the webhook rejects the message", async () => {
    const { notifier } = setup(new Response('{"message": "Unknown Webhook"}', { status: 404 }));

    await expect(notifier.send(BARE_ALERT)).rejects.toThrow(
      'Discord webhook failed: 404 {"message": "Unknown Webhook"}',
    );
  });
});
