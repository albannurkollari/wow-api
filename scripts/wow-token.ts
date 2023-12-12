import dotenv from "dotenv";
import { writeFileSync } from "node:fs";

type AccessTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  sub: string;
};

const currentEnvConfig = dotenv.parse(".env.locale");
const { CLIENT_ID, CLIENT_SECRET } = currentEnvConfig;

const setAccessToken = async (): Promise<void> => {
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

    debugger;

    currentEnvConfig.CURRENT_ACCESS_TOKEN = access_token;

    const configText = new URLSearchParams(currentEnvConfig).toString().replace(/&/g, "\n");

    debugger;

    process.env.CURRENT_ACCESS_TOKEN = access_token;

    writeFileSync("../.env.locale", configText, "utf-8");
  } catch (error) {
    console.error(error);
  }
};
