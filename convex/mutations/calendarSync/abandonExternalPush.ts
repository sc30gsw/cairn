import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { markStatus, resetCalendarCursor } from "../../services/calendarSync/connection";

//? 外部予定の操作を Google に送り切れなかったときの後始末を1トランザクションで:
//? 差分トークンを捨てて次の同期で写しを Google に合わせ、状態を error にして知らせる
export const abandonExternalPush = internalMutation({
  args: { calendarId: v.string(), lastError: v.string(), ownerId: v.string() },
  handler: async (ctx, args) => {
    await resetCalendarCursor(ctx, args.ownerId, args.calendarId, { dropExternals: false });
    await markStatus(ctx, {
      lastError: args.lastError,
      ownerId: args.ownerId,
      status: "error",
      syncedAt: null,
    });
    return null;
  },
  returns: v.null(),
});
