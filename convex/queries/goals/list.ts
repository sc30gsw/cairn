import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { goalDtoValidator } from "../../lib/validators";
import { list as listGoals } from "../../services/goals/list";

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => listGoals(ctx, ctx.ownerId),
  returns: v.array(goalDtoValidator),
});
