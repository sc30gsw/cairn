import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { nextReviewStage, reviewDueJst } from "../../lib/review";

async function flagOfReviewRow(ctx: MutationCtx, row: Doc<"rows">) {
  return await ctx.db
    .query("reviewFlags")
    .withIndex("by_reviewRow", (q) => q.eq("reviewRowId", row._id))
    .unique();
}

//? 復習の記録を確定した: 段階を1つ進め、次の期日はその日から数える。最後の段階なら印は消える
export async function advanceReviewForRow(ctx: MutationCtx, row: Doc<"rows">): Promise<null> {
  const flag = await flagOfReviewRow(ctx, row);
  if (flag === null) {
    return null;
  }
  const stage = nextReviewStage(flag.stage);
  if (stage === null) {
    await ctx.db.delete("reviewFlags", flag._id);
    return null;
  }
  await ctx.db.patch("reviewFlags", flag._id, {
    dueJst: reviewDueJst(row.dateJst, stage),
    reviewRowId: undefined,
    stage,
  });
  return null;
}

//? 復習の記録を見送った / ゴミ箱に入れた: 印はそこで終わる（催促も繰り越しもしない）
export async function endReviewForRow(ctx: MutationCtx, row: Doc<"rows">): Promise<null> {
  const flag = await flagOfReviewRow(ctx, row);
  if (flag !== null) {
    await ctx.db.delete("reviewFlags", flag._id);
  }
  return null;
}
