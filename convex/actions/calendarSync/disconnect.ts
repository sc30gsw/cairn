"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE } from "../../lib/calendarSync";
import { ConflictError } from "../../lib/errors";
import { todayJst } from "../../lib/jst";
import { ownerAction, throwDomain } from "../../lib/ownerFunctions";
import { deleteLinkedGoogleEvents } from "../../services/calendarSync/deleteLinkedGoogleEvents";
import { requireCalendarOperation } from "../../services/calendarSync/operation";

export const disconnect = ownerAction({
  args: {},
  handler: async (ctx) =>
    requireCalendarOperation(ctx, ctx.ownerId, async () => {
      const plan = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
        ownerId: ctx.ownerId,
        todayJst: todayJst(),
      });
      await ctx.runMutation(internal.mutations.calendarSync.operation.beginDisconnect, {
        ownerId: ctx.ownerId,
      });
      if (plan !== null) {
        const outcome = await deleteLinkedGoogleEvents(ctx, ctx.ownerId, plan);
        if (outcome === "failed") {
          throwDomain(new ConflictError({ message: CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE }));
        }
      }
      await ctx.runMutation(internal.mutations.calendarSync.clearConnection.clearConnection, {
        ownerId: ctx.ownerId,
      });
      return null;
    }),
  returns: v.null(),
});
