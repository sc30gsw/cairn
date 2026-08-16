import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { obstacleDtoValidator } from "../../lib/validators";
import { listObstacles as listObstaclePlans } from "../../services/goals/listObstacles";

export const listObstacles = ownerQuery({
  args: {},
  handler: async (ctx) => listObstaclePlans(ctx, ctx.ownerId),
  returns: v.array(obstacleDtoValidator),
});
