import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { compareDateJst } from "../../lib/jst";
import type { MasteryGoal } from "./masteryProgressOf";

//* ある目標を親に持つチェックポイントを期限昇順で返す(Confirm の列挙順と一致させる)。
//? by_owner_and_type で所有者の習得に絞ってから TypeScript 側で親 id 一致を取る(CVX-10)。
//? 専用インデックスは張らない — 1所有者の目標は数件〜数十件で読み取り量は同じオーダー(CVX-11/12)。
export async function listChildCheckpoints(
  ctx: MutationCtx,
  ownerId: string,
  goalId: Id<"goals">,
): Promise<MasteryGoal[]> {
  const mastery = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId).eq("type", "mastery"))
    .collect();

  return mastery
    .filter((goal): goal is MasteryGoal => goal.type === "mastery" && goal.parentGoalId === goalId)
    .sort((left, right) => compareDateJst(left.deadline ?? "", right.deadline ?? ""));
}
