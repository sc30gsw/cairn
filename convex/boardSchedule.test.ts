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

function owner() {
  return convexTest(schema, modules).withIdentity(OWNER);
}

async function ownerWithDay() {
  const t = owner();
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  return t;
}

test("boardScheduleEvents を作成・週一覧・更新・削除できる", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }

  const blockId = await t.mutation(api.mutations.boardSchedule.create.create, {
    color: "green",
    endAt: "2026-08-17 10:30:00",
    rowId: row._id,
    startAt: "2026-08-17 09:00:00",
  });

  const listed = await t.query(api.queries.boardSchedule.listForWeek.listForWeek, {
    anchorDateJst: MONDAY,
  });
  expect(listed).toEqual([
    {
      _id: blockId,
      color: "green",
      endAt: "2026-08-17 10:30:00",
      rowId: row._id,
      startAt: "2026-08-17 09:00:00",
      title: row.itemName,
    },
  ]);

  await t.mutation(api.mutations.boardSchedule.update.update, {
    blockId,
    color: "violet",
    endAt: "2026-08-17 11:00:00",
    startAt: "2026-08-17 09:30:00",
  });

  await t.mutation(api.mutations.boardSchedule.move.move, {
    blockId,
    endAt: "2026-08-18 11:00:00",
    startAt: "2026-08-18 09:30:00",
  });

  await t.mutation(api.mutations.boardSchedule.remove.remove, { blockId });

  expect(
    await t.query(api.queries.boardSchedule.listForWeek.listForWeek, {
      anchorDateJst: MONDAY,
    }),
  ).toEqual([]);
});

test("スキップした記録は unskip で未着手に戻せる", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }

  await t.mutation(api.mutations.rows.skip.skip, { rowId: row._id });
  await t.mutation(api.mutations.rows.unskip.unskip, { rowId: row._id });

  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.rows.find((candidate) => candidate._id === row._id)?.status).toBe("未着手");
});

test("未着手の記録に unskip は失敗する", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const row = day.rows[0];
  if (row === undefined) {
    throw new Error("expected a row");
  }

  await expect(t.mutation(api.mutations.rows.unskip.unskip, { rowId: row._id })).rejects.toThrow();
});

test("applyOrder でカンバン列の並べ替えを保存できる", async () => {
  const t = await ownerWithDay();
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  if (day.rows.length < 2) {
    throw new Error("expected at least two rows");
  }
  const reversed = [...day.rows].reverse().map((row) => row._id);

  await t.mutation(api.mutations.rows.applyOrder.applyOrder, {
    dateJst: MONDAY,
    orderedRowIds: reversed,
  });

  const after = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  expect(after.rows.map((row) => row._id)).toEqual(reversed);
});
