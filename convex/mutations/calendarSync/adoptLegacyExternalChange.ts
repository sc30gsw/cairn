import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import schema from "../../schema";
import { getConnection } from "../../services/calendarSync/getConnection";
import { queueExternalChange } from "../../services/calendarSync/queueExternalChange";

export const adoptLegacyExternalChange = internalMutation({
  args: schema.tables.calendarExternalChanges.validator.omit("settledAt").fields,
  handler: async (ctx, args) => {
    const connection = await getConnection(ctx, args.ownerId);
    if (
      connection === null ||
      connection.disconnecting === true ||
      connection.externalChangesVersion !== undefined
    )
      return null;
    const pending = await ctx.db
      .query("calendarExternalChanges")
      .withIndex("by_owner_and_calendar_and_event", (q) =>
        q
          .eq("ownerId", args.ownerId)
          .eq("calendarId", args.calendarId)
          .eq("googleEventId", args.googleEventId),
      )
      .unique();
    if (pending !== null) return null;
    await queueExternalChange(ctx, args);
    return null;
  },
  returns: v.null(),
});
