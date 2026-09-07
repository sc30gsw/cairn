"use node";

import type { FunctionReturnType } from "convex/server";
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";

const STAGGER_MS = 2_000;

type ConnectedPage = FunctionReturnType<
  typeof internal.queries.calendarSync.connectedPage.connectedPage
>;

export const syncAll = internalAction({
  args: {},
  handler: async (ctx) => {
    let cursor: string | null = null;
    while (true) {
      const page: ConnectedPage = await ctx.runQuery(
        internal.queries.calendarSync.connectedPage.connectedPage,
        { paginationOpts: { cursor, numItems: 100 } },
      );
      await Promise.all(
        page.page.map((connection, index) =>
          ctx.scheduler.runAfter(
            index * STAGGER_MS,
            internal.actions.calendarSync.syncOwner.syncOwner,
            connection,
          ),
        ),
      );
      if (page.isDone) break;
      cursor = page.continueCursor;
    }
    return null;
  },
  returns: v.null(),
});
