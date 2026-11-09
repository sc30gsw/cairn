---
name: verify-collapse-extra-live-days
description: Check that collapseExtraLiveDays keeps the oldest live day, moves every row from newer live days onto it, and leaves trashed days alone. Use when changing collapseExtraLiveDays, requireLiveDay, openDay, or plan openDate.
---

# Oldest live day keeps the rows

`collapseExtraLiveDays` (`convex/services/days/collapseExtraLiveDays.ts`) loads the owner's days for one date, keeps the live day with the smallest `_creationTime`, patches every row of each newer live day onto that day (including a row whose own `deletedAt` is set), deletes the newer live days, and does not touch a day whose `deletedAt` is set or that day's rows. It returns null when every day for that date is trashed or missing.

No test calls this function. `convex/goals.masteryProgressRepair.test.ts` sees two live days change progress counters and does not assert which day the rows end on. Callers are `requireLiveDay`, `openDay`, and `plan/openDate`. A wrong winner attaches new rows to a day the page may not be showing, or drops a row when the extra day is deleted.

The promise is a property of every input of this function, not an event order. Nothing in this repo verifies TypeScript, so the check calls the real function through `convex-test` on a generated grid. A TLA+ model would not run the query or the patches.

## Run

From the repository root, with `vp` on `PATH` (Node >= 24.17.0):

```bash
vp test convex/services/days/collapseExtraLiveDays.property.test.ts
```

## What the current code does

Pass. One test, 50 scenarios.

The check fails when the code breaks. Confirmed, then reverted:

- Sorting live days newest-first fails `live 0,0 / trash`: the returned id is the newer day, and the test expects `liveDays[0]`, the first inserted.
- Leaving the row patch out fails `live 0,1 / trash`: the row stays on the newer day's id. The winner id is still the oldest, so this is the row assertion, not the winner assertion.

After both edits were dropped, the same command passed again. Do not loosen the expected winner or skip a scenario to get that pass.

## Bounds

Live days: 0, 1, or 2. Trashed days: 0, 1, or 2. Each of those days has 0 or 1 row (49 scenarios). One more scenario gives the newer live day two rows and sets `deletedAt` to 9 on the second; that row must move and keep `deletedAt` 9. Trashed days are inserted first, so they are older than the live days. One decoy day for another owner on the same date, and one decoy day for this owner on another date, each with a row, must stay put.

Assumes `convex-test` gives a later insert a greater `_creationTime`. Equal timestamps are not in the grid.

Left out: three or more live days, two or more rows on the older day, timer fields on the row, and a concurrent insert that arrives during the collapse. `getDayByDate` choosing among those documents is `verify-canonical-day`.

## When the code moves

Follow /maintain-formal-verification-skill. Extend the grid from the new function behavior, rerun, and move the commit only after the test still calls `collapseExtraLiveDays` and still expects the oldest live day.

Covered: `collapseExtraLiveDays`. Rerun when `requireLiveDay`, `openDay`, or `convex/services/plan/openDate.ts` start calling something else to merge days.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
