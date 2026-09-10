import { convexTest } from "convex-test";
import { vi } from "vite-plus/test";
import { expect, test } from "vite-plus/test";

import { convexModules } from "../src/test-utils/convex-modules";
import { api } from "./_generated/api";
import schema from "./schema";

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const MONDAY = "2026-08-17";

function asOwner() {
  return convexTest(schema, convexModules).withIdentity(OWNER);
}

async function firstRow(t: ReturnType<typeof asOwner>) {
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const [row] = day.rows;
  if (row === undefined) {
    throw new Error("expected seeded row");
  }
  return row;
}

test("未着手の記録は start で進行中にできる", async () => {
  const t = asOwner();
  const row = await firstRow(t);

  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });

  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(day.rows.find((entry) => entry._id === row._id)?.status).toBe("進行中");
});

test("進行中の記録は unstart で未着手に戻せる", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });

  await t.mutation(api.mutations.rows.unstart.unstart, { rowId: row._id });

  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(day.rows.find((entry) => entry._id === row._id)?.status).toBe("未着手");
});

test("確定した記録は reopen で進行中に戻せる", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "Unit 1",
    minutes: 30,
    rowId: row._id,
  });

  await t.mutation(api.mutations.rows.reopen.reopen, { rowId: row._id });

  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(day.rows.find((entry) => entry._id === row._id)?.status).toBe("進行中");
});

test("進行中の記録は confirm で確定できる", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });

  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: "Unit 1",
    minutes: 25,
    rowId: row._id,
  });

  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const updated = day.rows.find((entry) => entry._id === row._id);
  expect(updated?.status).toBe("確定");
  expect(updated?.minutes).toBe(25);
});

test("未着手以外に start は失敗する", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });

  await expect(t.mutation(api.mutations.rows.start.start, { rowId: row._id })).rejects.toThrow();
});

test("進行中以外に unstart は失敗する", async () => {
  const t = asOwner();
  const row = await firstRow(t);

  await expect(
    t.mutation(api.mutations.rows.unstart.unstart, { rowId: row._id }),
  ).rejects.toThrow();
});

test("applyOrder は同じ記録IDの重複を拒否する", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  if (day.rows.length < 2) {
    throw new Error("expected at least two rows");
  }
  const duplicated = [row._id, row._id, ...day.rows.slice(2).map((entry) => entry._id)];

  await expect(
    t.mutation(api.mutations.rows.applyOrder.applyOrder, {
      dateJst: MONDAY,
      orderedRowIds: duplicated,
    }),
  ).rejects.toThrow();

  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.rows.map((entry) => entry._id)).toEqual(day.rows.map((entry) => entry._id));
});

test("moveAndApplyOrder は状態変更と並び替えを同じ transaction で保存する", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const orderedRowIds = [...day.rows].reverse().map((entry) => entry._id);

  await t.mutation(api.mutations.rows.moveAndApplyOrder.moveAndApplyOrder, {
    dateJst: MONDAY,
    move: { kind: "skip" },
    orderedRowIds,
    rowId: row._id,
  });

  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.rows.map((entry) => entry._id)).toEqual(orderedRowIds);
  expect(after.rows.find((entry) => entry._id === row._id)?.status).toBe("スキップ");
});

test("moveAndApplyOrder の confirm は計測停止と確定を同じ transaction で保存する", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });

  await t.mutation(api.mutations.rows.moveAndApplyOrder.moveAndApplyOrder, {
    dateJst: MONDAY,
    move: { content: "Unit 1", kind: "confirm" },
    orderedRowIds: day.rows.map((entry) => entry._id),
    rowId: row._id,
  });

  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const updated = after.rows.find((entry) => entry._id === row._id);
  expect(updated?.status).toBe("確定");
  expect(updated?.timer).toBeNull();
});

test("moveAndApplyOrder は記録と対象日の不一致を拒否する", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  const otherDate = "2026-08-18";
  await t.mutation(api.mutations.days.open.open, {
    dateJst: otherDate,
    todayJst: otherDate,
  });
  const otherDay = await t.query(api.queries.days.get.get, {
    dateJst: otherDate,
    todayJst: otherDate,
  });

  await expect(
    t.mutation(api.mutations.rows.moveAndApplyOrder.moveAndApplyOrder, {
      dateJst: otherDate,
      move: { kind: "skip" },
      orderedRowIds: otherDay.rows.map((entry) => entry._id),
      rowId: row._id,
    }),
  ).rejects.toThrow();
});

test("moveAndApplyOrder は不正な日付形式を拒否する", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });

  await expect(
    t.mutation(api.mutations.rows.moveAndApplyOrder.moveAndApplyOrder, {
      dateJst: "not-a-date",
      move: { kind: "skip" },
      orderedRowIds: day.rows.map((entry) => entry._id),
      rowId: row._id,
    }),
  ).rejects.toThrow();
});

vi.mock("./services/days/serviceStartDate", () => ({ serviceStartDate: async () => "2026-01-01" }));
