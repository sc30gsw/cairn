import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { TIMER_MAX_SEGMENT_MS } from "./lib/rowTimer";
import schema from "./schema";

//? 計測(#51)の状態機械。純関数の網羅は convex/lib/rowTimer.test.ts に置く。
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
const OTHER_OWNER = { email: "other@example.com", subject: "other-subject" };
const MONDAY = "2026-08-17";
const SUNDAY = "2026-08-16";
const BASE_MS = Date.UTC(2026, 7, 17, 1, 0, 0);

function raw() {
  return convexTest(schema, modules);
}

function asOwner(identity: typeof OWNER = OWNER) {
  return raw().withIdentity(identity);
}

async function seedRows(t: ReturnType<typeof asOwner>) {
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const [first, second] = day.rows;
  if (first === undefined || second === undefined) {
    throw new Error("expected at least two seeded rows");
  }
  return { first, second };
}

async function firstRow(t: ReturnType<typeof asOwner>) {
  return (await seedRows(t)).first;
}

async function rowDoc(t: ReturnType<typeof asOwner>, rowId: Id<"rows">): Promise<Doc<"rows">> {
  const row = await t.run(async (ctx) => ctx.db.get("rows", rowId));
  if (row === null) {
    throw new Error("expected row");
  }
  return row;
}

async function timerOf(t: ReturnType<typeof asOwner>, rowId: Id<"rows">) {
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  return day.rows.find((entry) => entry._id === rowId)?.timer ?? null;
}

afterEach(() => {
  vi.useRealTimers();
});

test("T1: start は計測を開始し、累積は0から始まる", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  vi.useFakeTimers();
  vi.setSystemTime(BASE_MS);

  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });

  const timer = await timerOf(t, row._id);
  expect(timer).toEqual({ accumulatedMs: 0, autoStoppedAt: null, startedAt: BASE_MS });
});

test("T2→T3→T2: 2区間の合計が累積に積まれる", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  vi.useFakeTimers();
  vi.setSystemTime(BASE_MS);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });

  vi.setSystemTime(BASE_MS + 600_000);
  const afterFirst = await t.mutation(api.mutations.rows.stopTimer.stopTimer, {
    rowId: row._id,
  });
  expect(afterFirst).toBe(600_000);
  expect(await timerOf(t, row._id)).toEqual({
    accumulatedMs: 600_000,
    autoStoppedAt: null,
    startedAt: null,
  });

  vi.setSystemTime(BASE_MS + 900_000);
  await t.mutation(api.mutations.rows.resumeTimer.resumeTimer, { rowId: row._id });
  vi.setSystemTime(BASE_MS + 900_000 + 120_000);
  const afterSecond = await t.mutation(api.mutations.rows.stopTimer.stopTimer, {
    rowId: row._id,
  });

  expect(afterSecond).toBe(720_000);
  expect(await timerOf(t, row._id)).toEqual({
    accumulatedMs: 720_000,
    autoStoppedAt: null,
    startedAt: null,
  });
});

test("T2': 計測していない進行中の記録に stopTimer は失敗せず現在値を返す", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  vi.useFakeTimers();
  vi.setSystemTime(BASE_MS);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });
  vi.setSystemTime(BASE_MS + 300_000);
  await t.mutation(api.mutations.rows.stopTimer.stopTimer, { rowId: row._id });

  vi.setSystemTime(BASE_MS + 600_000);
  const again = await t.mutation(api.mutations.rows.stopTimer.stopTimer, { rowId: row._id });

  expect(again).toBe(300_000);
});

test("T4: autoStopTimers は240分を加算して自動停止の目印を立て、状態は進行中のまま", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  vi.useFakeTimers();
  vi.setSystemTime(BASE_MS);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });
  vi.useRealTimers();

  const now = BASE_MS + TIMER_MAX_SEGMENT_MS;
  await t.mutation(internal.mutations.rows.autoStopTimers.autoStopTimers, { now });

  const doc = await rowDoc(t, row._id);
  expect(doc.status).toBe("進行中");
  expect(doc.timerAccumulatedMs).toBe(TIMER_MAX_SEGMENT_MS);
  expect(doc.timerAutoStoppedAt).toBe(now);
  expect(doc.timerStartedAt).toBeUndefined();
});

test("T4: cron が遅れても加算値は240分のまま", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  vi.useFakeTimers();
  vi.setSystemTime(BASE_MS);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });
  vi.useRealTimers();

  await t.mutation(internal.mutations.rows.autoStopTimers.autoStopTimers, {
    now: BASE_MS + TIMER_MAX_SEGMENT_MS + 30 * 60_000,
  });

  expect((await rowDoc(t, row._id)).timerAccumulatedMs).toBe(TIMER_MAX_SEGMENT_MS);
});

test("T4: 240分に達していない計測は自動停止しない", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  vi.useFakeTimers();
  vi.setSystemTime(BASE_MS);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });
  vi.useRealTimers();

  await t.mutation(internal.mutations.rows.autoStopTimers.autoStopTimers, {
    now: BASE_MS + TIMER_MAX_SEGMENT_MS - 60_000,
  });

  expect((await rowDoc(t, row._id)).timerStartedAt).toBe(BASE_MS);
});

test("T5: 別の記録の計測を始めると走っていた計測は畳まれ、計測中は1件だけになる", async () => {
  const t = asOwner();
  const { first, second } = await seedRows(t);
  vi.useFakeTimers();
  vi.setSystemTime(BASE_MS);
  await t.mutation(api.mutations.rows.start.start, { rowId: first._id });

  vi.setSystemTime(BASE_MS + 300_000);
  await t.mutation(api.mutations.rows.start.start, { rowId: second._id });

  expect(await timerOf(t, first._id)).toEqual({
    accumulatedMs: 300_000,
    autoStoppedAt: null,
    startedAt: null,
  });
  expect(await timerOf(t, second._id)).toEqual({
    accumulatedMs: 0,
    autoStoppedAt: null,
    startedAt: BASE_MS + 300_000,
  });
  const running = await t.run(async (ctx) =>
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_timerStartedAt", (q) =>
        q.eq("ownerId", OWNER.subject).gte("timerStartedAt", 0),
      )
      .collect(),
  );
  expect(running).toHaveLength(1);
});

test("T6: confirm は計測フィールドを消し、分数は引数の値になる", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });

  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "Unit 1",
    minutes: 5,
    rowId: row._id,
  });

  const doc = await rowDoc(t, row._id);
  expect(doc.minutes).toBe(5);
  expect(doc.timerAccumulatedMs).toBeUndefined();
  expect(doc.timerAutoStoppedAt).toBeUndefined();
  expect(doc.timerStartedAt).toBeUndefined();
  expect(await timerOf(t, row._id)).toBeNull();
});

test("T9: 確定30分の記録を reopen すると計測は30分から続く", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "Unit 1",
    minutes: 30,
    rowId: row._id,
  });

  await t.mutation(api.mutations.rows.reopen.reopen, { rowId: row._id });

  const doc = await rowDoc(t, row._id);
  expect(doc.timerAccumulatedMs).toBe(1_800_000);
  expect(doc.timerStartedAt).not.toBeUndefined();
});

test("T7: pause は計測を捨てるが分数は残す", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "Unit 1",
    minutes: 30,
    rowId: row._id,
  });
  await t.mutation(api.mutations.rows.reopen.reopen, { rowId: row._id });

  await t.mutation(api.mutations.rows.pause.pause, { rowId: row._id });

  const doc = await rowDoc(t, row._id);
  expect(doc.minutes).toBe(30);
  expect(doc.timerAccumulatedMs).toBeUndefined();
  expect(doc.timerStartedAt).toBeUndefined();
});

test("T8/T10/T11/T12: 状態を動かす経路の後に計測フィールドは残らない", async () => {
  const t = asOwner();
  const { first, second } = await seedRows(t);

  await t.mutation(api.mutations.rows.start.start, { rowId: first._id });
  await t.mutation(api.mutations.rows.skip.skip, { rowId: first._id });
  expect((await rowDoc(t, first._id)).timerStartedAt).toBeUndefined();

  await t.mutation(api.mutations.rows.unskip.unskip, { rowId: first._id });
  expect((await rowDoc(t, first._id)).timerAccumulatedMs).toBeUndefined();

  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "Unit 1",
    minutes: 20,
    rowId: second._id,
  });
  //? 不変条件では確定行に計測は残らないが、残っていたら unconfirm が消すことを確認する(T10 の防御)。
  await t.run(async (ctx) =>
    ctx.db.patch("rows", second._id, { timerAccumulatedMs: 60_000, timerAutoStoppedAt: 1 }),
  );
  await t.mutation(api.mutations.rows.unconfirm.unconfirm, { rowId: second._id });
  const unconfirmed = await rowDoc(t, second._id);
  expect(unconfirmed.timerAccumulatedMs).toBeUndefined();
  expect(unconfirmed.timerAutoStoppedAt).toBeUndefined();

  await t.mutation(api.mutations.rows.start.start, { rowId: second._id });
  await t.mutation(api.mutations.rows.remove.remove, { rowId: second._id });
  const removed = await rowDoc(t, second._id);
  expect(removed.timerStartedAt).toBeUndefined();
  expect(removed.timerAccumulatedMs).toBeUndefined();
});

test("copyYesterdayConfirmed: 重ねて消える記録は計測フィールドと予定も一緒に消える", async () => {
  const t = asOwner();
  const row = await firstRow(t);

  //? 昨日側に同じ項目の確定記録を作る(コピー元)。
  const yesterdayRowId = await t.mutation(api.mutations.rows.add.add, {
    content: "Unit 1",
    dateJst: SUNDAY,
    itemId: row.itemId,
    minutes: 0,
    todayJst: MONDAY,
  });
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "Unit 1",
    minutes: 30,
    rowId: yesterdayRowId,
  });

  //? 今日側は同じ項目の記録を計測中にし、予定も紐づけておく(重なって消える側)。
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });
  await t.mutation(api.mutations.boardSchedule.create.create, {
    endAt: `${MONDAY} 10:30:00`,
    rowId: row._id,
    startAt: `${MONDAY} 09:00:00`,
  });

  await t.mutation(api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });

  const overlapped = await rowDoc(t, row._id);
  expect(overlapped.deletedAt).not.toBeUndefined();
  expect(overlapped.timerStartedAt).toBeUndefined();
  expect(overlapped.timerAccumulatedMs).toBeUndefined();
  expect(overlapped.timerAutoStoppedAt).toBeUndefined();

  const remainingBlocks = await t.run(async (ctx) =>
    ctx.db
      .query("boardScheduleEvents")
      .withIndex("by_row", (q) => q.eq("rowId", row._id))
      .collect(),
  );
  expect(remainingBlocks).toEqual([]);
});

test("runningTimer は計測が無ければ null、1件あれば項目名と日付を返す", async () => {
  const t = asOwner();
  const row = await firstRow(t);

  expect(await t.query(api.queries.rows.runningTimer.runningTimer, {})).toBeNull();

  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });
  const running = await t.query(api.queries.rows.runningTimer.runningTimer, {});

  expect(running?._id).toBe(row._id);
  expect(running?.dateJst).toBe(MONDAY);
  expect(running?.itemName).toBe(row.itemName);
  expect(running?.timer.startedAt).not.toBeNull();
});

test("runningTimer は他所有者の計測を返さない", async () => {
  const shared = raw();
  const ownerA = shared.withIdentity(OWNER);
  const ownerB = shared.withIdentity(OTHER_OWNER);
  const row = await firstRow(ownerA);
  await ownerA.mutation(api.mutations.rows.start.start, { rowId: row._id });

  expect(await ownerB.query(api.queries.rows.runningTimer.runningTimer, {})).toBeNull();
});

test("未認証では計測の関数は失敗する", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  const anonymous = raw();

  await expect(anonymous.query(api.queries.rows.runningTimer.runningTimer, {})).rejects.toThrow();
  await expect(
    anonymous.mutation(api.mutations.rows.stopTimer.stopTimer, { rowId: row._id }),
  ).rejects.toThrow();
  await expect(
    anonymous.mutation(api.mutations.rows.resumeTimer.resumeTimer, { rowId: row._id }),
  ).rejects.toThrow();
});

test("日をゴミ箱に入れた記録の stopTimer は失敗する", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });
  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: MONDAY });

  await expect(
    t.mutation(api.mutations.rows.stopTimer.stopTimer, { rowId: row._id }),
  ).rejects.toThrow();
});

test("進行中でない記録の計測は開始も停止もできない", async () => {
  const t = asOwner();
  const row = await firstRow(t);

  await expect(
    t.mutation(api.mutations.rows.resumeTimer.resumeTimer, { rowId: row._id }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.rows.stopTimer.stopTimer, { rowId: row._id }),
  ).rejects.toThrow();
});
