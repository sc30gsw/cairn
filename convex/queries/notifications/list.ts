import { ownerQuery } from "../../lib/ownerFunctions";
import { notificationPageValidator } from "../../lib/validators";
import { list as listNotifications } from "../../services/notifications/list";

export const list = ownerQuery({
  args: {},
  handler: async (ctx) => listNotifications(ctx, ctx.ownerId),
  returns: notificationPageValidator,
});
