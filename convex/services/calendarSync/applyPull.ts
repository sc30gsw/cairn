import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { isDateJst } from "../../lib/jst";
import type { PulledEvent } from "../../lib/validators";
import { desiredEvent } from "./desiredEvent";
import { payloadKey } from "./eventPayload";
import { findAppLink } from "./findAppLink";
import { finishCalendarPull } from "./finishCalendarPull";
import { getConnection, getOutput } from "./getConnection";
import { overlapsWindow, syncWindow } from "./window";

export type PullFinish = { keepEventIds: readonly string[] | null; syncToken: string | null };

export async function applyPull(
  ctx: MutationCtx,
  args: {
    connectionId?: Id<"calendarConnections">;
    generation?: number;
    pullId?: string;
    calendarId: string;
    events: readonly PulledEvent[];
    finish: PullFinish | null;
    ownerId: string;
    todayJst: string;
  },
): Promise<null> {
  const connection = await getConnection(ctx, args.ownerId, args.connectionId);
  if (connection === null || connection.disconnecting === true) return null;
  const [legacy, output] = await Promise.all([
    getConnection(ctx, args.ownerId),
    getOutput(ctx, args.ownerId),
  ]);
  const window = syncWindow(args.todayJst);
  for (const event of args.events) {
    const link = await findAppLink(ctx, args.ownerId, event.calendarId, event.googleEventId);
    const copies = await ctx.db
      .query("externalCalendarEvents")
      .withIndex("by_owner_and_calendar_and_event", (q) =>
        q
          .eq("ownerId", args.ownerId)
          .eq("calendarId", event.calendarId)
          .eq("googleEventId", event.googleEventId),
      )
      .collect();
    if (link !== null) {
      await Promise.all(copies.map((copy) => ctx.db.delete("externalCalendarEvents", copy._id)));
      if (
        output?.connection._id === connection._id &&
        !output.changing &&
        link.calendarId === event.calendarId &&
        link.googleEventId === event.googleEventId &&
        (args.generation ?? 0) === output.generation
      ) {
        await applyToSource(ctx, link, event);
      }
      continue;
    }
    const tombstone = await ctx.db
      .query("calendarEventDeletions")
      .withIndex("by_owner_and_calendar_and_event", (q) =>
        q
          .eq("ownerId", args.ownerId)
          .eq("calendarId", event.calendarId)
          .eq("googleEventId", event.googleEventId),
      )
      .unique();
    if (event.kind === "delete") {
      const deletedAt = event.updated ?? new Date().toISOString();
      if (tombstone === null) {
        await ctx.db.insert("calendarEventDeletions", {
          ownerId: args.ownerId,
          calendarId: event.calendarId,
          googleEventId: event.googleEventId,
          deletedAt,
        });
      } else if (deletedAt > tombstone.deletedAt) {
        await ctx.db.patch("calendarEventDeletions", tombstone._id, { deletedAt });
      }
      await Promise.all(
        copies.flatMap((copy) =>
          copy.googleUpdated <= deletedAt
            ? [ctx.db.delete("externalCalendarEvents", copy._id)]
            : [],
        ),
      );
      continue;
    }
    if (tombstone !== null && event.updated <= tombstone.deletedAt) continue;
    const pending = await ctx.db
      .query("calendarExternalChanges")
      .withIndex("by_owner_and_calendar_and_event", (q) =>
        q
          .eq("ownerId", args.ownerId)
          .eq("calendarId", event.calendarId)
          .eq("googleEventId", event.googleEventId),
      )
      .unique();
    if (pending !== null && pending.settledAt === undefined) continue;
    const existing = copies.find((copy) => (copy.connectionId ?? legacy?._id) === connection._id);
    if (!overlapsWindow(event, window)) {
      if (existing !== undefined) await ctx.db.delete("externalCalendarEvents", existing._id);
      continue;
    }
    if (existing !== undefined && existing.googleUpdated > event.updated) {
      //? 古い結果は写しに反映しないが、Google が返した予定として全件整理で消されないよう印を付ける
      if (args.pullId !== undefined)
        await ctx.db.patch("externalCalendarEvents", existing._id, { lastPullId: args.pullId });
      continue;
    }
    const fields = {
      connectionId: connection._id,
      lastPullId: args.pullId,
      allDay: event.allDay,
      colorId: event.colorId,
      endAt: event.endAt,
      googleUpdated: event.updated,
      meetingUrl: event.meetingUrl,
      startAt: event.startAt,
      title: event.title,
    };
    if (existing === undefined) {
      await ctx.db.insert("externalCalendarEvents", {
        ...fields,
        calendarId: event.calendarId,
        googleEventId: event.googleEventId,
        ownerId: args.ownerId,
      });
    } else {
      await ctx.db.patch("externalCalendarEvents", existing._id, fields);
    }
  }
  if (args.finish !== null) {
    await finishCalendarPull(ctx, {
      ...args,
      connectionId: connection._id,
      keepEventIds: args.finish.keepEventIds,
      syncToken: args.finish.syncToken,
    });
  }
  return null;
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
