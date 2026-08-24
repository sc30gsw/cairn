import type { ComboboxData, ComboboxItem } from "@mantine/core";
import { compareDateJst } from "~domain/jst";

import type { ExamGoal, Goal, GoalId, MasteryGoal } from "~/features/goals/types/goal";

//* 習得の区分。判別子は期限の有無だけ(docs/adr/0005・0006)。
export type GoalTier = "checkpoint" | "longTerm";

//? 親になれるのはトップ層(本番目標 / 長期目標)だけ。階層は最大2層(INV-4/5)。
export type ParentGoal = ExamGoal | MasteryGoal;

export type ParentGroup<TParent extends ParentGoal = ParentGoal> = {
  //? 未達成の子だけ。期限昇順 → createdAt 昇順
  checkpoints: MasteryGoal[];
  parent: TParent;
};

export type GoalTree = {
  //? 孤児でないもののうち、達成済みで未達成の子を持たないもの。achievedAt 降順 → createdAt 降順
  achieved: MasteryGoal[];
  exam: ParentGroup<ExamGoal> | undefined;
  //? createdAt 昇順(= 作成順)
  longTerm: ParentGroup<MasteryGoal>[];
  //? 親が解決できないチェックポイント(バックフィル前の安全網。#49 完了後は常に空)。
  //? 達成済みでもここに入る(孤児判定が達成済み判定より先。#49 §8)
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

//* ある目標を親に持つチェックポイントを期限昇順で返す(達成済みも含む)。
//? カスケード削除の Confirm と crowded 助言が同じ並びを見るように、ここ1箇所で数える。
export function childCheckpointsOf(goals: readonly Goal[], parentId: GoalId): MasteryGoal[] {
  const children: MasteryGoal[] = [];
  for (const goal of goals) {
    if (isMastery(goal) && goal.parentGoalId === parentId) {
      children.push(goal);
    }
  }

  return children.sort(byDeadlineThenCreated);
}

//* フラットな一覧を「親カード + 子チェックポイントの行」の2層に仕分ける(CVX-09 の思想をフロントへ)。
//? 評価順は 孤児 → 達成済み → 親グループ。上から評価して最初に当たった規則だけを適用する(#49 §8)。
export function buildGoalTree(goals: readonly Goal[]): GoalTree {
  const exam = goals.find((goal): goal is ExamGoal => goal.type === "exam");
  //? 親になれるのはトップ層だけ。ここに居ない親を指す子は孤児(規則2)
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
    //? achievedAt の有無は問わない。達成済みの孤児もここに入る(#49 §8)
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
  //? 未達成の子が残っている達成済み長期目標はツリーに残す(子が親を失って浮かないように)
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

//* 親の選択肢。本番目標 + 未達成の長期目標 +(現在の親が上記に無ければその親)。self は除外。
//? Mantine の Select は value が data に無いと空表示になるので、現在の親は必ず残す。
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
