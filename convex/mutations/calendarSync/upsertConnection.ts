import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { upsertConnectionArgsValidator } from "../../lib/validators";
import { upsertConnection as upsert } from "../../services/calendarSync/connection";

export const upsertConnection = internalMutation({
  args: upsertConnectionArgsValidator.fields,
  handler: async (ctx, args) => upsert(ctx, args),
  returns: v.null(),
});
