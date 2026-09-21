import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { convexModules } from "../src/test-utils/convex-modules";
import { api } from "./_generated/api";
import schema from "./schema";

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const MONDAY = "2026-08-17";
const FUTURE = "2026-08-20";
const WINDOW = { cursor: null, numItems: 50 };

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${MONDAY}T12:00:00+09:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

function owner() {
  return convexTest(schema, convexModules).withIdentity(OWNER);
}

async function readingItem(t: ReturnType<typeof owner>) {
  const categoryId = await t.mutation(api.mutations.categories.create.create, { name: "英語" });
  return await t.mutation(api.mutations.items.create.create, {
    categoryId,
    name: "多読",
  });
}

async function countLive(t: ReturnType<typeof owner>) {
  return await t.run(async (ctx) => {
    const days = await ctx.db.query("days").collect();
    const rows = await ctx.db.query("rows").collect();
    return {
      days: days.filter((day) => day.deletedAt === undefined).length,
      rows: rows.filter((row) => row.deletedAt === undefined).length,
    };
  });
}

async function listDay(t: ReturnType<typeof owner>, dateJst: string) {
  return await t.query(api.queries.planEvents.listWindow.listWindow, {
    anchorDateJst: dateJst,
    paginationOpts: WINDOW,
    view: "day",
  });
}

async function liveRows(t: ReturnType<typeof owner>) {
  return await t.run(async (ctx) => {
    const rows = await ctx.db.query("rows").collect();
    return rows
      .filter((row) => row.deletedAt === undefined)
      .toSorted((left, right) => left.sortOrder - right.sortOrder);
  });
}

test("計画プリセットは項目なし行も保存し、忘れたとき指定は1つだけ", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  const morningId = await t.mutation(api.mutations.planTemplates.save.save, {
    events: [
      {
        endTime: "07:50",
        itemId,
        priority: "high",
        startTime: "07:00",
        title: "朝の多読",
      },
      {
        endTime: "21:00",
        priority: "low",
        startTime: "20:00",
        title: "X を見る",
      },
    ],
    name: "平日の型",
  });
  const eveningId = await t.mutation(api.mutations.planTemplates.save.save, {
    events: [
      {
        endTime: "21:30",
        priority: "medium",
        startTime: "21:00",
        title: "寝る前",
      },
    ],
    name: "夜だけ",
  });
  await t.mutation(api.mutations.planTemplates.setForgottenTemplate.setForgottenTemplate, {
    templateId: morningId,
  });
  await t.mutation(api.mutations.planTemplates.setForgottenTemplate.setForgottenTemplate, {
    templateId: eveningId,
  });
  const listed = await t.query(api.queries.planTemplates.list.list, {});
  expect(listed).toHaveLength(2);
  const morning = listed.find((template) => template._id === morningId);
  const evening = listed.find((template) => template._id === eveningId);
  expect(morning?.forgotten).toBe(false);
  expect(evening?.forgotten).toBe(true);
  expect(morning?.events.map((event) => event.title)).toEqual(["朝の多読", "X を見る"]);
  expect(morning?.events[1]?.itemId).toBeUndefined();
});

test("忘れたとき未設定なら今日を開いても予定を生やさない", async () => {
  const t = owner();
  await t.mutation(api.mutations.planTemplates.save.save, {
    events: [
      {
        endTime: "08:00",
        priority: "high",
        startTime: "07:00",
        title: "朝の多読",
      },
    ],
    name: "平日の型",
  });
  expect(
    await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY }),
  ).toEqual({ applied: false });
  expect((await listDay(t, MONDAY)).page).toEqual([]);
  expect(await countLive(t)).toEqual({ days: 0, rows: 0 });
});

test("今日を開いて予定0件なら既定雛形を展開し、項目つきだけ記録になる", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  const templateId = await t.mutation(api.mutations.planTemplates.save.save, {
    events: [
      {
        endTime: "07:50",
        itemId,
        priority: "high",
        startTime: "07:00",
        title: "朝の多読",
      },
      {
        endTime: "21:00",
        priority: "low",
        startTime: "20:00",
        title: "X を見る",
      },
    ],
    name: "平日の型",
  });
  await t.mutation(api.mutations.planTemplates.setForgottenTemplate.setForgottenTemplate, {
    templateId,
  });
  expect(
    await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY }),
  ).toEqual({ applied: true });
  const listed = await listDay(t, MONDAY);
  expect(listed.page.map((event) => event.title)).toEqual(["朝の多読", "X を見る"]);
  expect(listed.page[0]?.recordState).toEqual({ kind: "materialized", status: "未着手" });
  expect(listed.page[1]?.recordState).toEqual({ kind: "not-applicable" });
  expect(await countLive(t)).toEqual({ days: 1, rows: 1 });
  expect(
    await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY }),
  ).toEqual({ applied: false });
  expect((await listDay(t, MONDAY)).page).toHaveLength(2);
  expect(await countLive(t)).toEqual({ days: 1, rows: 1 });
});

test("すでに予定がある日へは雛形を適用しない", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  const templateId = await t.mutation(api.mutations.planTemplates.save.save, {
    events: [
      {
        endTime: "08:00",
        itemId,
        priority: "high",
        startTime: "07:00",
        title: "朝の多読",
      },
    ],
    name: "平日の型",
  });
  await t.mutation(api.mutations.planTemplates.setForgottenTemplate.setForgottenTemplate, {
    templateId,
  });
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "09:00",
    priority: "medium",
    startTime: "08:00",
    title: "先に書いた",
    todayJst: MONDAY,
  });
  expect(
    await t.mutation(api.mutations.planTemplates.applyToEmptyDate.applyToEmptyDate, {
      dateJst: MONDAY,
      templateId,
      todayJst: MONDAY,
    }),
  ).toEqual({ applied: false });
  expect((await listDay(t, MONDAY)).page.map((event) => event.title)).toEqual(["先に書いた"]);
});

test("未来の空の日に雛形を適用しても days と rows は増えない", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  const templateId = await t.mutation(api.mutations.planTemplates.save.save, {
    events: [
      {
        endTime: "08:00",
        itemId,
        priority: "high",
        startTime: "07:00",
        title: "朝の多読",
      },
    ],
    name: "平日の型",
  });
  expect(
    await t.mutation(api.mutations.planTemplates.applyToEmptyDate.applyToEmptyDate, {
      dateJst: FUTURE,
      templateId,
      todayJst: MONDAY,
    }),
  ).toEqual({ applied: true });
  expect((await listDay(t, FUTURE)).page.map((event) => event.title)).toEqual(["朝の多読"]);
  expect(await countLive(t)).toEqual({ days: 0, rows: 0 });
});

test("今日に適用すると days.open なしで項目つきだけ記録になる", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  const templateId = await t.mutation(api.mutations.planTemplates.save.save, {
    events: [
      {
        endTime: "07:50",
        itemId,
        priority: "high",
        startTime: "07:00",
        title: "",
      },
      {
        endTime: "21:00",
        priority: "low",
        startTime: "20:00",
        title: "X を見る",
      },
    ],
    name: "平日の型",
  });
  expect(
    await t.mutation(api.mutations.planTemplates.applyToEmptyDate.applyToEmptyDate, {
      dateJst: MONDAY,
      templateId,
      todayJst: MONDAY,
    }),
  ).toEqual({ applied: true });
  const listed = await listDay(t, MONDAY);
  expect(listed.page.map((event) => event.title)).toEqual(["", "X を見る"]);
  expect(listed.page[0]?.recordState).toEqual({ kind: "materialized", status: "未着手" });
  expect(listed.page[1]?.recordState).toEqual({ kind: "not-applicable" });
  expect(await countLive(t)).toEqual({ days: 1, rows: 1 });
  expect((await liveRows(t)).map((row) => row.itemId)).toEqual([itemId]);
});

test("項目なしだけの今日適用は記録を作らない", async () => {
  const t = owner();
  const templateId = await t.mutation(api.mutations.planTemplates.save.save, {
    events: [
      {
        endTime: "21:00",
        priority: "low",
        startTime: "20:00",
        title: "X を見る",
      },
    ],
    name: "予定だけ",
  });
  expect(
    await t.mutation(api.mutations.planTemplates.applyToEmptyDate.applyToEmptyDate, {
      dateJst: MONDAY,
      templateId,
      todayJst: MONDAY,
    }),
  ).toEqual({ applied: true });
  const listed = await listDay(t, MONDAY);
  expect(listed.page.map((event) => event.title)).toEqual(["X を見る"]);
  expect(listed.page[0]?.recordState).toEqual({ kind: "not-applicable" });
  expect(await countLive(t)).toEqual({ days: 0, rows: 0 });
});

test("適用を解除すると予定と記録が消え、独立した記録は残る", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  const templateId = await t.mutation(api.mutations.planTemplates.save.save, {
    events: [
      {
        endTime: "08:00",
        itemId,
        priority: "high",
        startTime: "07:00",
        title: "朝の多読",
      },
    ],
    name: "平日の型",
  });
  expect(
    await t.mutation(api.mutations.planTemplates.applyToEmptyDate.applyToEmptyDate, {
      dateJst: MONDAY,
      templateId,
      todayJst: MONDAY,
    }),
  ).toEqual({ applied: true });
  const adhocId = await t.mutation(api.mutations.rows.add.add, {
    content: "独立した記録",
    dateJst: MONDAY,
    itemId,
    minutes: 10,
    todayJst: MONDAY,
  });
  expect(await countLive(t)).toEqual({ days: 1, rows: 2 });
  expect(
    await t.mutation(api.mutations.planTemplates.unapplyDate.unapplyDate, {
      dateJst: MONDAY,
      todayJst: MONDAY,
    }),
  ).toEqual({ cleared: true });
  expect((await listDay(t, MONDAY)).page).toEqual([]);
  expect((await liveRows(t)).map((row) => row._id)).toEqual([adhocId]);
  expect(await countLive(t)).toEqual({ days: 1, rows: 1 });
});

test("曜日プリセットがあっても今日の予定0件では行を生やさない", async () => {
  const t = owner();
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  expect(
    await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY }),
  ).toEqual({ applied: false });
  expect(await countLive(t)).toEqual({ days: 0, rows: 0 });
});
