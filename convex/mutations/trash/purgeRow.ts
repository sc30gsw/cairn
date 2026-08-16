import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { purgeRow as purgeTrashRow } from "../../services/trash/purgeRow";

export const purgeRow = ownerMutation({
  args: { rowId: v.id("rows") },
  handler: async (ctx, args) => purgeTrashRow(ctx, ctx.ownerId, args),
  returns: v.null(),
});
