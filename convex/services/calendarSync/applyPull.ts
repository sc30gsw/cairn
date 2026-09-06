import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { isDateJst } from "../../lib/jst";
import type { PulledEvent } from "../../lib/validators";
import { desiredEvent } from "./desiredEvent";
import { payloadKey } from "./eventPayload";
import { finishCalendarPull } from "./finishCalendarPull";
import { overlapsWindow, syncWindow, type SyncWindow } from "./window";

export type PullFinish = {
  keepEventIds: readonly string[] | null;
  syncToken: string | null;
};

export async function applyPull(
  ctx: MutationCtx,
  args: {
    calendarId: string;
    events: readonly PulledEvent[];
    finish: PullFinish | null;
    ownerId: string;
    todayJst: string;
  },
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
      const shadow = await findExternal(ctx, args.ownerId, event);
      if (shadow !== null) {
        await ctx.db.delete("externalCalendarEvents", shadow._id);
      }
      await applyToSource(ctx, link, event);
      continue;
    }
    await applyToExternal(ctx, args.ownerId, event, window);
  }
  if (args.finish !== null) {
    await finishCalendarPull(ctx, {
      calendarId: args.calendarId,
      keepEventIds: args.finish.keepEventIds,
      ownerId: args.ownerId,
      syncToken: args.finish.syncToken,
      todayJst: args.todayJst,
    });
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
  const pending = await ctx.db
    .query("calendarExternalChanges")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q
        .eq("ownerId", ownerId)
        .eq("calendarId", event.calendarId)
        .eq("googleEventId", event.googleEventId),
    )
    .unique();
  if (pending !== null && pending.settledAt === undefined) {
    return;
  }
  const existing = await findExternal(ctx, ownerId, event);
  if (event.kind === "delete" || !overlapsWindow(event, window)) {
    if (existing !== null) {
      await ctx.db.delete("externalCalendarEvents", existing._id);
    }
    return;
  }
  const fields = {
    allDay: event.allDay,
    colorId: event.colorId,
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

type ApplyResult = "applied" | "ignored" | "reassert";

async function applyToSource(
  ctx: MutationCtx,
  link: Doc<"calendarSyncLinks">,
  event: PulledEvent,
): Promise<void> {
  if (event.kind === "delete") {
    if (link.sourceKind === "block") {
      const block = await ownedBlock(ctx, link);
      if (block !== null) {
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
  if (applied === "ignored") {
    return;
  }
  if (applied === "reassert") {
    await ctx.db.patch("calendarSyncLinks", link._id, {
      appChangedAt: Date.now(),
      googleUpdated: event.updated,
    });
    return;
  }
  const desired = await desiredEvent(ctx, link.ownerId, link.sourceKind, link.sourceId);
  await ctx.db.patch("calendarSyncLinks", link._id, {
    appChangedAt: undefined,
    googleUpdated: event.updated,
    payloadKey: desired === null ? undefined : payloadKey(desired),
  });
}

async function ownedBlock(
  ctx: MutationCtx,
  link: Doc<"calendarSyncLinks">,
): Promise<Doc<"boardScheduleEvents"> | null> {
  const blockId = ctx.db.normalizeId("boardScheduleEvents", link.sourceId);
  const block = blockId === null ? null : await ctx.db.get("boardScheduleEvents", blockId);
  return block === null || block.ownerId !== link.ownerId ? null : block;
}

async function moveBlockFromGoogle(
  ctx: MutationCtx,
  link: Doc<"calendarSyncLinks">,
  event: Extract<PulledEvent, { kind: "upsert" }>,
): Promise<ApplyResult> {
  const block = await ownedBlock(ctx, link);
  if (block === null) {
    return "ignored";
  }
  if (event.allDay || event.endAt <= event.startAt) {
    return "reassert";
  }
  if (block.startAt !== event.startAt || block.endAt !== event.endAt) {
    await ctx.db.patch("boardScheduleEvents", block._id, {
      endAt: event.endAt,
      startAt: event.startAt,
    });
  }
  return "applied";
}

async function moveGoalFromGoogle(
  ctx: MutationCtx,
  link: Doc<"calendarSyncLinks">,
  event: Extract<PulledEvent, { kind: "upsert" }>,
): Promise<ApplyResult> {
  const goalId = ctx.db.normalizeId("goals", link.sourceId);
  const goal = goalId === null ? null : await ctx.db.get("goals", goalId);
  if (goal === null || goal.ownerId !== link.ownerId) {
    return "ignored";
  }
  const dateJst = event.startAt.slice(0, 10);
  if (!isDateJst(dateJst)) {
    return "reassert";
  }
  if (goal.type === "exam") {
    if (goal.result !== undefined) {
      return "ignored";
    }
    if (goal.examDate !== dateJst) {
      await ctx.db.patch("goals", goal._id, { examDate: dateJst });
    }
    return "applied";
  }
  if (goal.deadline === undefined || goal.achievedAt !== undefined) {
    return "ignored";
  }
  if (goal.deadline !== dateJst) {
    await ctx.db.patch("goals", goal._id, { deadline: dateJst });
  }
  return "applied";
}
