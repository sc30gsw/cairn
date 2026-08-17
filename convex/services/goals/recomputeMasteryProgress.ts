import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { loadLiveRows } from "../rows/loadLiveRows";
import { creationDateJst, masteryProgressSince } from "./masteryProgress";

//* 保存済みカウンタを rows から作り直す。達成解除の「現在進行形への復帰」がこれ(ADR-0007)。
//? 差分更新の経路漏れでカウンタが漂流したときの修復手段も兼ねる(だから常に全期間を数え直す)。
//? 修復の入口は internal.mutations.goals.recomputeMasteryProgress(所有者ぶんまとめて数え直す)。
//? 上端を開いた範囲読みなので読み取り量は目標の寿命とともに増える。達成解除と修復だけの低頻度
//? 操作として許容する判断は ADR-0007 の追記に記録した(CVX-11)。
export async function recomputeMasteryProgress(
  ctx: MutationCtx,
  goal: Doc<"goals">,
): Promise<null> {
  if (goal.type !== "mastery") {
    return null;
  }
  const since = creationDateJst(goal._creationTime);
  const { rows } = await loadLiveRows(ctx, goal.ownerId, { from: since });
  await ctx.db.patch("goals", goal._id, masteryProgressSince(rows, since));
  return null;
}
