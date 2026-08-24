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

//* 本番目標は1件だけ。習得(チェックポイントを含む)は何件でも持てる(CONTEXT.md「目標」)。
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
  //? 期限を持つなら親の不変条件を確かめる。新規は子を持たないので INV-5 は不要。
  await assertCheckpointParent(ctx, ownerId, goal);
  //? 保存形の一意性は正規化が担う(重複を落とし、空は「すべての記録」に畳む)。
  const scopeItemIds = normalizeScopeItemIds(goal.scopeItemIds);
  await assertScopeItems(ctx, ownerId, scopeItemIds);
  //? 学習量の実績は作成日を起点にする。作成と同じ暦日に既にある確定は実績に入る(ADR-0007)。
  //? 対象項目で絞ってから初期値にする。mutation なので Date.now() を読んでよい(CVX-14 は query だけの制約)。
  const totals = await loadDayItemTotals(ctx, ownerId, todayJst());
  const progress = initialMasteryProgress(scopedDayTotals(totals, scopeItemIds));
  return await ctx.db.insert(
    "goals",
    toGoalDocument({ ...goal, ...progress, scopeItemIds }, ownerId),
  );
}
