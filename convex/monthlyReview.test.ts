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
  "!./migrations.ts",
]);

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const OTHER_OWNER = { email: "other@example.com", subject: "other-owner-subject" };
const YEAR_MONTH = "2026-08";
const TODAY_AFTER_MONTH = "2026-09-10";
const TODAY_IN_MONTH = "2026-08-19";

function raw() {
  return convexTest(schema, modules);
}

function owner() {
  return raw().withIdentity(OWNER);
}

type SeedRow = Pick<Doc<"rows">, "dateJst" | "minutes" | "status"> & { deletedAt?: number };

async function seedCategory(
  t: ReturnType<typeof owner>,
  args: { itemName?: string; name: string; rows?: readonly SeedRow[]; sortOrder: number },
): Promise<Id<"categories">> {
  return t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: args.name,
      ownerId: OWNER.subject,
      sortOrder: args.sortOrder,
    });
    const itemId = await ctx.db.insert("items", {
      categoryId,
      name: args.itemName ?? args.name,
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    for (const [index, row] of (args.rows ?? []).entries()) {
      const existingDay = await ctx.db
        .query("days")
        .withIndex("by_owner_and_date", (q) =>
          q.eq("ownerId", OWNER.subject).eq("dateJst", row.dateJst),
        )
        .first();
      const dayId =
        existingDay?._id ??
        (await ctx.db.insert("days", { dateJst: row.dateJst, ownerId: OWNER.subject }));
      await ctx.db.insert("rows", {
        content: "",
        dateJst: row.dateJst,
        dayId,
        ...(row.deletedAt === undefined ? {} : { deletedAt: row.deletedAt }),
        itemId,
        minutes: row.minutes,
        ownerId: OWNER.subject,
        sortOrder: index,
        status: row.status,
      });
    }
    return categoryId;
  });
}

test("未認証で月次レビューを読むと拒否される", async () => {
  await expect(
    raw().query(api.queries.review.monthlyReview.monthlyReview, {
      todayJst: TODAY_AFTER_MONTH,
      yearMonth: YEAR_MONTH,
    }),
  ).rejects.toThrow();
});

test("他の所有者のデータは月次レビューに混ざらない", async () => {
  const t = owner();
  await seedCategory(t, {
    name: "TOEIC対策",
    rows: [{ dateJst: "2026-08-03", minutes: 60, status: "確定" }],
    sortOrder: 0,
  });

  const other = await raw()
    .withIdentity(OTHER_OWNER)
    .query(api.queries.review.monthlyReview.monthlyReview, {
      todayJst: TODAY_AFTER_MONTH,
      yearMonth: YEAR_MONTH,
    });
  expect(other.confirmedMinutes).toBe(0);
  expect(other.activeDays).toBe(0);
  expect(other.byCategory).toEqual([]);
});

test("対象月と前月の実績が状態ごとに分かれる", async () => {
  const t = owner();
  await seedCategory(t, {
    name: "TOEIC対策",
    rows: [
      { dateJst: "2026-07-06", minutes: 100, status: "確定" },
      { dateJst: "2026-07-07", minutes: 50, status: "確定" },
      { dateJst: "2026-08-03", minutes: 120, status: "確定" },
      { dateJst: "2026-08-04", minutes: 30, status: "確定" },
      { dateJst: "2026-08-04", minutes: 30, status: "未着手" },
      { dateJst: "2026-08-05", minutes: 20, status: "進行中" },
      { dateJst: "2026-08-05", minutes: 40, status: "スキップ" },
    ],
    sortOrder: 0,
  });

  const review = await t.query(api.queries.review.monthlyReview.monthlyReview, {
    todayJst: TODAY_AFTER_MONTH,
    yearMonth: YEAR_MONTH,
  });
  expect(review).toMatchObject({
    activeDays: 2,
    confirmedMinutes: 150,
    elapsedDays: 31,
    isCurrentMonth: false,
    monthEnd: "2026-08-31",
    monthStart: "2026-08-01",
    previousActiveDays: 2,
    previousConfirmedMinutes: 150,
    previousYearMonth: "2026-07",
    skippedMinutes: 40,
    yearMonth: YEAR_MONTH,
  });
  expect(review.byCategory).toEqual([
    { category: "TOEIC対策", categorySortOrder: 0, minutes: 150 },
  ]);
  expect(review.previousByCategory).toEqual([
    { category: "TOEIC対策", categorySortOrder: 0, minutes: 150 },
  ]);
  expect(review.digest).toMatchObject({
    confirmedCount: 2,
    countedFrom: "2026-08-01",
    countedThrough: "2026-08-31",
    isPartial: false,
    leftoverCount: 1,
    ongoingCount: 1,
    plannedCount: 5,
    skippedCount: 1,
  });
});

test("消化推移は月曜始まりの週バケットになり、月境界は部分週になる", async () => {
  const t = owner();
  await seedCategory(t, {
    name: "TOEIC対策",
    rows: [
      { dateJst: "2026-08-01", minutes: 60, status: "確定" },
      { dateJst: "2026-08-03", minutes: 60, status: "確定" },
      { dateJst: "2026-08-04", minutes: 30, status: "未着手" },
    ],
    sortOrder: 0,
  });

  const review = await t.query(api.queries.review.monthlyReview.monthlyReview, {
    todayJst: TODAY_AFTER_MONTH,
    yearMonth: YEAR_MONTH,
  });
  expect(review.digestTrend).toHaveLength(6);
  expect(review.digestTrend[0]).toMatchObject({
    bucketEnd: "2026-08-02",
    bucketStart: "2026-08-01",
    confirmedCount: 1,
    digestRate: 1,
    isPartial: true,
    plannedCount: 1,
  });
  expect(review.digestTrend[1]).toMatchObject({
    bucketEnd: "2026-08-09",
    bucketStart: "2026-08-03",
    confirmedCount: 1,
    digestRate: 0.5,
    isPartial: false,
    plannedCount: 2,
  });
  expect(review.digestTrend[2]).toMatchObject({ isPartial: false, plannedCount: 0 });
});

test("当月レビューでは今日以降を消化に数えない", async () => {
  const t = owner();
  await seedCategory(t, {
    name: "TOEIC対策",
    rows: [
      { dateJst: "2026-08-17", minutes: 60, status: "確定" },
      { dateJst: TODAY_IN_MONTH, minutes: 60, status: "確定" },
      { dateJst: TODAY_IN_MONTH, minutes: 30, status: "未着手" },
    ],
    sortOrder: 0,
  });

  const review = await t.query(api.queries.review.monthlyReview.monthlyReview, {
    todayJst: TODAY_IN_MONTH,
    yearMonth: YEAR_MONTH,
  });
  expect(review.isCurrentMonth).toBe(true);
  expect(review.digest.isPartial).toBe(true);
  expect(review.digest.plannedCount).toBe(1);
  expect(review.digest.countedThrough).toBe("2026-08-18");
  expect(review.elapsedDays).toBe(19);
  expect(review.confirmedMinutes).toBe(120);
  const currentBucket = review.digestTrend[3];
  expect(currentBucket?.bucketStart).toBe("2026-08-17");
  expect(currentBucket?.plannedCount).toBe(1);
  expect(currentBucket?.isPartial).toBe(true);
});

test("ゴミ箱の記録と日は集計・消化・推移から除かれる", async () => {
  const t = owner();
  await seedCategory(t, {
    name: "TOEIC対策",
    rows: [
      { dateJst: "2026-08-03", minutes: 60, status: "確定" },
      { dateJst: "2026-08-04", minutes: 90, status: "確定", deletedAt: 1 },
      { dateJst: "2026-08-05", minutes: 45, status: "確定" },
    ],
    sortOrder: 0,
  });
  await t.run(async (ctx) => {
    const day = await ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", OWNER.subject).eq("dateJst", "2026-08-05"),
      )
      .first();
    if (day !== null) {
      await ctx.db.patch("days", day._id, { deletedAt: 1 });
    }
  });

  const review = await t.query(api.queries.review.monthlyReview.monthlyReview, {
    todayJst: TODAY_AFTER_MONTH,
    yearMonth: YEAR_MONTH,
  });
  expect(review.confirmedMinutes).toBe(60);
  expect(review.activeDays).toBe(1);
  expect(review.digest.plannedCount).toBe(1);
  expect(review.digestTrend[1]).toMatchObject({ confirmedCount: 1, plannedCount: 1 });
});

test("前月に記録が無ければ前月比の生値は0", async () => {
  const t = owner();
  await seedCategory(t, {
    name: "TOEIC対策",
    rows: [{ dateJst: "2026-08-03", minutes: 60, status: "確定" }],
    sortOrder: 0,
  });

  const review = await t.query(api.queries.review.monthlyReview.monthlyReview, {
    todayJst: TODAY_AFTER_MONTH,
    yearMonth: YEAR_MONTH,
  });
  expect(review.previousConfirmedMinutes).toBe(0);
  expect(review.previousActiveDays).toBe(0);
  expect(review.previousByCategory).toEqual([]);
});

test("年をまたぐ1月は前月が前年12月になる", async () => {
  const t = owner();
  await seedCategory(t, {
    name: "TOEIC対策",
    rows: [
      { dateJst: "2025-12-15", minutes: 80, status: "確定" },
      { dateJst: "2026-01-15", minutes: 40, status: "確定" },
    ],
    sortOrder: 0,
  });

  const review = await t.query(api.queries.review.monthlyReview.monthlyReview, {
    todayJst: "2026-02-01",
    yearMonth: "2026-01",
  });
  expect(review.previousYearMonth).toBe("2025-12");
  expect(review.previousConfirmedMinutes).toBe(80);
  expect(review.confirmedMinutes).toBe(40);
});

test("月の指定が壊れていれば空の DTO を返す(throw しない)", async () => {
  const review = await owner().query(api.queries.review.monthlyReview.monthlyReview, {
    todayJst: TODAY_AFTER_MONTH,
    yearMonth: "こんげつ",
  });
  expect(review).toMatchObject({
    activeDays: 0,
    byCategory: [],
    confirmedMinutes: 0,
    digestTrend: [],
    elapsedDays: 0,
    isCurrentMonth: false,
    previousByCategory: [],
    yearMonth: "こんげつ",
  });
  expect(review.digest.plannedCount).toBe(0);
});
