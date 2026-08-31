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
const MONDAY = "2026-08-17";
const TODAY_IN_WEEK = "2026-08-20";
const TODAY_AFTER_WEEK = "2026-08-31";

function raw() {
  return convexTest(schema, modules);
}

function owner() {
  return raw().withIdentity(OWNER);
}

type SeedRow = Pick<Doc<"rows">, "dateJst" | "minutes" | "status"> & {
  content?: string;
  deletedAt?: number;
};

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
        content: row.content ?? "",
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

test("未認証で週次レビューを読むと拒否される", async () => {
  await expect(
    raw().query(api.queries.review.weeklyReview.weeklyReview, {
      todayJst: TODAY_AFTER_WEEK,
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("他の所有者のデータは週次レビューに混ざらない", async () => {
  const t = owner();
  await seedCategory(t, {
    name: "TOEIC対策",
    rows: [{ dateJst: MONDAY, minutes: 60, status: "確定" }],
    sortOrder: 0,
  });

  const other = await raw()
    .withIdentity(OTHER_OWNER)
    .query(api.queries.review.weeklyReview.weeklyReview, {
      todayJst: TODAY_AFTER_WEEK,
      weekStartJst: MONDAY,
    });
  expect(other.confirmedMinutes).toBe(0);
  expect(other.activeDays).toBe(0);
  expect(other.shareMarkdown).toBe("");
});

test("対象週と前週の実績が状態ごとに分かれる", async () => {
  const t = owner();
  await seedCategory(t, {
    name: "TOEIC対策",
    rows: [
      { dateJst: "2026-08-10", minutes: 100, status: "確定" },
      { dateJst: "2026-08-11", minutes: 50, status: "確定" },
      { dateJst: MONDAY, minutes: 120, status: "確定" },
      { dateJst: "2026-08-18", minutes: 30, status: "確定" },
      { dateJst: "2026-08-18", minutes: 30, status: "未着手" },
      { dateJst: "2026-08-19", minutes: 20, status: "進行中" },
      { dateJst: "2026-08-19", minutes: 40, status: "スキップ" },
    ],
    sortOrder: 0,
  });

  const review = await t.query(api.queries.review.weeklyReview.weeklyReview, {
    todayJst: TODAY_AFTER_WEEK,
    weekStartJst: MONDAY,
  });
  expect(review).toMatchObject({
    activeDays: 2,
    confirmedMinutes: 150,
    previousActiveDays: 2,
    previousConfirmedMinutes: 150,
    previousWeekStart: "2026-08-10",
    skippedMinutes: 40,
    weekEnd: "2026-08-23",
    weekStart: MONDAY,
  });
  expect(review.digest).toMatchObject({
    confirmedCount: 2,
    isPartial: false,
    leftoverCount: 1,
    ongoingCount: 1,
    plannedCount: 5,
    skippedCount: 1,
  });
});

test("週の途中の日付を渡してもその週の月曜に正規化される", async () => {
  const t = owner();
  const review = await t.query(api.queries.review.weeklyReview.weeklyReview, {
    todayJst: TODAY_AFTER_WEEK,
    weekStartJst: "2026-08-20",
  });
  expect(review.weekStart).toBe(MONDAY);
  expect(review.weekEnd).toBe("2026-08-23");
});

test("今週はターゲットが配列で返り、今日の行は消化に数えない", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, {
    name: "TOEIC対策",
    rows: [
      { dateJst: MONDAY, minutes: 60, status: "確定" },
      { dateJst: TODAY_IN_WEEK, minutes: 60, status: "確定" },
      { dateJst: TODAY_IN_WEEK, minutes: 30, status: "未着手" },
    ],
    sortOrder: 0,
  });
  await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 100,
  });

  const review = await t.query(api.queries.review.weeklyReview.weeklyReview, {
    todayJst: TODAY_IN_WEEK,
    weekStartJst: MONDAY,
  });
  expect(review.isCurrentWeek).toBe(true);
  expect(review.targets).toHaveLength(1);
  expect(review.targets?.[0]).toMatchObject({ achieved: true, current: 120 });
  expect(review.digest.isPartial).toBe(true);
  expect(review.digest.plannedCount).toBe(1);
  expect(review.digest.countedThrough).toBe("2026-08-19");
  expect(review.elapsedDays).toBe(4);
  expect(review.confirmedMinutes).toBe(120);
});

test("過去週はターゲットが null になり、7日すべてを数える", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, {
    name: "TOEIC対策",
    rows: [{ dateJst: MONDAY, minutes: 60, status: "確定" }],
    sortOrder: 0,
  });
  await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 100,
  });

  const review = await t.query(api.queries.review.weeklyReview.weeklyReview, {
    todayJst: TODAY_AFTER_WEEK,
    weekStartJst: MONDAY,
  });
  expect(review.isCurrentWeek).toBe(false);
  expect(review.targets).toBeNull();
  expect(review.digest.isPartial).toBe(false);
  expect(review.elapsedDays).toBe(7);
});

test("ターゲットが0件のままの今週は空配列(null ではない)", async () => {
  const review = await owner().query(api.queries.review.weeklyReview.weeklyReview, {
    todayJst: TODAY_IN_WEEK,
    weekStartJst: MONDAY,
  });
  expect(review.targets).toEqual([]);
});

test("ゴミ箱の記録と日は集計・消化・byDay・共有文・ターゲット実績から除かれる", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, {
    name: "TOEIC対策",
    rows: [
      { dateJst: MONDAY, minutes: 60, status: "確定" },
      { dateJst: "2026-08-18", minutes: 90, status: "確定", deletedAt: 1 },
    ],
    sortOrder: 0,
  });
  await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 100,
  });
  await t.run(async (ctx) => {
    const day = await ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) =>
        q.eq("ownerId", OWNER.subject).eq("dateJst", "2026-08-18"),
      )
      .first();
    if (day !== null) {
      await ctx.db.patch("days", day._id, { deletedAt: 1 });
    }
  });

  const review = await t.query(api.queries.review.weeklyReview.weeklyReview, {
    todayJst: TODAY_IN_WEEK,
    weekStartJst: MONDAY,
  });
  expect(review.confirmedMinutes).toBe(60);
  expect(review.digest.plannedCount).toBe(1);
  expect(review.byDay[1]).toMatchObject({ confirmedMinutes: 0, kind: "rest" });
  expect(review.shareMarkdown).toContain("60分");
  expect(review.targets?.[0]).toMatchObject({ achieved: false, current: 60 });
});

test("前週に記録が無ければ前週比の生値は0", async () => {
  const t = owner();
  await seedCategory(t, {
    name: "TOEIC対策",
    rows: [{ dateJst: MONDAY, minutes: 60, status: "確定" }],
    sortOrder: 0,
  });
  const review = await t.query(api.queries.review.weeklyReview.weeklyReview, {
    todayJst: TODAY_AFTER_WEEK,
    weekStartJst: MONDAY,
  });
  expect(review.previousConfirmedMinutes).toBe(0);
  expect(review.previousActiveDays).toBe(0);
});

test("共有文は見出し行+カテゴリ+項目行の週版になり、確定0件なら空文字列", async () => {
  const t = owner();
  await seedCategory(t, {
    itemName: "金のフレーズ",
    name: "TOEIC対策",
    rows: [
      { dateJst: MONDAY, minutes: 60, status: "確定" },
      { dateJst: "2026-08-18", minutes: 60, status: "確定" },
    ],
    sortOrder: 0,
  });
  await seedCategory(t, {
    name: "英会話",
    rows: [{ dateJst: "2026-08-19", minutes: 30, status: "確定" }],
    sortOrder: 1,
  });

  const review = await t.query(api.queries.review.weeklyReview.weeklyReview, {
    todayJst: TODAY_AFTER_WEEK,
    weekStartJst: MONDAY,
  });
  expect(review.shareMarkdown.split("\n")).toEqual([
    "週次まとめ 2026-08-17〜2026-08-23（学習量 150分 / 実施 3日）",
    "- TOEIC対策",
    "  - 金のフレーズ 120分",
    "- 英会話 30分",
  ]);

  const empty = await t.query(api.queries.review.weeklyReview.weeklyReview, {
    todayJst: TODAY_AFTER_WEEK,
    weekStartJst: "2026-08-10",
  });
  expect(empty.shareMarkdown).toBe("");
});

test("週の指定が日付形式でなければ拒否される", async () => {
  await expect(
    owner().query(api.queries.review.weeklyReview.weeklyReview, {
      todayJst: TODAY_AFTER_WEEK,
      weekStartJst: "今週",
    }),
  ).rejects.toThrow();
});

test("今日の指定が日付形式でなければ拒否される", async () => {
  await expect(
    owner().query(api.queries.review.weeklyReview.weeklyReview, {
      todayJst: "きょう",
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("byDay は月曜から日曜の7件で、コンディション未選択は null", async () => {
  const t = owner();
  await seedCategory(t, {
    name: "TOEIC対策",
    rows: [{ dateJst: MONDAY, minutes: 60, status: "確定" }],
    sortOrder: 0,
  });
  await t.run(async (ctx) => {
    const day = await ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", OWNER.subject).eq("dateJst", MONDAY))
      .first();
    if (day !== null) {
      await ctx.db.patch("days", day._id, { condition: "好調" });
    }
  });

  const review = await t.query(api.queries.review.weeklyReview.weeklyReview, {
    todayJst: TODAY_IN_WEEK,
    weekStartJst: MONDAY,
  });
  expect(review.byDay).toHaveLength(7);
  expect(review.byDay.map((day) => day.dateJst)).toEqual([
    MONDAY,
    "2026-08-18",
    "2026-08-19",
    "2026-08-20",
    "2026-08-21",
    "2026-08-22",
    "2026-08-23",
  ]);
  expect(review.byDay[0]?.condition).toBe("好調");
  expect(review.byDay[1]?.condition).toBeNull();
  expect(review.byDay[6]?.kind).toBe("unrecorded");
});
