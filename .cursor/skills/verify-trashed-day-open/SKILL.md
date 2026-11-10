---
name: verify-trashed-day-open
description: Check that opening today or materializing its item plan does not place a due review or a pending plan onto a day whose deletedAt is set. Use when changing openDay, materializePlanEventsForDate, placeDueReviews, or pendingPlanMaterializations.
---

# Trashed day stays closed to open and plan materialize

Opening today, or materializing that date's item plan, does not place a due review and does not insert a plan row when `getDayByDate` already finds `deletedAt` set.

`openDay` returns `{ applied: false }` before `placeDueReviews` and `materializePlanEvents` in that case (`convex/services/days/openDay.ts`). `materializePlanEventsForDate` returns before the insert in the same case (`convex/services/plan/openDate.ts`). The learning-log test `ゴミ箱の日には行を足さず、open も日を増やさない` only checks that return value and the trash-list length. `openDay` returns `{ applied: false }` even after it writes, so a removed `deletedAt` return still passes that test while `reviewRowId` is consumed on a hidden day, or a plan row is attached to a day the page does not show.

This is an order of events on one date, so the check is TLA+ / TLC. The invariant is `NothingPlacedInTrash` (`~placedWhileTrashed`), plus `TypeOK`, on `TrashedOpen.tla`.

## Run

From the repository root, with Java 21 on `PATH` (last run: OpenJDK 21.0.10):

```bash
bash .cursor/skills/trashed-open-model/run-tlc.sh TrashedOpen.cfg
```

TLC 1.7.4, jar sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`, checked by the script. One worker.

Read every TLC result with /statechart. Do not copy that skill's commands, options, or file paths.

## What the current code does

Exit 0. `Model checking completed. No error has been found.` 27 states generated, 16 distinct, depth 3, none left on the queue.

The property can fail. Confirmed, then reverted. Do not weaken `NothingPlacedInTrash`.

- Removing the `deletedAt` return in `openDay`, and dropping `~trashed` from `Open` so a write sets `placedWhileTrashed`, violates the invariant. Trace: initial `review = "due"` and `plan = "pending"`, `Trash`, `Open`. `review` becomes `placed` and `plan` becomes `materialized` while `trashed` stays true. Exit 12.
- Removing the `deletedAt` return in `materializePlanEventsForDate`, and dropping `~trashed` from `Materialize` the same way, violates it. Trace: the same initial state, `Trash`, `Materialize`. `plan` becomes `materialized` and `review` stays `due`. Exit 12.

After those edits were dropped, the run returned to the exit 0 result above. A model that still refuses `Open` and `Materialize` while `trashed` is true will pass while the product writes. Update the action from the function before rerunning.

## Bounds

One date, one day document. `review` is `none`, `due`, or `placed`. `plan` is `none`, `pending`, or `materialized`. A title-only plan event is `none`, because it never becomes a row. The item for a pending plan is assumed to still exist. No purge, and no second document.

Left out: the day-page heading after trash (`verify-trashed-day-page-kind`), which 調子 and rows survive (`verify-day-document-keeps`), and weekly-review aggregates.

## When the code moves

Follow /maintain-formal-verification-skill. Update `Open` or `Materialize` in `TrashedOpen.tla` from the function you changed, then rerun. Move the commit only after the model matches.

Covered: `openDay`, `materializePlanEventsForDate`, `dueUnplacedFlags` (a due flag is `reviewRowId` unset and `dueJst` on or before the date), `pendingPlanMaterializations` (an item event with `materializedRowId` unset). `removeDay` and `restoreDay` are the `Trash` and `Restore` steps.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
