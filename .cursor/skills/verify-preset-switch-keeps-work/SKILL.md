---
name: verify-preset-switch-keeps-work
description: Check that switchPreset deletes only 未着手 rows and leaves a 進行中 row's timerStartedAt in place. Use when changing switchPreset or the delete condition next to keptRowsAfterSwitch.
---

# Preset switch keeps work in progress

`switchPreset` (`convex/services/rows/switchPreset.ts`) hard-deletes rows whose status is `未着手`, then inserts the preset lines as `未着手`. A `確定` row, a `進行中` row, and a `スキップ` row stay, including `timerStartedAt` on the `進行中` row. The delete condition is written inline. It does not call `keptRowsAfterSwitch`.

`convex/lib/preset.test.ts` checks `keptRowsAfterSwitch`. The learning-log switch test keeps one `確定` row. Neither runs the mutation with a clock on `進行中` and a `スキップ` row beside an `未着手` row. Deleting the `進行中` row throws away the measurement.

No verifier runs on this TypeScript. The check calls `switchPreset` through `convex-test`.

## Run

From the repository root, with `vp` on `PATH` (Node >= 24.17.0):

```bash
vp test convex/services/rows/switchPresetKeeps.property.test.ts
```

## What the current code does

Pass. One day, four rows on one item (`確定`, `進行中` with `timerStartedAt` set, `未着手`, `スキップ`). The preset has one line on a second item. After the switch the three kept ids remain, the clock is unchanged, the old `未着手` id is gone, and one new `未着手` row has the preset content.

Changing the delete condition from `status === "未着手"` to `status !== "確定"` removes the `進行中` row, so its status is undefined. Confirmed, then reverted. Do not drop the clock assertion because the pure helper still passes.

## Bounds

One live day, one preset, one line, four rows. The date is today (`2026-08-17`), so the edit guard allows the switch. No second preset and no board schedule event on the deleted row.

Left out: `keptRowsAfterSwitch` itself, and whether a kept `進行中` clock is the only clock on the day (`verify-one-running-timer`).

## When the code moves

Follow /maintain-formal-verification-skill. If the kept statuses change, change the assertions to the new rule and rerun. Move the commit only after they still call `switchPreset`.

Covered: `switchPreset`.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
