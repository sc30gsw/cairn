---
name: verify-due-review-order
description: Check that dueUnplacedFlags returns only unplaced flags whose dueJst is on or before today, oldest due date first and creation order within a date. Use when changing dueUnplacedFlags, isReviewDue, or placeDueReviews.
---

# Due reviews, oldest first

`dueUnplacedFlags` (`convex/services/reviews/placeDueReviews.ts`) keeps flags whose `reviewRowId` is unset and whose `dueJst` is on or before the date (`isReviewDue`), then sorts by `dueJst` and, within a date, by `_creationTime`.

No test calls it. `placeDueReviews` places flags in that order. An overdue flag placed after a later one, or a placed or future flag placed again, hides the review the owner is late on or consumes a flag that was already on a row.

No verifier runs on this TypeScript. The check builds every subset of size 0 to 3 from six flags and calls `dueUnplacedFlags`. The expected ids are computed in the test from the rule above, not by calling `dueUnplacedFlags` or `isReviewDue`.

## Run

From the repository root, with `vp` on `PATH` (Node >= 24.17.0):

```bash
vp test convex/services/reviews/dueUnplacedFlags.property.test.ts
```

## What the current code does

Pass. 42 subsets. The six flags are two unplaced past flags (creation 1 then 2), one unplaced flag due today, one unplaced future flag, one placed past flag, and one placed flag due today. Today is `2026-08-17`.

Reversing the comparator fails a two-flag subset: the ids come back newest-first (`flag-71` before `flag-70`) where the rule wants creation order. Confirmed, then reverted. Do not change the expected order to match a reversed sort.

## Bounds

Subsets of at most three of those six shapes. Dates are `YYYY-MM-DD`, so string order matches calendar order. Equal `_creationTime` is not generated.

Left out: the row `placeDueReviews` inserts, stage advance, and a second open not duplicating a placed flag (the reviews integration test already walks one flag).

## When the code moves

Follow /maintain-formal-verification-skill. If the order rule changes, change the expected ids to the new rule and rerun. Move the commit only after the assertion still compares against that rule on the whole grid.

Covered: `dueUnplacedFlags`.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
