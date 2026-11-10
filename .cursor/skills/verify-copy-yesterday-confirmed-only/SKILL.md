---
name: verify-copy-yesterday-confirmed-only
description: Check that copyYesterdayConfirmed copies only live 確定 rows from yesterday and inserts them as 未着手. Use when changing copyYesterdayConfirmed or the status filter on yesterday's rows.
---

# Copy yesterday copies confirmed rows only

`copyYesterdayConfirmed` (`convex/services/rows/copyYesterdayConfirmed.ts`) reads yesterday's live rows, keeps those whose status is `確定` (`STATUSES[0]`), and inserts copies as `未着手`. A `スキップ`, `未着手`, or `進行中` row is not copied. A `確定` row with `deletedAt` set is not live, so it is not copied.

The learning-log copy test puts one `確定` row on yesterday. Removing the status filter still passes that test and copies a skipped or in-progress row as if it were confirmed study.

No verifier runs on this TypeScript. The check calls the mutation through `convex-test` with all five kinds of yesterday row.

## Run

From the repository root, with `vp` on `PATH` (Node >= 24.17.0):

```bash
vp test convex/services/rows/copyYesterdayConfirmed.property.test.ts
```

## What the current code does

Pass. Yesterday `2026-08-16` has a live `確定` (content `確定した`, 12 minutes), a live `スキップ`, a live `未着手`, a live `進行中`, and a deleted `確定`, each on its own item. The copy onto `2026-08-17` returns 1. Today's only row is `未着手` with that content and 12 minutes.

Removing the `status === confirmedStatus` filter returns 4. Confirmed, then reverted. Do not change the expected count to 4.

## Bounds

One owner, one live source day, five rows, an empty target date. Overlap replacement on the target is not in this case because the target starts empty.

Left out: soft-deleting a target row that shares an `itemId`, and the timer fields cleared on that overlap.

## When the code moves

Follow /maintain-formal-verification-skill. If which statuses are copied changes, change the expected row to the new rule and rerun. Move the commit only after the assertion still calls `copyYesterdayConfirmed`.

Covered: `copyYesterdayConfirmed`.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
