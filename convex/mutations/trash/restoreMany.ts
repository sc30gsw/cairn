import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { restoreTrashResultValidator } from "../../lib/validators/trash";
import { restoreMany as restoreTrashMany } from "../../services/trash/restoreMany";

export const restoreMany = ownerMutation({
  args: { dayIds: v.array(v.id("days")), rowIds: v.array(v.id("rows")) },
  handler: async (ctx, args) => restoreTrashMany(ctx, ctx.ownerId, args),
  returns: restoreTrashResultValidator,
});
