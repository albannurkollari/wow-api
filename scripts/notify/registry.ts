import { createConsoleNotifier } from "./console.ts";
import { createDiscordNotifier } from "./discord.ts";
import type { Alert, Notifier } from "./types.ts";

type Env = Record<string, string | undefined>;
type NotifierFactory = (env: Env) => Notifier;

export const requireEnv = (env: Env, key: string) => {
  const value = env[key];
  if (!value) throw new Error(`Missing ${key} in .env.local`);

  return value;
};

// Adding a receiver means adding a factory here; nothing else needs to know about it.
export const NOTIFIER_FACTORIES: Record<string, NotifierFactory> = {
  console: () => createConsoleNotifier(),
  discord: (env) => createDiscordNotifier({ webhookUrl: requireEnv(env, "DISCORD_WEBHOOK_URL") }),
};

export const createNotifiers = (
  names: string,
  env: Env,
  factories: Record<string, NotifierFactory> = NOTIFIER_FACTORIES,
): Notifier[] =>
  names
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => {
      const factory = factories[name];
      if (!factory) {
        throw new Error(
          `Unknown notifier "${name}". Available: ${Object.keys(factories).join(", ")}`,
        );
      }

      return factory(env);
    });

export const notifyAll = async (notifiers: Notifier[], alert: Alert) => {
  const results = await Promise.allSettled(notifiers.map((notifier) => notifier.send(alert)));

  return results.flatMap((result, index) =>
    result.status === "rejected"
      ? [{ notifier: notifiers[index].name, error: result.reason as unknown }]
      : [],
  );
};
