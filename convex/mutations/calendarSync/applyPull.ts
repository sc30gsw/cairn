import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { pulledEventValidator } from "../../lib/validators";
import { applyPull as applyPulledEvents } from "../../services/calendarSync/applyPull";

export const applyPull = internalMutation({
  args: {
    calendarId: v.string(),
    events: v.array(pulledEventValidator),
    //? 最後の塊に付ける。差分トークンの保存と写しの掃除を同じトランザクションで行う
    finish: v.union(
      v.null(),
      v.object({
        keepEventIds: v.union(v.array(v.string()), v.null()),
        syncToken: v.union(v.string(), v.null()),
      }),
    ),
    ownerId: v.string(),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => applyPulledEvents(ctx, args),
  returns: v.null(),
});
