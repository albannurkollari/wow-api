---
title: How Tests Share Their Setup
status: Accepted
date: 2026-11-15
audience: Engineering
summary: Test helpers live in the test file that uses them, and move to a colocated .fixture.ts file once a second test file needs them.
---

# How Tests Share Their Setup

## Status

Accepted (2026-11-15).

## Context

The auction house watcher (PR #10) added eleven test files under `scripts/`. Written one at a time, they repeated the same setup:

- The same item IDs, item names and snapshot dates appeared as literals in up to five files.
- Two builders produced the same auction object under different names (`auction()` in one file, `listing()` in another).
- Four files registered the same fake-timer `beforeEach` and `afterEach` hooks.
- The fake Blizzard client, token provider and rate limiter lived inside individual test files, so a second consumer would have copied them.

Copies drift. When a type such as `Deal` changes, every hand-written literal needs the same edit, and a missed copy keeps passing while it tests the old shape.

## Decision

We keep test helpers next to the tests that use them, and promote them to a fixture file only when sharing begins.

1. **One consumer: keep it local.** A helper used by a single test file lives in that file, above the first `describe`.
2. **Two or more consumers: move it into a fixture file.** It moves to a `<topic>.fixture.ts` file in the folder of the code it stands in for, for example `scripts/blizzard/api.fixture.ts` for fakes of the Blizzard API modules. When the consumers sit in different folders, the fixture goes in their nearest shared folder, for example `scripts/clock.fixture.ts`.
3. **Names say what a fixture does.**
   - `build<Thing>(overrides)` returns a fresh, valid plain object, with `overrides` applied on top.
   - `createFake<Thing>()` returns a stand-in for a module, with `vi.fn` spies to assert on.
   - `use<Thing>()` registers Vitest lifecycle hooks for the calling `describe`.
   - `UPPER_SNAKE` constants hold shared reference data. They use real values where they exist, such as the item IDs and copper prices seen on Blackrock on 2026-11-15.
4. **Fixtures only provide data and fakes.** They contain no assertions, no `describe` and no `it`.
5. **Fixtures follow the source's dependency direction.** `watch` fixtures may import `blizzard` fixtures because `watch` code imports `blizzard` code. The reverse never happens.
6. **Production code never imports a fixture.**

Vitest only collects `*.test.ts` files, so fixture files never run as tests.

The fixtures this decision introduced:

| Fixture                           | Shares                                                                 |
| --------------------------------- | ---------------------------------------------------------------------- |
| `scripts/clock.fixture.ts`        | `useFakeClock()`                                                       |
| `scripts/blizzard/api.fixture.ts` | Snapshot times, token and API response builders, fake fetch, tokens, limiter and client |
| `scripts/notify/alert.fixture.ts` | A sample alert                                                         |
| `scripts/watch/auctions.fixture.ts` | Watched items, item names, places, real prices, auction, deal and snapshot builders |

## Consequences

- A test reads as its scenario. The setup that differs from the defaults is the only setup in view.
- A type change means one edit in a builder instead of one per copy, and TypeScript flags any fixture that falls out of shape.
- Readers sometimes open a second file to see what a builder's defaults are.
- Fixture files count toward coverage reports, because the project has no coverage exclusion for them yet.
- Rule 6 depends on review. No lint rule enforces it yet.

## Alternatives considered

- **One `test/fixtures/` folder for the whole repository.** Rejected. It separates fakes from the code they stand in for and tends to collect unrelated helpers.
- **A factory library such as fishery.** Rejected. A handful of builders don't justify a dependency, and a plain spread over defaults covers them.
- **Vitest's `test.extend` fixtures.** Not adopted for now. They suit per-test setup and teardown, but most of our fixtures are plain data. We may revisit them for fakes that need cleanup.

## Not decided here

- A lint rule that stops production code from importing `*.fixture.ts`.
- Excluding fixture files from coverage.
