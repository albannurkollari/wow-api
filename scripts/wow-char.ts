import data from "./data.json" with { type: "json" };
import khazAlgarEngineeringData from "./engineering.json" with { type: "json" };
import recipe from "./engineering-recipe.json" with { type: "json" };

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

// console.log(primary.profession.id, primary.tiers.at(-1).tier.id);
// console.log(secondary.profession.id, secondary.tiers.at(-1).tier.id);
// console.log(JSON.stringify(obj, null, 2));

const knownEngineeringIds = Object.keys(obj[primary.profession.name]).map(Number);

const aa = khazAlgarEngineeringData.categories.reduce(
  (acc, { recipes }) => {
    const t = recipes.filter((recipe) => !knownEngineeringIds.includes(recipe.id));
    acc.push(...t);

    return acc;
  },
  [] as { key: { href: string }; name: string; id: number }[],
);

const bb = aa.reduce(
  (acc, { key, name, id }) => ({ ...acc, [id]: { link: key.href, name } }),
  {} as Record<number, { link: string; name: string }>,
);

console.log(JSON.stringify(bb, null, 2));
