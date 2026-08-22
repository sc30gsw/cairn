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

test("未認証の setup.status は throw する", async () => {
  const t = convexTest(schema, modules);
  await expect(t.query(api.queries.setup.status.status, {})).rejects.toThrow();
});

test("空の所有者は setup が未完了", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  const status = await asOwner.query(api.queries.setup.status.status, {});
  expect(status).toEqual({
    examGoalCount: 0,
    hasExamGoal: false,
    hasItems: false,
    hasPresets: false,
    hasWeeklyTargets: false,
    isComplete: false,
    itemCount: 0,
    presetCount: 0,
    targetCount: 0,
  });
});

test("項目を1件追加すると hasItems が true", async () => {
  const t = convexTest(schema, modules);
  const asOwner = t.withIdentity(OWNER);
  await asOwner.mutation(api.mutations.categories.create.create, { name: "多聴" });
  const categories = await asOwner.query(api.queries.categories.list.list, {});
  const categoryId = categories[0]?._id;
  expect(categoryId).toBeDefined();
  await asOwner.mutation(api.mutations.items.create.create, {
    categoryId: categoryId!,
    name: "Distinction 2000",
  });
  const status = await asOwner.query(api.queries.setup.status.status, {});
  expect(status.hasItems).toBe(true);
  expect(status.itemCount).toBe(1);
});
