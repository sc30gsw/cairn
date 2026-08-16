import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";

export async function saveExam(
  ctx: MutationCtx,
  ownerId: string,
  args: { examDate: string; maxScore: number; minScore: number },
): Promise<null> {
  if (args.minScore > args.maxScore) {
    throwDomain(new ValidationFailedError({ message: "目標点の下限が上限を超えています" }));
  }
  const existing = await ctx.db
    .query("examGoals")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .unique();
  if (existing === null) {
    await ctx.db.insert("examGoals", {
      examDate: args.examDate,
      maxScore: args.maxScore,
      minScore: args.minScore,
      ownerId,
    });
  } else {
    await ctx.db.patch("examGoals", existing._id, {
      examDate: args.examDate,
      maxScore: args.maxScore,
      minScore: args.minScore,
    });
  }
  return null;
}
