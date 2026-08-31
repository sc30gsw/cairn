import type { MutationCtx } from "../../_generated/server";
import { loadLiveRows } from "../rows/loadLiveRows";
import { creationDateJst, masteryProgressSince } from "./masteryProgress";

export async function recomputeMasteryProgressForOwner(
  ctx: MutationCtx,
  ownerId: string,
): Promise<null> {
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "mastery"))
    .collect();
  const targets = goals.flatMap((goal) =>
    goal.type === "mastery" && goal.achievedAt === undefined
      ? [
          {
            goalId: goal._id,
            scopeItemIds: goal.scopeItemIds,
            since: creationDateJst(goal._creationTime),
          },
        ]
      : [],
  );
  const earliest = targets.reduce<string | undefined>(
    (oldest, target) => (oldest === undefined || target.since < oldest ? target.since : oldest),
    undefined,
  );
  if (earliest === undefined) {
    return null;
  }
  const { rows } = await loadLiveRows(ctx, ownerId, { from: earliest });
  await Promise.all(
    targets.map(({ goalId, scopeItemIds, since }) =>
      ctx.db.patch("goals", goalId, masteryProgressSince(rows, since, scopeItemIds)),
    ),
  );
  return null;
}
