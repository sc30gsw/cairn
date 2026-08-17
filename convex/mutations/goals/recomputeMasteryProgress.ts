import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { recomputeMasteryProgressForOwner } from "../../services/goals/recomputeMasteryProgressForOwner";

//? カウンタが漂流したときの修復手段(ADR-0007)。内部専用なので所有者は引数で受ける — 呼べるのは
//? scheduler / crons / ダッシュボードの一度きり実行だけで、クライアントからは呼べない(CVX-01/05)。
export const recomputeMasteryProgress = internalMutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => recomputeMasteryProgressForOwner(ctx, args.ownerId),
  returns: v.null(),
});
