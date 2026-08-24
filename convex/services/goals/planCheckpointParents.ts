import type { Doc, Id } from "../../_generated/dataModel";
import type { CheckpointBackfillPlan } from "../../lib/domain";
import { compareDateJst } from "../../lib/jst";

export type CheckpointParentPlan = {
  //? 親を書き込む孤児(昇格対象は含まない)
  assignGoalIds: readonly Id<"goals">[];
  //? 孤児に書き込む親。孤児が無い / 人に返す場合は null
  parentGoalId: Id<"goals"> | null;
  //? どの規則が当たったか。監査の出力と同じ語彙(CVX-16)
  plan: CheckpointBackfillPlan;
  //? 期限を外して親に昇格させる孤児。規則3 のときだけ入る
  promoteGoalId: Id<"goals"> | null;
};

type MasteryDoc = Extract<Doc<"goals">, Record<"type", "mastery">>;

//? Phase 1(optional)と Phase 5(2枝 union)のどちらの型でも同じに動く読み出し。
function deadlineOf(goal: MasteryDoc): string | undefined {
  return "deadline" in goal ? goal.deadline : undefined;
}

function parentOf(goal: MasteryDoc): Id<"goals"> | undefined {
  return "parentGoalId" in goal ? goal.parentGoalId : undefined;
}

function byOldest(left: Doc<"goals">, right: Doc<"goals">): number {
  return left._creationTime - right._creationTime || left._id.localeCompare(right._id);
}

function byFarthestDeadline(left: MasteryDoc, right: MasteryDoc): number {
  return compareDateJst(deadlineOf(right) ?? "", deadlineOf(left) ?? "") || byOldest(left, right);
}

//* 所有者1人ぶんの孤児(期限あり・親なし)に、どの親を当てるかを決める純関数(CVX-09)。
//? 上から評価し、最初に当たった規則だけを適用する(#49 §5)。引数の並び順に依存しない。
export function planCheckpointParents(goals: readonly Doc<"goals">[]): CheckpointParentPlan {
  const mastery = goals.filter((goal): goal is MasteryDoc => goal.type === "mastery");
  const orphans = mastery.filter(
    (goal) => deadlineOf(goal) !== undefined && parentOf(goal) === undefined,
  );
  if (orphans.length === 0) {
    return { assignGoalIds: [], parentGoalId: null, plan: "none", promoteGoalId: null };
  }
  const assignAll = orphans.map((goal) => goal._id);

  //* 規則1 — 本番目標を親にする。重複があれば最古。
  const exam = goals.filter((goal) => goal.type === "exam").sort(byOldest)[0];
  if (exam !== undefined) {
    return { assignGoalIds: assignAll, parentGoalId: exam._id, plan: "exam", promoteGoalId: null };
  }

  //* 規則2 — 既存の長期目標(期限なしの習得)を親にする。未達成優先、同条件なら最古。
  const longTerms = mastery.filter((goal) => deadlineOf(goal) === undefined).sort(byOldest);
  const longTerm = longTerms.find((goal) => goal.achievedAt === undefined) ?? longTerms[0];
  if (longTerm !== undefined) {
    return {
      assignGoalIds: assignAll,
      parentGoalId: longTerm._id,
      plan: "longTerm",
      promoteGoalId: null,
    };
  }

  //* 規則3 / 規則4 — 親候補が無い。未達成の孤児のうち期限がもっとも遠い1件を長期目標へ昇格させる。
  //? 昇格できる孤児が無い(= すべて達成済み)なら履歴を書き換えないため人に返す(規則4)。
  const promoted = orphans
    .filter((goal) => goal.achievedAt === undefined)
    .sort(byFarthestDeadline)[0];
  if (promoted === undefined) {
    return { assignGoalIds: [], parentGoalId: null, plan: "manual", promoteGoalId: null };
  }

  return {
    assignGoalIds: assignAll.filter((goalId) => goalId !== promoted._id),
    parentGoalId: promoted._id,
    plan: "promote",
    promoteGoalId: promoted._id,
  };
}
