import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import { getOutput } from "./getConnection";

export async function scheduleSourceSync(
  ctx: MutationCtx,
  ownerId: string,
  sourceKind: CalendarSyncSourceKind,
  sourceId: string,
): Promise<void> {
  const output = await getOutput(ctx, ownerId);
  if (output === null) {
    return;
  }
  const connection = output.connection;
  await markAppChanged(ctx, ownerId, sourceKind, sourceId);
  if (output.changing || connection.status === "needsReauth" || connection.disconnecting === true) {
    return;
  }
  await ctx.scheduler.runAfter(0, internal.actions.calendarSync.pushSource.pushSource, {
    connectionId: connection._id,
    generation: output.generation,
    attempt: 0,
    ownerId,
    sourceId,
    sourceKind,
  });
}

async function markAppChanged(
  ctx: MutationCtx,
  ownerId: string,
  sourceKind: CalendarSyncSourceKind,
  sourceId: string,
): Promise<void> {
  const link = await ctx.db
    .query("calendarSyncLinks")
    .withIndex("by_source", (q) => q.eq("sourceKind", sourceKind).eq("sourceId", sourceId))
    .unique();
  if (link !== null && link.ownerId === ownerId) {
    await ctx.db.patch("calendarSyncLinks", link._id, { appChangedAt: Date.now() });
  }
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
