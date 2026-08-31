import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { countMasteryProgress } from "./countMasteryProgress";
import { creationDateJst } from "./masteryProgress";

export async function recomputeMasteryProgress(
  ctx: MutationCtx,
  goal: Doc<"goals">,
): Promise<null> {
  if (goal.type !== "mastery") {
    return null;
  }
  const since = creationDateJst(goal._creationTime);
  await ctx.db.patch(
    "goals",
    goal._id,
    await countMasteryProgress(ctx, goal.ownerId, { scopeItemIds: goal.scopeItemIds, since }),
  );
  return null;
}
