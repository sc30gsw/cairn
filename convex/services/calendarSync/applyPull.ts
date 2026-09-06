import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { isDateJst } from "../../lib/jst";
import type { PulledEvent } from "../../lib/validators";
import { desiredEvent } from "./desiredEvent";
import { payloadKey } from "./eventPayload";
import { isWithinWindow, syncWindow, type SyncWindow } from "./window";

//? Google から来た差分をアプリに写す。対応表にある予定はアプリ発なので「戻す」、無いものは外部予定の写し。
//? 後の更新が勝つ: アプリ側の未送信の変更（appChangedAt）が Google の updated より新しければ Google 側を捨てる
export async function applyPull(
  ctx: MutationCtx,
  args: { calendarId: string; events: readonly PulledEvent[]; ownerId: string; todayJst: string },
): Promise<null> {
  const window = syncWindow(args.todayJst);
  for (const event of args.events) {
    const link = await ctx.db
      .query("calendarSyncLinks")
      .withIndex("by_owner_and_calendar_and_event", (q) =>
        q
          .eq("ownerId", args.ownerId)
          .eq("calendarId", event.calendarId)
          .eq("googleEventId", event.googleEventId),
      )
      .unique();
    if (link !== null) {
      //? 対応表より先に写しになっていたら（送信と取り込みの並走）、写しを消してから戻す
      const shadow = await findExternal(ctx, args.ownerId, event);
      if (shadow !== null) {
        await ctx.db.delete("externalCalendarEvents", shadow._id);
      }
      await applyToSource(ctx, link, event);
      continue;
    }
    await applyToExternal(ctx, args.ownerId, event, window);
  }
  return null;
}

async function findExternal(
  ctx: MutationCtx,
  ownerId: string,
  event: Pick<PulledEvent, "calendarId" | "googleEventId">,
): Promise<Doc<"externalCalendarEvents"> | null> {
  return await ctx.db
    .query("externalCalendarEvents")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q
        .eq("ownerId", ownerId)
        .eq("calendarId", event.calendarId)
        .eq("googleEventId", event.googleEventId),
    )
    .unique();
}

async function applyToExternal(
  ctx: MutationCtx,
  ownerId: string,
  event: PulledEvent,
  window: SyncWindow,
): Promise<void> {
  const existing = await findExternal(ctx, ownerId, event);
  if (event.kind === "delete" || !isWithinWindow(event.startAt, window)) {
    if (existing !== null) {
      await ctx.db.delete("externalCalendarEvents", existing._id);
    }
    return;
  }
  const fields = {
    allDay: event.allDay,
    endAt: event.endAt,
    googleUpdated: event.updated,
    startAt: event.startAt,
    title: event.title,
  };
  if (existing === null) {
    await ctx.db.insert("externalCalendarEvents", {
      ...fields,
      calendarId: event.calendarId,
      googleEventId: event.googleEventId,
      ownerId,
    });
    return;
  }
  await ctx.db.patch("externalCalendarEvents", existing._id, fields);
}

function googleWins(link: Doc<"calendarSyncLinks">, updated: string): boolean {
  if (link.appChangedAt === undefined) {
    return true;
  }
  const updatedMs = Date.parse(updated);
  return !Number.isNaN(updatedMs) && updatedMs > link.appChangedAt;
}

async function applyToSource(
  ctx: MutationCtx,
  link: Doc<"calendarSyncLinks">,
  event: PulledEvent,
): Promise<void> {
  if (event.kind === "delete") {
    //? 予定は Google で消せばアプリでも消える。目標は消さず、対応表だけ落として次の送信で戻す（Q10）
    if (link.sourceKind === "block") {
      const blockId = ctx.db.normalizeId("boardScheduleEvents", link.sourceId);
      const block = blockId === null ? null : await ctx.db.get("boardScheduleEvents", blockId);
      if (block !== null && block.ownerId === link.ownerId) {
        await ctx.db.delete("boardScheduleEvents", block._id);
      }
    }
    await ctx.db.delete("calendarSyncLinks", link._id);
    return;
  }
  if (event.updated === link.googleUpdated || !googleWins(link, event.updated)) {
    return;
  }
  const applied =
    link.sourceKind === "block"
      ? await moveBlockFromGoogle(ctx, link, event)
      : await moveGoalFromGoogle(ctx, link, event);
  if (!applied) {
    return;
  }
  const desired = await desiredEvent(ctx, link.ownerId, link.sourceKind, link.sourceId);
  await ctx.db.patch("calendarSyncLinks", link._id, {
    appChangedAt: undefined,
    googleUpdated: event.updated,
    payloadKey: desired === null ? undefined : payloadKey(desired),
  });
}

async function moveBlockFromGoogle(
  ctx: MutationCtx,
  link: Doc<"calendarSyncLinks">,
  event: Extract<PulledEvent, { kind: "upsert" }>,
): Promise<boolean> {
  if (event.allDay || event.endAt <= event.startAt) {
    return false;
  }
  const blockId = ctx.db.normalizeId("boardScheduleEvents", link.sourceId);
  const block = blockId === null ? null : await ctx.db.get("boardScheduleEvents", blockId);
  if (block === null || block.ownerId !== link.ownerId) {
    return false;
  }
  if (block.startAt === event.startAt && block.endAt === event.endAt) {
    return true;
  }
  await ctx.db.patch("boardScheduleEvents", block._id, {
    endAt: event.endAt,
    startAt: event.startAt,
  });
  return true;
}

async function moveGoalFromGoogle(
  ctx: MutationCtx,
  link: Doc<"calendarSyncLinks">,
  event: Extract<PulledEvent, { kind: "upsert" }>,
): Promise<boolean> {
  const dateJst = event.startAt.slice(0, 10);
  if (!isDateJst(dateJst)) {
    return false;
  }
  const goalId = ctx.db.normalizeId("goals", link.sourceId);
  const goal = goalId === null ? null : await ctx.db.get("goals", goalId);
  if (goal === null || goal.ownerId !== link.ownerId) {
    return false;
  }
  if (goal.type === "exam") {
    if (goal.result !== undefined) {
      return false;
    }
    if (goal.examDate !== dateJst) {
      await ctx.db.patch("goals", goal._id, { examDate: dateJst });
    }
    return true;
  }
  if (goal.deadline === undefined || goal.achievedAt !== undefined) {
    return false;
  }
  if (goal.deadline !== dateJst) {
    await ctx.db.patch("goals", goal._id, { deadline: dateJst });
  }
  return true;
}
