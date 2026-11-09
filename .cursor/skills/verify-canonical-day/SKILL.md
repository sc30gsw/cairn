---
name: verify-canonical-day
description: Check that getDayByDate returns the oldest live day for one owner and date, or the oldest trashed day when none are live. Use when changing getDayByDate or any writer that inserts a second days document.
---

# Canonical day for one date

`getDayByDate` (`convex/services/days/getDayByDate.ts`) queries `by_owner_and_date`, returns the live day with the smallest `_creationTime`, and if every match has `deletedAt` set returns the trashed day with the smallest `_creationTime`. No match returns null.

No test calls it. Callers are `getLiveDay`, `openDay`, `requireEditableDay`, `requireLiveDay`, `plan/openDate`, `rowDayLiveness`, and `removeDay`. The page, the edit guard, and the trash mutation all read this pick. Returning a newer live day shows a different 調子 and a different set of rows than the day `collapseExtraLiveDays` would keep. Returning a newer trashed day makes `requireEditableDay` throw 「ゴミ箱の日です。先に戻してください」 while an older live day still exists, or the reverse.

The promise is every combination of live and trashed documents, not an event order. No verifier runs on this TypeScript, so the check inserts the grid and calls `getDayByDate` through `convex-test`.

## Run

From the repository root, with `vp` on `PATH` (Node >= 24.17.0):

```bash
vp test convex/services/days/getDayByDate.property.test.ts
```

## What the current code does

Pass. 16 scenarios: 0 to 3 live days crossed with 0 to 3 trashed days.

Trashed days are inserted first. The case `liveCount: 1` and `trashedCount: 1` is the one that matters for the page: the older document is trashed and the newer one is live, and the pick must be the live day. `liveCount: 0` and `trashedCount: 2` must pick the older trashed day.

Sorting both lists newest-first fails that second case: the returned id is the newer trashed day. Confirmed, then reverted; the command passed again. Do not change the expected id to the last element.

A decoy day for another owner on the same date, and one for this owner on another date, are inserted and must not be returned. The query already filters both, and the grid still inserts them so a dropped filter fails the check.

## Bounds

At most three live and three trashed documents. Assumes a later insert has a greater `_creationTime`. Equal timestamps are not generated.

Left out: which rows sit on the picked day (that move is `verify-collapse-extra-live-days`), and the day-page heading after the pick (that is `verify-trashed-day-page-kind`).

## When the code moves

Follow /maintain-formal-verification-skill. If the pick rule changes, change the expected id in the test to the new rule and rerun. Move the commit only after the assertion still compares against that rule on the whole grid.

Covered: `getDayByDate`. Rerun when a caller starts choosing a day without it.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
