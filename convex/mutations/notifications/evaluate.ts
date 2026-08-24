import { v } from "convex/values";

import { internalMutation } from "../../_generated/server";
import { evaluate as evaluateNotifications } from "../../services/notifications/evaluate";

//? now を引数で受けるのはテストの縫い目。cron は {} を渡し、テストは固定時刻を注入する。
export const evaluate = internalMutation({
  args: { now: v.optional(v.number()) },
  handler: async (ctx, args) => evaluateNotifications(ctx, args),
  returns: v.null(),
});
