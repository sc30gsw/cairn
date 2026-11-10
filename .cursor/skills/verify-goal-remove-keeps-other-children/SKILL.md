---
name: verify-goal-remove-keeps-other-children
description: Check that goals.remove deletes only the checkpoints whose parentGoalId is the removed goal. Use when changing goals.remove or listChildCheckpoints.
---

# Removing one exam keeps another exam's checkpoints

`goals.remove` deletes the mastery goals `listChildCheckpoints` returns, then deletes the goal (`convex/services/goals/remove.ts`). `listChildCheckpoints` (`convex/services/goals/listChildCheckpoints.ts`) keeps goals whose type is `mastery` and whose `parentGoalId` is that goal. A checkpoint of a different parent stays.

`convex/goals.hierarchy.test.ts` INV-6 deletes one parent and keeps a long-term goal that has no parent and no children. It does not create a checkpoint under a second exam. Widening the filter to every mastery goal with any parent deletes the other exam's checkpoints, and INV-6 still passes.

No verifier runs on this TypeScript. The check calls `goals.remove` through `convex-test`.

## Run

From the repository root, with `vp` on `PATH` (Node >= 24.17.0):

```bash
vp test convex/services/goals/removeLeavesOtherCheckpoints.property.test.ts
```

## What the current code does

Pass. Exam A has one checkpoint. A's result is recorded (`score` 855 on `2026-08-17`), which is what lets a second exam exist. Exam B has its own checkpoint. Removing A returns 1. A and A's checkpoint are gone. B and B's checkpoint remain.

Changing the filter from `parentGoalId === goalId` to `parentGoalId !== undefined` makes `remove` return 2. Confirmed, then reverted. Do not change the expected count to 2.

## Bounds

Two exams, one checkpoint each, one owner, system date `2026-08-17`. A is finished before B is created, because a second active exam is rejected. No long-term goal and no grandchild.

Left out: INV-1 through INV-5 (parent required, a checkpoint cannot parent a checkpoint, self-parent, another owner's goal, and a goal with children cannot become a checkpoint). Those already fail in `goals.hierarchy.test.ts`.

## When the code moves

Follow /maintain-formal-verification-skill. If which children are deleted changes, change the expected remaining ids to the new rule and rerun. Move the commit only after the assertion still calls `goals.remove`.

Covered: `listChildCheckpoints`, `goals.remove`.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
