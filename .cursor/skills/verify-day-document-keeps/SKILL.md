---
name: verify-day-document-keeps
description: Check that trashing, restoring, and setting 調子 leave a day's stored 調子 and its rows on that document. Use when changing setCondition, setMemo, rows.add, removeDay, or restoreDay.
---

# Day document keeps its 調子 and rows

Two promises on the same steps as the day page:

- After `setCondition` has stored a 調子, every later step still has that 調子 on the same document. `restoreDay` patches `deletedAt` off and no other field (`convex/services/trash/restoreDay.ts`).
- After a row has been added, every later step still has a row on that document. `setCondition` patches `condition` only (`convex/services/days/setCondition.ts`). `removeDay` does not delete rows.

`convex/learningLog.test.ts` (`コンディションとメモ`) checks the condition and the memo, not the rows, and the trash/restore test does not read `condition` after restore.

Event order, so the check is TLA+ / TLC on `DayPage.tla`. The invariants are `ConditionSurvives` (`condEver => condition = "set" /\ stored`) and `RowsSurvive` (`rowsEver => rows /\ stored`), plus `TypeOK`.

## Run

From the repository root, with Java 21 on `PATH` (last run: OpenJDK 21.0.10):

```bash
bash .cursor/skills/day-page-model/run-tlc.sh DayDocumentKeeps.cfg
```

TLC 1.7.4, jar sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`, checked by the script. One worker.

Read every TLC result with /statechart. Do not copy that skill's commands, options, or file paths.

## What the current code does

Exit 0. `Model checking completed. No error has been found.` 159 states generated, 76 distinct, depth 6, none left on the queue. TLC's coverage of this `Next`: Midnight 26, WriteMemo 3, WriteRecord 9, PickCondition 9, TrashDay 12, TryEdit 12, OpenTrash 24, CloseTrash 36, Restore 24. The zero-successor count is the breadth-first tree, not a deadlock.

The properties can fail. Confirmed, then reverted:

- `restoreDay` also patching `condition: undefined`, with `Restore` setting `condition' = "none"`, violates `ConditionSurvives`. Trace: `PickCondition`, `TrashDay`, `OpenTrash`, `Restore`, and `condition` is `none` while `condEver` stays true. Exit 12.
- `setCondition` deleting the day's rows, with `PickCondition` setting `rows' = FALSE`, violates `RowsSurvive`. Trace: `WriteRecord`, then `PickCondition`. Exit 12.

After those edits were dropped, the run returned to the exit 0 result above. Do not weaken either invariant to keep that result.

## Bounds

Same model as `verify-trashed-day-page-kind`: one date, one document, `condition` is `none` or `set`, `rows` is a boolean. `WriteMemo` on an existing day and an empty memo are omitted because they change no variable. `PickCondition` covers both creating the day and setting 調子 on an existing today or past day.

Left out: which of the three 調子 labels was stored, row text and minutes, a second document, purge, and `open`. The page-kind promise is the other skill; this config does not check `TrashDayIsObvious`, so its exit 0 does not mean a trashed day looks honest.

## When the code moves

Follow /maintain-formal-verification-skill. Update the action in `DayPage.tla` from the function you changed, then rerun. Move the commit only after the model matches.

Covered functions: `setCondition`, `setMemo`, `rows.add`, `removeDay`, `restoreDay`, and the day-page steps they share with `DayPage.tla`.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
