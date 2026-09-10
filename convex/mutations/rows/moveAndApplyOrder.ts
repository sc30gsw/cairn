import { v } from "convex/values";

import { requireDateJst } from "../../lib/dateArgs";
import { ownerMutation } from "../../lib/ownerFunctions";
import { moveAndApplyOrderArgsValidator } from "../../lib/validators/rowMove";
import { moveAndApplyOrder as moveAndApplyOrderService } from "../../services/rows/moveAndApplyOrder";

export const moveAndApplyOrder = ownerMutation({
  args: {
    ...moveAndApplyOrderArgsValidator.fields,
  },
  handler: async (ctx, args) =>
    moveAndApplyOrderService(ctx, ctx.ownerId, {
      ...args,
      dateJst: requireDateJst(args.dateJst),
    }),
  returns: v.union(v.number(), v.null()),
});
