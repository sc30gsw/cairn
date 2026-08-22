import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

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

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const MONDAY = "2026-08-17";

function asOwner() {
  return convexTest(schema, modules).withIdentity(OWNER);
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

test("進行中の記録は pause で未着手に戻せる", async () => {
  const t = asOwner();
  const row = await firstRow(t);
  await t.mutation(api.mutations.rows.start.start, { rowId: row._id });

  await t.mutation(api.mutations.rows.pause.pause, { rowId: row._id });

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

test("進行中以外に pause は失敗する", async () => {
  const t = asOwner();
  const row = await firstRow(t);

  await expect(t.mutation(api.mutations.rows.pause.pause, { rowId: row._id })).rejects.toThrow();
});
