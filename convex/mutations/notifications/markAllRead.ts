import { v } from "convex/values";

import { ownerMutation } from "../../lib/ownerFunctions";
import { markAllRead as markAllNotificationsRead } from "../../services/notifications/markAllRead";

//? 引数なし。通知欄が返さない51件目以降の未読も既読になる(バッジが下がらないバグを構造的に消す)。
export const markAllRead = ownerMutation({
  args: {},
  handler: async (ctx) => markAllNotificationsRead(ctx, ctx.ownerId),
  returns: v.null(),
});
