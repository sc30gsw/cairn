import { type Infer, v } from "convex/values";

export const rowMoveValidator = v.union(
  v.literal("confirm"),
  v.literal("reopen"),
  v.literal("skip"),
  v.literal("start"),
  v.literal("unconfirm"),
  v.literal("unskip"),
  v.literal("unstart"),
);

export const moveAndApplyOrderArgsValidator = v.object({
  content: v.optional(v.string()),
  dateJst: v.string(),
  minutes: v.optional(v.number()),
  move: rowMoveValidator,
  orderedRowIds: v.array(v.id("rows")),
  rowId: v.id("rows"),
});

export type MoveAndApplyOrderArgs = Infer<typeof moveAndApplyOrderArgsValidator>;
