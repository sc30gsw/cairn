---
name: verify-plan-clock-times
description: Check that parseMinuteOfDay accepts 00:00–23:59, accepts 24:00 only as an end, and that parsePlanWindow rejects an end that is not after the start. Use when changing parseMinuteOfDay or parsePlanWindow.
---

# Plan clock times

`parseMinuteOfDay` (`convex/lib/planEvent.ts`) returns `hour * 60 + minute` for `00:00` through `23:59`. Minute above 59 throws `PLAN_TIME_MESSAGE`. Hour above 23 throws the same message, except `24:00` as an end, which returns 1440. `24:00` as a start throws. `parsePlanWindow` throws `PLAN_WINDOW_MESSAGE` when the start minute is greater than or equal to the end minute, and `PLAN_TIME_MESSAGE` when a clock is not a minute of the day.

`convex/lib/planEvent.test.ts` checks schedule instants and the today-through-plus-seven date range. It does not pass `23:60` or a clock grid. Accepting minute 60 stores `10:60` as 11:00.

No verifier runs on this TypeScript. The check calls `parseMinuteOfDay` and `parsePlanWindow`.

## Run

From the repository root, with `vp` on `PATH` (Node >= 24.17.0):

```bash
vp test convex/lib/planMinute.property.test.ts
```

## What the current code does

Pass. For each hour 0 through 23 and minutes 0, 1, 30, and 59, both roles return `hour * 60 + minute`. Minutes 60, 61, and 99 throw `PLAN_TIME_MESSAGE` for both roles. `24:00` as an end is 1440. `24:00` as a start, `24:01`, `25:00`, and `ab:cd` throw `PLAN_TIME_MESSAGE`. Each hour 0 through 22 accepts `HH:00` through the next hour. The same clock, and an end before the start, throw `PLAN_WINDOW_MESSAGE`. `23:59`–`24:00` is minutes 1439 and 1440. `24:00`–`24:00` throws `PLAN_TIME_MESSAGE` because the start is not a start time.

Deleting the `minute > 59` throw makes `00:60` return a number. Confirmed, then reverted. Do not drop the throw.

## Bounds

Hours 0 through 23, four legal minutes, three illegal minutes, and the 24:00 end. Not every minute 0 through 59. Not a date, and not the plan-week horizon (the plan-event tests already reject today+8).

Left out: `parsePlanWindow` of a cross-midnight string the API already rejects, and whether a saved plan materializes a row (`verify-trashed-day-open` covers the trashed case only).

## When the code moves

Follow /maintain-formal-verification-skill. If the legal clocks change, change the expected minutes and messages to the new rule and rerun. Move the commit only after the assertions still call `parseMinuteOfDay` and `parsePlanWindow`.

Covered: `parseMinuteOfDay`, `parsePlanWindow`.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
