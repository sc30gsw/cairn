import { Result } from "better-result";
import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { throwDomain } from "../../lib/ownerFunctions";
import schema from "../../schema";
import { consumeRequest } from "../../services/calendarAuth/requests";

const requestFields = schema.tables.calendarAuthorizationRequests.validator.fields;

export const consume = internalMutation({
  args: { ownerId: v.string(), requestId: v.string() },
  handler: async (ctx, args) => {
    const result = await consumeRequest(ctx, args.ownerId, args.requestId);
    if (Result.isError(result)) {
      throwDomain(result.error);
    }
    return result.value;
  },
  returns: v.object({
    calendarId: requestFields.calendarId,
    googleAccountId: v.string(),
    purpose: requestFields.purpose,
  }),
});
