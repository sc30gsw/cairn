import { v } from "convex/values";

import { requireEditableDay, requireLiveDay } from "./ensureCatalog";
import { ensureCatalog } from "./ensureCatalog";
import { conditionValidator, dayPageValidator, presetApplyResultValidator } from "./lib/validators";
import { ownerMutation, ownerQuery } from "./ownerFunctions";
import { getDayPage } from "./services/days/getDayPage";
import { openDay } from "./services/days/openDay";

export { toRowDtos } from "./services/days/toRowDtos";

export const open = ownerMutation({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => {
    await ensureCatalog(ctx, ctx.ownerId);
    return openDay(ctx, ctx.ownerId, args);
  },
  returns: presetApplyResultValidator,
});

export const get = ownerQuery({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => getDayPage(ctx, ctx.ownerId, args),
  returns: dayPageValidator,
});

export const setCondition = ownerMutation({
  args: {
    condition: conditionValidator,
    dateJst: v.string(),
    todayJst: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEditableDay(ctx, ctx.ownerId, args.dateJst, args.todayJst);
    const day = await requireLiveDay(ctx, ctx.ownerId, args.dateJst);
    await ctx.db.patch("days", day._id, { condition: args.condition });
    return null;
  },
  returns: v.null(),
});

export const setMemo = ownerMutation({
  args: { dateJst: v.string(), memo: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => {
    const existing = await requireEditableDay(ctx, ctx.ownerId, args.dateJst, args.todayJst);
    if (args.memo.trim() === "") {
      if (existing === null) {
        return null;
      }
      await ctx.db.patch("days", existing._id, { memo: undefined });
      return null;
    }
    const day = existing ?? (await requireLiveDay(ctx, ctx.ownerId, args.dateJst));
    await ctx.db.patch("days", day._id, { memo: args.memo });
    return null;
  },
  returns: v.null(),
});
