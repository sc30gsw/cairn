import type { MutationCtx } from "../../_generated/server";
import {
  CHECKPOINT_BACKFILL_MANUAL_MESSAGE,
  CHECKPOINT_DEADLINE_MALFORMED_MESSAGE,
} from "../../lib/domain";
import { ValidationFailedError } from "../../lib/errors";
import { isDateJst } from "../../lib/jst";
import { throwDomain } from "../../lib/ownerFunctions";
import type { BackfillCheckpointParentsResult } from "../../lib/validators";
import { planCheckpointParents } from "./planCheckpointParents";

//* 所有者1人ぶんの孤児を1トランザクションで解決する(CVX-15)。規則は純関数側が SSoT。
//? 壊れた期限は黙って直さず throw する。バッチは1トランザクションなので部分適用は起きない。
export async function backfillCheckpointParents(
  ctx: MutationCtx,
  ownerId: string,
): Promise<BackfillCheckpointParentsResult> {
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId))
    .collect();
  for (const goal of goals) {
    if (goal.type === "mastery" && goal.deadline !== undefined && !isDateJst(goal.deadline)) {
      throwDomain(new ValidationFailedError({ message: CHECKPOINT_DEADLINE_MALFORMED_MESSAGE }));
    }
  }
  const plan = planCheckpointParents(goals);
  if (plan.plan === "manual") {
    throwDomain(new ValidationFailedError({ message: CHECKPOINT_BACKFILL_MANUAL_MESSAGE }));
  }
  if (plan.parentGoalId === null) {
    return { assigned: 0, plan: plan.plan, promoted: 0 };
  }
  if (plan.promoteGoalId !== null) {
    //? 昇格は期限を外すだけ。トップ層なので親は持たない(両方 undefined で落とす)。
    await ctx.db.patch("goals", plan.promoteGoalId, {
      deadline: undefined,
      parentGoalId: undefined,
    });
  }
  const parentGoalId = plan.parentGoalId;
  await Promise.all(
    plan.assignGoalIds.map((goalId) => ctx.db.patch("goals", goalId, { parentGoalId })),
  );

  return {
    assigned: plan.assignGoalIds.length,
    plan: plan.plan,
    promoted: plan.promoteGoalId === null ? 0 : 1,
  };
}
