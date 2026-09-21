import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import type { CalendarSyncSourceKind } from "../../lib/calendarSync";
import type { GoogleEventPayload } from "../../lib/validators";
import { goalEventPayload, planEventPayload } from "./eventPayload";

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
  const eventId = ctx.db.normalizeId("planEvents", sourceId);
  const event = eventId === null ? null : await ctx.db.get("planEvents", eventId);
  if (event === null || event.ownerId !== ownerId) {
    return null;
  }
  return planEventPayload(event, await planPayloadContext(ctx, event));
}

async function planPayloadContext(
  ctx: MutationCtx | QueryCtx,
  event: Doc<"planEvents">,
): Promise<{ itemName: string; note: string }> {
  if (event.record.kind === "none") {
    return { itemName: "", note: "" };
  }
  const rowId = event.record.materializedRowId;
  const [item, row] = await Promise.all([
    ctx.db.get("items", event.record.itemId),
    rowId === undefined ? Promise.resolve(null) : ctx.db.get("rows", rowId),
  ]);
  return {
    itemName: item === null || item.ownerId !== event.ownerId ? "" : item.name,
    note:
      row === null || row.deletedAt !== undefined || row.ownerId !== event.ownerId
        ? ""
        : row.content,
  };
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
