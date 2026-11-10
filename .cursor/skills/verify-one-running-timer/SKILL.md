---
name: verify-one-running-timer
description: Check that start, resumeTimer, and reopen leave at most one row with timerStartedAt set, and that a clock sits only on 進行中. Use when changing those three, stopRunningTimer, stopTimer, autoStopTimers, confirm, skip, unstart, unskip, or unconfirm.
---

# One running timer

After `start`, `resumeTimer`, `reopen`, `stopTimer`, `autoStopTimers`, `confirm`, `skip`, `unstart`, `unskip`, or `unconfirm`, at most one of two rows has `timerStartedAt` set, and a clock sits only on `進行中`.

`start`, `resumeTimer`, and `reopen` each call `stopRunningTimer` before they set their own clock (`convex/services/rows/start.ts`, `resumeTimer.ts`, `reopen.ts`, `stopRunningTimer.ts`). `stopRunningTimer` adds the elapsed segment and clears `timerStartedAt`. It does not change status. `confirm`, `skip`, and `unstart` clear that row's timer fields. `unconfirm` and `unskip` do not start a clock. `findRunningTimerRow` returns the first of at most eight index hits, so a second clock is folded onto the wrong row or left running.

`convex/rowTimer.test.ts` T5 starts a second row and checks that one timer remains. It does not resume a different `進行中` row, and it does not reopen a `確定` row while another clock is set.

This is an order of events, so the check is TLA+ / TLC. The invariants are `AtMostOneClock` and `TypeOK` (`clock` implies status `ongoing`) on `OneTimer.tla`.

## Run

From the repository root, with Java 21 on `PATH` (last run: OpenJDK 21.0.10):

```bash
bash .cursor/skills/timer-model/run-tlc.sh OneTimer.cfg
```

TLC 1.7.4, jar sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`, checked by the script. One worker.

Read every TLC result with /statechart. Do not copy that skill's commands, options, or file paths.

In the model, `pending` is `未着手`, `ongoing` is `進行中`, `confirmed` is `確定`, and `skipped` is `スキップ`. Rows are `a` and `b`. `clock` means `timerStartedAt` is set.

## What the current code does

Exit 0. `Model checking completed. No error has been found.` 177 states generated, 24 distinct, depth 4, none left on the queue.

The property can fail. Confirmed, then reverted. Do not weaken `AtMostOneClock`.

- Removing `stopRunningTimer` from `resumeTimer`, and changing `Resume` to set only that row's clock, violates the invariant. Trace: `Start` on `a` (clock on `a`), `Start` on `b` (stops `a`, both `ongoing`, clock on `b`), `Resume` on `a`. Both clocks are true. Exit 12.
- Removing `stopRunningTimer` from `reopen`, and changing `Reopen` the same way, violates it. Trace: `Start` on `a`, `Confirm` on `b` (confirm does not stop another row's clock), `Reopen` on `b`. Both clocks are true. Exit 12.

After those edits were dropped, the run returned to the exit 0 result above. A model whose `Resume` or `Reopen` still clears the other clock will pass while the product leaves two clocks. Update the action from the function before rerunning.

## Bounds

Two rows, one live day. No trash. `confirm` and `skip` have no status precondition in the code, and the model matches that: they set the status and clear that row's clock, and they do not clear the other row. `Start` requires `未着手`. `Resume` requires `進行中` with the clock off. `Reopen` requires `確定`. The 240-minute cap and the auto-stop arithmetic are not in this model. `AutoStop` only clears the clock and leaves `進行中`.

Left out: which row `findRunningTimerRow` returns when two clocks exist, a trashed day, and a third row. The auto-stop filter over `確定` and deleted rows is `verify-auto-stop-leaves-other-rows`.

## When the code moves

Follow /maintain-formal-verification-skill. Update the action in `OneTimer.tla` from the function you changed, then rerun. Move the commit only after the model matches.

Covered: `start`, `resumeTimer`, `reopen`, `stopRunningTimer`, `stopTimer`, `autoStopTimers` (clock cleared, status unchanged), `confirm`, `skip`, `unstart`, `unskip`, `unconfirm`.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
