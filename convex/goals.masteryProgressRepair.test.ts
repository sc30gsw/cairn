import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { creationDateJst } from "./services/goals/masteryProgress";
import { recomputeMasteryProgress } from "./services/goals/recomputeMasteryProgress";

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
const YESTERDAY = "2026-08-16";

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

const MASTERY_GOAL = {
  content: "音読を止まらずにできる",
  criterion: "1分間で120語",
  type: "mastery",
} as const;

const CONCRETE_ACTION = "Unit 1 を音読する";

async function seedItemId(t: ReturnType<typeof owner>) {
  return await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "TOEIC対策",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    return await ctx.db.insert("items", {
      categoryId,
      name: "金のフレーズ",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
  });
}

async function addConfirmedRow(
  t: ReturnType<typeof owner>,
  itemId: Id<"items">,
  entry: { dateJst: string; minutes: number },
) {
  const rowId = await t.mutation(api.mutations.rows.add.add, {
    content: CONCRETE_ACTION,
    dateJst: entry.dateJst,
    itemId,
    minutes: 0,
    todayJst: TODAY,
  });
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: CONCRETE_ACTION,
    minutes: entry.minutes,
    rowId,
  });
  return rowId;
}

async function createMasteryGoal(t: ReturnType<typeof owner>) {
  return await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
}

async function progressOf(t: ReturnType<typeof owner>, goalId: Id<"goals">) {
  const goals = await t.query(api.queries.goals.list.list, {});
  const goal = goals.find((entry) => entry._id === goalId);
  if (goal === undefined || goal.type !== "mastery") {
    throw new Error("習得目標が見つからない");
  }
  return { activeDays: goal.activeDays, confirmedMinutes: goal.confirmedMinutes };
}

async function liveDayId(t: ReturnType<typeof owner>, dateJst: string) {
  const page = await t.query(api.queries.days.get.get, { dateJst, todayJst: TODAY });
  const dayId = page.day?._id;
  if (dayId === undefined) {
    throw new Error("日が見つからない");
  }
  return dayId;
}

async function creationDateOf(t: ReturnType<typeof owner>, goalId: Id<"goals">) {
  return await t.run(async (ctx) => {
    const goal = await ctx.db.get("goals", goalId);
    if (goal === null) {
      throw new Error("目標が見つからない");
    }
    return creationDateJst(goal._creationTime);
  });
}

async function repair(t: ReturnType<typeof owner>) {
  await t.mutation(internal.mutations.goals.recomputeMasteryProgress.recomputeMasteryProgress, {
    ownerId: OWNER.subject,
  });
}

async function insertExtraLiveDay(t: ReturnType<typeof owner>, dateJst: string) {
  return await t.run(async (ctx) => ctx.db.insert("days", { dateJst, ownerId: OWNER.subject }));
}

test("達成すると実績が凍結され、達成後の確定では動かない", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await createMasteryGoal(t);
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: masteryId,
  });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("達成を解除すると凍結中に動いた確定を取り込んで再計算される", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await createMasteryGoal(t);
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: masteryId,
  });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { goalId: masteryId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
});

test("凍結中に確定が減っていれば、解除の再計算で実績も減る", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await createMasteryGoal(t);
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  const droppedId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: masteryId,
  });

  await t.mutation(api.mutations.rows.remove.remove, { rowId: droppedId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { goalId: masteryId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("日ドキュメントが入れ替わった記録でも、実績は暦日の生存で数え直される", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await createMasteryGoal(t);
  const rowId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  const staleDayId = await liveDayId(t, TODAY);

  await insertExtraLiveDay(t, TODAY);
  await t.run(async (ctx) => {
    await ctx.db.delete("days", staleDayId);
  });

  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await t.mutation(api.mutations.rows.remove.remove, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  await t.mutation(api.mutations.rows.restore.restore, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("暦日に生きた日が2つあるとき、日をゴミ箱に入れても実績は実測と一致する", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await createMasteryGoal(t);
  const rowId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });

  const extraDayId = await insertExtraLiveDay(t, TODAY);
  await t.run(async (ctx) => {
    await ctx.db.patch("rows", rowId, { dayId: extraDayId });
  });

  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: TODAY });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await repair(t);
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("暦日に生きた日が残っているとき、ゴミ箱の日を戻しても実績は二重計上されない", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await createMasteryGoal(t);
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  const dayId = await liveDayId(t, TODAY);

  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: TODAY });
  await insertExtraLiveDay(t, TODAY);
  await repair(t);
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await t.mutation(api.mutations.trash.restoreDay.restoreDay, { dayId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
  await repair(t);
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("暦日に生きた日が残っているゴミ箱の日を完全削除すると、配下の確定が実績から外れる", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await createMasteryGoal(t);
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  const dayId = await liveDayId(t, TODAY);

  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: TODAY });
  await insertExtraLiveDay(t, TODAY);
  await repair(t);
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await t.mutation(api.mutations.trash.purgeDay.purgeDay, { dayId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
  await repair(t);
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});

test("内部の再計算ミューテーションは漂流したカウンタを修復する", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await createMasteryGoal(t);
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });

  await t.run(async (ctx) => {
    await ctx.db.patch("goals", masteryId, { activeDays: 9, confirmedMinutes: 999 });
  });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 9, confirmedMinutes: 999 });

  await repair(t);
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("再計算は作成日の違う複数の習得目標をそれぞれの起点で数え直す", async () => {
  const t = owner();
  vi.setSystemTime(new Date(`${YESTERDAY}T12:00:00+09:00`));
  const olderId = await createMasteryGoal(t);
  vi.setSystemTime(new Date(`${TODAY}T12:00:00+09:00`));
  const itemId = await seedItemId(t);
  const newerId = await createMasteryGoal(t);
  expect(await creationDateOf(t, olderId)).toBe(YESTERDAY);
  expect(await creationDateOf(t, newerId)).toBe(TODAY);
  await addConfirmedRow(t, itemId, { dateJst: YESTERDAY, minutes: 90 });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });

  await t.run(async (ctx) => {
    await ctx.db.patch("goals", olderId, { activeDays: 9, confirmedMinutes: 999 });
    await ctx.db.patch("goals", newerId, { activeDays: 9, confirmedMinutes: 999 });
  });

  await repair(t);
  expect(await progressOf(t, olderId)).toEqual({ activeDays: 2, confirmedMinutes: 120 });
  expect(await progressOf(t, newerId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("再計算は達成済みの目標を凍結したままにする", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await createMasteryGoal(t);
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: masteryId,
  });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });

  await repair(t);
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

const EXAM_GOAL = {
  content: "900点を取る",
  examDate: "2026-09-27",
  maxScore: 850,
  minScore: 730,
  type: "exam",
} as const;

test("試験目標は recomputeMasteryProgress の対象外", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  const result = await t.run(async (ctx) => {
    const goal = await ctx.db.get("goals", examId);
    if (goal === null) {
      throw new Error("試験目標が見つからない");
    }
    return recomputeMasteryProgress(ctx, goal);
  });
  expect(result).toBeNull();
});
