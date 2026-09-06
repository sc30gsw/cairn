"use node";

import { v } from "convex/values";

import { ownerAction } from "../../lib/ownerFunctions";
import { runOwnerSync } from "../../services/calendarSync/runOwnerSync";

//? 「今すぐ同期」と、予定タブを開いたときの差分取得（Q14）
export const syncNow = ownerAction({
  args: {},
  handler: async (ctx) => runOwnerSync(ctx, ctx.ownerId),
  returns: v.union(
    v.literal("error"),
    v.literal("needsReauth"),
    v.literal("notConnected"),
    v.literal("ok"),
  ),
});
