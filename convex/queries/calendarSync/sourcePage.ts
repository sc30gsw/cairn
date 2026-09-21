import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { calendarSyncSourcePhaseValidator, syncSourceValidator } from "../../lib/validators";
import { getOutput } from "../../services/calendarSync/getConnection";
import { findLink, syncSource } from "../../services/calendarSync/syncSource";
import { syncWindow } from "../../services/calendarSync/window";

export const sourcePage = internalQuery({
  args: {
    ownerId: v.string(),
    connectionId: v.id("calendarConnections"),
    todayJst: v.string(),
    phase: calendarSyncSourcePhaseValidator,
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(syncSourceValidator),
  handler: async (ctx, args) => {
    const output = await getOutput(ctx, args.ownerId);
    if (
      output === null ||
      output.changing ||
      output.connection._id !== args.connectionId ||
      output.connection.disconnecting
    )
      return { page: [], isDone: true, continueCursor: "" };
    if (args.phase === "goals") {
      const page = await ctx.db
        .query("goals")
        .withIndex("by_owner_and_type", (q) => q.eq("ownerId", args.ownerId))
        .paginate(args.paginationOpts);
      return {
        ...page,
        page: await Promise.all(
          page.page.map(async (goal) =>
            syncSource(
              ctx,
              args.ownerId,
              "goal",
              goal._id,
              await findLink(ctx, args.ownerId, "goal", goal._id),
            ),
          ),
        ),
      };
    }
    if (args.phase === "plans") {
      const window = syncWindow(args.todayJst);
      const startDate = window.startAtMin.slice(0, 10);
      const endExclusive = window.startAtMaxExclusive.slice(0, 10);
      const page = await ctx.db
        .query("planEvents")
        .withIndex("by_owner_and_dateJst_and_startMinute", (q) =>
          q.eq("ownerId", args.ownerId).gte("dateJst", startDate).lt("dateJst", endExclusive),
        )
        .paginate(args.paginationOpts);
      return {
        ...page,
        page: await Promise.all(
          page.page.map(async (event) =>
            syncSource(
              ctx,
              args.ownerId,
              "plan",
              event._id,
              await findLink(ctx, args.ownerId, "plan", event._id),
            ),
          ),
        ),
      };
    }
    const page = await ctx.db
      .query("calendarSyncLinks")
      .withIndex("by_owner_and_calendar_and_event", (q) => q.eq("ownerId", args.ownerId))
      .paginate(args.paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page.map((link) =>
          syncSource(ctx, args.ownerId, link.sourceKind, link.sourceId, link),
        ),
      ),
    };
  },
});
