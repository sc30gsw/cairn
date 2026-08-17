import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api } from "./_generated/api";
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
]);

const ALLOWED_EMAIL = "owner@example.com";
const OWNER = { email: ALLOWED_EMAIL, subject: "owner-subject" };
const MONDAY = "2026-08-17";
const NEXT_MONDAY = "2026-08-24";
const LAST_MONDAY = "2026-08-10";

//? 週の書き込みは「今週」に閉じているので、サーバが見る現在時刻を MONDAY の週に固定する。
function setNowTo(dateJst: string) {
  vi.setSystemTime(new Date(`${dateJst}T12:00:00+09:00`));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  setNowTo(MONDAY);
});

afterEach(() => {
  vi.useRealTimers();
});

function owner() {
  process.env.ALLOWED_EMAIL = ALLOWED_EMAIL;
  return convexTest(schema, modules).withIdentity(OWNER);
}

async function weeklyGoalFor(t: ReturnType<typeof owner>, dateJst: string) {
  const week = await t.query(api.queries.history.week.week, { dateJst });
  return week.weeklyGoal;
}

test("ensureWeekSnapshot はペース目標があれば新しい週にスナップショットを作る", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "毎日机に向かう", dailyFloorMinutes: 30, daysPerWeek: 4, type: "pace" },
    weekStartJst: MONDAY,
  });
  expect(await weeklyGoalFor(t, NEXT_MONDAY)).toBeNull();
  //? 週が変わってから初めて開いた、という状況
  setNowTo(NEXT_MONDAY);
  await t.mutation(api.mutations.goals.ensureWeekSnapshot.ensureWeekSnapshot, {
    weekStartJst: NEXT_MONDAY,
  });
  expect(await weeklyGoalFor(t, NEXT_MONDAY)).toEqual({ dailyFloorMinutes: 30, days: 4 });
});

test("ensureWeekSnapshot は既存のスナップショットを上書きしない(冪等)", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "毎日机に向かう", dailyFloorMinutes: 30, daysPerWeek: 4, type: "pace" },
    weekStartJst: MONDAY,
  });
  expect(await weeklyGoalFor(t, MONDAY)).toEqual({ dailyFloorMinutes: 30, days: 4 });

  //? 翌週は「この週だけ」の値を先に入れておく(ペース目標そのものは 30/4 のまま)
  setNowTo(NEXT_MONDAY);
  await t.mutation(api.mutations.goals.saveWeekly.saveWeekly, {
    dailyFloorMinutes: 20,
    days: 2,
    weekStartJst: NEXT_MONDAY,
  });

  //? 既にスナップショットがあるので、ペース目標の値では上書きされない
  await t.mutation(api.mutations.goals.ensureWeekSnapshot.ensureWeekSnapshot, {
    weekStartJst: NEXT_MONDAY,
  });
  expect(await weeklyGoalFor(t, NEXT_MONDAY)).toEqual({ dailyFloorMinutes: 20, days: 2 });
  expect(await weeklyGoalFor(t, MONDAY)).toEqual({ dailyFloorMinutes: 30, days: 4 });
});

test("ensureWeekSnapshot はペース目標が無ければ何もしない", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "机の上を片付ける", type: "other" },
    weekStartJst: MONDAY,
  });
  await t.mutation(api.mutations.goals.ensureWeekSnapshot.ensureWeekSnapshot, {
    weekStartJst: MONDAY,
  });
  expect(await weeklyGoalFor(t, MONDAY)).toBeNull();
});

test("saveWeekly はその週のスナップショットを上書きする", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "毎日机に向かう", dailyFloorMinutes: 30, daysPerWeek: 4, type: "pace" },
    weekStartJst: MONDAY,
  });
  expect(await weeklyGoalFor(t, MONDAY)).toEqual({ dailyFloorMinutes: 30, days: 4 });
  await t.mutation(api.mutations.goals.saveWeekly.saveWeekly, {
    dailyFloorMinutes: 45,
    days: 5,
    weekStartJst: MONDAY,
  });
  expect(await weeklyGoalFor(t, MONDAY)).toEqual({ dailyFloorMinutes: 45, days: 5 });
});

test("saveWeekly はスナップショットの無い週にも作成できる", async () => {
  const t = owner();
  expect(await weeklyGoalFor(t, MONDAY)).toBeNull();
  await t.mutation(api.mutations.goals.saveWeekly.saveWeekly, {
    dailyFloorMinutes: 20,
    days: 2,
    weekStartJst: MONDAY,
  });
  expect(await weeklyGoalFor(t, MONDAY)).toEqual({ dailyFloorMinutes: 20, days: 2 });
});

test("saveWeekly は実施日数・最低分数が範囲外なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.saveWeekly.saveWeekly, {
      dailyFloorMinutes: 20,
      days: 8,
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.saveWeekly.saveWeekly, {
      dailyFloorMinutes: 20,
      days: 0,
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.saveWeekly.saveWeekly, {
      dailyFloorMinutes: 1,
      days: 3,
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("非月曜の weekStartJst は月曜キーに正規化される", async () => {
  const t = owner();
  const wednesday = "2026-08-19";
  await t.mutation(api.mutations.goals.saveWeekly.saveWeekly, {
    dailyFloorMinutes: 20,
    days: 2,
    weekStartJst: wednesday,
  });
  //? 水曜キーの行が別に生えるのではなく、その週の月曜として1行だけ立つ
  expect(await weeklyGoalFor(t, MONDAY)).toEqual({ dailyFloorMinutes: 20, days: 2 });
  expect(await weeklyGoalFor(t, NEXT_MONDAY)).toBeNull();

  await t.mutation(api.mutations.goals.saveWeekly.saveWeekly, {
    dailyFloorMinutes: 45,
    days: 5,
    weekStartJst: wednesday,
  });
  expect(await weeklyGoalFor(t, MONDAY)).toEqual({ dailyFloorMinutes: 45, days: 5 });
});

test("非月曜を渡しても ensureWeekSnapshot は同じ週を1行に保つ", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "毎日机に向かう", dailyFloorMinutes: 30, daysPerWeek: 4, type: "pace" },
    weekStartJst: MONDAY,
  });
  //? 既に MONDAY の行があるので、同じ週の日曜を渡しても新しい行は作られない
  await t.mutation(api.mutations.goals.ensureWeekSnapshot.ensureWeekSnapshot, {
    weekStartJst: "2026-08-23",
  });
  const rows = await t.run(async (ctx) =>
    ctx.db
      .query("weeklyGoals")
      .withIndex("by_owner_and_week", (q) => q.eq("ownerId", OWNER.subject))
      .collect(),
  );
  expect(rows).toHaveLength(1);
  expect(rows[0]?.weekStartJst).toBe(MONDAY);
});

test("今週以外の週は書き換えられない", async () => {
  const t = owner();
  for (const weekStartJst of [LAST_MONDAY, NEXT_MONDAY]) {
    await expect(
      t.mutation(api.mutations.goals.saveWeekly.saveWeekly, {
        dailyFloorMinutes: 20,
        days: 2,
        weekStartJst,
      }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.mutations.goals.ensureWeekSnapshot.ensureWeekSnapshot, { weekStartJst }),
    ).rejects.toThrow();
    await expect(
      t.mutation(api.mutations.goals.create.create, {
        goal: { content: "毎日机に向かう", dailyFloorMinutes: 30, daysPerWeek: 4, type: "pace" },
        weekStartJst,
      }),
    ).rejects.toThrow();
  }
  //? 過去週の行が生まれていないこと
  const rows = await t.run(async (ctx) =>
    ctx.db
      .query("weeklyGoals")
      .withIndex("by_owner_and_week", (q) => q.eq("ownerId", OWNER.subject))
      .collect(),
  );
  expect(rows).toEqual([]);
});

test("update も今週以外の週では拒否される", async () => {
  const t = owner();
  const paceId = await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "毎日机に向かう", dailyFloorMinutes: 30, daysPerWeek: 4, type: "pace" },
    weekStartJst: MONDAY,
  });
  await expect(
    t.mutation(api.mutations.goals.update.update, {
      goal: { content: "毎日机に向かう", dailyFloorMinutes: 45, daysPerWeek: 5, type: "pace" },
      goalId: paceId,
      weekStartJst: LAST_MONDAY,
    }),
  ).rejects.toThrow();
  expect(await weeklyGoalFor(t, MONDAY)).toEqual({ dailyFloorMinutes: 30, days: 4 });
});

test("週の指定が日付形式でなければ拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.saveWeekly.saveWeekly, {
      dailyFloorMinutes: 20,
      days: 2,
      weekStartJst: "2026/08/17",
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.ensureWeekSnapshot.ensureWeekSnapshot, {
      weekStartJst: "いつか",
    }),
  ).rejects.toThrow();
  await expect(
    t.query(api.queries.goals.weeklyTrend.weeklyTrend, { todayJst: "2026-02-31" }),
  ).rejects.toThrow();
});

test("weeklyTrend: ペース目標もスナップショットも無ければ goalDays は null", async () => {
  const t = owner();
  const trend = await t.query(api.queries.goals.weeklyTrend.weeklyTrend, { todayJst: MONDAY });
  expect(trend).toHaveLength(12);
  for (const week of trend) {
    expect(week.goalDays).toBeNull();
    expect(week.dailyFloorMinutes).toBeNull();
    expect(week.qualifyingDays).toBe(0);
    expect(week.achieved).toBe(false);
    expect(week.volumeMinutes).toBe(0);
  }
});

test("weeklyTrend: スナップショットの無い週はペース目標から導出する(未訪問で判定を落とさない)", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "毎日机に向かう", dailyFloorMinutes: 30, daysPerWeek: 3, type: "pace" },
    weekStartJst: MONDAY,
  });
  //? 先週はアプリを開いていないのでスナップショットが無い。実績だけがある状態。
  await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "TOEIC対策",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    const itemId = await ctx.db.insert("items", {
      categoryId,
      name: "金のフレーズ",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    for (const dateJst of ["2026-08-10", "2026-08-11", "2026-08-12"]) {
      const dayId = await ctx.db.insert("days", { dateJst, ownerId: OWNER.subject });
      await ctx.db.insert("rows", {
        content: "Unit 1 を音読する",
        dateJst,
        dayId,
        itemId,
        minutes: 60,
        ownerId: OWNER.subject,
        sortOrder: 0,
        status: "確定",
      });
    }
  });
  const trend = await t.query(api.queries.goals.weeklyTrend.weeklyTrend, { todayJst: MONDAY });
  expect(trend.find((week) => week.weekStart === LAST_MONDAY)).toEqual({
    achieved: true,
    dailyFloorMinutes: 30,
    goalDays: 3,
    qualifyingDays: 3,
    volumeMinutes: 180,
    weekEnd: "2026-08-16",
    weekStart: LAST_MONDAY,
  });
  //? 実績の無い週も判定対象(未達)として残る。null で打ち切らないのでストリークが読める。
  expect(trend.find((week) => week.weekStart === "2026-08-03")).toEqual({
    achieved: false,
    dailyFloorMinutes: 30,
    goalDays: 3,
    qualifyingDays: 0,
    volumeMinutes: 0,
    weekEnd: "2026-08-09",
    weekStart: "2026-08-03",
  });
});

test("weeklyTrend: 保存済みスナップショットはペース目標より優先される", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "毎日机に向かう", dailyFloorMinutes: 30, daysPerWeek: 5, type: "pace" },
    weekStartJst: MONDAY,
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("weeklyGoals", {
      dailyFloorMinutes: 10,
      days: 1,
      ownerId: OWNER.subject,
      weekStartJst: LAST_MONDAY,
    });
  });
  const trend = await t.query(api.queries.goals.weeklyTrend.weeklyTrend, { todayJst: MONDAY });
  const lastWeek = trend.find((week) => week.weekStart === LAST_MONDAY);
  expect(lastWeek?.goalDays).toBe(1);
  expect(lastWeek?.dailyFloorMinutes).toBe(10);
});

test("weeklyTrend: 1日に集中した実績は実施日1日で未達", async () => {
  const t = owner();
  const lastWeekStart = "2026-08-10";
  await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "TOEIC対策",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    const itemId = await ctx.db.insert("items", {
      categoryId,
      name: "金のフレーズ",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    await ctx.db.insert("weeklyGoals", {
      dailyFloorMinutes: 30,
      days: 3,
      ownerId: OWNER.subject,
      weekStartJst: lastWeekStart,
    });
    //? 300分を1日に固めても実施日は1日 → 未達。
    for (const [dateJst, minutes] of [
      ["2026-08-10", 300],
      ["2026-08-11", 20],
    ] as const) {
      const dayId = await ctx.db.insert("days", { dateJst, ownerId: OWNER.subject });
      await ctx.db.insert("rows", {
        content: "Unit 1 を音読する",
        dateJst,
        dayId,
        itemId,
        minutes,
        ownerId: OWNER.subject,
        sortOrder: 0,
        status: "確定",
      });
    }
  });
  const trend = await t.query(api.queries.goals.weeklyTrend.weeklyTrend, { todayJst: MONDAY });
  const lastWeek = trend.find((week) => week.weekStart === lastWeekStart);
  expect(lastWeek).toEqual({
    achieved: false,
    dailyFloorMinutes: 30,
    goalDays: 3,
    qualifyingDays: 1,
    volumeMinutes: 320,
    weekEnd: "2026-08-16",
    weekStart: lastWeekStart,
  });
});

test("weeklyTrend: フロアを満たす実施日が目標日数以上なら達成", async () => {
  const t = owner();
  const lastWeekStart = "2026-08-10";
  const weekdayDates = ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"];
  await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "TOEIC対策",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    const itemId = await ctx.db.insert("items", {
      categoryId,
      name: "金のフレーズ",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    await ctx.db.insert("weeklyGoals", {
      dailyFloorMinutes: 30,
      days: 3,
      ownerId: OWNER.subject,
      weekStartJst: lastWeekStart,
    });
    for (const dateJst of weekdayDates) {
      const dayId = await ctx.db.insert("days", { dateJst, ownerId: OWNER.subject });
      await ctx.db.insert("rows", {
        content: "Unit 1 を音読する",
        dateJst,
        dayId,
        itemId,
        minutes: 60,
        ownerId: OWNER.subject,
        sortOrder: 0,
        status: "確定",
      });
    }
  });
  const trend = await t.query(api.queries.goals.weeklyTrend.weeklyTrend, { todayJst: MONDAY });
  const lastWeek = trend.find((week) => week.weekStart === lastWeekStart);
  expect(lastWeek).toEqual({
    achieved: true,
    dailyFloorMinutes: 30,
    goalDays: 3,
    qualifyingDays: 5,
    volumeMinutes: 300,
    weekEnd: "2026-08-16",
    weekStart: lastWeekStart,
  });
});
