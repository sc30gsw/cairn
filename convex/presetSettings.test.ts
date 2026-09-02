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
  "!./migrations.ts",
]);

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const OTHER = { email: "other@example.com", subject: "other-subject" };
const HOLIDAY_MONDAY = "2026-09-21";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${HOLIDAY_MONDAY}T12:00:00+09:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

function owner() {
  return convexTest(schema, modules).withIdentity(OWNER);
}

async function ownerWithWeekdayAndSundayPresets() {
  const t = owner();
  const categories = await t.query(api.queries.categories.list.list, {});
  let categoryId = categories[0]?._id;
  if (categoryId === undefined) {
    categoryId = await t.mutation(api.mutations.categories.create.create, { name: "TOEIC対策" });
  }
  const weekdayItem = await t.mutation(api.mutations.items.create.create, {
    categoryId,
    name: "平日の単語",
  });
  const sundayItem = await t.mutation(api.mutations.items.create.create, {
    categoryId,
    name: "日曜の多読",
  });
  await t.mutation(api.mutations.presets.create.create, {
    lines: [{ content: "", itemId: weekdayItem, minutes: 20 }],
    name: "月曜",
    weekday: 1,
  });
  await t.mutation(api.mutations.presets.create.create, {
    lines: [{ content: "", itemId: sundayItem, minutes: 30 }],
    name: "日曜",
    weekday: 0,
  });
  return t;
}

test("プリセット設定は既定で祝日を日曜扱いにしない", async () => {
  const t = owner();
  expect(await t.query(api.queries.presets.settings.settings, {})).toEqual({
    holidayAsSunday: false,
  });
});

test("設定は所有者ごとに保存され、他の所有者に漏れない", async () => {
  const t = owner();
  await t.mutation(api.mutations.presets.saveSettings.saveSettings, { holidayAsSunday: true });
  expect(await t.query(api.queries.presets.settings.settings, {})).toEqual({
    holidayAsSunday: true,
  });
  const other = convexTest(schema, modules).withIdentity(OTHER);
  expect(await other.query(api.queries.presets.settings.settings, {})).toEqual({
    holidayAsSunday: false,
  });
  await t.mutation(api.mutations.presets.saveSettings.saveSettings, { holidayAsSunday: false });
  expect(await t.query(api.queries.presets.settings.settings, {})).toEqual({
    holidayAsSunday: false,
  });
});

test("設定が有効なら、祝日の月曜に今日を開くと日曜のプリセットが並ぶ", async () => {
  const t = await ownerWithWeekdayAndSundayPresets();
  await t.mutation(api.mutations.presets.saveSettings.saveSettings, { holidayAsSunday: true });
  await t.mutation(api.mutations.days.open.open, {
    dateJst: HOLIDAY_MONDAY,
    todayJst: HOLIDAY_MONDAY,
  });
  const day = await t.query(api.queries.days.get.get, {
    dateJst: HOLIDAY_MONDAY,
    todayJst: HOLIDAY_MONDAY,
  });
  expect(day.rows.map((row) => row.itemName)).toEqual(["日曜の多読"]);
});

test("設定が無効なら、祝日の月曜でも月曜のプリセットが並ぶ", async () => {
  const t = await ownerWithWeekdayAndSundayPresets();
  await t.mutation(api.mutations.days.open.open, {
    dateJst: HOLIDAY_MONDAY,
    todayJst: HOLIDAY_MONDAY,
  });
  const day = await t.query(api.queries.days.get.get, {
    dateJst: HOLIDAY_MONDAY,
    todayJst: HOLIDAY_MONDAY,
  });
  expect(day.rows.map((row) => row.itemName)).toEqual(["平日の単語"]);
});
