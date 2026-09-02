import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireDateJst } from "../../lib/dateArgs";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { compareDateJst } from "../../lib/jst";
import { throwDomain } from "../../lib/ownerFunctions";
import {
  REVIEW_DUE_MESSAGE,
  REVIEW_OF_REVIEW_MESSAGE,
  REVIEW_ONLY_CONFIRMED_MESSAGE,
  reviewDueJst,
} from "../../lib/review";
import { requireOwnedRow } from "../rows/requireOwnedRow";
import { rowDayLiveness } from "../rows/rowDayLiveness";

export type FlagReviewArgs = {
  //? 省略なら既定の間隔（今日から1日後）。手直しは日付で渡す
  dueJst?: string;
  rowId: Id<"rows">;
  todayJst: string;
};

//? 確定した記録にだけ印を付ける。すでに印があれば期日だけを差し替える（段階は保つ）
export async function flag(ctx: MutationCtx, ownerId: string, args: FlagReviewArgs): Promise<null> {
  const todayJst = requireDateJst(args.todayJst);
  const row = await requireOwnedRow(ctx, ownerId, args.rowId);
  if ((await rowDayLiveness(ctx, ownerId, row)) !== "live") {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  const asReview = await ctx.db
    .query("reviewFlags")
    .withIndex("by_reviewRow", (q) => q.eq("reviewRowId", row._id))
    .unique();
  if (asReview !== null) {
    throwDomain(new ValidationFailedError({ message: REVIEW_OF_REVIEW_MESSAGE }));
  }
  if (row.status !== "確定") {
    throwDomain(new ValidationFailedError({ message: REVIEW_ONLY_CONFIRMED_MESSAGE }));
  }
  const dueJst =
    args.dueJst === undefined ? reviewDueJst(todayJst, 0) : requireDateJst(args.dueJst);
  if (compareDateJst(dueJst, todayJst) <= 0) {
    throwDomain(new ValidationFailedError({ message: REVIEW_DUE_MESSAGE }));
  }
  const existing = await ctx.db
    .query("reviewFlags")
    .withIndex("by_sourceRow", (q) => q.eq("sourceRowId", row._id))
    .unique();
  if (existing !== null) {
    await ctx.db.patch("reviewFlags", existing._id, { dueJst });
    return null;
  }
  await ctx.db.insert("reviewFlags", {
    content: row.content,
    dueJst,
    itemId: row.itemId,
    ownerId,
    sourceRowId: row._id,
    stage: 0,
  });
  return null;
}
