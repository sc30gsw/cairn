import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { Status } from "./lib/domain";
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

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const TODAY = "2026-08-21";

function newTest() {
  return convexTest(schema, modules);
}

async function seedReviewRows(
  t: ReturnType<typeof newTest>,
  days: { dateJst: string; statuses: Status[] }[],
): Promise<void> {
  await t.run(async (ctx) => {
    const itemId = await ctx.db.insert("items", {
      name: "Distinction 2000",
      ownerId: OWNER.subject,
    });
    for (const day of days) {
      const dayId = await ctx.db.insert("days", {
        dateJst: day.dateJst,
        ownerId: OWNER.subject,
      });
      for (const [index, status] of day.statuses.entries()) {
        await ctx.db.insert("rows", {
          content: "",
          dateJst: day.dateJst,
          dayId,
          itemId,
          minutes: 20,
          ownerId: OWNER.subject,
          sortOrder: index,
          status,
        });
      }
    }
  });
}

test("未認証の presetReview は throw する", async () => {
  const t = newTest();
  await expect(
    t.query(api.queries.history.presetReview.presetReview, { todayJst: TODAY }),
  ).rejects.toThrow();
});

test("今日と休養は分母に入れず、消化の低い曜日を提案する", async () => {
  const t = newTest();
  await seedReviewRows(t, [
    { dateJst: "2026-08-17", statuses: ["スキップ", "未着手", "未着手"] },
    { dateJst: "2026-08-10", statuses: ["スキップ", "未着手"] },
    { dateJst: "2026-08-18", statuses: ["確定", "確定", "確定"] },
    { dateJst: "2026-08-11", statuses: ["確定", "確定"] },
    { dateJst: "2026-08-21", statuses: ["未着手", "未着手"] },
  ]);

  const review = await t
    .withIdentity(OWNER)
    .query(api.queries.history.presetReview.presetReview, { todayJst: TODAY });

  expect(review.windowStart).toBe("2026-07-24");
  expect(review.windowEnd).toBe("2026-08-20");
  const monday = review.weekdays.find((row) => row.weekday === 1);
  const tuesday = review.weekdays.find((row) => row.weekday === 2);
  expect(monday).toMatchObject({
    confirmed: 0,
    leftover: 3,
    ongoing: 0,
    planned: 5,
    skipped: 2,
    weekday: 1,
  });
  expect(tuesday).toMatchObject({
    confirmed: 5,
    leftover: 0,
    ongoing: 0,
    planned: 5,
    skipped: 0,
    weekday: 2,
  });
  expect(review.suggestions).toEqual([{ reason: "leftoverHeavy", weekday: 1 }]);
});

test("ゴミ箱の日の記録は数えない", async () => {
  const t = newTest();
  await t.run(async (ctx) => {
    const itemId = (await ctx.db.insert("items", {
      name: "Distinction 2000",
      ownerId: OWNER.subject,
    })) as Id<"items">;
    const dayId = await ctx.db.insert("days", {
      dateJst: "2026-08-17",
      deletedAt: Date.now(),
      ownerId: OWNER.subject,
    });
    await ctx.db.insert("rows", {
      content: "",
      dateJst: "2026-08-17",
      dayId,
      itemId,
      minutes: 20,
      ownerId: OWNER.subject,
      sortOrder: 0,
      status: "スキップ",
    });
  });

  const review = await t
    .withIdentity(OWNER)
    .query(api.queries.history.presetReview.presetReview, { todayJst: TODAY });
  const monday = review.weekdays.find((row) => row.weekday === 1);
  expect(monday).toMatchObject({ confirmed: 0, leftover: 0, ongoing: 0, planned: 0, skipped: 0 });
  expect(review.suggestions).toEqual([]);
});

test("ゴミ箱の行は、日が残っていても数えない", async () => {
  const t = newTest();
  await t.run(async (ctx) => {
    const itemId = (await ctx.db.insert("items", {
      name: "Distinction 2000",
      ownerId: OWNER.subject,
    })) as Id<"items">;
    const dayId = await ctx.db.insert("days", {
      dateJst: "2026-08-17",
      ownerId: OWNER.subject,
    });
    await ctx.db.insert("rows", {
      content: "",
      dateJst: "2026-08-17",
      dayId,
      deletedAt: Date.now(),
      itemId,
      minutes: 20,
      ownerId: OWNER.subject,
      sortOrder: 0,
      status: "スキップ",
    });
    await ctx.db.insert("rows", {
      content: "",
      dateJst: "2026-08-17",
      dayId,
      itemId,
      minutes: 20,
      ownerId: OWNER.subject,
      sortOrder: 1,
      status: "確定",
    });
  });

  const review = await t
    .withIdentity(OWNER)
    .query(api.queries.history.presetReview.presetReview, { todayJst: TODAY });
  const monday = review.weekdays.find((row) => row.weekday === 1);
  expect(monday).toMatchObject({ confirmed: 1, leftover: 0, ongoing: 0, planned: 1, skipped: 0 });
});
