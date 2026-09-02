import { ownerQuery } from "../../lib/ownerFunctions";
import { calendarFeedStatusValidator } from "../../lib/validators";
import { status as feedStatus } from "../../services/calendarFeed/status";

export const status = ownerQuery({
  args: {},
  handler: async (ctx) => feedStatus(ctx, ctx.ownerId),
  returns: calendarFeedStatusValidator,
});
