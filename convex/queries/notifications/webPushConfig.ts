import { ownerQuery } from "../../lib/ownerFunctions";
import { webPushConfigValidator } from "../../lib/validators";
import { webPushConfig as loadWebPushConfig } from "../../services/notifications/webPushConfig";

export const webPushConfig = ownerQuery({
  args: {},
  handler: async () => loadWebPushConfig(),
  returns: webPushConfigValidator,
});
