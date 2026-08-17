import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { setAchieved as setGoalAchieved } from "../../services/goals/setAchieved";

//? achievedAt は JST 暦日 `YYYY-MM-DD`。形は validator では縛れないので services 側で弾く。
export const setAchieved = ownerMutation({
  args: { achievedAt: v.optional(v.string()), goalId: v.id("goals") },
  handler: async (ctx, args) => setGoalAchieved(ctx, ctx.ownerId, args),
  returns: v.null(),
});
