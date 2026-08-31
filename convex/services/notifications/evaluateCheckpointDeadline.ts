import type { MutationCtx } from "../../_generated/server";
import { GOAL_TYPES } from "../../lib/domain";
import { deadlineDaysLeft, isDeadlineNear } from "../../lib/notifications";
import type { NotificationPayload } from "../../lib/validators";

const [, masteryType] = GOAL_TYPES;

export async function evaluateCheckpointDeadline(
  ctx: MutationCtx,
  ownerId: string,
  dateJst: string,
): Promise<NotificationPayload | null> {
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", masteryType))
    .collect();
  const items = goals.flatMap((goal) => {
    if (goal.type !== masteryType || goal.deadline === undefined) {
      return [];
    }
    if (goal.achievedAt !== undefined || !isDeadlineNear(dateJst, goal.deadline)) {
      return [];
    }
    return [
      {
        content: goal.content,
        daysLeft: deadlineDaysLeft(dateJst, goal.deadline),
        deadline: goal.deadline,
        goalId: goal._id,
      },
    ];
  });
  if (items.length === 0) {
    return null;
  }
  return {
    dateJst,
    items: items.toSorted((left, right) => left.daysLeft - right.daysLeft),
    kind: "checkpointDeadline",
  };
}
