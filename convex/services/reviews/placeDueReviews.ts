import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { compareDateJst } from "../../lib/jst";
import { isReviewDue } from "../../lib/review";

//? 期日が来て、まだ並べていない印。期日超過も今日に繰り越す（休養日は飛ばし、失敗にはしない）
export function dueUnplacedFlags(
  flags: readonly Doc<"reviewFlags">[],
  dateJst: string,
): Doc<"reviewFlags">[] {
  return flags
    .filter((flag) => flag.reviewRowId === undefined && isReviewDue(flag.dueJst, dateJst))
    .toSorted(
      (left, right) =>
        compareDateJst(left.dueJst, right.dueJst) || left._creationTime - right._creationTime,
    );
}

//? 期日の来た復習を、その日の先頭に未着手の記録として並べる（プリセット適用と同じ経路・同じトランザクション）
export async function placeDueReviews(
  ctx: MutationCtx,
  ownerId: string,
  args: {
    dateJst: string;
    day: Doc<"days">;
    flags: readonly Doc<"reviewFlags">[];
    liveRows: readonly Doc<"rows">[];
  },
): Promise<number> {
  const due = dueUnplacedFlags(args.flags, args.dateJst);
  if (due.length === 0) {
    return 0;
  }
  const minSortOrder = args.liveRows.reduce((min, row) => Math.min(min, row.sortOrder), 0);
  await Promise.all(
    due.map(async (flag, index) => {
      const reviewRowId = await ctx.db.insert("rows", {
        content: flag.content,
        dateJst: args.dateJst,
        dayId: args.day._id,
        itemId: flag.itemId,
        minutes: 0,
        ownerId,
        sortOrder: minSortOrder - due.length + index,
        status: "未着手",
      });
      await ctx.db.patch("reviewFlags", flag._id, { reviewRowId });
    }),
  );
  return due.length;
}
