import { writeToFile } from "./utils";

const url = (() => {
  const base = "https://eu.account.battle.net/";
  const path = "login/en-us/?ref=https://oauth.battle.net/oauth/authorize";
  const _url = new URL(path, base);
  _url.search = new URLSearchParams({
    response_type: "code",
    client_id: process.env.CLIENT_ID,
    scope: "wow.profile",
    redirect_uri: "http://localhost:5137",
  }).toString();

  return _url.toString();
})();

fetch("https://oauth.battle.net/token", {
  body: "redirect_uri=<redirect&scope=<space&grant_type=authorization_code&code=<authorization",
  headers: {
    Authorization: "Basic PGRldmVsb3Blcg==",
    "Content-Type": "application/x-www-form-urlencoded",
  },
  method: "POST",
});
// https://eu.account.battle.net/login/en-us/?ref=https://oauth.battle.net/oauth/authorize?
// response_type=code&client_id=e1cee08e63694287be9b50f2aed1d82b&scope=wow.profile%20sc2.profile&redirect_uri=https://develop.battle.net/documentation/world-of-warcraft/profile-apis&app=oauth&hostingApp=oauth
// writeToFile;
