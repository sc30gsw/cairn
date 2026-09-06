import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";

import { internalQuery } from "../../_generated/server";
import { syncSourceValidator } from "../../lib/validators";
import { getOutput } from "../../services/calendarSync/getConnection";
import { findLink, syncSource } from "../../services/calendarSync/syncSource";
import { syncWindow } from "../../services/calendarSync/window";

export const sourcePage = internalQuery({
  args: {
    ownerId: v.string(),
    connectionId: v.id("calendarConnections"),
    todayJst: v.string(),
    phase: v.union(v.literal("goals"), v.literal("blocks"), v.literal("links")),
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
    if (args.phase === "blocks") {
      const window = syncWindow(args.todayJst);
      const page = await ctx.db
        .query("boardScheduleEvents")
        .withIndex("by_owner_and_startAt", (q) =>
          q
            .eq("ownerId", args.ownerId)
            .gte("startAt", window.startAtMin)
            .lt("startAt", window.startAtMaxExclusive),
        )
        .paginate(args.paginationOpts);
      return {
        ...page,
        page: await Promise.all(
          page.page.map(async (block) =>
            syncSource(
              ctx,
              args.ownerId,
              "block",
              block._id,
              await findLink(ctx, args.ownerId, "block", block._id),
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
