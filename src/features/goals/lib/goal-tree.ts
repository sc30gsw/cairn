import type { ComboboxData, ComboboxItem } from "@mantine/core";
import { compareDateJst } from "~domain/jst";

import type { ExamGoal, Goal, GoalId, MasteryGoal } from "~/features/goals/types/goal";

export type GoalTier = "checkpoint" | "longTerm";

export type ParentGoal = ExamGoal | MasteryGoal;

export type ParentGroup<TParent extends ParentGoal = ParentGoal> = {
  checkpoints: MasteryGoal[];
  parent: TParent;
};

export type GoalTree = {
  achieved: MasteryGoal[];
  exam: ParentGroup<ExamGoal> | undefined;
  longTerm: ParentGroup<MasteryGoal>[];
  orphans: MasteryGoal[];
};

export const PARENT_GOAL_OPTION_GROUPS = {
  exam: "本番目標",
  longTerm: "長期目標",
} as const satisfies Record<"exam" | "longTerm", string>;

export function goalTier(goal: MasteryGoal): GoalTier {
  return goal.deadline === undefined ? "longTerm" : "checkpoint";
}

function isMastery(goal: Goal): goal is MasteryGoal {
  return goal.type === "mastery";
}

function isLongTerm(goal: Goal): goal is MasteryGoal {
  return isMastery(goal) && goal.deadline === undefined;
}

function byDeadlineThenCreated(left: MasteryGoal, right: MasteryGoal): number {
  return (
    compareDateJst(left.deadline ?? "", right.deadline ?? "") || left.createdAt - right.createdAt
  );
}

function byAchievedDesc(left: MasteryGoal, right: MasteryGoal): number {
  return (
    compareDateJst(right.achievedAt ?? "", left.achievedAt ?? "") ||
    right.createdAt - left.createdAt
  );
}

export function childCheckpointsOf(goals: readonly Goal[], parentId: GoalId): MasteryGoal[] {
  const children: MasteryGoal[] = [];
  for (const goal of goals) {
    if (isMastery(goal) && goal.parentGoalId === parentId) {
      children.push(goal);
    }
  }

  return children.sort(byDeadlineThenCreated);
}

export function buildGoalTree(goals: readonly Goal[]): GoalTree {
  const exam = goals.find((goal): goal is ExamGoal => goal.type === "exam");
  const parentIds = new Set<GoalId>(exam === undefined ? [] : [exam._id]);
  const longTermGoals: MasteryGoal[] = [];
  const orphans: MasteryGoal[] = [];
  const checkpoints: MasteryGoal[] = [];

  for (const goal of goals) {
    if (isLongTerm(goal)) {
      longTermGoals.push(goal);
      parentIds.add(goal._id);
      continue;
    }
    if (isMastery(goal)) {
      checkpoints.push(goal);
    }
  }
  const linked: MasteryGoal[] = [];
  for (const goal of checkpoints) {
    if (goal.parentGoalId !== undefined && parentIds.has(goal.parentGoalId)) {
      linked.push(goal);
      continue;
    }
    orphans.push(goal);
  }
  const openChildrenOf = (parentId: GoalId) => {
    const children: MasteryGoal[] = [];
    for (const goal of linked) {
      if (goal.parentGoalId === parentId && goal.achievedAt === undefined) {
        children.push(goal);
      }
    }

    return children.sort(byDeadlineThenCreated);
  };
  const achieved: MasteryGoal[] = [];
  const achievedParentIds = new Set<GoalId>();
  for (const goal of longTermGoals) {
    if (goal.achievedAt !== undefined && openChildrenOf(goal._id).length === 0) {
      achieved.push(goal);
      achievedParentIds.add(goal._id);
    }
  }
  for (const goal of linked) {
    if (goal.achievedAt !== undefined) {
      achieved.push(goal);
    }
  }
  const longTermParents: MasteryGoal[] = [];
  for (const goal of longTermGoals) {
    if (!achievedParentIds.has(goal._id)) {
      longTermParents.push(goal);
    }
  }
  longTermParents.sort((left, right) => left.createdAt - right.createdAt);

  return {
    achieved: achieved.sort(byAchievedDesc),
    exam: exam === undefined ? undefined : { checkpoints: openChildrenOf(exam._id), parent: exam },
    longTerm: longTermParents.map((parent) => ({
      checkpoints: openChildrenOf(parent._id),
      parent,
    })),
    orphans: orphans.sort(byDeadlineThenCreated),
  };
}

type ParentGoalOptionsInput = {
  currentParentId: GoalId | undefined;
  selfId: GoalId | undefined;
};

export function parentGoalOptions(
  goals: readonly Goal[],
  { currentParentId, selfId }: ParentGoalOptionsInput,
): ComboboxData {
  const examItems: ComboboxItem[] = [];
  const longTermItems: ComboboxItem[] = [];
  const candidates: Goal[] = [];

  for (const goal of goals) {
    if (goal._id === selfId) {
      continue;
    }
    if (
      goal.type === "exam" ||
      (isLongTerm(goal) && goal.achievedAt === undefined) ||
      goal._id === currentParentId
    ) {
      candidates.push(goal);
    }
  }
  candidates.sort((left, right) => left.createdAt - right.createdAt);
  for (const goal of candidates) {
    const item = { label: goal.content, value: goal._id };
    if (goal.type === "exam") {
      examItems.push(item);
      continue;
    }
    longTermItems.push(item);
  }

  return [
    ...(examItems.length === 0
      ? []
      : [{ group: PARENT_GOAL_OPTION_GROUPS.exam, items: examItems }]),
    ...(longTermItems.length === 0
      ? []
      : [{ group: PARENT_GOAL_OPTION_GROUPS.longTerm, items: longTermItems }]),
  ];
}
