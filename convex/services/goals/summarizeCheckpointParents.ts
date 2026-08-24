import type { Doc, Id } from "../../_generated/dataModel";
import { isDateJst } from "../../lib/jst";
import type { CheckpointParentAudit, CheckpointParentAuditOwner } from "../../lib/validators";
import { planCheckpointParents } from "./planCheckpointParents";

type MasteryDoc = Extract<Doc<"goals">, Record<"type", "mastery">>;

function isCheckpointDoc(goal: Doc<"goals">): goal is MasteryDoc {
  return goal.type === "mastery" && goal.deadline !== undefined;
}

function ownerSummary(ownerId: string, goals: readonly Doc<"goals">[]): CheckpointParentAuditOwner {
  const plan = planCheckpointParents(goals);
  const promoted =
    plan.promoteGoalId === null ? undefined : goals.find((goal) => goal._id === plan.promoteGoalId);

  return {
    examGoalCount: goals.filter((goal) => goal.type === "exam").length,
    longTermCount: goals.filter((goal) => goal.type === "mastery" && goal.deadline === undefined)
      .length,
    orphanCount: goals.filter((goal) => isCheckpointDoc(goal) && goal.parentGoalId === undefined)
      .length,
    ownerId,
    plan: plan.plan,
    //? 規則3 で失う期限を名指しする。所有者が Phase 2 の UI で先に手当てできるようにする。
    promoteLosesDeadline:
      promoted !== undefined && promoted.type === "mastery" ? (promoted.deadline ?? null) : null,
  };
}

//* 監査の集計(CVX-09: 純関数)。実行と同じ規則を planCheckpointParents から借りる(二重化しない)。
export function summarizeCheckpointParents(
  goals: readonly Doc<"goals">[],
  truncated: boolean,
): CheckpointParentAudit {
  const byId = new Map<Id<"goals">, Doc<"goals">>(goals.map((goal) => [goal._id, goal]));
  const owners = [...new Set(goals.map((goal) => goal.ownerId))]
    .sort((left, right) => left.localeCompare(right))
    .map((ownerId) =>
      ownerSummary(
        ownerId,
        goals.filter((goal) => goal.ownerId === ownerId),
      ),
    );
  const withParent = goals.filter(
    (goal): goal is MasteryDoc => goal.type === "mastery" && goal.parentGoalId !== undefined,
  );
  const parents = withParent.map((goal) => ({
    goal,
    parent: goal.parentGoalId === undefined ? undefined : byId.get(goal.parentGoalId),
  }));

  return {
    //? 親自身が親を持つ = チェーン。最大2層の不変条件(INV-4/5)の破れ。
    chainedCount: parents.filter(
      ({ parent }) => parent?.type === "mastery" && parent.parentGoalId !== undefined,
    ).length,
    crossOwnerParentCount: parents.filter(
      ({ goal, parent }) => parent !== undefined && parent.ownerId !== goal.ownerId,
    ).length,
    danglingParentCount: parents.filter(({ parent }) => parent === undefined).length,
    malformedDeadlineCount: goals.filter(
      (goal) => isCheckpointDoc(goal) && !isDateJst(goal.deadline ?? ""),
    ).length,
    orphanCount: goals.filter((goal) => isCheckpointDoc(goal) && goal.parentGoalId === undefined)
      .length,
    owners,
    parentWithoutDeadlineCount: withParent.filter((goal) => goal.deadline === undefined).length,
    selfParentCount: withParent.filter((goal) => goal.parentGoalId === goal._id).length,
    truncated,
  };
}
