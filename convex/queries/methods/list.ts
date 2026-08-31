import { ownerQuery } from "../../lib/ownerFunctions";
import { methodCatalogValidator } from "../../lib/validators";
import { listCatalog } from "../../services/methods/listCatalog";

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => listCatalog(ctx, ctx.ownerId),
  returns: methodCatalogValidator,
});
