import { ownerMutation } from "../../lib/ownerFunctions";
import { restoreManyArgsValidator, restoreTrashResultValidator } from "../../lib/validators/trash";
import { restoreMany as restoreTrashMany } from "../../services/trash/restoreMany";

export const restoreMany = ownerMutation({
  args: restoreManyArgsValidator.fields,
  handler: async (ctx, args) => restoreTrashMany(ctx, ctx.ownerId, args),
  returns: restoreTrashResultValidator,
});
