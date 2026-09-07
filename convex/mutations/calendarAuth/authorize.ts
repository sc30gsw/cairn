import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { authorizeRequest } from "../../services/calendarAuth/requests";

export const authorize = internalMutation({
  args: { googleAccountId: v.string(), ownerId: v.string(), requestId: v.string() },
  handler: authorizeRequest,
  returns: v.boolean(),
});
