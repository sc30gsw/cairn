---
name: verify-trashed-day-page-kind
description: Check that a day whose deletedAt is set does not show as an empty today or a rest day on the day page. Use when changing getLiveDay, dayViewKind, getDayPage, removeDay, restoreDay, the day board empty state, or emptyDayCopy.
---

# Trashed day page kind

Promise, in the code's words: while the day page is showing a date whose day has `deletedAt` set, `dayViewKind` is not `todayEmpty` or `rest`. The trash list is a different screen and may list that day. The toast 「ゴミ箱の日です。先に戻してください」 does not change the kind, so it does not satisfy the promise.

`getLiveDay` returns nothing when the document is missing or `deletedAt` is set (`convex/services/days/getLiveDay.ts`). `getDayPage` then passes `hasLiveDay: false` and sets `day` to null and `rows` to `[]` (`convex/services/days/getDayPage.ts`). `dayViewKind` (`convex/lib/dayView.ts`) returns `todayEmpty` for today and `rest` for a past date that is not before service start. `DayBoard` renders `emptyDayCopy` whenever `rows` is empty (`src/features/today/components/day-board.tsx`), so the heading is 「この日の記録はありません」 or 「休養」 (`src/features/today/lib/empty-day-copy.ts`). The trash button renders only when `day.day !== null`, so it disappears with the document.

This is an order of events on one date, so the check is TLA+ / TLC, not a unit table of `dayViewKind`. `convex/learningLog.test.ts` (`ゴミ箱の日には行を足さず、open も日を増やさない`) only checks that adding a row throws and that `open` does not add a day. `convex/lib/dayView.test.ts` takes `hasLiveDay` as an argument and never sees `deletedAt`.

## Run

From the repository root, with Java 21 on `PATH` (last run: OpenJDK 21.0.10):

```bash
bash .cursor/skills/day-page-model/run-tlc.sh TrashedDayPageKind.cfg
```

TLC is pinned to 1.7.4. The script uses `tla2tools.jar` sha256 `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` and checks that hash before it starts. One worker. The config is `INVARIANT TypeOK` and `INVARIANT TrashDayIsObvious` on `DayPage.tla`.

Read every TLC result with /statechart. Do not copy that skill's commands, options, or file paths into this one. This command stops at the first broken state. /statechart keeps walking after a broken rule, which is how the other orders below were seen.

## What the current code does

Exit 12. TLC reports `Invariant TrashDayIsObvious is violated`. Shortest trace:

1. Initial: the date is today, no day document, the day page is open.
2. `WriteMemo`: a non-empty memo creates the day (`convex/services/days/setMemo.ts` calls `requireLiveDay` only when the memo is non-empty).
3. `TrashDay`: `removeDay` sets `deletedAt` (`convex/services/trash/removeDay.ts`).

`Kind` becomes `todayEmpty`. That is the page heading 「この日の記録はありません」, with the trash button gone. Do not edit `TrashDayIsObvious` so this exits 0. The product breaks the promise. Leave the finding until the product changes, then update `Live` from the new `getLiveDay` and rerun.

A model that sets `Live == stored` (ignoring `deletedAt`) makes this invariant pass at 76 states while `getLiveDay` still drops the day. That is the model lying. Revert it.

This command stops on that trace (19 states generated, 14 distinct, depth 3, states left on the queue). It does not print the other orders. They are the same actions from the other initial states, and `Kind` is the `dayViewKind` branches:

- `PickCondition` or `WriteRecord`, then `TrashDay`, on today, is the same `todayEmpty` heading. `PickCondition` does not require `stored = FALSE`, so it also sets 調子 on a day that already exists.
- `WriteMemo` then `TrashDay` from the past, not-before-start initial state makes `Kind` `rest`, heading 「休養」. TLC does not print it, because the today trace is also depth 2 and this command stops at the first violation. Read the result with /statechart to see that state.
- `CloseTrash` returns to that heading. `Restore` stays on the trash list (`src/features/trash/components/trash-page.tsx` does not navigate) and only clears `deletedAt`.
- `TryEdit` sets `told` and leaves `Kind` unchanged.
- A date before service start is `beforeRegistration`, heading 「利用開始前」. `TrashDayIsObvious` allows that. `removeDay` has no date check, so a written before-start day can be trashed.

The document-keeps config runs this same `Next` to completion (see that skill for the coverage counts). It does not check `TrashDayIsObvious`.

## Bounds

One date. `when` is `future`, `today`, or `past`. `beforeStart` only with `past`, because service start is `todayJst(user.createdAt)` and is never after today (`convex/services/days/serviceStartDate.ts`). `condition` is `none` or `set`, not the three 調子 labels. `rows` is absent or present. `place` is the day page or the trash list. One midnight step moves future to today and today to past.

Left out: `open` and plan materialization, purge, a second days document (that is `verify-collapse-extra-live-days`), weekly-review aggregates (`convex/weeklyReview.test.ts` expects a trashed past day to be `rest` for the review, which is a different surface), and the exact heading strings (`empty-day-copy.test.ts` already covers those given a kind).

## When the code moves

Follow /maintain-formal-verification-skill. Update `DayPage.tla` from the files below before rerunning. Move the commit only after the model matches the new code. Do not weaken `TrashDayIsObvious`.

Covered: `getLiveDay`, `dayViewKind`, `getDayPage`, `requireEditableDay`, `setMemo` (non-empty create), `setCondition`, `rows.add` (as `WriteRecord`), `removeDay`, `restoreDay`, `emptyDayCopy`, the day-board empty state and trash button, the trash page staying put on restore.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
