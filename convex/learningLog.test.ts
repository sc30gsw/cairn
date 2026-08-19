import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

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

const CONCRETE_ACTION = "Unit 1 を音読する";
const CONCRETE_ACTION_2 = "Unit 2 を音読する";
const THEN_ACTION = "Unit 3 の例文を声に出して5文読む";
const THEN_ACTION_UPDATED = "金フレを10分だけ声に出して読む";
const ALLOWED_EMAIL = "owner@example.com";
const OWNER = { email: ALLOWED_EMAIL, subject: "owner-subject" };
const MONDAY = "2026-08-17";
const SATURDAY = "2026-08-15";
const FUTURE = "2026-08-20";

//? 週間ターゲットの集計窓は「今週」に閉じているので、現在時刻を MONDAY の週に固定する。
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${MONDAY}T12:00:00+09:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

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
  await expect(
    t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY }),
  ).rejects.toThrow();
});

test("allowlist 外の days.get は throw する", async () => {
  const t = raw().withIdentity({ email: "other@example.com", subject: "other" });
  await expect(
    t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY }),
  ).rejects.toThrow();
});

test("所有者なら今日を開いて未着手行が読める", async () => {
  const t = owner();
  const opened = await t.mutation(api.mutations.days.open.open, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  expect(opened).toEqual({ applied: true });
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
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
  const opened = await t.mutation(api.mutations.days.open.open, {
    dateJst: SATURDAY,
    todayJst: SATURDAY,
  });
  expect(opened).toEqual({ applied: false });
  const day = await t.query(api.queries.days.get.get, { dateJst: SATURDAY, todayJst: SATURDAY });
  expect(day.rows).toEqual([]);
  expect(day.day).toBeNull();
});

test("未来の日を開けても行は作られない", async () => {
  const t = owner();
  const opened = await t.mutation(api.mutations.days.open.open, {
    dateJst: FUTURE,
    todayJst: SATURDAY,
  });
  expect(opened).toEqual({ applied: false });
  const day = await t.query(api.queries.days.get.get, { dateJst: FUTURE, todayJst: SATURDAY });
  expect(day.rows).toEqual([]);
  expect(day.kind).toBe("unrecorded");
});

test("確定とスキップで学習量が変わる。未認証は throw", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const before = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const distinction = before.rows.find((row) => row.itemName === "Distinction 2000");
  const kaiwa = before.rows.find((row) => row.itemName === "英会話");
  if (distinction === undefined || kaiwa === undefined) {
    throw new Error("シード行がない");
  }
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: CONCRETE_ACTION,
    minutes: 30,
    rowId: distinction._id,
  });
  await t.mutation(api.mutations.rows.skip.skip, { rowId: kaiwa._id });
  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.volumeMinutes).toBe(30);
  expect(after.shareMarkdown).toBe(
    ["- 多聴", `  - Distinction 2000: ${CONCRETE_ACTION} 30分`].join("\n"),
  );
  expect(after.rows.find((row) => row.itemName === "英会話")?.status).toBe("スキップ");
  await expect(
    raw().mutation(api.mutations.rows.confirm.confirm, {
      content: "x",
      minutes: 10,
      rowId: distinction._id,
    }),
  ).rejects.toThrow();
});

test("コンディションとメモ", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  await t.mutation(api.mutations.days.setCondition.setCondition, {
    condition: "普通",
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  await t.mutation(api.mutations.days.setMemo.setMemo, {
    dateJst: MONDAY,
    memo: "枕元",
    todayJst: MONDAY,
  });
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(day.day?.condition).toBe("普通");
  expect(day.day?.memo).toBe("枕元");
});

test("月と週の学習量が所有者に読める", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const distinction = day.rows[0];
  if (distinction === undefined) {
    throw new Error("行がない");
  }
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: CONCRETE_ACTION,
    minutes: 70,
    rowId: distinction._id,
  });
  const month = await t.query(api.queries.history.month.month, {
    todayJst: MONDAY,
    yearMonth: "2026-08",
  });
  const monday = month.days.find((entry) => entry.dateJst === MONDAY);
  expect(monday?.minutes).toBe(70);
  expect(monday?.isRest).toBe(false);
  const rest = month.days.find((entry) => entry.dateJst === SATURDAY);
  expect(rest?.isRest).toBe(true);
  expect(rest?.minutes).toBe(0);
  const week = await t.query(api.queries.history.week.week, { dateJst: MONDAY, todayJst: MONDAY });
  expect(week.volumeMinutes).toBe(70);
  expect(week.weekStart).toBe(MONDAY);
  await expect(
    raw().query(api.queries.history.month.month, { todayJst: MONDAY, yearMonth: "2026-08" }),
  ).rejects.toThrow();
});

test("項目 CRUD・使用中削除失敗・プリセット切替", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const items = await t.query(api.queries.items.list.list, {});
  const distinction = items.find((item) => item.name === "Distinction 2000");
  if (distinction === undefined) {
    throw new Error("Distinction がない");
  }
  await expect(
    t.mutation(api.mutations.items.remove.remove, { itemId: distinction._id }),
  ).rejects.toThrow();
  const categories = await t.query(api.queries.categories.list.list, {});
  const otherCategory = categories.find((category) => category.name === "その他");
  const readingCategory = categories.find((category) => category.name === "多読");
  if (otherCategory === undefined || readingCategory === undefined) {
    throw new Error("カテゴリがない");
  }
  const extraId = await t.mutation(api.mutations.items.create.create, {
    categoryId: otherCategory._id,
    name: "単語帳",
  });
  await t.mutation(api.mutations.items.rename.rename, {
    categoryId: readingCategory._id,
    itemId: extraId,
    name: "単語帳2",
  });
  await t.mutation(api.mutations.items.remove.remove, { itemId: extraId });
  const presets = await t.query(api.queries.presets.list.list, {});
  const saturday = presets.find((preset) => preset.weekday === 6);
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const first = day.rows[0];
  if (first === undefined || saturday === undefined) {
    throw new Error("切替の材料がない");
  }
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "確定した行を残す手順",
    minutes: 30,
    rowId: first._id,
  });
  await t.mutation(api.mutations.rows.switchPreset.switchPreset, {
    dateJst: MONDAY,
    presetId: saturday._id,
    todayJst: MONDAY,
  });
  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(
    after.rows.some((row) => row.content === "確定した行を残す手順" && row.status === "確定"),
  ).toBe(true);
  expect(after.rows.filter((row) => row.status === "未着手")).toEqual([]);
  await expect(raw().query(api.queries.items.list.list, {})).rejects.toThrow();
});

test("カテゴリ CRUD・項目が残っていると削除失敗", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const categories = await t.query(api.queries.categories.list.list, {});
  expect(categories.map((category) => category.name)).toEqual([
    "TOEIC対策",
    "多聴",
    "多読",
    "英会話",
    "その他",
  ]);
  const listening = categories.find((category) => category.name === "多聴");
  if (listening === undefined) {
    throw new Error("多聴がない");
  }
  await expect(
    t.mutation(api.mutations.categories.remove.remove, { categoryId: listening._id }),
  ).rejects.toThrow();
  const extraId = await t.mutation(api.mutations.categories.create.create, { name: "単語" });
  await t.mutation(api.mutations.categories.rename.rename, { categoryId: extraId, name: "語彙" });
  const afterRename = await t.query(api.queries.categories.list.list, {});
  expect(afterRename.some((category) => category.name === "語彙")).toBe(true);
  await t.mutation(api.mutations.categories.remove.remove, { categoryId: extraId });
  const afterRemove = await t.query(api.queries.categories.list.list, {});
  expect(afterRemove.some((category) => category.name === "語彙")).toBe(false);
});

test("その日限りの行を足せる。未来には足さない", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const items = await t.query(api.queries.items.list.list, {});
  const other = items.find((item) => item.name === "その他");
  if (other === undefined) {
    throw new Error("その他がない");
  }
  await t.mutation(api.mutations.rows.add.add, {
    content: "臨時で追加した学習手順",
    dateJst: MONDAY,
    itemId: other._id,
    minutes: 15,
    todayJst: MONDAY,
  });
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const added = day.rows.find((row) => row.content === "臨時で追加した学習手順");
  if (added === undefined) {
    throw new Error("追加行がない");
  }
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "臨時で追加した学習手順",
    minutes: 15,
    rowId: added._id,
  });
  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.volumeMinutes).toBe(15);
  await expect(
    t.mutation(api.mutations.rows.add.add, {
      content: "未来",
      dateJst: FUTURE,
      itemId: other._id,
      minutes: 10,
      todayJst: MONDAY,
    }),
  ).rejects.toThrow();
  await expect(
    raw().mutation(api.mutations.rows.add.add, {
      content: "x",
      dateJst: MONDAY,
      itemId: other._id,
      minutes: 10,
      todayJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("目標・障害プラン。行の状態は変えない", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const before = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(await t.query(api.queries.goals.list.list, {})).toEqual([]);
  //? 目標は記録と独立。作っても行の状態には波及しない
  await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "音読を止まらずにできる",
      criterion: "1分間で120語",
      type: "mastery",
    },
  });
  const planId = await t.mutation(api.mutations.goals.createObstacle.createObstacle, {
    ifText: "眠い",
    thenText: THEN_ACTION,
  });
  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.rows.map((row) => row.status)).toEqual(before.rows.map((row) => row.status));
  const plans = await t.query(api.queries.goals.listObstacles.listObstacles, {});
  expect(plans).toEqual([{ _id: planId, ifText: "眠い", thenText: THEN_ACTION }]);
  await t.mutation(api.mutations.goals.removeObstacle.removeObstacle, { planId });
  expect(await t.query(api.queries.goals.listObstacles.listObstacles, {})).toEqual([]);
  await expect(raw().query(api.queries.goals.list.list, {})).rejects.toThrow();
});

test("行と日のゴミ箱。30日後に完全削除。未認証は throw", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined || day.day === null) {
    throw new Error("ゴミ箱の材料がない");
  }
  const purgeAfter = (deletedAt: number) => deletedAt + 30 * 24 * 60 * 60 * 1000;
  await t.mutation(api.mutations.rows.remove.remove, { rowId: row._id });
  const trashed = await t.query(api.queries.trash.list.list, {});
  expect(trashed.rows.some((entry) => entry.itemName === "Distinction 2000")).toBe(true);
  expect(trashed.rows[0]?.minutes).toBe(row.minutes);
  await t.mutation(api.mutations.rows.restore.restore, { rowId: row._id });
  expect((await t.query(api.queries.trash.list.list, {})).rows).toEqual([]);
  await t.mutation(api.mutations.rows.remove.remove, { rowId: row._id });
  await t.mutation(api.mutations.trash.purgeRow.purgeRow, { rowId: row._id });
  expect((await t.query(api.queries.trash.list.list, {})).rows).toEqual([]);
  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: MONDAY });
  const daysInTrash = await t.query(api.queries.trash.list.list, {});
  expect(daysInTrash.days.some((entry) => entry.dateJst === MONDAY)).toBe(true);
  await t.mutation(api.mutations.trash.restoreDay.restoreDay, { dayId: day.day._id });
  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: MONDAY });
  await t.mutation(api.mutations.trash.purgeDay.purgeDay, { dayId: day.day._id });
  expect((await t.query(api.queries.trash.list.list, {})).days).toEqual([]);
  expect(
    (await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY })).day,
  ).toBeNull();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const reopened = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  if (reopened.day === null) {
    throw new Error("日の再作成に失敗");
  }
  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: MONDAY });
  const trashedDay = (await t.query(api.queries.trash.list.list, {})).days.find(
    (entry) => entry.dateJst === MONDAY,
  );
  if (trashedDay === undefined) {
    throw new Error("ゴミ箱の日がない");
  }
  await t.mutation(internal.mutations.trash.purgeExpired.purgeExpired, {
    now: purgeAfter(trashedDay.deletedAt),
  });
  expect((await t.query(api.queries.trash.list.list, {})).days).toEqual([]);
  expect(
    (await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY })).day,
  ).toBeNull();
  await expect(raw().query(api.queries.trash.list.list, {})).rejects.toThrow();
});

test("空のメモだけでは日を作らない。土日でも今日のプリセット切替は日を作る", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: SATURDAY, todayJst: SATURDAY });
  await t.mutation(api.mutations.days.setMemo.setMemo, {
    dateJst: SATURDAY,
    memo: "",
    todayJst: SATURDAY,
  });
  expect(
    (await t.query(api.queries.days.get.get, { dateJst: SATURDAY, todayJst: SATURDAY })).day,
  ).toBeNull();
  const presets = await t.query(api.queries.presets.list.list, {});
  const monday = presets.find((preset) => preset.weekday === 1);
  if (monday === undefined) {
    throw new Error("月曜日のプリセットがない");
  }
  await t.mutation(api.mutations.rows.switchPreset.switchPreset, {
    dateJst: SATURDAY,
    presetId: monday._id,
    todayJst: SATURDAY,
  });
  const switched = await t.query(api.queries.days.get.get, {
    dateJst: SATURDAY,
    todayJst: SATURDAY,
  });
  expect(switched.rows.map((row) => row.itemName)[0]).toBe("Distinction 2000");
});

test("ゴミ箱の日には行を足さず、open も日を増やさない", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const items = await t.query(api.queries.items.list.list, {});
  const other = items.find((item) => item.name === "その他");
  if (other === undefined) {
    throw new Error("その他がない");
  }
  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: MONDAY });
  await expect(
    t.mutation(api.mutations.rows.add.add, {
      content: "復活させない",
      dateJst: MONDAY,
      itemId: other._id,
      minutes: 10,
      todayJst: MONDAY,
    }),
  ).rejects.toThrow();
  expect(
    await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY }),
  ).toEqual({
    applied: false,
  });
  expect((await t.query(api.queries.trash.list.list, {})).days).toHaveLength(1);
});

test("コンディションだけの日を開くとプリセット行が載る", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.setCondition.setCondition, {
    condition: "普通",
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  const before = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(before.rows).toEqual([]);
  expect(before.day?.condition).toBe("普通");
  expect(
    await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY }),
  ).toEqual({
    applied: true,
  });
  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.rows.map((row) => row.itemName)[0]).toBe("Distinction 2000");
  expect(after.day?.condition).toBe("普通");
});

test("プリセット雛形だけの項目は消せない", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: SATURDAY, todayJst: SATURDAY });
  const items = await t.query(api.queries.items.list.list, {});
  const distinction = items.find((item) => item.name === "Distinction 2000");
  if (distinction === undefined) {
    throw new Error("Distinction がない");
  }
  await expect(
    t.mutation(api.mutations.items.remove.remove, { itemId: distinction._id }),
  ).rejects.toThrow();
});

test("分析クエリと年ヒートマップが学習量を返す", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const distinction = day.rows.find((row) => row.itemName === "Distinction 2000");
  const kaiwa = day.rows.find((row) => row.itemName === "英会話");
  if (distinction === undefined || kaiwa === undefined) {
    throw new Error("シード行がない");
  }
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: CONCRETE_ACTION,
    minutes: 45,
    rowId: distinction._id,
  });
  await t.mutation(api.mutations.rows.skip.skip, { rowId: kaiwa._id });
  const dayBreakdown = await t.query(api.queries.history.dayBreakdown.dayBreakdown, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  expect(dayBreakdown.confirmedMinutes).toBe(45);
  expect(dayBreakdown.skippedMinutes).toBeGreaterThan(0);
  expect(dayBreakdown.rows).toEqual([
    expect.objectContaining({
      itemName: "Distinction 2000",
      minutes: 45,
      status: "確定",
    }),
  ]);
  expect(dayBreakdown.rows.every((row) => row.status === "確定")).toBe(true);
  const weekBreakdown = await t.query(api.queries.history.weekBreakdown.weekBreakdown, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  expect(weekBreakdown.volumeMinutes).toBe(45);
  expect(weekBreakdown.rows.every((row) => row.status === "確定")).toBe(true);
  const monthBreakdown = await t.query(api.queries.history.monthBreakdown.monthBreakdown, {
    todayJst: MONDAY,
    yearMonth: "2026-08",
  });
  expect(monthBreakdown.confirmedMinutes).toBe(45);
  expect(monthBreakdown.rows.every((row) => row.status === "確定")).toBe(true);
  const heatmap = await t.query(api.queries.history.yearHeatmap.yearHeatmap, {
    todayJst: MONDAY,
  });
  const mondayHeat = heatmap.days.find((entry) => entry.dateJst === MONDAY);
  expect(mondayHeat?.minutes).toBe(45);
});

test("分析内訳は同一項目の確定を合算し、未着手を載せない", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const distinction = day.rows.find((row) => row.itemName === "Distinction 2000");
  if (distinction === undefined) {
    throw new Error("Distinction がない");
  }
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: CONCRETE_ACTION,
    minutes: 30,
    rowId: distinction._id,
  });
  await t.mutation(api.mutations.rows.add.add, {
    content: CONCRETE_ACTION_2,
    dateJst: MONDAY,
    itemId: distinction.itemId,
    minutes: 15,
    todayJst: MONDAY,
  });
  const afterAdd = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const second = afterAdd.rows.find((row) => row.content === CONCRETE_ACTION_2);
  if (second === undefined) {
    throw new Error("追加の Distinction 行がない");
  }
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: CONCRETE_ACTION_2,
    minutes: 15,
    rowId: second._id,
  });

  const dayBreakdown = await t.query(api.queries.history.dayBreakdown.dayBreakdown, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  expect(dayBreakdown.confirmedMinutes).toBe(45);
  expect(dayBreakdown.rows).toEqual([
    expect.objectContaining({
      itemName: "Distinction 2000",
      minutes: 45,
      status: "確定",
    }),
  ]);
  expect(dayBreakdown.rows).toHaveLength(1);

  const weekBreakdown = await t.query(api.queries.history.weekBreakdown.weekBreakdown, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  expect(weekBreakdown.rows).toEqual([
    expect.objectContaining({ itemName: "Distinction 2000", minutes: 45 }),
  ]);

  const monthBreakdown = await t.query(api.queries.history.monthBreakdown.monthBreakdown, {
    todayJst: MONDAY,
    yearMonth: "2026-08",
  });
  expect(monthBreakdown.rows).toEqual([
    expect.objectContaining({ itemName: "Distinction 2000", minutes: 45 }),
  ]);
});

test("プリセット CRUD と曜日重複は失敗", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const items = await t.query(api.queries.items.list.list, {});
  const distinction = items.find((item) => item.name === "Distinction 2000");
  if (distinction === undefined || distinction.categoryId === undefined) {
    throw new Error("Distinction がない");
  }
  await expect(
    t.mutation(api.mutations.presets.create.create, {
      lines: [{ content: "x", itemId: distinction._id, minutes: 10 }],
      name: "重複月曜",
      weekday: 1,
    }),
  ).rejects.toThrow();
  const seededSunday = (await t.query(api.queries.presets.list.list, {})).find(
    (preset) => preset.weekday === 0,
  );
  if (seededSunday === undefined) {
    throw new Error("日曜プリセットがない");
  }
  await t.mutation(api.mutations.presets.remove.remove, { presetId: seededSunday._id });
  const presetId = await t.mutation(api.mutations.presets.create.create, {
    lines: [{ content: "日曜日のTrackを1周聞く", itemId: distinction._id, minutes: 20 }],
    name: "日曜",
    weekday: 0,
  });
  await t.mutation(api.mutations.presets.update.update, {
    lines: [{ content: "日曜日のTrackを2周聞く", itemId: distinction._id, minutes: 25 }],
    name: "日曜改",
    presetId,
    weekday: 0,
  });
  const presets = await t.query(api.queries.presets.list.list, {});
  const sunday = presets.find((preset) => preset._id === presetId);
  expect(sunday?.name).toBe("日曜改");
  expect(sunday?.lines[0]?.content).toBe("日曜日のTrackを2周聞く");
  await t.mutation(api.mutations.presets.remove.remove, { presetId });
  expect((await t.query(api.queries.presets.list.list, {})).some((p) => p._id === presetId)).toBe(
    false,
  );
});

test("applyOrder で項目順とカテゴリを更新", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const items = await t.query(api.queries.items.list.list, {});
  const categories = await t.query(api.queries.categories.list.list, {});
  const toeic = categories.find((category) => category.name === "TOEIC対策");
  const reading = categories.find((category) => category.name === "多読");
  if (toeic === undefined || reading === undefined) {
    throw new Error("カテゴリがない");
  }
  const toeicItems = items.filter((item) => item.categoryId === toeic._id);
  if (toeicItems.length < 2) {
    throw new Error("TOEIC 項目が足りない");
  }
  const reordered = [...toeicItems].reverse();
  await t.mutation(api.mutations.items.applyOrder.applyOrder, {
    updates: [{ categoryId: toeic._id, orderedItemIds: reordered.map((item) => item._id) }],
  });
  const after = await t.query(api.queries.items.list.list, {});
  const afterToeic = after.filter((item) => item.categoryId === toeic._id);
  expect(afterToeic.map((item) => item._id)).toEqual(reordered.map((item) => item._id));
  await expect(
    t.mutation(api.mutations.items.applyOrder.applyOrder, {
      updates: [
        { categoryId: toeic._id, orderedItemIds: reordered.slice(1).map((item) => item._id) },
      ],
    }),
  ).rejects.toThrow();
  const moved = afterToeic[0];
  if (moved === undefined) {
    throw new Error("移動元がない");
  }
  const readingItems = after.filter((item) => item.categoryId === reading._id);
  await t.mutation(api.mutations.items.applyOrder.applyOrder, {
    updates: [
      { categoryId: toeic._id, orderedItemIds: afterToeic.slice(1).map((item) => item._id) },
      {
        categoryId: reading._id,
        orderedItemIds: [...readingItems.map((item) => item._id), moved._id],
      },
    ],
  });
  const movedAfter = await t.query(api.queries.items.list.list, {});
  expect(movedAfter.find((item) => item._id === moved._id)?.categoryId).toBe(reading._id);
});

test("試験目標の保存と障害プラン更新", async () => {
  const t = owner();
  const goalId = await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "本番までに公式問題集を1冊やり切る",
      examDate: "2026-10-01",
      maxScore: 900,
      minScore: 800,
      type: "exam",
    },
  });
  expect(await t.query(api.queries.goals.list.list, {})).toEqual([
    {
      _id: goalId,
      content: "本番までに公式問題集を1冊やり切る",
      examDate: "2026-10-01",
      maxScore: 900,
      minScore: 800,
      type: "exam",
    },
  ]);
  const planId = await t.mutation(api.mutations.goals.createObstacle.createObstacle, {
    ifText: "眠い",
    thenText: THEN_ACTION,
  });
  await t.mutation(api.mutations.goals.updateObstacle.updateObstacle, {
    ifText: "眠い朝",
    planId,
    thenText: THEN_ACTION_UPDATED,
  });
  const plans = await t.query(api.queries.goals.listObstacles.listObstacles, {});
  expect(plans).toEqual([{ _id: planId, ifText: "眠い朝", thenText: THEN_ACTION_UPDATED }]);
  await expect(
    t.mutation(api.mutations.goals.createObstacle.createObstacle, { ifText: " ", thenText: "x" }),
  ).rejects.toThrow();
});

test("空の過去を open しても日もプリセットも作らない", async () => {
  const t = owner();
  const opened = await t.mutation(api.mutations.days.open.open, {
    dateJst: SATURDAY,
    todayJst: MONDAY,
  });
  expect(opened).toEqual({ applied: false });
  const day = await t.query(api.queries.days.get.get, { dateJst: SATURDAY, todayJst: MONDAY });
  expect(day.day).toBeNull();
  expect(day.rows).toEqual([]);
  expect(day.canCopyYesterday).toBe(false);
});

test("過去の日でもプリセットを切り替えられる。未来は切り替えられない", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: SATURDAY, todayJst: SATURDAY });
  const presets = await t.query(api.queries.presets.list.list, {});
  const mondayPreset = presets.find((preset) => preset.weekday === 1);
  if (mondayPreset === undefined) {
    throw new Error("月曜日のプリセットがない");
  }
  await t.mutation(api.mutations.rows.switchPreset.switchPreset, {
    dateJst: SATURDAY,
    presetId: mondayPreset._id,
    todayJst: MONDAY,
  });
  const switched = await t.query(api.queries.days.get.get, {
    dateJst: SATURDAY,
    todayJst: MONDAY,
  });
  expect(switched.rows.map((row) => row.itemName)[0]).toBe("Distinction 2000");
  await expect(
    t.mutation(api.mutations.rows.switchPreset.switchPreset, {
      dateJst: FUTURE,
      presetId: mondayPreset._id,
      todayJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("昨日の確定だけを未着手として足し、空の過去に日を作る", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: SATURDAY, todayJst: SATURDAY });
  const items = await t.query(api.queries.items.list.list, {});
  const other = items.find((item) => item.name === "その他");
  if (other === undefined) {
    throw new Error("その他がない");
  }
  const addedId = await t.mutation(api.mutations.rows.add.add, {
    content: "土曜に確定した手順",
    dateJst: SATURDAY,
    itemId: other._id,
    minutes: 20,
    todayJst: SATURDAY,
  });
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "土曜に確定した手順",
    minutes: 20,
    rowId: addedId,
  });
  const sunday = "2026-08-16";
  const copied = await t.mutation(
    api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed,
    {
      dateJst: sunday,
      todayJst: MONDAY,
    },
  );
  expect(copied).toBe(1);
  const sundayPage = await t.query(api.queries.days.get.get, {
    dateJst: sunday,
    todayJst: MONDAY,
  });
  expect(sundayPage.day).not.toBeNull();
  expect(sundayPage.canCopyYesterday).toBe(true);
  expect(sundayPage.rows).toEqual([
    expect.objectContaining({
      content: "土曜に確定した手順",
      minutes: 20,
      status: "未着手",
    }),
  ]);
  const copiedAgain = await t.mutation(
    api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed,
    {
      dateJst: sunday,
      todayJst: MONDAY,
    },
  );
  expect(copiedAgain).toBe(1);
  expect(
    (await t.query(api.queries.days.get.get, { dateJst: sunday, todayJst: MONDAY })).rows,
  ).toHaveLength(2);
  await expect(
    t.mutation(api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed, {
      dateJst: FUTURE,
      todayJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("今月の未来のマスは休養ではない", async () => {
  const t = owner();
  const month = await t.query(api.queries.history.month.month, {
    todayJst: MONDAY,
    yearMonth: "2026-08",
  });
  expect(month.days.find((entry) => entry.dateJst === FUTURE)?.isRest).toBe(false);
  expect(month.days.find((entry) => entry.dateJst === SATURDAY)?.isRest).toBe(true);
  const weekBreakdown = await t.query(api.queries.history.weekBreakdown.weekBreakdown, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  expect(weekBreakdown.byDay.find((entry) => entry.dateJst === FUTURE)?.isRest).toBe(false);
});

test("昨日に日が無いコピーは0件", async () => {
  const t = owner();
  const copied = await t.mutation(
    api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed,
    {
      dateJst: SATURDAY,
      todayJst: MONDAY,
    },
  );
  expect(copied).toBe(0);
});

test("昨日に確定が無いコピーは0件", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: SATURDAY, todayJst: SATURDAY });
  const copied = await t.mutation(
    api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed,
    {
      dateJst: "2026-08-16",
      todayJst: MONDAY,
    },
  );
  expect(copied).toBe(0);
});

test("他人のプリセットでは切り替えられない", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const otherPresetId = await t.run(async (ctx) => {
    return await ctx.db.insert("presets", {
      lines: [],
      name: "他人",
      ownerId: "other-subject",
      weekday: 9,
    });
  });
  await expect(
    t.mutation(api.mutations.rows.switchPreset.switchPreset, {
      dateJst: SATURDAY,
      presetId: otherPresetId,
      todayJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("空の雛形でも休養の日を作れる", async () => {
  const t = owner();
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const emptyPresetId = await t.run(async (ctx) => {
    return await ctx.db.insert("presets", {
      lines: [],
      name: "空",
      ownerId: OWNER.subject,
      weekday: 8,
    });
  });
  await t.mutation(api.mutations.rows.switchPreset.switchPreset, {
    dateJst: SATURDAY,
    presetId: emptyPresetId,
    todayJst: MONDAY,
  });
  const created = await t.query(api.queries.days.get.get, {
    dateJst: SATURDAY,
    todayJst: MONDAY,
  });
  expect(created.kind).toBe("live");
  expect(created.day).not.toBeNull();
  expect(created.rows).toEqual([]);
});
