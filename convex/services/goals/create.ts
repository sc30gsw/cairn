import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ValidationFailedError } from "../../lib/errors";
import { todayJst } from "../../lib/jst";
import { throwDomain } from "../../lib/ownerFunctions";
import type { GoalInput } from "../../lib/validators";
import { assertCheckpointParent } from "./assertCheckpointParent";
import { assertGoalInput } from "./assertGoalInput";
import { assertScopeItems } from "./assertScopeItems";
import { loadDayItemTotals } from "./loadDayItemTotals";
import { initialMasteryProgress, scopedDayTotals } from "./masteryDayTotals";
import { normalizeScopeItemIds } from "./scopeItemIds";
import { toGoalDocument } from "./toGoalDocument";

export const SINGLE_EXAM_GOAL_MESSAGE = "本番目標は1件までです";

export type CreateGoalArgs = Record<"goal", GoalInput>;

export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: CreateGoalArgs,
): Promise<Id<"goals">> {
  const { goal } = args;
  assertGoalInput(goal);
  if (goal.type === "exam") {
    const existing = await ctx.db
      .query("goals")
      .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "exam"))
      .first();
    if (existing !== null) {
      throwDomain(new ValidationFailedError({ message: SINGLE_EXAM_GOAL_MESSAGE }));
    }
    return await ctx.db.insert("goals", toGoalDocument(goal, ownerId));
  }
  await assertCheckpointParent(ctx, ownerId, goal);
  const scopeItemIds = normalizeScopeItemIds(goal.scopeItemIds);
  await assertScopeItems(ctx, ownerId, scopeItemIds);
  const totals = await loadDayItemTotals(ctx, ownerId, todayJst());
  const progress = initialMasteryProgress(scopedDayTotals(totals, scopeItemIds));
  return await ctx.db.insert(
    "goals",
    toGoalDocument({ ...goal, ...progress, scopeItemIds }, ownerId),
  );
}
