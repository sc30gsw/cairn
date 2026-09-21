import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { convexModules } from "../src/test-utils/convex-modules";
import { seedWeekdayDay } from "../src/test-utils/seed-weekday-day";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { migrateBoardScheduleEvent } from "./services/plan/migrateBoardSchedule";

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const MONDAY = "2026-08-17";
const FUTURE = "2026-08-20";
const WEEK_AHEAD_MAX = "2026-08-24";
const BEYOND_WEEK_AHEAD = "2026-08-25";
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

test("未来の予定を保存しても days と rows は増えない", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: FUTURE,
    endTime: "08:15",
    itemId,
    priority: "high",
    startTime: "07:30",
    title: "公式問題集 Part 7",
    todayJst: MONDAY,
  });
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: FUTURE,
    endTime: "21:00",
    priority: "low",
    startTime: "20:00",
    title: "X を見る",
    todayJst: MONDAY,
  });
  expect(await countLive(t)).toEqual({ days: 0, rows: 0 });
  const listed = await listDay(t, FUTURE);
  expect(listed.unplannedConfirmedMinutes).toBe(0);
  expect(listed.page.map((event) => event.title)).toEqual(["公式問題集 Part 7", "X を見る"]);
  expect(listed.page[0]?.recordState).toEqual({ kind: "awaiting-open" });
  expect(listed.page[1]?.recordState).toEqual({ kind: "not-applicable" });
});

test("項目ありならタイトル空でも保存できる", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: FUTURE,
    endTime: "08:15",
    itemId,
    priority: "high",
    startTime: "07:30",
    title: "",
    todayJst: MONDAY,
  });
  const listed = await listDay(t, FUTURE);
  expect(listed.page[0]).toEqual(
    expect.objectContaining({ itemId, title: "", startTime: "07:30", endTime: "08:15" }),
  );
});

test("項目なし予定だけを今日開いても days と rows は増えない", async () => {
  const t = owner();
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "21:00",
    priority: "low",
    startTime: "20:00",
    title: "X を見る",
    todayJst: MONDAY,
  });
  expect(
    await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY }),
  ).toEqual({ applied: false });
  expect(await countLive(t)).toEqual({ days: 0, rows: 0 });
});

test("今日+7日までの未来予定は保存でき、日は作らない", async () => {
  const t = owner();
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: WEEK_AHEAD_MAX,
    endTime: "10:00",
    priority: "medium",
    startTime: "09:00",
    title: "来週の予定",
    todayJst: MONDAY,
  });
  expect(await countLive(t)).toEqual({ days: 0, rows: 0 });
  expect((await listDay(t, WEEK_AHEAD_MAX)).page).toEqual([
    expect.objectContaining({ title: "来週の予定" }),
  ]);
});

test("今日+8日以降の予定は拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.planEvents.save.save, {
      dateJst: BEYOND_WEEK_AHEAD,
      endTime: "10:00",
      priority: "medium",
      startTime: "09:00",
      title: "遠すぎる予定",
      todayJst: MONDAY,
    }),
  ).rejects.toThrow(/7日後まで/);
});

test("未来の日は days.open できない", async () => {
  const t = owner();
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: FUTURE,
    endTime: "10:00",
    priority: "medium",
    startTime: "09:00",
    title: "未来の予定",
    todayJst: MONDAY,
  });
  expect(
    await t.mutation(api.mutations.days.open.open, { dateJst: FUTURE, todayJst: MONDAY }),
  ).toEqual({ applied: false });
  expect(await countLive(t)).toEqual({ days: 0, rows: 0 });
});

test("項目つき予定は days.open で1件だけ未着手になり、再 open で増えない", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "08:15",
    itemId,
    priority: "high",
    startTime: "07:30",
    title: "Part 7",
    todayJst: MONDAY,
  });
  expect(
    await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY }),
  ).toEqual({ applied: false });
  const first = await liveRows(t);
  expect(first).toEqual([
    expect.objectContaining({
      content: "",
      itemId,
      minutes: 0,
      status: "未着手",
    }),
  ]);
  expect(
    await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY }),
  ).toEqual({ applied: false });
  const second = await liveRows(t);
  expect(second).toHaveLength(1);
  expect(second[0]?._id).toBe(first[0]?._id);
  expect((await listDay(t, MONDAY)).page[0]?.recordState).toEqual({
    kind: "materialized",
    status: "未着手",
  });
});

test("同じ項目の2予定は2記録になり、ひとことは空、分数は0", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "08:00",
    itemId,
    priority: "high",
    startTime: "07:00",
    title: "朝の多読",
    todayJst: MONDAY,
  });
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "21:00",
    itemId,
    priority: "medium",
    startTime: "20:00",
    title: "夜の多読",
    todayJst: MONDAY,
  });
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const rows = await liveRows(t);
  expect(rows).toHaveLength(2);
  expect(rows.map((row) => row.content)).toEqual(["", ""]);
  expect(rows.map((row) => row.minutes)).toEqual([0, 0]);
  expect(rows.every((row) => row.status === "未着手")).toBe(true);
  expect(new Set(rows.map((row) => row._id)).size).toBe(2);
});

test("記録を消して再 open しても復活しない", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "08:15",
    itemId,
    priority: "high",
    startTime: "07:30",
    title: "Part 7",
    todayJst: MONDAY,
  });
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const opened = await liveRows(t);
  const rowId = opened[0]?._id;
  if (rowId === undefined) {
    throw new Error("expected a minted row");
  }
  await t.mutation(api.mutations.rows.remove.remove, { rowId });
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  expect(await liveRows(t)).toEqual([]);
  expect((await listDay(t, MONDAY)).page[0]?.recordState).toEqual({ kind: "removed" });
});

test("予定を消しても記録は残る", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  const eventId = await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "08:15",
    itemId,
    priority: "high",
    startTime: "07:30",
    title: "Part 7",
    todayJst: MONDAY,
  });
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const opened = await liveRows(t);
  expect(opened).toHaveLength(1);
  await t.mutation(api.mutations.planEvents.remove.remove, { eventId });
  const after = await liveRows(t);
  expect(after).toHaveLength(1);
  expect(after[0]?._id).toBe(opened[0]?._id);
  expect((await listDay(t, MONDAY)).page).toEqual([]);
});

test("materialize 済み予定の日付・項目変更は拒否される", async () => {
  const t = owner();
  const categoryId = await t.mutation(api.mutations.categories.create.create, { name: "英語" });
  const itemId = await t.mutation(api.mutations.items.create.create, {
    categoryId,
    name: "多読",
  });
  const otherItemId = await t.mutation(api.mutations.items.create.create, {
    categoryId,
    name: "金フレ",
  });
  const eventId = await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "08:15",
    itemId,
    priority: "high",
    startTime: "07:30",
    title: "Part 7",
    todayJst: MONDAY,
  });
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  await expect(
    t.mutation(api.mutations.planEvents.save.save, {
      dateJst: FUTURE,
      endTime: "08:15",
      eventId,
      itemId,
      priority: "high",
      startTime: "07:30",
      title: "Part 7",
      todayJst: MONDAY,
    }),
  ).rejects.toThrow(/日付と項目/);
  await expect(
    t.mutation(api.mutations.planEvents.save.save, {
      dateJst: MONDAY,
      endTime: "08:15",
      eventId,
      itemId: otherItemId,
      priority: "high",
      startTime: "07:30",
      title: "Part 7",
      todayJst: MONDAY,
    }),
  ).rejects.toThrow(/日付と項目/);
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "08:45",
    eventId,
    itemId,
    priority: "medium",
    startTime: "07:45",
    title: "Part 7 続き",
    todayJst: MONDAY,
  });
  const listed = await listDay(t, MONDAY);
  expect(listed.page).toEqual([
    expect.objectContaining({
      _id: eventId,
      dateJst: MONDAY,
      endTime: "08:45",
      itemId,
      priority: "medium",
      startTime: "07:45",
      title: "Part 7 続き",
    }),
  ]);
});

test("日跨ぎの時刻は拒否する", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.planEvents.save.save, {
      dateJst: MONDAY,
      endTime: "01:00",
      priority: "low",
      startTime: "22:00",
      title: "夜更かし",
      todayJst: MONDAY,
    }),
  ).rejects.toThrow(/同じ日/);
});

test("saveDay はその日の予定を置き換え、載っていない予定は消す", async () => {
  const t = owner();
  const first = await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "08:00",
    priority: "high",
    startTime: "07:00",
    title: "朝",
    todayJst: MONDAY,
  });
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "21:00",
    priority: "low",
    startTime: "20:00",
    title: "夜",
    todayJst: MONDAY,
  });
  const kept = await t.mutation(api.mutations.planEvents.saveDay.saveDay, {
    dateJst: MONDAY,
    todayJst: MONDAY,
    events: [
      {
        endTime: "08:00",
        eventId: first,
        priority: "high",
        startTime: "07:00",
        title: "朝",
      },
      {
        endTime: "12:00",
        priority: "medium",
        startTime: "11:00",
        title: "昼",
      },
    ],
  });
  const listed = await listDay(t, MONDAY);
  expect(listed.page.map((event) => event.title)).toEqual(["朝", "昼"]);
  expect(listed.page[0]?._id).toBe(first);
  expect(kept).toHaveLength(2);
});

test("確定分数のうち予定に塗れない分が unplannedConfirmedMinutes になる", async () => {
  const t = owner();
  const itemId = await readingItem(t);
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "08:00",
    itemId,
    priority: "high",
    startTime: "07:00",
    title: "朝の多読",
    todayJst: MONDAY,
  });
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const plannedRow = (await liveRows(t))[0];
  if (plannedRow === undefined) {
    throw new Error("expected a minted row");
  }
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "",
    minutes: 50,
    rowId: plannedRow._id,
  });
  const extraRowId: Id<"rows"> = await t.mutation(api.mutations.rows.add.add, {
    content: "",
    dateJst: MONDAY,
    itemId,
    minutes: 20,
    todayJst: MONDAY,
  });
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "",
    minutes: 20,
    rowId: extraRowId,
  });
  const listed = await listDay(t, MONDAY);
  expect(listed.unplannedConfirmedMinutes).toBe(20);
});

test("終了 24:00 は同じ日の末尾として保存できる", async () => {
  const t = owner();
  await t.mutation(api.mutations.planEvents.save.save, {
    dateJst: MONDAY,
    endTime: "24:00",
    priority: "low",
    startTime: "23:00",
    title: "終わり",
    todayJst: MONDAY,
  });
  expect((await listDay(t, MONDAY)).page[0]).toEqual(
    expect.objectContaining({ endTime: "24:00", startTime: "23:00" }),
  );
});

test("日跨ぎの legacy 予定は対象 ID を出して失敗する", async () => {
  const t = owner();
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  await seedWeekdayDay(t, MONDAY, MONDAY);
  const row = (await liveRows(t))[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }
  await expect(
    t.run(async (ctx) => {
      const blockId = await ctx.db.insert("boardScheduleEvents", {
        color: "green",
        endAt: "2026-08-18 01:00:00",
        ownerId: row.ownerId,
        rowId: row._id,
        startAt: "2026-08-17 23:00:00",
        title: "夜更かし",
      });
      const block = await ctx.db.get("boardScheduleEvents", blockId);
      if (block === null) {
        throw new Error("expected a block");
      }
      await migrateBoardScheduleEvent(ctx, block);
    }),
  ).rejects.toThrow(/日跨ぎの予定は移せません/);
});
