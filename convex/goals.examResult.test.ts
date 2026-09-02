import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api } from "./_generated/api";
import schema from "./schema";
import { SINGLE_EXAM_GOAL_MESSAGE } from "./services/goals/create";
import { NOT_EXAM_GOAL_MESSAGE } from "./services/goals/setExamResult";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
  "!./auth.ts",
  "!./betterAuth/**",
  "!./convex.config.ts",
  "!./crons.ts",
  "!./http.ts",
  "!./migrations.ts",
]);

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const TODAY = "2026-10-20";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00+09:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

function owner() {
  return convexTest(schema, modules).withIdentity(OWNER);
}

const EXAM_GOAL = {
  content: "本番で900点を取る",
  examDate: "2026-10-01",
  maxScore: 900,
  minScore: 800,
  type: "exam",
} as const;

const NEXT_EXAM_GOAL = {
  ...EXAM_GOAL,
  content: "次の本番で950点を取る",
  examDate: "2027-01-24",
  maxScore: 950,
  minScore: 900,
} as const;

const CHECKPOINT = {
  content: "Part 5 を10分で解く",
  criterion: "30問を10分以内",
  type: "mastery",
} as const;

const RESULT = { recordedAt: TODAY, score: 855 } as const;

async function examOf(t: ReturnType<typeof owner>, goalId: string) {
  const goals = await t.query(api.queries.goals.list.list, {});
  const goal = goals.find((candidate) => candidate._id === goalId);
  return goal?.type === "exam" ? goal : undefined;
}

test("結果を入れると list に result が載り、本番目標は終了する", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  expect((await examOf(t, examId))?.result).toBeUndefined();

  await t.mutation(api.mutations.goals.setExamResult.setExamResult, {
    goalId: examId,
    result: RESULT,
  });

  expect((await examOf(t, examId))?.result).toEqual(RESULT);
});

test("結果は訂正できる（最後に入れた値だけが残る）", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  await t.mutation(api.mutations.goals.setExamResult.setExamResult, {
    goalId: examId,
    result: RESULT,
  });

  await t.mutation(api.mutations.goals.setExamResult.setExamResult, {
    goalId: examId,
    result: { recordedAt: "2026-10-21", score: 860 },
  });

  expect((await examOf(t, examId))?.result).toEqual({ recordedAt: "2026-10-21", score: 860 });
});

test("進行中の本番目標があるうちは2件目を拒否し、結果を入れた後は次の本番を作れる", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  await expect(
    t.mutation(api.mutations.goals.create.create, { goal: NEXT_EXAM_GOAL }),
  ).rejects.toThrow(SINGLE_EXAM_GOAL_MESSAGE);

  await t.mutation(api.mutations.goals.setExamResult.setExamResult, {
    goalId: examId,
    result: RESULT,
  });
  const nextId = await t.mutation(api.mutations.goals.create.create, { goal: NEXT_EXAM_GOAL });

  const goals = await t.query(api.queries.goals.list.list, {});
  expect(goals.filter((goal) => goal.type === "exam")).toHaveLength(2);
  expect((await examOf(t, nextId))?.result).toBeUndefined();
  //? 終了した本番が2件あっても、進行中は常に1件まで
  await expect(
    t.mutation(api.mutations.goals.create.create, { goal: NEXT_EXAM_GOAL }),
  ).rejects.toThrow(SINGLE_EXAM_GOAL_MESSAGE);
});

test("編集しても結果は消えない", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  await t.mutation(api.mutations.goals.setExamResult.setExamResult, {
    goalId: examId,
    result: RESULT,
  });

  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...EXAM_GOAL, content: "本番で905点を取る" },
    goalId: examId,
  });

  const exam = await examOf(t, examId);
  expect(exam?.content).toBe("本番で905点を取る");
  expect(exam?.result).toEqual(RESULT);
});

test("スコアの範囲・刻み、日付の形式が不正なら拒否する", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });

  for (const score of [5, 995, 857, 850.5]) {
    await expect(
      t.mutation(api.mutations.goals.setExamResult.setExamResult, {
        goalId: examId,
        result: { recordedAt: TODAY, score },
      }),
    ).rejects.toThrow();
  }
  for (const recordedAt of ["2026/10/20", "2026-02-31"]) {
    await expect(
      t.mutation(api.mutations.goals.setExamResult.setExamResult, {
        goalId: examId,
        result: { recordedAt, score: 855 },
      }),
    ).rejects.toThrow();
  }
  expect((await examOf(t, examId))?.result).toBeUndefined();
});

test("習得の目標には結果を入れられない", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: CHECKPOINT });

  await expect(
    t.mutation(api.mutations.goals.setExamResult.setExamResult, {
      goalId: masteryId,
      result: RESULT,
    }),
  ).rejects.toThrow(NOT_EXAM_GOAL_MESSAGE);
});

test("終了した本番の未達成チェックポイントは残り、次の本番へ付け替えられる", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  const checkpointId = await t.mutation(api.mutations.goals.create.create, {
    goal: { ...CHECKPOINT, deadline: "2026-09-27", parentGoalId: examId },
  });
  await t.mutation(api.mutations.goals.setExamResult.setExamResult, {
    goalId: examId,
    result: RESULT,
  });

  const afterResult = await t.query(api.queries.goals.list.list, {});
  const staying = afterResult.find((goal) => goal._id === checkpointId);
  expect(staying?.type === "mastery" && staying.parentGoalId).toBe(examId);

  const nextId = await t.mutation(api.mutations.goals.create.create, { goal: NEXT_EXAM_GOAL });
  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...CHECKPOINT, deadline: "2027-01-10", parentGoalId: nextId },
    goalId: checkpointId,
  });

  const moved = (await t.query(api.queries.goals.list.list, {})).find(
    (goal) => goal._id === checkpointId,
  );
  expect(moved?.type === "mastery" && moved.parentGoalId).toBe(nextId);
});
