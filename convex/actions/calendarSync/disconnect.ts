"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE } from "../../lib/calendarSync";
import { ConflictError } from "../../lib/errors";
import { todayJst } from "../../lib/jst";
import { ownerAction, throwDomain } from "../../lib/ownerFunctions";
import { clearConnectionState } from "../../services/calendarSync/clearConnectionState";
import { deleteLinkedGoogleEvents } from "../../services/calendarSync/deleteLinkedGoogleEvents";
import { requireCalendarOperation } from "../../services/calendarSync/operation";

export const disconnect = ownerAction({
  args: { connectionId: v.optional(v.id("calendarConnections")) },
  handler: async (ctx, args) =>
    requireCalendarOperation(ctx, ctx.ownerId, async () => {
      const plan = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
        ownerId: ctx.ownerId,
        connectionId: args.connectionId,
        todayJst: todayJst(),
      });
      await ctx.runMutation(internal.mutations.calendarSync.beginDisconnect.beginDisconnect, {
        ownerId: ctx.ownerId,
        connectionId: args.connectionId,
      });
      let warning: string | null = null;
      if (plan !== null) {
        const outcome = await deleteLinkedGoogleEvents(ctx, ctx.ownerId, plan);
        if (outcome === "noToken")
          warning =
            "Google の権限が失われているため、Cairn が作った予定が Google に残っている可能性があります";
        if (outcome === "failed") {
          throwDomain(new ConflictError({ message: CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE }));
        }
      }
      await clearConnectionState(ctx, ctx.ownerId, args.connectionId);
      return { warning };
    }),
  returns: v.object({ warning: v.union(v.null(), v.string()) }),
});
