import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import type { SyncSource } from "../../lib/validators";
import { desiredEvent } from "./desiredEvent";
import { payloadKey } from "./eventPayload";

export function linkSummary(link: Doc<"calendarSyncLinks"> | null): SyncSource["link"] {
  if (link === null) {
    return null;
  }
  return {
    calendarId: link.calendarId,
    connectionId: link.connectionId,
    appChangedAt: link.appChangedAt ?? null,
    googleEventId: link.googleEventId,
    payloadKey: link.payloadKey ?? null,
  };
}

export async function findLink(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  sourceKind: CalendarSyncSourceKind,
  sourceId: string,
): Promise<Doc<"calendarSyncLinks"> | null> {
  const link = await ctx.db
    .query("calendarSyncLinks")
    .withIndex("by_source", (q) => q.eq("sourceKind", sourceKind).eq("sourceId", sourceId))
    .unique();
  return link === null || link.ownerId !== ownerId ? null : link;
}

export async function syncSource(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  sourceKind: CalendarSyncSourceKind,
  sourceId: string,
  link: Doc<"calendarSyncLinks"> | null,
): Promise<SyncSource> {
  const desired = await desiredEvent(ctx, ownerId, sourceKind, sourceId);
  return {
    desired,
    link: linkSummary(link),
    payloadKey: desired === null ? null : payloadKey(desired),
    sourceId,
    sourceKind,
  };
}
