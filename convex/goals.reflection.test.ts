import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api } from "./_generated/api";
import { ACHIEVEMENT_REFLECTION_MAX_LENGTH } from "./lib/domain";
import schema from "./schema";

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
const TODAY = "2026-08-17";
const MASTERY_GOAL = {
  content: "Part 5 を10分で解き切る",
  criterion: "模試 Part 5 を時間内に終えられる",
  type: "mastery",
} as const;

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

async function masteryGoal(t: ReturnType<typeof owner>) {
  const goalId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  return {
    goalId,
    read: async () => {
      const goals = await t.query(api.queries.goals.list.list, {});
      const goal = goals.find((entry) => entry._id === goalId);
      if (goal === undefined || goal.type !== "mastery") {
        throw new Error("習得の目標が見つからない");
      }
      return goal;
    },
  };
}

test("達成にするとき振り返りを一行残せる", async () => {
  const t = owner();
  const { goalId, read } = await masteryGoal(t);
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId,
    reflection: "  毎朝の音読を続けたのが効いた  ",
  });
  const goal = await read();
  expect(goal.achievedAt).toBe(TODAY);
  expect(goal.reflection).toBe("毎朝の音読を続けたのが効いた");
});

test("振り返りは任意で、空なら残らない", async () => {
  const t = owner();
  const { goalId, read } = await masteryGoal(t);
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId,
    reflection: "   ",
  });
  expect((await read()).reflection).toBeUndefined();
});

test("達成を外しても振り返りは残り、再達成で書き換えられる", async () => {
  const t = owner();
  const { goalId, read } = await masteryGoal(t);
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId,
    reflection: "最初の振り返り",
  });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { goalId });
  const cleared = await read();
  expect(cleared.achievedAt).toBeUndefined();
  expect(cleared.reflection).toBe("最初の振り返り");

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId,
    reflection: "二度目の振り返り",
  });
  expect((await read()).reflection).toBe("二度目の振り返り");
});

test("振り返りを渡さずに達成にすると既存の振り返りを保つ", async () => {
  const t = owner();
  const { goalId, read } = await masteryGoal(t);
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId,
    reflection: "保たれる振り返り",
  });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { goalId });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { achievedAt: TODAY, goalId });
  expect((await read()).reflection).toBe("保たれる振り返り");
});

test("目標の編集で振り返りは消えない", async () => {
  const t = owner();
  const { goalId, read } = await masteryGoal(t);
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId,
    reflection: "編集後も残る",
  });
  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...MASTERY_GOAL, content: "Part 5 を9分で解き切る" },
    goalId,
  });
  const goal = await read();
  expect(goal.content).toBe("Part 5 を9分で解き切る");
  expect(goal.reflection).toBe("編集後も残る");
});

test("上限を超える振り返りは拒否する", async () => {
  const t = owner();
  const { goalId } = await masteryGoal(t);
  await expect(
    t.mutation(api.mutations.goals.setAchieved.setAchieved, {
      achievedAt: TODAY,
      goalId,
      reflection: "あ".repeat(ACHIEVEMENT_REFLECTION_MAX_LENGTH + 1),
    }),
  ).rejects.toThrow();
});
