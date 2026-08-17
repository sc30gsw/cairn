import type { MutationCtx } from "../../_generated/server";
import type { GoalInput } from "../../lib/validators";
import { upsertWeekSnapshot } from "./upsertWeekSnapshot";

//* ペース目標を書いた週のスナップショットを目標値に合わせる。他タイプは素通し。
//? 週間ゴールは書き込んだ週から効かせる(過去週は requireCurrentWeekStartJst が既に弾いている)。
export async function syncPaceSnapshot(
  ctx: MutationCtx,
  ownerId: string,
  goal: GoalInput,
  weekStartJst: string,
): Promise<null> {
  if (goal.type !== "pace") {
    return null;
  }
  return upsertWeekSnapshot(ctx, ownerId, {
    dailyFloorMinutes: goal.dailyFloorMinutes,
    days: goal.daysPerWeek,
    weekStartJst,
  });
}
