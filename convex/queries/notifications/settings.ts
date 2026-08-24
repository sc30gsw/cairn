import { ownerQuery } from "../../lib/ownerFunctions";
import { notificationSettingsDtoValidator } from "../../lib/validators";
import { settings as notificationSettings } from "../../services/notifications/settings";

export const settings = ownerQuery({
  args: {},
  handler: async (ctx) => notificationSettings(ctx, ctx.ownerId),
  returns: notificationSettingsDtoValidator,
});
