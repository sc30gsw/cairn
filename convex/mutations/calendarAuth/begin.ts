import { Result } from "better-result";

import { ownerMutation, throwDomain } from "../../lib/ownerFunctions";
import {
  calendarAuthBeginArgsValidator,
  calendarAuthBeginResultValidator,
} from "../../lib/validators";
import { beginRequest } from "../../services/calendarAuth/requests";

export const begin = ownerMutation({
  args: calendarAuthBeginArgsValidator.fields,
  handler: async (ctx, args) => {
    const result = await beginRequest(ctx, ctx.ownerId, args);
    if (Result.isError(result)) {
      throwDomain(result.error);
    }
    return result.value;
  },
  returns: calendarAuthBeginResultValidator,
});
