import { type Infer, v } from "convex/values";

export const rowMoveValidator = v.union(
  v.object({
    content: v.string(),
    kind: v.literal("confirm"),
    minutes: v.optional(v.number()),
  }),
  v.object({ kind: v.literal("reopen") }),
  v.object({ kind: v.literal("skip") }),
  v.object({ kind: v.literal("start") }),
  v.object({ kind: v.literal("unconfirm") }),
  v.object({ kind: v.literal("unskip") }),
  v.object({ kind: v.literal("unstart") }),
);

export const moveAndApplyOrderArgsValidator = v.object({
  dateJst: v.string(),
  move: rowMoveValidator,
  orderedRowIds: v.array(v.id("rows")),
  rowId: v.id("rows"),
});

export type MoveAndApplyOrderArgs = Infer<typeof moveAndApplyOrderArgsValidator>;
