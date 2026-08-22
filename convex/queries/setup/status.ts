import { ownerQuery } from "../../lib/ownerFunctions";
import { setupStatusValidator } from "../../lib/setupStatus";
import { status as loadSetupStatus } from "../../services/setup/status";

export const status = ownerQuery({
  args: {},
  handler: async (ctx) => loadSetupStatus(ctx, ctx.ownerId),
  returns: setupStatusValidator,
});
