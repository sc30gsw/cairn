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

const OWNER_A = { email: "owner-a@example.com", subject: "owner-a" };
const OWNER_B = { email: "owner-b@example.com", subject: "owner-b" };
const MONDAY = "2026-08-17";

function asOwner(identity: typeof OWNER_A) {
  return convexTest(schema, modules).withIdentity(identity);
}

async function firstRowId(t: ReturnType<typeof asOwner>) {
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const day = await t.query(api.queries.days.get.get, { dateJst: MONDAY, todayJst: MONDAY });
  const [row] = day.rows;
  if (row === undefined) {
    throw new Error("expected seeded row");
  }
  return row._id;
}

test("他人の日データは ownerId で分離される", async () => {
  const ownerA = asOwner(OWNER_A);
  await firstRowId(ownerA);

  const ownerB = asOwner(OWNER_B);
  const day = await ownerB.query(api.queries.days.get.get, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });

  expect(day.rows).toEqual([]);
});

test("他人の行は確定できない", async () => {
  const ownerA = asOwner(OWNER_A);
  const rowId = await firstRowId(ownerA);

  const ownerB = asOwner(OWNER_B);
  await expect(
    ownerB.mutation(api.mutations.rows.confirm.confirm, {
      content: "盗み確定",
      minutes: 10,
      rowId,
    }),
  ).rejects.toThrow();
});

test("他人の行はスキップできない", async () => {
  const ownerA = asOwner(OWNER_A);
  const rowId = await firstRowId(ownerA);

  const ownerB = asOwner(OWNER_B);
  await expect(ownerB.mutation(api.mutations.rows.skip.skip, { rowId })).rejects.toThrow();
});

test("他人の boardScheduleEvents は更新・削除できない", async () => {
  const ownerA = asOwner(OWNER_A);
  const rowId = await firstRowId(ownerA);
  const blockId = await ownerA.mutation(api.mutations.boardSchedule.create.create, {
    color: "blue",
    endAt: "2026-08-17 10:00:00",
    rowId,
    startAt: "2026-08-17 09:00:00",
  });

  const ownerB = asOwner(OWNER_B);
  await expect(
    ownerB.mutation(api.mutations.boardSchedule.update.update, {
      blockId,
      color: "red",
      endAt: "2026-08-17 11:00:00",
      startAt: "2026-08-17 09:30:00",
    }),
  ).rejects.toThrow();
  await expect(
    ownerB.mutation(api.mutations.boardSchedule.remove.remove, { blockId }),
  ).rejects.toThrow();
  await expect(
    ownerB.mutation(api.mutations.boardSchedule.move.move, {
      blockId,
      endAt: "2026-08-18 11:00:00",
      startAt: "2026-08-18 09:30:00",
    }),
  ).rejects.toThrow();
});

test("他人の rowId では boardScheduleEvents を作成できない", async () => {
  const ownerA = asOwner(OWNER_A);
  const rowId = await firstRowId(ownerA);

  const ownerB = asOwner(OWNER_B);
  await expect(
    ownerB.mutation(api.mutations.boardSchedule.create.create, {
      color: "green",
      endAt: "2026-08-17 10:00:00",
      rowId,
      startAt: "2026-08-17 09:00:00",
    }),
  ).rejects.toThrow();
});

test("他人の boardScheduleEvents は週一覧に出ない", async () => {
  const ownerA = asOwner(OWNER_A);
  const rowId = await firstRowId(ownerA);
  await ownerA.mutation(api.mutations.boardSchedule.create.create, {
    color: "green",
    endAt: "2026-08-17 10:00:00",
    rowId,
    startAt: "2026-08-17 09:00:00",
  });

  const ownerB = asOwner(OWNER_B);
  const listed = await ownerB.query(api.queries.boardSchedule.listForWeek.listForWeek, {
    anchorDateJst: MONDAY,
    view: "week",
  });
  expect(listed).toEqual([]);
});
