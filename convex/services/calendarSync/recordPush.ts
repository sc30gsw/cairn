import type { MutationCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import type { PushExpectation, PushOutcome, RecordPushResult } from "../../lib/validators";
import { getConnection } from "./getConnection";
import { findLink, linkSummary } from "./syncSource";

export async function recordPush(
  ctx: MutationCtx,
  args: {
    calendarId: string;
    expected: PushExpectation;
    outcome: PushOutcome;
    ownerId: string;
    sourceId: string;
    sourceKind: CalendarSyncSourceKind;
  },
): Promise<RecordPushResult> {
  if ((await getConnection(ctx, args.ownerId)) === null) {
    return "conflict";
  }
  const link = await findLink(ctx, args.ownerId, args.sourceKind, args.sourceId);
  if (!matchesExpectation(linkSummary(link), args.expected)) {
    return "conflict";
  }
  const { outcome } = args;
  if (outcome.kind === "deleted") {
    if (link !== null) {
      await ctx.db.delete("calendarSyncLinks", link._id);
    }
    return "recorded";
  }
  const shadow = await ctx.db
    .query("externalCalendarEvents")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q
        .eq("ownerId", args.ownerId)
        .eq("calendarId", args.calendarId)
        .eq("googleEventId", outcome.googleEventId),
    )
    .unique();
  if (shadow !== null) {
    await ctx.db.delete("externalCalendarEvents", shadow._id);
  }
  const fields = {
    appChangedAt: undefined,
    calendarId: args.calendarId,
    googleEventId: outcome.googleEventId,
    googleUpdated: outcome.googleUpdated,
    payloadKey: outcome.payloadKey,
  };
  if (link === null) {
    await ctx.db.insert("calendarSyncLinks", {
      calendarId: fields.calendarId,
      googleEventId: fields.googleEventId,
      googleUpdated: fields.googleUpdated,
      ownerId: args.ownerId,
      payloadKey: fields.payloadKey,
      sourceId: args.sourceId,
      sourceKind: args.sourceKind,
    });
    return "recorded";
  }
  await ctx.db.patch("calendarSyncLinks", link._id, fields);
  return "recorded";
}

function matchesExpectation(
  current: ReturnType<typeof linkSummary>,
  expected: PushExpectation,
): boolean {
  if (current === null || expected === null) {
    return current === expected;
  }
  return (
    current.googleEventId === expected.googleEventId &&
    current.payloadKey === expected.payloadKey &&
    current.appChangedAt === expected.appChangedAt
  );
}
