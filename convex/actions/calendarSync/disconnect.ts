"use node";

import { Result } from "better-result";
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { getGoogleAccessToken } from "../../lib/googleAccessToken";
import { deleteEvent } from "../../lib/googleCalendar";
import { todayJst } from "../../lib/jst";
import { ownerAction } from "../../lib/ownerFunctions";

//? 連携解除: アプリが Google に作った予定を消し（できる範囲で）、接続・対応表・写しをすべて消す（Q8/Q19）
export const disconnect = ownerAction({
  args: {},
  handler: async (ctx) => {
    const plan = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
      ownerId: ctx.ownerId,
      todayJst: todayJst(),
    });
    if (plan !== null) {
      const token = await getGoogleAccessToken(ctx, {
        accountId: plan.accessAccountId,
        userId: ctx.ownerId,
      });
      if (Result.isOk(token)) {
        const client = { accessToken: token.value };
        const deletions: Promise<unknown>[] = [];
        for (const source of plan.sources) {
          if (source.link !== null) {
            deletions.push(deleteEvent(client, plan.calendarId, source.link.googleEventId));
          }
        }
        await Promise.all(deletions);
      }
    }
    await ctx.runMutation(internal.mutations.calendarSync.clearConnection.clearConnection, {
      ownerId: ctx.ownerId,
    });
    return null;
  },
  returns: v.null(),
});
