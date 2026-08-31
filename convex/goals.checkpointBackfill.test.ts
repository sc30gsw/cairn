import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { expect, test } from "vite-plus/test";

import type { Doc } from "./_generated/dataModel";
import type { BackfillCheckpointParentsResult } from "./lib/validators";
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

const backfillRef = makeFunctionReference<
  "mutation",
  Record<"ownerId", string>,
  BackfillCheckpointParentsResult
>("mutations/goals/backfillCheckpointParents:backfillCheckpointParents");

const OWNER = "owner-subject";
const OTHER_OWNER = "other-owner-subject";

const MASTERY_FIELDS = {
  activeDays: 0,
  confirmedMinutes: 0,
  criterion: "できる",
  type: "mastery",
} as const;

function raw() {
  return convexTest(schema, modules);
}

async function goalsOf(t: ReturnType<typeof raw>, ownerId: string): Promise<Doc<"goals">[]> {
  return await t.run(async (ctx) =>
    ctx.db
      .query("goals")
      .withIndex("by_owner_and_type", (q) => q.eq("ownerId", ownerId))
      .collect(),
  );
}

test("本番目標がある所有者では孤児が全部その子になり、期限つき・親なしが残らない", async () => {
  const t = raw();
  const examId = await t.run(async (ctx) =>
    ctx.db.insert("goals", {
      content: "TOEIC で900点を取る",
      examDate: "2026-11-15",
      maxScore: 900,
      minScore: 850,
      ownerId: OWNER,
      type: "exam",
    }),
  );
  await t.run(async (ctx) => {
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "孤児1",
      deadline: "2026-09-06",
      ownerId: OWNER,
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "孤児2",
      deadline: "2026-09-13",
      ownerId: OWNER,
    });
  });

  const result = await t.mutation(backfillRef, { ownerId: OWNER });
  expect(result).toEqual({ assigned: 2, plan: "exam", promoted: 0 });

  const goals = await goalsOf(t, OWNER);
  const orphans = goals.filter(
    (goal) =>
      goal.type === "mastery" && goal.deadline !== undefined && goal.parentGoalId === undefined,
  );
  expect(orphans).toEqual([]);
  expect(
    goals.filter((goal) => goal.type === "mastery" && goal.parentGoalId === examId),
  ).toHaveLength(2);
});

test("親候補が無ければ期限がもっとも遠い孤児が長期目標に昇格して親になる", async () => {
  const t = raw();
  await t.run(async (ctx) => {
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "近い",
      deadline: "2026-09-06",
      ownerId: OWNER,
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "遠い",
      deadline: "2026-12-06",
      ownerId: OWNER,
    });
  });

  const result = await t.mutation(backfillRef, { ownerId: OWNER });
  expect(result).toEqual({ assigned: 1, plan: "promote", promoted: 1 });

  const goals = await goalsOf(t, OWNER);
  const promoted = goals.find((goal) => goal.content === "遠い");
  const child = goals.find((goal) => goal.content === "近い");
  expect(promoted?.type === "mastery" && promoted.deadline).toBeUndefined();
  expect(promoted?.type === "mastery" && promoted.parentGoalId).toBeUndefined();
  expect(child?.type === "mastery" && child.parentGoalId).toBe(promoted?._id);
});

test("2回呼んでも結果が変わらない(冪等)", async () => {
  const t = raw();
  await t.run(async (ctx) => {
    await ctx.db.insert("goals", {
      content: "TOEIC で900点を取る",
      examDate: "2026-11-15",
      maxScore: 900,
      minScore: 850,
      ownerId: OWNER,
      type: "exam",
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "孤児",
      deadline: "2026-09-06",
      ownerId: OWNER,
    });
  });

  await t.mutation(backfillRef, { ownerId: OWNER });
  const first = await goalsOf(t, OWNER);
  const second = await t.mutation(backfillRef, { ownerId: OWNER });
  expect(second).toEqual({ assigned: 0, plan: "none", promoted: 0 });
  expect(await goalsOf(t, OWNER)).toEqual(first);
});

test("他所有者の目標は親にならず、書き換わらない", async () => {
  const t = raw();
  const otherLongTermId = await t.run(async (ctx) =>
    ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "他人の長期目標",
      ownerId: OTHER_OWNER,
    }),
  );
  await t.run(async (ctx) => {
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "自分の孤児",
      deadline: "2026-09-06",
      ownerId: OWNER,
    });
  });

  const result = await t.mutation(backfillRef, { ownerId: OWNER });
  expect(result.plan).toBe("promote");

  const goals = await goalsOf(t, OWNER);
  expect(goals.every((goal) => goal.ownerId === OWNER)).toBe(true);
  const other = await t.run(async (ctx) => ctx.db.get("goals", otherLongTermId));
  expect(other?.type === "mastery" && other.parentGoalId).toBeUndefined();
  expect(
    goals.some((goal) => goal.type === "mastery" && goal.parentGoalId === otherLongTermId),
  ).toBe(false);
});

test("達成済みチェックポイントは親だけが付き、達成日と実績は動かない", async () => {
  const t = raw();
  await t.run(async (ctx) => {
    await ctx.db.insert("goals", {
      content: "TOEIC で900点を取る",
      examDate: "2026-11-15",
      maxScore: 900,
      minScore: 850,
      ownerId: OWNER,
      type: "exam",
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      achievedAt: "2026-08-01",
      activeDays: 6,
      confirmedMinutes: 300,
      content: "達成済みの孤児",
      deadline: "2026-08-01",
      ownerId: OWNER,
    });
  });

  await t.mutation(backfillRef, { ownerId: OWNER });

  const goals = await goalsOf(t, OWNER);
  const achieved = goals.find((goal) => goal.content === "達成済みの孤児");
  expect(achieved?.type === "mastery" && achieved.achievedAt).toBe("2026-08-01");
  expect(achieved?.type === "mastery" && achieved.activeDays).toBe(6);
  expect(achieved?.type === "mastery" && achieved.confirmedMinutes).toBe(300);
  expect(achieved?.type === "mastery" && achieved.parentGoalId).toBeDefined();
  expect(achieved?.type === "mastery" && achieved.deadline).toBe("2026-08-01");
});

test("壊れた期限があると throw し、同じバッチの書き込みも入らない", async () => {
  const t = raw();
  await t.run(async (ctx) => {
    await ctx.db.insert("goals", {
      content: "TOEIC で900点を取る",
      examDate: "2026-11-15",
      maxScore: 900,
      minScore: 850,
      ownerId: OWNER,
      type: "exam",
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "正しい孤児",
      deadline: "2026-09-06",
      ownerId: OWNER,
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "壊れた期限",
      deadline: "2026/09/11",
      ownerId: OWNER,
    });
  });

  await expect(t.mutation(backfillRef, { ownerId: OWNER })).rejects.toThrow();

  const goals = await goalsOf(t, OWNER);
  expect(goals.every((goal) => goal.type !== "mastery" || goal.parentGoalId === undefined)).toBe(
    true,
  );
});

test("親候補が無く孤児がすべて達成済みなら throw し、データは無変更", async () => {
  const t = raw();
  await t.run(async (ctx) => {
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      achievedAt: "2026-08-01",
      content: "達成済みの孤児",
      deadline: "2026-08-01",
      ownerId: OWNER,
    });
  });
  const before = await goalsOf(t, OWNER);

  await expect(t.mutation(backfillRef, { ownerId: OWNER })).rejects.toThrow();
  expect(await goalsOf(t, OWNER)).toEqual(before);
});
