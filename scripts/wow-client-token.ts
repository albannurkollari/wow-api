import dotenv from "dotenv";
import { writeFileSync } from "node:fs";

type AccessTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  sub: string;
};

type EnvVars = {
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  CURRENT_ACCESS_TOKEN: string;
};

const currentEnvConfig = dotenv.config({ path: ".env.local" }).parsed as EnvVars;
const { CLIENT_ID, CLIENT_SECRET } = currentEnvConfig;

const setClientAccessToken = async (): Promise<void> => {
  try {
    const credentials = `${CLIENT_ID}:${CLIENT_SECRET}`;
    const contentType = "application/x-www-form-urlencoded";
    const authorization = `Basic ${btoa(credentials)}`;
    const response = await fetch("https://oauth.battle.net/oauth/token", {
      method: "POST",
      headers: { authorization, "content-type": contentType },
      body: "grant_type=client_credentials",
    });
    const { access_token } = (await response.json()) as AccessTokenResponse;
    currentEnvConfig.CURRENT_ACCESS_TOKEN = access_token;
    const configText = new URLSearchParams(currentEnvConfig).toString().replace(/&/g, "\n");

    writeFileSync(".env.local", configText, "utf-8");

    console.log("-----------------------------------------")
    console.log("| ✅ New client token successfully set! |");
    console.log("-----------------------------------------")
  } catch (error) {
    console.error(error);
  }
};

setClientAccessToken();
