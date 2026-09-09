import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { purgeManyArgsValidator } from "../../lib/validators/trash";
import { purgeMany as purgeTrashMany } from "../../services/trash/purgeMany";

export const purgeMany = ownerMutation({
  args: purgeManyArgsValidator.fields,
  handler: async (ctx, args) => purgeTrashMany(ctx, ctx.ownerId, args),
  returns: v.null(),
});
