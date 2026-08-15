import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { api, internal } from "./_generated/api";
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
const SATURDAY = "2026-08-15";
const FUTURE = "2026-08-20";

function owner() {
  process.env.ALLOWED_EMAIL = ALLOWED_EMAIL;
  return convexTest(schema, modules).withIdentity(OWNER);
}

function raw() {
  process.env.ALLOWED_EMAIL = ALLOWED_EMAIL;
  return convexTest(schema, modules);
}

test("未認証の days.open は throw する", async () => {
  const t = raw();
  await expect(t.mutation(api.days.open, { dateJst: MONDAY, todayJst: MONDAY })).rejects.toThrow();
});

test("allowlist 外の days.get は throw する", async () => {
  const t = raw().withIdentity({ email: "other@example.com", subject: "other" });
  await expect(t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY })).rejects.toThrow();
});

test("所有者なら今日を開いて未着手行が読める", async () => {
  const t = owner();
  const opened = await t.mutation(api.days.open, { dateJst: MONDAY, todayJst: MONDAY });
  expect(opened).toEqual({ applied: true });
  const day = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(day.rows.map((row) => row.itemName)).toEqual([
    "Distinction 2000",
    "英会話",
    "金のフレーズ",
    "多読",
    "英文法（解く）",
    "英文法（復習）",
    "出る文特急",
  ]);
  expect(day.rows.every((row) => row.status === "未着手")).toBe(true);
  expect(day.volumeMinutes).toBe(0);
});

test("土曜を開いても学習行は作られない", async () => {
  const t = owner();
  const opened = await t.mutation(api.days.open, { dateJst: SATURDAY, todayJst: SATURDAY });
  expect(opened).toEqual({ applied: false });
  const day = await t.query(api.days.get, { dateJst: SATURDAY, todayJst: SATURDAY });
  expect(day.rows).toEqual([]);
  expect(day.day).toBeNull();
});

test("未来の日を開けても行は作られない", async () => {
  const t = owner();
  const opened = await t.mutation(api.days.open, { dateJst: FUTURE, todayJst: SATURDAY });
  expect(opened).toEqual({ applied: false });
  const day = await t.query(api.days.get, { dateJst: FUTURE, todayJst: SATURDAY });
  expect(day.rows).toEqual([]);
  expect(day.isFuture).toBe(true);
});

test("確定とスキップで学習量が変わる。未認証は throw", async () => {
  const t = owner();
  await t.mutation(api.days.open, { dateJst: MONDAY, todayJst: MONDAY });
  const before = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  const distinction = before.rows.find((row) => row.itemName === "Distinction 2000");
  const kaiwa = before.rows.find((row) => row.itemName === "英会話");
  if (distinction === undefined || kaiwa === undefined) {
    throw new Error("シード行がない");
  }
  await t.mutation(api.rows.confirm, {
    content: "Unit 1",
    minutes: 30,
    rowId: distinction._id,
  });
  await t.mutation(api.rows.skip, { rowId: kaiwa._id });
  const after = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.volumeMinutes).toBe(30);
  expect(after.shareMarkdown).toBe("- Distinction 2000: Unit 1 30分");
  expect(after.rows.find((row) => row.itemName === "英会話")?.status).toBe("スキップ");
  await expect(
    raw().mutation(api.rows.confirm, { content: "x", minutes: 10, rowId: distinction._id }),
  ).rejects.toThrow();
});

test("今夜の就寝・起床・コンディション・メモ", async () => {
  const t = owner();
  await t.mutation(api.days.open, { dateJst: MONDAY, todayJst: MONDAY });
  await t.mutation(api.tonight.setBed, { bedHm: "21:00" });
  await t.mutation(api.days.setWake, { dateJst: MONDAY, todayJst: MONDAY, wakeHm: "05:30" });
  await t.mutation(api.days.setCondition, { condition: "普通", dateJst: MONDAY, todayJst: MONDAY });
  await t.mutation(api.days.setMemo, { dateJst: MONDAY, memo: "枕元", todayJst: MONDAY });
  const day = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(day.day?.sleepHours).toBe(8.5);
  expect(day.day?.sleepWarning).toBe(false);
  expect(day.day?.condition).toBe("普通");
  expect(day.day?.memo).toBe("枕元");
  await expect(raw().mutation(api.tonight.setBed, { bedHm: "22:00" })).rejects.toThrow();
});

test("月と週の学習量が所有者に読める", async () => {
  const t = owner();
  await t.mutation(api.days.open, { dateJst: MONDAY, todayJst: MONDAY });
  const day = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  const distinction = day.rows[0];
  if (distinction === undefined) {
    throw new Error("行がない");
  }
  await t.mutation(api.rows.confirm, { content: "Unit 1", minutes: 70, rowId: distinction._id });
  const month = await t.query(api.history.month, { todayJst: MONDAY, yearMonth: "2026-08" });
  const monday = month.days.find((entry) => entry.dateJst === MONDAY);
  expect(monday?.minutes).toBe(70);
  expect(monday?.isRest).toBe(false);
  const rest = month.days.find((entry) => entry.dateJst === SATURDAY);
  expect(rest?.isRest).toBe(true);
  expect(rest?.minutes).toBe(0);
  const week = await t.query(api.history.week, { dateJst: MONDAY });
  expect(week.volumeMinutes).toBe(70);
  expect(week.weekStart).toBe(MONDAY);
  await expect(
    raw().query(api.history.month, { todayJst: MONDAY, yearMonth: "2026-08" }),
  ).rejects.toThrow();
});

test("項目 CRUD・使用中削除失敗・プリセット切替", async () => {
  const t = owner();
  await t.mutation(api.days.open, { dateJst: MONDAY, todayJst: MONDAY });
  const items = await t.query(api.items.list, {});
  const distinction = items.find((item) => item.name === "Distinction 2000");
  if (distinction === undefined) {
    throw new Error("Distinction がない");
  }
  await expect(t.mutation(api.items.remove, { itemId: distinction._id })).rejects.toThrow();
  const extraId = await t.mutation(api.items.create, { category: "その他", name: "単語帳" });
  await t.mutation(api.items.rename, { category: "多読", itemId: extraId, name: "単語帳2" });
  await t.mutation(api.items.remove, { itemId: extraId });
  const presets = await t.query(api.presets.list, {});
  const saturday = presets.find((preset) => preset.weekday === 6);
  const day = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  const first = day.rows[0];
  if (first === undefined || saturday === undefined) {
    throw new Error("切替の材料がない");
  }
  await t.mutation(api.rows.confirm, { content: "残す", minutes: 30, rowId: first._id });
  await t.mutation(api.rows.switchPreset, {
    dateJst: MONDAY,
    presetId: saturday._id,
    todayJst: MONDAY,
  });
  const after = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.rows.some((row) => row.content === "残す" && row.status === "確定")).toBe(true);
  expect(after.rows.filter((row) => row.status === "未着手")).toEqual([]);
  await expect(raw().query(api.items.list, {})).rejects.toThrow();
});

test("その日限りの行を足せる。未来には足さない", async () => {
  const t = owner();
  await t.mutation(api.days.open, { dateJst: MONDAY, todayJst: MONDAY });
  const items = await t.query(api.items.list, {});
  const other = items.find((item) => item.name === "その他");
  if (other === undefined) {
    throw new Error("その他がない");
  }
  await t.mutation(api.rows.add, {
    content: "臨時",
    dateJst: MONDAY,
    itemId: other._id,
    minutes: 15,
    todayJst: MONDAY,
  });
  const day = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  const added = day.rows.find((row) => row.content === "臨時");
  if (added === undefined) {
    throw new Error("追加行がない");
  }
  await t.mutation(api.rows.confirm, { content: "臨時", minutes: 15, rowId: added._id });
  const after = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.volumeMinutes).toBe(15);
  await expect(
    t.mutation(api.rows.add, {
      content: "未来",
      dateJst: FUTURE,
      itemId: other._id,
      minutes: 10,
      todayJst: MONDAY,
    }),
  ).rejects.toThrow();
  await expect(
    raw().mutation(api.rows.add, {
      content: "x",
      dateJst: MONDAY,
      itemId: other._id,
      minutes: 10,
      todayJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("本番目標・週間ゴール・障害プラン。行の状態は変えない", async () => {
  const t = owner();
  await t.mutation(api.days.open, { dateJst: MONDAY, todayJst: MONDAY });
  const before = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  const exam = await t.query(api.goals.getExam, { todayJst: MONDAY });
  expect(exam).toEqual({
    daysRemaining: 41,
    examDate: "2026-09-27",
    maxScore: 850,
    minScore: 730,
  });
  await t.mutation(api.goals.saveWeekly, { minutes: 300, weekStartJst: MONDAY });
  const planId = await t.mutation(api.goals.createObstacle, {
    ifText: "眠い",
    thenText: "金フレだけ",
  });
  const after = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.rows.map((row) => row.status)).toEqual(before.rows.map((row) => row.status));
  const plans = await t.query(api.goals.listObstacles, {});
  expect(plans).toEqual([{ _id: planId, ifText: "眠い", thenText: "金フレだけ" }]);
  await t.mutation(api.goals.removeObstacle, { planId });
  expect(await t.query(api.goals.listObstacles, {})).toEqual([]);
  await expect(raw().query(api.goals.getExam, { todayJst: MONDAY })).rejects.toThrow();
});

test("行と日のゴミ箱。30日後に完全削除。未認証は throw", async () => {
  const t = owner();
  await t.mutation(api.days.open, { dateJst: MONDAY, todayJst: MONDAY });
  const day = await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined || day.day === null) {
    throw new Error("ゴミ箱の材料がない");
  }
  const now = 1_000;
  await t.mutation(api.rows.remove, { now, rowId: row._id });
  const trashed = await t.query(api.trash.list, {});
  expect(trashed.rows.some((entry) => entry.itemName === "Distinction 2000")).toBe(true);
  await t.mutation(api.rows.restore, { rowId: row._id });
  expect((await t.query(api.trash.list, {})).rows).toEqual([]);
  await t.mutation(api.trash.removeDay, { dateJst: MONDAY, now });
  const daysInTrash = await t.query(api.trash.list, {});
  expect(daysInTrash.days.some((entry) => entry.dateJst === MONDAY)).toBe(true);
  await t.mutation(api.trash.restoreDay, { dayId: day.day._id });
  await t.mutation(api.trash.removeDay, { dateJst: MONDAY, now });
  await t.mutation(internal.trash.purgeExpired, { now: now + 30 * 24 * 60 * 60 * 1000 });
  expect((await t.query(api.trash.list, {})).days).toEqual([]);
  expect((await t.query(api.days.get, { dateJst: MONDAY, todayJst: MONDAY })).day).toBeNull();
  await expect(raw().query(api.trash.list, {})).rejects.toThrow();
});

test("ゴミ箱の日には行を足さず、open も日を増やさない", async () => {
  const t = owner();
  await t.mutation(api.days.open, { dateJst: MONDAY, todayJst: MONDAY });
  const items = await t.query(api.items.list, {});
  const other = items.find((item) => item.name === "その他");
  if (other === undefined) {
    throw new Error("その他がない");
  }
  await t.mutation(api.trash.removeDay, { dateJst: MONDAY, now: 1_000 });
  await expect(
    t.mutation(api.rows.add, {
      content: "復活させない",
      dateJst: MONDAY,
      itemId: other._id,
      minutes: 10,
      todayJst: MONDAY,
    }),
  ).rejects.toThrow();
  expect(await t.mutation(api.days.open, { dateJst: MONDAY, todayJst: MONDAY })).toEqual({
    applied: false,
  });
  expect((await t.query(api.trash.list, {})).days).toHaveLength(1);
});
