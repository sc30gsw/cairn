import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import { getConnection } from "./getConnection";

export async function scheduleSourceSync(
  ctx: MutationCtx,
  ownerId: string,
  sourceKind: CalendarSyncSourceKind,
  sourceId: string,
): Promise<void> {
  const connection = await getConnection(ctx, ownerId);
  if (connection === null) {
    return;
  }
  const link = await ctx.db
    .query("calendarSyncLinks")
    .withIndex("by_source", (q) => q.eq("sourceKind", sourceKind).eq("sourceId", sourceId))
    .unique();
  if (link !== null && link.ownerId === ownerId) {
    await ctx.db.patch("calendarSyncLinks", link._id, { appChangedAt: Date.now() });
  }
  if (connection.status === "needsReauth") {
    return;
  }
  await ctx.scheduler.runAfter(0, internal.actions.calendarSync.pushSource.pushSource, {
    attempt: 0,
    ownerId,
    sourceId,
    sourceKind,
  });
}

export async function scheduleGoalSync(
  ctx: MutationCtx,
  ownerId: string,
  goalIds: readonly Id<"goals">[],
): Promise<void> {
  for (const goalId of goalIds) {
    await scheduleSourceSync(ctx, ownerId, "goal", goalId);
  }
}

export async function scheduleBlockSync(
  ctx: MutationCtx,
  ownerId: string,
  blockIds: readonly Id<"boardScheduleEvents">[],
): Promise<void> {
  for (const blockId of blockIds) {
    await scheduleSourceSync(ctx, ownerId, "block", blockId);
  }
}
