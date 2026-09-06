import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import type { GoogleEventPayload } from "../../lib/validators";
import { blockEventPayload, goalEventPayload } from "./eventPayload";

function dayUrl(dateJst: string): string | null {
  const siteUrl = process.env.SITE_URL;
  if (siteUrl === undefined || siteUrl === "") {
    return null;
  }
  return `${siteUrl.replace(/\/$/, "")}/days/${dateJst}`;
}

export async function desiredEvent(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  sourceKind: CalendarSyncSourceKind,
  sourceId: string,
): Promise<GoogleEventPayload | null> {
  if (sourceKind === "goal") {
    const goalId = ctx.db.normalizeId("goals", sourceId);
    const goal = goalId === null ? null : await ctx.db.get("goals", goalId);
    if (goal === null || goal.ownerId !== ownerId) {
      return null;
    }
    const parent = await parentOf(ctx, goal);
    return goalEventPayload(goal, parent);
  }
  const blockId = ctx.db.normalizeId("boardScheduleEvents", sourceId);
  const block = blockId === null ? null : await ctx.db.get("boardScheduleEvents", blockId);
  if (block === null || block.ownerId !== ownerId) {
    return null;
  }
  const row = await ctx.db.get("rows", block.rowId);
  if (row === null || row.deletedAt !== undefined) {
    return null;
  }
  return blockEventPayload(block, { content: row.content, dayUrl: dayUrl(row.dateJst) });
}

async function parentOf(
  ctx: MutationCtx | QueryCtx,
  goal: Doc<"goals">,
): Promise<Doc<"goals"> | null> {
  if (goal.type !== "mastery" || goal.parentGoalId === undefined) {
    return null;
  }
  const parent = await ctx.db.get("goals", goal.parentGoalId);
  return parent === null || parent.ownerId !== goal.ownerId ? null : parent;
}
