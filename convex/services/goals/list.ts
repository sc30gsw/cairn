import type { QueryCtx } from "../../_generated/server";
import type { GoalDto } from "../../lib/validators";
import { toGoalDto } from "./toGoalDto";

//? 1所有者の目標は数件〜数十件。by_owner_and_type で所有者に絞ってから collect(CVX-11)。
//? 学習量の実績は保存値を読むだけなので、読み取り量は目標の件数で決まり、未達成目標の寿命に比例して
//? 単調増加しない(ADR-0007 が狙った効果)。確定を動かす書き込み(確定・スキップ・記録やその日の
//? ゴミ箱操作)は goals を patch するのでこの購読も再実行される — 再実行されないのは記録の追加と
//? プリセット切替だけ。
export async function list(ctx: QueryCtx, ownerId: string): Promise<GoalDto[]> {
  const goals = await ctx.db
    .query("goals")
    .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId))
    .collect();
  return goals.map(toGoalDto);
}
