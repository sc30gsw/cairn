import type { MutationCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import type { PushExpectation, PushOutcome, RecordPushResult } from "../../lib/validators";
import { desiredEvent } from "./desiredEvent";
import { payloadKey } from "./eventPayload";
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
  const connection = await getConnection(ctx, args.ownerId);
  if (
    connection === null ||
    connection.disconnecting === true ||
    connection.primaryCalendarId !== args.calendarId
  ) {
    return "disconnected";
  }
  const link = await findLink(ctx, args.ownerId, args.sourceKind, args.sourceId);
  if (!matchesExpectation(linkSummary(link), args.expected)) {
    return "conflict";
  }
  const { outcome } = args;
  const desired = await desiredEvent(ctx, args.ownerId, args.sourceKind, args.sourceId);
  const changed =
    outcome.kind === "deleted"
      ? desired !== null
      : desired === null || payloadKey(desired) !== outcome.payloadKey;
  if (outcome.kind === "deleted") {
    if (link !== null) {
      await ctx.db.delete("calendarSyncLinks", link._id);
    }
    return changed ? "changed" : "recorded";
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
    appChangedAt: changed ? (link?.appChangedAt ?? Date.now()) : undefined,
    calendarId: args.calendarId,
    googleEventId: outcome.googleEventId,
    googleUpdated: outcome.googleUpdated,
    payloadKey: outcome.payloadKey,
  };
  if (link === null) {
    await ctx.db.insert("calendarSyncLinks", {
      appChangedAt: fields.appChangedAt,
      calendarId: fields.calendarId,
      googleEventId: fields.googleEventId,
      googleUpdated: fields.googleUpdated,
      ownerId: args.ownerId,
      payloadKey: fields.payloadKey,
      sourceId: args.sourceId,
      sourceKind: args.sourceKind,
    });
    return changed ? "changed" : "recorded";
  }
  await ctx.db.patch("calendarSyncLinks", link._id, fields);
  return changed ? "changed" : "recorded";
}

function matchesExpectation(
  current: ReturnType<typeof linkSummary>,
  expected: PushExpectation,
): boolean {
  if (current === null || expected === null) {
    return current === expected;
  }
  return current.googleEventId === expected.googleEventId;
}
