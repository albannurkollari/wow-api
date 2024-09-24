import data from "./data.json" with { type: "json" };

const getErenndrielProfessions = async () => {
  return fetch(
    "https://eu.api.blizzard.com/profile/wow/character/twisting-nether/banidriel/professions?namespace=profile-eu&locale=en_GB&access_token=EUHppktrl46T1GsXc9eDo6YD4RZZTruvea",
    {
      headers: {
        "sec-fetch-mode": "cors",
        Referer: "https://develop.battle.net/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: null,
      method: "GET",
    },
  );
};

const { primaries } = data;
const [primary, secondary] = primaries;
const knownPrimaryRecipes = primary.tiers.at(-1).known_recipes;
const knownSecondaryRecipes = secondary.tiers.at(-1).known_recipes;
const obj = {
  [primary.profession.name]: knownPrimaryRecipes.reduce(
    (acc, { id, name }) => ({ ...acc, [id]: name }),
    {},
  ),
  [secondary.profession.name]: knownSecondaryRecipes.reduce(
    (acc, { id, name }) => ({ ...acc, [id]: name }),
    {},
  ),
};

console.log(JSON.stringify(obj, null, 2));
