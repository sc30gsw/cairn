import { expect, test } from "vite-plus/test";

import {
  buildGoalTree,
  childCheckpointsOf,
  goalTier,
  PARENT_GOAL_OPTION_GROUPS,
  parentGoalOptions,
} from "~/features/goals/lib/goal-tree";
import type { ExamGoal, Goal, GoalId, MasteryGoal } from "~/features/goals/types/goal";

function goalId(id: string): GoalId {
  return id as GoalId;
}

type MasteryInput = {
  achievedAt?: string;
  createdAt?: number;
  deadline?: string;
  id: string;
  parentGoalId?: GoalId;
};

function mastery({
  achievedAt,
  createdAt = 1,
  deadline,
  id,
  parentGoalId,
}: MasteryInput): MasteryGoal {
  return {
    _id: goalId(id),
    achievedAt,
    activeDays: 1,
    confirmedMinutes: 30,
    content: `${id} の内容`,
    createdAt,
    criterion: `${id} ができる`,
    deadline,
    parentGoalId,
    type: "mastery",
  };
}

function exam(id = "exam", createdAt = 1): ExamGoal {
  return {
    _id: goalId(id),
    content: `${id} の内容`,
    createdAt,
    examDate: "2026-11-15",
    maxScore: 900,
    minScore: 850,
    type: "exam",
  };
}

test("goalTier は期限の有無で区分を決める", () => {
  expect(goalTier(mastery({ id: "longTerm" }))).toBe("longTerm");
  expect(goalTier(mastery({ id: "checkpoint", deadline: "2026-09-06" }))).toBe("checkpoint");
});

test("本番目標は1件のトップの親になり、その子が期限昇順で並ぶ", () => {
  const tree = buildGoalTree([
    exam(),
    mastery({ id: "later", deadline: "2026-09-13", parentGoalId: goalId("exam") }),
    mastery({ id: "soon", deadline: "2026-09-06", parentGoalId: goalId("exam") }),
  ]);

  expect(tree.exam?.parent._id).toBe(goalId("exam"));
  expect(tree.exam?.checkpoints.map((goal) => goal._id)).toEqual([goalId("soon"), goalId("later")]);
});

test("同じ期限のチェックポイントは createdAt 昇順で並ぶ", () => {
  const tree = buildGoalTree([
    exam(),
    mastery({ createdAt: 200, id: "newer", deadline: "2026-09-06", parentGoalId: goalId("exam") }),
    mastery({ createdAt: 100, id: "older", deadline: "2026-09-06", parentGoalId: goalId("exam") }),
  ]);

  expect(tree.exam?.checkpoints.map((goal) => goal._id)).toEqual([
    goalId("older"),
    goalId("newer"),
  ]);
});

test("期限なしの習得は長期目標の親グループになり、作成順に並ぶ", () => {
  const tree = buildGoalTree([
    mastery({ createdAt: 200, id: "second" }),
    mastery({ createdAt: 100, id: "first" }),
  ]);

  expect(tree.longTerm.map((group) => group.parent._id)).toEqual([
    goalId("first"),
    goalId("second"),
  ]);
  expect(tree.longTerm.every((group) => group.checkpoints.length === 0)).toBe(true);
});

test("子は自分の親のグループにだけ入る", () => {
  const tree = buildGoalTree([
    exam(),
    mastery({ id: "longTerm" }),
    mastery({ id: "examChild", deadline: "2026-09-06", parentGoalId: goalId("exam") }),
    mastery({ id: "longTermChild", deadline: "2026-09-07", parentGoalId: goalId("longTerm") }),
  ]);

  expect(tree.exam?.checkpoints.map((goal) => goal._id)).toEqual([goalId("examChild")]);
  expect(tree.longTerm[0]?.checkpoints.map((goal) => goal._id)).toEqual([goalId("longTermChild")]);
});

test("親が居ない・親がチェックポイントのチェックポイントは孤児になる", () => {
  const tree = buildGoalTree([
    mastery({ id: "noParent", deadline: "2026-09-06" }),
    mastery({ id: "missingParent", deadline: "2026-09-07", parentGoalId: goalId("ghost") }),
    mastery({ id: "checkpointParent", deadline: "2026-09-08", parentGoalId: goalId("ghost") }),
    mastery({
      id: "chained",
      deadline: "2026-09-09",
      parentGoalId: goalId("checkpointParent"),
    }),
  ]);

  expect(tree.orphans.map((goal) => goal._id)).toEqual([
    goalId("noParent"),
    goalId("missingParent"),
    goalId("checkpointParent"),
    goalId("chained"),
  ]);
  expect(tree.achieved).toEqual([]);
});

test("達成済みのチェックポイントは親グループから外れ、達成の一覧に入る", () => {
  const tree = buildGoalTree([
    exam(),
    mastery({
      achievedAt: "2026-08-09",
      id: "done",
      deadline: "2026-08-09",
      parentGoalId: goalId("exam"),
    }),
    mastery({ id: "open", deadline: "2026-09-06", parentGoalId: goalId("exam") }),
  ]);

  expect(tree.exam?.checkpoints.map((goal) => goal._id)).toEqual([goalId("open")]);
  expect(tree.achieved.map((goal) => goal._id)).toEqual([goalId("done")]);
});

test("達成の一覧は達成日の新しい順に並ぶ", () => {
  const tree = buildGoalTree([
    mastery({ achievedAt: "2026-08-01", id: "old" }),
    mastery({ achievedAt: "2026-08-09", id: "new" }),
  ]);

  expect(tree.achieved.map((goal) => goal._id)).toEqual([goalId("new"), goalId("old")]);
});

test("達成済みでも未達成の子が残っている長期目標はツリーに残る(二重表示しない)", () => {
  const tree = buildGoalTree([
    mastery({ achievedAt: "2026-08-09", id: "achievedParent" }),
    mastery({ id: "openChild", deadline: "2026-09-06", parentGoalId: goalId("achievedParent") }),
  ]);

  expect(tree.longTerm.map((group) => group.parent._id)).toEqual([goalId("achievedParent")]);
  expect(tree.achieved).toEqual([]);
});

test("達成済みで子が全部達成済みの長期目標は達成の一覧へ移る", () => {
  const tree = buildGoalTree([
    mastery({ achievedAt: "2026-08-09", id: "achievedParent" }),
    mastery({
      achievedAt: "2026-08-08",
      id: "doneChild",
      deadline: "2026-08-08",
      parentGoalId: goalId("achievedParent"),
    }),
  ]);

  expect(tree.longTerm).toEqual([]);
  expect(tree.achieved.map((goal) => goal._id)).toEqual([
    goalId("achievedParent"),
    goalId("doneChild"),
  ]);
});

test("達成済みの孤児は achieved ではなく orphans に入る", () => {
  const tree = buildGoalTree([
    mastery({ achievedAt: "2026-08-09", id: "achievedOrphan", deadline: "2026-08-09" }),
  ]);

  expect(tree.orphans.map((goal) => goal._id)).toEqual([goalId("achievedOrphan")]);
  expect(tree.achieved).toEqual([]);
});

test("childCheckpointsOf は達成済みも含めて期限昇順で返す", () => {
  const goals: Goal[] = [
    exam(),
    mastery({ id: "later", deadline: "2026-09-13", parentGoalId: goalId("exam") }),
    mastery({
      achievedAt: "2026-08-09",
      id: "done",
      deadline: "2026-08-09",
      parentGoalId: goalId("exam"),
    }),
    mastery({ id: "other", deadline: "2026-09-06", parentGoalId: goalId("longTerm") }),
  ];

  expect(childCheckpointsOf(goals, goalId("exam")).map((goal) => goal._id)).toEqual([
    goalId("done"),
    goalId("later"),
  ]);
});

test("親の候補は本番目標と未達成の長期目標をグループ分けして返す", () => {
  const options = parentGoalOptions(
    [
      exam(),
      mastery({ createdAt: 100, id: "openLongTerm" }),
      mastery({ achievedAt: "2026-08-01", createdAt: 200, id: "achievedLongTerm" }),
      mastery({ createdAt: 300, id: "checkpoint", deadline: "2026-09-06" }),
    ],
    { currentParentId: undefined, selfId: undefined },
  );

  expect(options).toEqual([
    { group: PARENT_GOAL_OPTION_GROUPS.exam, items: [{ label: "exam の内容", value: "exam" }] },
    {
      group: PARENT_GOAL_OPTION_GROUPS.longTerm,
      items: [{ label: "openLongTerm の内容", value: "openLongTerm" }],
    },
  ]);
});

test("現在の親は候補条件を満たさなくても残り、自分自身は外れる", () => {
  const options = parentGoalOptions(
    [
      mastery({ achievedAt: "2026-08-01", createdAt: 100, id: "achievedParent" }),
      mastery({
        createdAt: 200,
        id: "self",
        deadline: "2026-09-06",
        parentGoalId: goalId("achievedParent"),
      }),
    ],
    { currentParentId: goalId("achievedParent"), selfId: goalId("self") },
  );

  expect(options).toEqual([
    {
      group: PARENT_GOAL_OPTION_GROUPS.longTerm,
      items: [{ label: "achievedParent の内容", value: "achievedParent" }],
    },
  ]);
});

test("候補が無いグループは含めない", () => {
  expect(parentGoalOptions([], { currentParentId: undefined, selfId: undefined })).toEqual([]);
});
