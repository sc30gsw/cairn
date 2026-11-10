---
name: verify-item-held-by-trashed-row
description: Check that items.remove refuses an item that still has a trashed row. Use when changing items.remove, the by_item lookup, or itemIdIsInUse.
---

# A trashed row still holds its item

`items.remove` (`convex/services/items/remove.ts`) loads the first `rows` document on `by_item` and throws 「使っている行または雛形がある項目は消せません」 when `itemIdIsInUse` sees it. The query does not filter `deletedAt`. A trashed row still points at the item. Deleting the item, then restoring the day, leaves that row on a missing item.

The item-delete tests use a live row, a preset line, or a mastery scope item. None inserts only a trashed row.

No verifier runs on this TypeScript. The check calls `items.remove` through `convex-test` on a real trashed row, and on a second item that has no row so the mutation is not "always throw".

## Run

From the repository root, with `vp` on `PATH` (Node >= 24.17.0):

```bash
vp test convex/services/items/removeHeldByTrash.property.test.ts
```

## What the current code does

Pass. The held item throws that message and stays. The unused item is deleted.

Treating a row with `deletedAt` set as unused makes `remove` resolve `null` for the held item. Confirmed, then reverted. Do not drop the throw assertion.

## Bounds

One owner, one category, one trashed row (`deletedAt` set, status `確定`), and one unused item. The day document is also trashed.

Left out: a preset line and a mastery `scopeItemIds` hold (those tests already throw), and `by_item.first()` when several rows share the item.

## When the code moves

Follow /maintain-formal-verification-skill. If a trashed row should stop holding the item, change this check to the new rule and rerun. Move the commit only after the assertion matches that rule on the real mutation.

Covered: `items.remove`.

Last confirmed against `989ad6a5f5648fc2d7490345222c5c5accd08e23`.
