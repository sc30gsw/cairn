---
name: verify-auto-stop-leaves-other-rows
description: Check that autoStopTimers clears the clock only on a live 進行中 row whose segment has expired. Use when changing autoStopTimers or the stale-row filter.
---

# Auto-stop leaves confirmed and trashed rows alone

`autoStopTimers` (`convex/services/rows/autoStopTimers.ts`) scans `by_timerStartedAt` up to `now - TIMER_MAX_SEGMENT_MS`. It patches a row only when `deletedAt` is unset, status is `進行中`, `timerStartedAt` is set, and `isSegmentExpired`. The patch adds `TIMER_MAX_SEGMENT_MS` to `timerAccumulatedMs`, sets `timerAutoStoppedAt` to `now`, clears `timerStartedAt`, and leaves status at `進行中`.

`convex/rowTimer.test.ts` T4 walks a live `進行中` row that is due, and one that is not. It does not insert a `確定` row or a deleted `進行中` row with a stale `timerStartedAt`. Dropping the status filter rewrites a confirmed row's stored timer.

No verifier runs on this TypeScript. The check calls `internal.mutations.rows.autoStopTimers` through `convex-test`.

## Run

From the repository root, with `vp` on `PATH` (Node >= 24.17.0):

```bash
vp test convex/services/rows/autoStopTimers.property.test.ts
```

## What the current code does

Pass. `now` is `1000 + TIMER_MAX_SEGMENT_MS`. The due `進行中` row (accumulated 5) ends with no `timerStartedAt`, `timerAutoStoppedAt` equal to `now`, accumulated `5 + TIMER_MAX_SEGMENT_MS`, and status `進行中`. The `確定` row keeps `timerStartedAt` 1000. The deleted `進行中` row keeps `deletedAt` 4 and `timerStartedAt` 1000. The `進行中` row started 60 seconds before `now` keeps its clock and has no `timerAutoStoppedAt`.

Removing `status === "進行中"` from the filter clears the confirmed row's `timerStartedAt`. Confirmed, then reverted. Do not drop that assertion because T4 still passes.

## Bounds

Four rows, one owner, one day, one `now`. The index includes any `timerStartedAt` from 0 through the cutoff, so the stale values are 1000. A row started after the cutoff is not expired.

Left out: the 240-minute value of `TIMER_MAX_SEGMENT_MS` (T4 and `rowTimer` cover the length), and whether two clocks can exist before this scan (`verify-one-running-timer`).

## When the code moves

Follow /maintain-formal-verification-skill. If which rows are patched changes, change the assertions to the new rule and rerun. Move the commit only after they still call `autoStopTimers`.

Covered: `autoStopTimers`.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
