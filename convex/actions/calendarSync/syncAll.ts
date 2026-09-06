"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

const STAGGER_MS = 2_000;

export const syncAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const ownerIds = await ctx.runQuery(
      internal.queries.calendarSync.listConnectedOwners.listConnectedOwners,
      {},
    );
    await Promise.all(
      ownerIds.map((ownerId, index) =>
        ctx.scheduler.runAfter(
          index * STAGGER_MS,
          internal.actions.calendarSync.syncOwner.syncOwner,
          {
            ownerId,
          },
        ),
      ),
    );
    return null;
  },
  returns: v.null(),
});
