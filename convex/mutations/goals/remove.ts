import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { remove as removeGoal } from "../../services/goals/remove";

export const remove = ownerMutation({
  args: { goalId: v.id("goals") },
  handler: async (ctx, args) => removeGoal(ctx, ctx.ownerId, args),
  //? カスケードで消えた子チェックポイントの件数。トーストの文言に使う(INV-6)。
  returns: v.number(),
});
