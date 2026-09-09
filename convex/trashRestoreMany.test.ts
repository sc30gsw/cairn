import { validate } from "convex-helpers/validators";
import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { api, components } from "./_generated/api";
import authSchema from "./betterAuth/schema";
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
const authModules = import.meta.glob("./betterAuth/**/*.ts");

const OWNER = { email: "trash-owner@example.com", subject: "trash-owner" };
const MONDAY = "2026-08-17";

async function owner() {
  const t = convexTest(schema, modules);
  t.registerComponent("betterAuth", authSchema, authModules);
  const user = await t.run((ctx) =>
    ctx.runMutation(components.betterAuth.adapter.create, {
      input: {
        model: "user",
        data: {
          name: "ゴミ箱利用者",
          email: OWNER.email,
          emailVerified: true,
          createdAt: 0,
          updatedAt: 0,
        },
      },
    }),
  );
  if (!validate(authSchema.doc("user"), user)) {
    throw new Error("expected a better-auth user");
  }
  return t.withIdentity({ email: OWNER.email, subject: user._id });
}

test("記録を選ぶと親の日を先に復元し、指定した記録だけ復元する", async () => {
  const t = await owner();
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const page = await t.query(api.queries.days.get.get, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  const row = page.rows[0];
  if (page.day === null || row === undefined) {
    throw new Error("expected a day and row");
  }

  await t.mutation(api.mutations.rows.remove.remove, { rowId: row._id });
  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: MONDAY });
  const result = await t.mutation(api.mutations.trash.restoreMany.restoreMany, {
    dayIds: [],
    rowIds: [row._id],
  });

  expect(result).toEqual({
    failedDayIds: [],
    failedRowIds: [],
    restoredDayIds: [page.day._id],
    restoredRowIds: [row._id],
  });
  const trash = await t.query(api.queries.trash.list.list, {});
  expect(trash.days).toEqual([]);
  expect(trash.rows.some((entry) => entry._id === row._id)).toBe(false);
});

test("未認証の一括復元は拒否する", async () => {
  const t = convexTest(schema, modules);
  await expect(
    t.mutation(api.mutations.trash.restoreMany.restoreMany, { dayIds: [], rowIds: [] }),
  ).rejects.toThrow();
});

test("すでに復元された対象は失敗として残り、再試行結果を返す", async () => {
  const t = await owner();
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  await t.mutation(api.mutations.days.open.open, { dateJst: MONDAY, todayJst: MONDAY });
  const page = await t.query(api.queries.days.get.get, {
    dateJst: MONDAY,
    todayJst: MONDAY,
  });
  const row = page.rows[0];
  if (page.day === null || row === undefined) {
    throw new Error("expected a day and row");
  }

  await t.mutation(api.mutations.rows.remove.remove, { rowId: row._id });
  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: MONDAY });
  await t.mutation(api.mutations.trash.restoreMany.restoreMany, {
    dayIds: [page.day._id],
    rowIds: [row._id],
  });
  const result = await t.mutation(api.mutations.trash.restoreMany.restoreMany, {
    dayIds: [page.day._id],
    rowIds: [row._id],
  });

  expect(result).toEqual({
    failedDayIds: [page.day._id],
    failedRowIds: [row._id],
    restoredDayIds: [],
    restoredRowIds: [],
  });
});
