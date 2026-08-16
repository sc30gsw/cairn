import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { itemDtoValidator } from "../../lib/validators";
import { list as listItems } from "../../services/items/list";

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => listItems(ctx, ctx.ownerId),
  returns: v.array(itemDtoValidator),
});
