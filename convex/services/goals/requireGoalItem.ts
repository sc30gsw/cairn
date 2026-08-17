import type { MutationCtx } from "../../_generated/server";
import type { GoalInput } from "../../lib/validators";
import { requireOwnedItem } from "../items/helpers";

//* 達成量目標だけが持つ項目リンクの参照整合性。他人の項目 ID や存在しない ID を保存させない。
//? union の volume 枝しか itemId を持たないので、他タイプは素通し(CVX-04)。
export async function requireGoalItem(
  ctx: MutationCtx,
  ownerId: string,
  goal: GoalInput,
): Promise<null> {
  if (goal.type !== "volume" || goal.itemId === undefined) {
    return null;
  }
  await requireOwnedItem(ctx, ownerId, goal.itemId);
  return null;
}
