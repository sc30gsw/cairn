import type { Doc, Id } from "../../_generated/dataModel";
import type { CheckpointBackfillPlan } from "../../lib/domain";
import { isActiveExamGoal } from "../../lib/examGoal";
import { compareDateJst } from "../../lib/jst";

export type CheckpointParentPlan = {
  assignGoalIds: readonly Id<"goals">[];
  parentGoalId: Id<"goals"> | null;
  plan: CheckpointBackfillPlan;
  promoteGoalId: Id<"goals"> | null;
};

type MasteryDoc = Extract<Doc<"goals">, Record<"type", "mastery">>;

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

export function planCheckpointParents(goals: readonly Doc<"goals">[]): CheckpointParentPlan {
  const mastery = goals.filter((goal): goal is MasteryDoc => goal.type === "mastery");
  const orphans = mastery.filter(
    (goal) => deadlineOf(goal) !== undefined && parentOf(goal) === undefined,
  );
  if (orphans.length === 0) {
    return { assignGoalIds: [], parentGoalId: null, plan: "none", promoteGoalId: null };
  }
  const assignAll = orphans.map((goal) => goal._id);

  //? 終了した本番目標は新しい子を受け取らない。進行中の本番目標だけが受け皿になる
  const exam = goals.filter((goal) => isActiveExamGoal(goal)).sort(byOldest)[0];
  if (exam !== undefined) {
    return { assignGoalIds: assignAll, parentGoalId: exam._id, plan: "exam", promoteGoalId: null };
  }

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
