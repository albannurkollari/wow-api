# WoW APIs consumer web app

This repo is only for demonstration purposes, on how to consume WoW APIs for collective data.
Make sure to install dependencies via `pnpm`.

```bash
$ pnpm i
```

Installing also sets up the [lefthook](https://lefthook.dev) git hooks: staged files get formatted
and linted on commit, and the typecheck and tests run on push.

| Script                      | What it does                                          |
| --------------------------- | ----------------------------------------------------- |
| `pnpm dev`                  | Start the Vite dev server                             |
| `pnpm build`                | Typecheck, then build for production                  |
| `pnpm typecheck`            | Typecheck the app and the Node scripts                |
| `pnpm test`                 | Run the Vitest suites (`test:watch`, `test:coverage`) |
| `pnpm lint`                 | Type-aware lint with oxlint (`lint:fix` to autofix)   |
| `pnpm format`               | Format with oxfmt (`format:check` to only check)      |
| `pnpm setClientAccessToken` | Fetch a Battle.net client token into `.env.local`     |
| `pnpm query <ids> [-a\|-c\|-i\|-r]` | Query auctions, commodities, items or realms  |

## Last but not least

![unagi](https://media4.giphy.com/media/JOe7JxOiMg61ogl6fH/giphy.gif)
