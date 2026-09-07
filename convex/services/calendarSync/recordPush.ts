import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import type { PushExpectation, PushOutcome, RecordPushResult } from "../../lib/validators";
import { desiredEvent } from "./desiredEvent";
import { payloadKey } from "./eventPayload";
import { getOutput } from "./getConnection";
import { findLink } from "./syncSource";

export async function recordPush(
  ctx: MutationCtx,
  args: {
    connectionId?: Id<"calendarConnections">;
    generation?: number;
    calendarId: string;
    expected: PushExpectation;
    outcome: PushOutcome;
    ownerId: string;
    sourceId: string;
    sourceKind: CalendarSyncSourceKind;
  },
): Promise<RecordPushResult> {
  const output = await getOutput(ctx, args.ownerId);
  if (
    output === null ||
    output.changing ||
    output.connection.disconnecting === true ||
    output.calendarId !== args.calendarId ||
    (args.connectionId !== undefined && output.connection._id !== args.connectionId) ||
    output.generation !== (args.generation ?? 0)
  ) {
    return "disconnected";
  }
  const link = await findLink(ctx, args.ownerId, args.sourceKind, args.sourceId);
  if ((link?.googleEventId ?? null) !== args.expected) {
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
  const shadows = await ctx.db
    .query("externalCalendarEvents")
    .withIndex("by_owner_and_calendar_and_event", (q) =>
      q
        .eq("ownerId", args.ownerId)
        .eq("calendarId", args.calendarId)
        .eq("googleEventId", outcome.googleEventId),
    )
    .collect();
  await Promise.all(shadows.map((shadow) => ctx.db.delete("externalCalendarEvents", shadow._id)));
  const fields = {
    connectionId: output.connection._id,
    appChangedAt: changed ? (link?.appChangedAt ?? Date.now()) : undefined,
    calendarId: args.calendarId,
    googleEventId: outcome.googleEventId,
    googleUpdated: outcome.googleUpdated,
    payloadKey: outcome.payloadKey,
  };
  if (link === null) {
    await ctx.db.insert("calendarSyncLinks", {
      connectionId: fields.connectionId,
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
