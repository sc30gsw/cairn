import { expect, test } from "vite-plus/test";

import type { Doc, Id } from "../../_generated/dataModel";
import { planCheckpointParents } from "./planCheckpointParents";

const OWNER = "owner-subject";

function goalId(name: string): Id<"goals"> {
  return name as Id<"goals">;
}

type MasteryInput = {
  achievedAt?: string;
  createdAt?: number;
  deadline?: string;
  id: string;
  parentGoalId?: Id<"goals">;
};

function mastery({
  achievedAt,
  createdAt = 1,
  deadline,
  id,
  parentGoalId,
}: MasteryInput): Doc<"goals"> {
  return {
    _creationTime: createdAt,
    _id: goalId(id),
    achievedAt,
    activeDays: 0,
    confirmedMinutes: 0,
    content: `${id} の内容`,
    criterion: `${id} ができる`,
    deadline,
    ownerId: OWNER,
    parentGoalId,
    type: "mastery",
  };
}

function exam(id: string, createdAt = 1): Doc<"goals"> {
  return {
    _creationTime: createdAt,
    _id: goalId(id),
    content: `${id} の内容`,
    examDate: "2026-11-15",
    maxScore: 900,
    minScore: 850,
    ownerId: OWNER,
    type: "exam",
  };
}

test("孤児が無ければ何もしない", () => {
  const plan = planCheckpointParents([
    exam("exam"),
    mastery({ id: "child", deadline: "2026-09-06", parentGoalId: goalId("exam") }),
  ]);

  expect(plan).toEqual({
    assignGoalIds: [],
    parentGoalId: null,
    plan: "none",
    promoteGoalId: null,
  });
});

test("本番目標があれば全孤児がその子になる(達成済みの孤児も含む)", () => {
  const plan = planCheckpointParents([
    exam("exam"),
    mastery({ id: "orphan", deadline: "2026-09-06" }),
    mastery({ achievedAt: "2026-08-01", id: "achievedOrphan", deadline: "2026-08-01" }),
  ]);

  expect(plan.plan).toBe("exam");
  expect(plan.parentGoalId).toBe(goalId("exam"));
  expect(plan.assignGoalIds).toEqual([goalId("orphan"), goalId("achievedOrphan")]);
  expect(plan.promoteGoalId).toBeNull();
});

test("本番目標が2件ある不正データでは最古が選ばれる", () => {
  const plan = planCheckpointParents([
    exam("newExam", 200),
    exam("oldExam", 100),
    mastery({ id: "orphan", deadline: "2026-09-06" }),
  ]);

  expect(plan.parentGoalId).toBe(goalId("oldExam"));
});

test("本番目標が無ければ未達成の長期目標の最古が親になる", () => {
  const plan = planCheckpointParents([
    mastery({ achievedAt: "2026-07-01", createdAt: 100, id: "achievedLongTerm" }),
    mastery({ createdAt: 300, id: "newLongTerm" }),
    mastery({ createdAt: 200, id: "openLongTerm" }),
    mastery({ id: "orphan", deadline: "2026-09-06" }),
  ]);

  expect(plan.plan).toBe("longTerm");
  expect(plan.parentGoalId).toBe(goalId("openLongTerm"));
});

test("長期目標が達成済みだけなら、その最古が親になる(履歴は書き換えない)", () => {
  const plan = planCheckpointParents([
    mastery({ achievedAt: "2026-07-01", createdAt: 200, id: "newDone" }),
    mastery({ achievedAt: "2026-06-01", createdAt: 100, id: "oldDone" }),
    mastery({ id: "orphan", deadline: "2026-09-06" }),
  ]);

  expect(plan.plan).toBe("longTerm");
  expect(plan.parentGoalId).toBe(goalId("oldDone"));
});

test("親候補が無ければ期限がもっとも遠い未達成の孤児が長期目標に昇格する", () => {
  const plan = planCheckpointParents([
    mastery({ id: "near", deadline: "2026-09-06" }),
    mastery({ id: "far", deadline: "2026-12-06" }),
  ]);

  expect(plan).toEqual({
    assignGoalIds: [goalId("near")],
    parentGoalId: goalId("far"),
    plan: "promote",
    promoteGoalId: goalId("far"),
  });
});

test("同じ期限が並んだら _creationTime の最古が昇格する(決定性)", () => {
  const plan = planCheckpointParents([
    mastery({ createdAt: 200, id: "newer", deadline: "2026-12-06" }),
    mastery({ createdAt: 100, id: "older", deadline: "2026-12-06" }),
  ]);

  expect(plan.promoteGoalId).toBe(goalId("older"));
});

test("親候補が無く孤児がすべて達成済みなら人に返す", () => {
  const plan = planCheckpointParents([
    mastery({ achievedAt: "2026-08-01", id: "done1", deadline: "2026-08-01" }),
    mastery({ achievedAt: "2026-08-02", id: "done2", deadline: "2026-08-02" }),
  ]);

  expect(plan).toEqual({
    assignGoalIds: [],
    parentGoalId: null,
    plan: "manual",
    promoteGoalId: null,
  });
});

test("すでに親を持つチェックポイントは assignGoalIds に入らない", () => {
  const plan = planCheckpointParents([
    exam("exam"),
    mastery({ id: "linked", deadline: "2026-09-06", parentGoalId: goalId("exam") }),
    mastery({ id: "orphan", deadline: "2026-09-07" }),
  ]);

  expect(plan.assignGoalIds).toEqual([goalId("orphan")]);
});

test("引数の並び順を入れ替えても同じ結果になる(順序独立)", () => {
  const goals = [
    mastery({ createdAt: 300, id: "orphanB", deadline: "2026-10-06" }),
    mastery({ createdAt: 100, id: "longTerm" }),
    mastery({ createdAt: 200, id: "orphanA", deadline: "2026-09-06" }),
  ];
  const forward = planCheckpointParents(goals);
  const reversed = planCheckpointParents([...goals].reverse());

  expect(reversed.plan).toBe(forward.plan);
  expect(reversed.parentGoalId).toBe(forward.parentGoalId);
  expect([...reversed.assignGoalIds].sort()).toEqual([...forward.assignGoalIds].sort());
});
