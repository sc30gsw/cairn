import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { resetCalendarCursor as reset } from "../../services/calendarSync/connection";

//? 外部予定の操作を Google に送れなかったときの後始末: 差分トークンを捨てて次の同期で全件を取り直す
export const resetCalendarCursor = internalMutation({
  args: { calendarId: v.string(), ownerId: v.string() },
  handler: async (ctx, args) => reset(ctx, args.ownerId, args.calendarId, { dropExternals: false }),
  returns: v.null(),
});
