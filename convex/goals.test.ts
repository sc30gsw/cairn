import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api } from "./_generated/api";
import schema from "./schema";

//? 目標の作成・編集・削除・達成日と認可。学習量の実績カウンタは
//? goals.masteryProgress.test.ts / goals.masteryProgressRepair.test.ts に置く。
const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
  "!./auth.ts",
  "!./betterAuth/**",
  "!./convex.config.ts",
  "!./crons.ts",
  "!./http.ts",
]);

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const OTHER_OWNER = { email: "other@example.com", subject: "other-owner-subject" };
const TODAY = "2026-08-17";

//? 習得の学習量実績は目標の作成日を起点にするので、サーバが見る現在時刻を固定する。
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00+09:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

function raw() {
  return convexTest(schema, modules);
}

function owner() {
  return raw().withIdentity(OWNER);
}

const EXAM_GOAL = {
  content: "本番で900点を取る",
  examDate: "2026-10-01",
  maxScore: 900,
  minScore: 800,
  type: "exam",
} as const;

const MASTERY_GOAL = {
  content: "音読を止まらずにできる",
  criterion: "1分間で120語",
  type: "mastery",
} as const;

test("試験・習得の2タイプを作成でき、list に反映される", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });

  const goals = await t.query(api.queries.goals.list.list, {});
  expect(goals).toHaveLength(2);
  expect(goals).toContainEqual({ _id: examId, ...EXAM_GOAL });
  //? 習得には達成日(未達成なら undefined)と学習量の実績が載る
  expect(goals).toContainEqual({
    _id: masteryId,
    achievedAt: undefined,
    activeDays: 0,
    confirmedMinutes: 0,
    ...MASTERY_GOAL,
    deadline: undefined,
  });
});

test("期限つきの習得(チェックポイント)は同じタイプとして保存される", async () => {
  const t = owner();
  const goalId = await t.mutation(api.mutations.goals.create.create, {
    goal: { ...MASTERY_GOAL, deadline: "2026-08-23" },
  });
  const goals = await t.query(api.queries.goals.list.list, {});
  const goal = goals.find((entry) => entry._id === goalId);
  expect(goal?.type).toBe("mastery");
  expect(goal?.type === "mastery" && goal.deadline).toBe("2026-08-23");
});

test("本番目標は1件までで2件目は拒否される", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { ...EXAM_GOAL, content: "本番で950点を取る", maxScore: 990, minScore: 850 },
    }),
  ).rejects.toThrow();
  expect(await t.query(api.queries.goals.list.list, {})).toHaveLength(1);
});

test("習得は複数件作成できる", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await t.mutation(api.mutations.goals.create.create, {
    goal: { ...MASTERY_GOAL, content: "Part2 を聞き取れる", criterion: "正答率9割" },
  });
  await t.mutation(api.mutations.goals.create.create, {
    goal: { ...MASTERY_GOAL, content: "長文を時間内に読み切れる", deadline: "2026-08-30" },
  });
  expect(await t.query(api.queries.goals.list.list, {})).toHaveLength(3);
});

test("TOEICスコアが範囲外・5刻みでない・下限が上限超なら拒否される", async () => {
  const t = owner();
  for (const scores of [
    { maxScore: 995, minScore: 800 },
    { maxScore: 903, minScore: 800 },
    { maxScore: 800, minScore: 900 },
  ]) {
    await expect(
      t.mutation(api.mutations.goals.create.create, { goal: { ...EXAM_GOAL, ...scores } }),
    ).rejects.toThrow();
  }
  expect(await t.query(api.queries.goals.list.list, {})).toEqual([]);
});

test("本番日の形式が不正・実在しない暦日なら拒否される", async () => {
  const t = owner();
  for (const examDate of ["2026/10/01", "2026-02-31"]) {
    await expect(
      t.mutation(api.mutations.goals.create.create, { goal: { ...EXAM_GOAL, examDate } }),
    ).rejects.toThrow();
  }
});

test("習得の期限が実在しない暦日なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { ...MASTERY_GOAL, deadline: "2026-02-31" },
    }),
  ).rejects.toThrow();
});

test("達成の基準・内容が空白なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, { goal: { ...MASTERY_GOAL, criterion: "  " } }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.create.create, { goal: { ...MASTERY_GOAL, content: "  " } }),
  ).rejects.toThrow();
});

test("未認証では目標を作成できない", async () => {
  const t = raw();
  await expect(
    t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL }),
  ).rejects.toThrow();
});

test("目標タイプの変更は拒否される", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await expect(
    t.mutation(api.mutations.goals.update.update, { goal: EXAM_GOAL, goalId: masteryId }),
  ).rejects.toThrow();
  const goals = await t.query(api.queries.goals.list.list, {});
  expect(goals.find((goal) => goal._id === masteryId)?.type).toBe("mastery");
});

test("同タイプの更新は基準と期限を書き換える", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...MASTERY_GOAL, criterion: "1分間で150語", deadline: "2026-08-23" },
    goalId: masteryId,
  });
  const goals = await t.query(api.queries.goals.list.list, {});
  const updated = goals.find((goal) => goal._id === masteryId);
  expect(updated?.type === "mastery" && updated.criterion).toBe("1分間で150語");
  expect(updated?.type === "mastery" && updated.deadline).toBe("2026-08-23");
});

test("試験目標も同タイプで更新できる", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...EXAM_GOAL, content: "900点を安定して取る", maxScore: 900, minScore: 850 },
    goalId: examId,
  });
  const goals = await t.query(api.queries.goals.list.list, {});
  const updated = goals.find((goal) => goal._id === examId);
  expect(updated?.type === "exam" && updated.content).toBe("900点を安定して取る");
  expect(updated?.type === "exam" && updated.maxScore).toBe(900);
});

test("setAchieved は習得を達成にし、undefined で取り消せる", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: masteryId,
  });
  const achieved = await t.query(api.queries.goals.list.list, {});
  const achievedGoal = achieved.find((goal) => goal._id === masteryId);
  expect(achievedGoal?.type === "mastery" && achievedGoal.achievedAt).toBe(TODAY);

  //? 達成しても目標は消えない(達成済みの一覧が達成の履歴になる)
  expect(achieved).toHaveLength(1);

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { goalId: masteryId });
  const cleared = await t.query(api.queries.goals.list.list, {});
  const clearedGoal = cleared.find((goal) => goal._id === masteryId);
  expect(clearedGoal?.type === "mastery" && clearedGoal.achievedAt).toBeUndefined();
});

test("達成日は編集で消えない", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: masteryId,
  });
  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...MASTERY_GOAL, deadline: "2026-08-30" },
    goalId: masteryId,
  });
  const goals = await t.query(api.queries.goals.list.list, {});
  const updated = goals.find((goal) => goal._id === masteryId);
  expect(updated?.type === "mastery" && updated.achievedAt).toBe(TODAY);
});

test("setAchieved は本番目標と不正な日付を拒否する", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });

  await expect(
    t.mutation(api.mutations.goals.setAchieved.setAchieved, {
      achievedAt: TODAY,
      goalId: examId,
    }),
  ).rejects.toThrow();
  for (const achievedAt of ["2026/08/17", "2026-02-31"]) {
    await expect(
      t.mutation(api.mutations.goals.setAchieved.setAchieved, { achievedAt, goalId: masteryId }),
    ).rejects.toThrow();
  }
});
test("目標を削除できる", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  expect(await t.query(api.queries.goals.list.list, {})).toHaveLength(1);
  await t.mutation(api.mutations.goals.remove.remove, { goalId: masteryId });
  expect(await t.query(api.queries.goals.list.list, {})).toEqual([]);
});

test("他人の目標は取得できず、更新・削除・達成も拒否される", async () => {
  const t = raw();
  const asOwner = t.withIdentity(OWNER);
  const asOther = t.withIdentity(OTHER_OWNER);

  const masteryId = await asOwner.mutation(api.mutations.goals.create.create, {
    goal: MASTERY_GOAL,
  });

  expect(await asOther.query(api.queries.goals.list.list, {})).toEqual([]);

  await expect(
    asOther.mutation(api.mutations.goals.update.update, {
      goal: { ...MASTERY_GOAL, content: "乗っ取り" },
      goalId: masteryId,
    }),
  ).rejects.toThrow();
  await expect(
    asOther.mutation(api.mutations.goals.setAchieved.setAchieved, {
      achievedAt: TODAY,
      goalId: masteryId,
    }),
  ).rejects.toThrow();
  await expect(
    asOther.mutation(api.mutations.goals.remove.remove, { goalId: masteryId }),
  ).rejects.toThrow();

  //? 所有者本人には影響していない
  const goals = await asOwner.query(api.queries.goals.list.list, {});
  const goal = goals.find((entry) => entry._id === masteryId);
  expect(goal?.type === "mastery" && goal.content).toBe(MASTERY_GOAL.content);
  expect(goal?.type === "mastery" && goal.achievedAt).toBeUndefined();
});
