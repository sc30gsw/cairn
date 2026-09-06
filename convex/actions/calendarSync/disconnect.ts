"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { CALENDAR_SYNC_DISCONNECT_INCOMPLETE_MESSAGE } from "../../lib/calendarSync";
import { ConflictError } from "../../lib/errors";
import { todayJst } from "../../lib/jst";
import { ownerAction, throwDomain } from "../../lib/ownerFunctions";
import { deleteLinkedGoogleEvents } from "../../services/calendarSync/deleteLinkedGoogleEvents";

//? 連携解除: アプリが Google に作った予定を消し、接続・対応表・写しをすべて消す（Q8/Q19）。
//? 消せなかった予定があれば解除せずに知らせる（Google 側に孤児を残さない）。トークンが取れない
//? （権限が取り消された）ときは消しようがないので、そのまま解除する
export const disconnect = ownerAction({
  args: {},
  handler: async (ctx) => {
    const plan = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
      ownerId: ctx.ownerId,
      todayJst: todayJst(),
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
  },
  returns: v.null(),
});
