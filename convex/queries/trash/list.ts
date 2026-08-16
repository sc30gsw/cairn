import { ownerQuery } from "../../lib/ownerFunctions";
import { trashPageValidator } from "../../lib/validators";
import { list as listTrash } from "../../services/trash/list";

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => listTrash(ctx, ctx.ownerId),
  returns: trashPageValidator,
});
