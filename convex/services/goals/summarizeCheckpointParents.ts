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
    promoteLosesDeadline:
      promoted !== undefined && promoted.type === "mastery" ? (promoted.deadline ?? null) : null,
  };
}

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
