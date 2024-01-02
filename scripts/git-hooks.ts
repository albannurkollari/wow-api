import { createFileAsync } from "./file";
import { log } from "./logging";

const updateDependenciesContent = `
# https://jshakespeare.com/use-git-hooks-and-husky-to-tell-your-teammates-when-to-run-npm-install/

function changed {
  git diff --name-only HEAD@{1} HEAD | grep "^$1" >/dev/null 2>&1
}

if changed 'package-lock.json'; then
  echo -e "\\n↱⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢⇢↴"
  echo -e "⇡ \\x1b[7m 📦 package-lock.json \\x1b[0m changed.                                      ⇣"
  echo -e "⇡ Run \\x1b[32mnpm install\\x1b[0m or \\x1b[32mnpm ci\\x1b[0m to bring your dependencies up to date!     ⇣"
  echo -e "⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠⇠↲\\n"
fi
`;

const hookContent = `
#!/bin/bash

source .git/hooks/update-dependencies.sh
`;

const paths = {
  postCheckout: "./.git/hooks/post-checkout",
  postMerge: "./.git/hooks/post-merge",
  updateDependencies: "./.git/hooks/update-dependencies.sh",
};

async function createAdditionalHooks() {
  await createFileAsync(paths.updateDependencies, updateDependenciesContent);
  await createFileAsync(paths.postCheckout, hookContent);
  await createFileAsync(paths.postMerge, hookContent);

  log.yellow("\nHappy 🤖 hacking and 🐜 bug hunting! 🚀\n");
}

createAdditionalHooks();
