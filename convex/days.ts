import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  collapseExtraLiveDays,
  ensureCatalog,
  getDayByDate,
  getLiveDay,
  liveRowsForDay,
  requireEditableDay,
  requireLiveDay,
} from "./ensureCatalog";
import { ConflictError } from "./lib/errors";
import { isFutureDateJst, weekdayFromDateJst } from "./lib/jst";
import { formatShareMarkdown } from "./lib/share";
import { isShortSleep, sleepHours } from "./lib/sleep";
import { conditionValidator, dayDtoValidator, rowDtoValidator } from "./lib/validators";
import { confirmedVolumeMinutes } from "./lib/volume";
import { ownerMutation, ownerQuery, throwDomain } from "./ownerFunctions";

async function itemMap(
  ctx: QueryCtx | MutationCtx,
  ownerId: string,
): Promise<Map<Id<"items">, Doc<"items">>> {
  const items = await ctx.db
    .query("items")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  return new Map(items.map((item) => [item._id, item]));
}

export async function toRowDtos(ctx: QueryCtx | MutationCtx, ownerId: string, rows: Doc<"rows">[]) {
  const items = await itemMap(ctx, ownerId);
  return rows.map((row) => {
    const item = items.get(row.itemId);
    return {
      _id: row._id,
      category: item?.category ?? "その他",
      content: row.content,
      itemId: row.itemId,
      itemName: item?.name ?? "不明",
      minutes: row.minutes,
      sortOrder: row.sortOrder,
      status: row.status,
    };
  });
}

function sleepFields(day: Doc<"days"> | null) {
  if (day === null || day.bedHm === undefined || day.wakeHm === undefined) {
    return { sleepHours: null, sleepWarning: false };
  }
  const hours = sleepHours(day.bedHm, day.wakeHm);
  return { sleepHours: hours, sleepWarning: isShortSleep(hours) };
}

export const open = ownerMutation({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => {
    await ensureCatalog(ctx, ctx.ownerId);
    if (isFutureDateJst(args.dateJst, args.todayJst)) {
      return { applied: false };
    }
    const existing = await getDayByDate(ctx, ctx.ownerId, args.dateJst);
    if (existing !== null && existing.deletedAt !== undefined) {
      return { applied: false };
    }
    const weekday = weekdayFromDateJst(args.dateJst);
    const preset = await ctx.db
      .query("presets")
      .withIndex("by_owner_and_weekday", (q) => q.eq("ownerId", ctx.ownerId).eq("weekday", weekday))
      .unique();
    if (preset === null || preset.lines.length === 0) {
      return { applied: false };
    }
    let day = existing;
    if (day === null) {
      await ctx.db.insert("days", { dateJst: args.dateJst, ownerId: ctx.ownerId });
      day = await collapseExtraLiveDays(ctx, ctx.ownerId, args.dateJst);
      if (day === null) {
        return { applied: false };
      }
    }
    await ctx.db.patch(day._id, { dateJst: day.dateJst });
    const liveRows = await liveRowsForDay(ctx, day._id);
    if (liveRows.length > 0) {
      return { applied: false };
    }
    await Promise.all(
      preset.lines.map((line, index) =>
        ctx.db.insert("rows", {
          content: line.content,
          dateJst: args.dateJst,
          dayId: day._id,
          itemId: line.itemId,
          minutes: line.minutes,
          ownerId: ctx.ownerId,
          sortOrder: index,
          status: "未着手",
        }),
      ),
    );
    return { applied: true };
  },
  returns: v.object({ applied: v.boolean() }),
});

export const get = ownerQuery({
  args: { dateJst: v.string(), todayJst: v.string() },
  handler: async (ctx, args) => {
    const day = await getLiveDay(ctx, ctx.ownerId, args.dateJst);
    const [rows, tonight] = await Promise.all([
      day === null ? Promise.resolve([]) : liveRowsForDay(ctx, day._id),
      ctx.db
        .query("tonight")
        .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
        .unique(),
    ]);
    const rowDtos = await toRowDtos(ctx, ctx.ownerId, rows);
    const sleep = sleepFields(day);
    return {
      dateJst: args.dateJst,
      day:
        day === null
          ? null
          : {
              _id: day._id,
              bedHm: day.bedHm ?? null,
              condition: day.condition ?? null,
              dateJst: day.dateJst,
              memo: day.memo ?? null,
              sleepHours: sleep.sleepHours,
              sleepWarning: sleep.sleepWarning,
              wakeHm: day.wakeHm ?? null,
            },
      isFuture: isFutureDateJst(args.dateJst, args.todayJst),
      rows: rowDtos,
      shareMarkdown: formatShareMarkdown(rowDtos),
      tonightBedHm: tonight?.bedHm ?? null,
      volumeMinutes: confirmedVolumeMinutes(rowDtos),
    };
  },
  returns: v.object({
    dateJst: v.string(),
    day: v.union(dayDtoValidator, v.null()),
    isFuture: v.boolean(),
    rows: v.array(rowDtoValidator),
    shareMarkdown: v.string(),
    tonightBedHm: v.union(v.string(), v.null()),
    volumeMinutes: v.number(),
  }),
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
    await ctx.db.patch(day._id, { condition: args.condition });
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
      await ctx.db.patch(existing._id, { memo: undefined });
      return null;
    }
    const day = existing ?? (await requireLiveDay(ctx, ctx.ownerId, args.dateJst));
    await ctx.db.patch(day._id, { memo: args.memo });
    return null;
  },
  returns: v.null(),
});

export const setWake = ownerMutation({
  args: { dateJst: v.string(), todayJst: v.string(), wakeHm: v.string() },
  handler: async (ctx, args) => {
    const existing = await requireEditableDay(ctx, ctx.ownerId, args.dateJst, args.todayJst);
    const tonight = await ctx.db
      .query("tonight")
      .withIndex("by_owner", (q) => q.eq("ownerId", ctx.ownerId))
      .unique();
    const bedHm = existing?.bedHm ?? tonight?.bedHm;
    if (bedHm === undefined) {
      throwDomain(new ConflictError({ message: "今夜の就寝がまだありません" }));
    }
    const day = existing ?? (await requireLiveDay(ctx, ctx.ownerId, args.dateJst));
    await ctx.db.patch(day._id, { bedHm, wakeHm: args.wakeHm });
    if (tonight !== null && existing?.bedHm === undefined) {
      await ctx.db.delete(tonight._id);
    }
    return null;
  },
  returns: v.null(),
});
