import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import { categoryDtoValidator } from "../../lib/validators";
import { list as listCategories } from "../../services/categories/list";

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => listCategories(ctx, ctx.ownerId),
  returns: v.array(categoryDtoValidator),
});
