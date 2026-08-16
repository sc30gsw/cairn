import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
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

const ALLOWED_EMAIL = "owner@example.com";
const OWNER = { email: ALLOWED_EMAIL, subject: "owner-subject" };

function newTest() {
  process.env.ALLOWED_EMAIL = ALLOWED_EMAIL;
  return convexTest(schema, modules);
}

async function seedItemWithRows(
  t: ReturnType<typeof newTest>,
  rows: Pick<Doc<"rows">, "content" | "status">[],
): Promise<Id<"items">> {
  return t.run(async (ctx) => {
    const itemId = await ctx.db.insert("items", {
      name: "TOEIC単語",
      ownerId: OWNER.subject,
    });
    const dayId = await ctx.db.insert("days", {
      dateJst: "2026-08-10",
      ownerId: OWNER.subject,
    });
    for (const [index, row] of rows.entries()) {
      await ctx.db.insert("rows", {
        content: row.content,
        dateJst: "2026-08-10",
        dayId,
        itemId,
        minutes: 20,
        ownerId: OWNER.subject,
        sortOrder: index,
        status: row.status,
      });
    }
    return itemId;
  });
}

test("確定済みの行から重複排除で最大5件返す", async () => {
  const t = newTest();
  const itemId = await seedItemWithRows(
    t,
    ["a", "b", "a", "c", "d", "e", "f"].map((content) => ({ content, status: "確定" as const })),
  );

  const suggestions = await t
    .withIdentity(OWNER)
    .query(api.queries.items.recentConcreteActions.recentConcreteActions, { itemId });

  expect(suggestions.length).toBeLessThanOrEqual(5);
  expect(new Set(suggestions).size).toBe(suggestions.length);
});

test("未着手・スキップの行はサジェストに出さない", async () => {
  const t = newTest();
  const itemId = await seedItemWithRows(t, [
    { content: "未着手の内容", status: "未着手" },
    { content: "スキップの内容", status: "スキップ" },
  ]);

  const suggestions = await t
    .withIdentity(OWNER)
    .query(api.queries.items.recentConcreteActions.recentConcreteActions, { itemId });

  expect(suggestions).toEqual([]);
});

test("未認証では呼べない", async () => {
  const t = newTest();
  const itemId = await seedItemWithRows(t, [{ content: "内容", status: "確定" }]);

  await expect(
    t.query(api.queries.items.recentConcreteActions.recentConcreteActions, { itemId }),
  ).rejects.toThrow();
});

test("存在しない項目には NotFound を投げる", async () => {
  const t = newTest();
  const itemId = await seedItemWithRows(t, [{ content: "内容", status: "確定" }]);
  await t.run(async (ctx) => {
    await ctx.db.delete("items", itemId);
  });

  await expect(
    t
      .withIdentity(OWNER)
      .query(api.queries.items.recentConcreteActions.recentConcreteActions, { itemId }),
  ).rejects.toThrow();
});

test("ゴミ箱の日に属する行はサジェストに出さない", async () => {
  const t = newTest();
  const itemId = await seedItemWithRows(t, [{ content: "確定済みの内容", status: "確定" }]);
  //? removeDay と同じく day の deletedAt だけを立てる(行は生きたまま)
  await t.run(async (ctx) => {
    const days = await ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", OWNER.subject).eq("dateJst", "2026-08-10"),
      )
      .collect();
    for (const day of days) {
      await ctx.db.patch("days", day._id, { deletedAt: Date.now() });
    }
  });

  const suggestions = await t
    .withIdentity(OWNER)
    .query(api.queries.items.recentConcreteActions.recentConcreteActions, { itemId });

  expect(suggestions).toEqual([]);
});

test("ゴミ箱の行はサジェストに出さない", async () => {
  const t = newTest();
  const itemId = await seedItemWithRows(t, [{ content: "確定済みの内容", status: "確定" }]);
  await t.run(async (ctx) => {
    const rows = await ctx.db
      .query("rows")
      .withIndex("by_item", (q) => q.eq("itemId", itemId))
      .collect();
    for (const row of rows) {
      await ctx.db.patch("rows", row._id, { deletedAt: Date.now() });
    }
  });

  const suggestions = await t
    .withIdentity(OWNER)
    .query(api.queries.items.recentConcreteActions.recentConcreteActions, { itemId });

  expect(suggestions).toEqual([]);
});
