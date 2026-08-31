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
const CONTENT = "Unit 1 を音読する";

function raw() {
  return convexTest(schema, modules);
}

function owner() {
  return raw().withIdentity(OWNER);
}

type SeedRow = Pick<Doc<"rows">, "dateJst" | "minutes" | "status">;

async function seedCategory(
  t: ReturnType<typeof owner>,
  name: string,
  sortOrder: number,
  rows: readonly SeedRow[] = [],
): Promise<Id<"categories">> {
  return t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name,
      ownerId: OWNER.subject,
      sortOrder,
    });
    const itemId = await ctx.db.insert("items", {
      categoryId,
      name: `${name}の項目`,
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    for (const [index, row] of rows.entries()) {
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
        content: CONTENT,
        dateJst: row.dateJst,
        dayId,
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

test("週間ターゲットを保存すると進捗つきで読める", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, "TOEIC対策", 0, [
    { dateJst: "2026-08-17", minutes: 30, status: "確定" },
    { dateJst: "2026-08-19", minutes: 45, status: "確定" },
  ]);
  const targetId = await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 60,
  });

  const targets = await t.query(api.queries.targets.listWithProgress.listWithProgress, {
    weekStartJst: MONDAY,
  });
  expect(targets).toEqual([
    {
      _id: targetId,
      achieved: true,
      categoryId,
      categoryName: "TOEIC対策",
      current: 75,
      metric: "minutes",
      targetValue: 60,
    },
  ]);
});

test("同じカテゴリに2件目を保存すると upsert になる", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, "TOEIC対策", 0, [
    { dateJst: "2026-08-17", minutes: 30, status: "確定" },
  ]);
  const first = await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 60,
  });
  const second = await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "days",
    targetValue: 3,
  });
  expect(second).toEqual(first);

  const targets = await t.query(api.queries.targets.listWithProgress.listWithProgress, {
    weekStartJst: MONDAY,
  });
  expect(targets).toHaveLength(1);
  expect(targets[0]).toMatchObject({ achieved: false, current: 1, metric: "days", targetValue: 3 });
});

test("count は確定記録の件数を数える", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, "多読", 0, [
    { dateJst: "2026-08-17", minutes: 10, status: "確定" },
    { dateJst: "2026-08-17", minutes: 10, status: "確定" },
    { dateJst: "2026-08-18", minutes: 10, status: "スキップ" },
  ]);
  await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "count",
    targetValue: 2,
  });

  const targets = await t.query(api.queries.targets.listWithProgress.listWithProgress, {
    weekStartJst: MONDAY,
  });
  expect(targets[0]).toMatchObject({ achieved: true, current: 2 });
});

test("前週の日曜と翌週の月曜の記録は今週に混ざらない", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, "TOEIC対策", 0, [
    { dateJst: "2026-08-16", minutes: 100, status: "確定" },
    { dateJst: "2026-08-17", minutes: 20, status: "確定" },
    { dateJst: "2026-08-23", minutes: 20, status: "確定" },
    { dateJst: "2026-08-24", minutes: 100, status: "確定" },
  ]);
  await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 40,
  });

  const targets = await t.query(api.queries.targets.listWithProgress.listWithProgress, {
    weekStartJst: MONDAY,
  });
  expect(targets[0]).toMatchObject({ achieved: true, current: 40 });
});

test("週の途中の日を渡してもその週の月曜〜日曜で集計する", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, "TOEIC対策", 0, [
    { dateJst: "2026-08-16", minutes: 100, status: "確定" },
    { dateJst: "2026-08-17", minutes: 20, status: "確定" },
    { dateJst: "2026-08-23", minutes: 20, status: "確定" },
    { dateJst: "2026-08-24", minutes: 100, status: "確定" },
  ]);
  await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 40,
  });

  const targets = await t.query(api.queries.targets.listWithProgress.listWithProgress, {
    weekStartJst: "2026-08-20",
  });
  expect(targets[0]).toMatchObject({ achieved: true, current: 40 });
});

test("週の指定が日付形式でなければ拒否される", async () => {
  const t = owner();
  await expect(
    t.query(api.queries.targets.listWithProgress.listWithProgress, { weekStartJst: "今週" }),
  ).rejects.toThrow();
});

test("未着手とスキップは進捗に数えない", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, "TOEIC対策", 0, [
    { dateJst: "2026-08-17", minutes: 30, status: "未着手" },
    { dateJst: "2026-08-18", minutes: 30, status: "スキップ" },
  ]);
  await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 30,
  });

  const targets = await t.query(api.queries.targets.listWithProgress.listWithProgress, {
    weekStartJst: MONDAY,
  });
  expect(targets[0]).toMatchObject({ achieved: false, current: 0 });
});

test("複数カテゴリはカテゴリの並び順で返る", async () => {
  const t = owner();
  const reading = await seedCategory(t, "多読", 1, [
    { dateJst: "2026-08-17", minutes: 15, status: "確定" },
  ]);
  const toeic = await seedCategory(t, "TOEIC対策", 0, [
    { dateJst: "2026-08-17", minutes: 30, status: "確定" },
  ]);
  await t.mutation(api.mutations.targets.save.save, {
    categoryId: reading,
    metric: "minutes",
    targetValue: 60,
  });
  await t.mutation(api.mutations.targets.save.save, {
    categoryId: toeic,
    metric: "minutes",
    targetValue: 30,
  });

  const targets = await t.query(api.queries.targets.listWithProgress.listWithProgress, {
    weekStartJst: MONDAY,
  });
  expect(targets.map((target) => target.categoryName)).toEqual(["TOEIC対策", "多読"]);
  expect(targets.map((target) => target.achieved)).toEqual([true, false]);
});

test("目標値が0以下や非整数なら拒否する", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, "TOEIC対策", 0);
  for (const targetValue of [0, -1, 1.5]) {
    await expect(
      t.mutation(api.mutations.targets.save.save, {
        categoryId,
        metric: "minutes",
        targetValue,
      }),
    ).rejects.toThrow();
  }
});

test("実施日の目標は7日を超えられない", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, "TOEIC対策", 0);
  await expect(
    t.mutation(api.mutations.targets.save.save, { categoryId, metric: "days", targetValue: 8 }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.targets.save.save, { categoryId, metric: "days", targetValue: 7 }),
  ).resolves.toBeDefined();
});

test("週間ターゲットを削除できる", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, "TOEIC対策", 0);
  const targetId = await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 60,
  });
  await t.mutation(api.mutations.targets.remove.remove, { targetId });
  expect(
    await t.query(api.queries.targets.listWithProgress.listWithProgress, {
      weekStartJst: MONDAY,
    }),
  ).toEqual([]);
});

test("カテゴリを消すと週間ターゲットも一緒に消える", async () => {
  const t = owner();
  const categoryId = await t.mutation(api.mutations.categories.create.create, {
    name: "自習",
  });
  await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 60,
  });
  await t.mutation(api.mutations.categories.remove.remove, { categoryId });
  expect(
    await t.query(api.queries.targets.listWithProgress.listWithProgress, {
      weekStartJst: MONDAY,
    }),
  ).toEqual([]);
});

test("未認証では読み書きできない", async () => {
  const anonymous = raw();
  const t = anonymous.withIdentity(OWNER);
  const categoryId = await seedCategory(t, "TOEIC対策", 0);
  await expect(
    anonymous.query(api.queries.targets.listWithProgress.listWithProgress, {
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
  await expect(
    anonymous.mutation(api.mutations.targets.save.save, {
      categoryId,
      metric: "minutes",
      targetValue: 60,
    }),
  ).rejects.toThrow();
});

test("他人のカテゴリやターゲットは操作できない", async () => {
  const shared = raw();
  const t = shared.withIdentity(OWNER);
  const categoryId = await seedCategory(t, "TOEIC対策", 0);
  const targetId = await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 60,
  });

  const stranger = shared.withIdentity(OTHER_OWNER);
  await expect(
    stranger.mutation(api.mutations.targets.save.save, {
      categoryId,
      metric: "minutes",
      targetValue: 10,
    }),
  ).rejects.toThrow();
  await expect(
    stranger.mutation(api.mutations.targets.remove.remove, { targetId }),
  ).rejects.toThrow();
  expect(
    await stranger.query(api.queries.targets.listWithProgress.listWithProgress, {
      weekStartJst: MONDAY,
    }),
  ).toEqual([]);
});

test("categoryId が無い項目の記録は進捗に加算されない", async () => {
  const t = owner();
  const categoryId = await seedCategory(t, "TOEIC対策", 0);
  await t.run(async (ctx) => {
    const itemId = await ctx.db.insert("items", {
      name: "レガシー項目",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    const dayId = await ctx.db.insert("days", { dateJst: "2026-08-17", ownerId: OWNER.subject });
    await ctx.db.insert("rows", {
      content: CONTENT,
      dateJst: "2026-08-17",
      dayId,
      itemId,
      minutes: 90,
      ownerId: OWNER.subject,
      sortOrder: 0,
      status: "確定",
    });
  });
  await t.mutation(api.mutations.targets.save.save, {
    categoryId,
    metric: "minutes",
    targetValue: 60,
  });

  const targets = await t.query(api.queries.targets.listWithProgress.listWithProgress, {
    weekStartJst: MONDAY,
  });
  expect(targets[0]).toMatchObject({ achieved: false, current: 0 });
});

test("削除済みカテゴリのターゲットはカテゴリ名を不明と表示する", async () => {
  const t = owner();
  const categoryId = await t.run(async (ctx) => {
    return await ctx.db.insert("categories", {
      name: "削除予定",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("targets", {
      categoryId,
      metric: "minutes",
      ownerId: OWNER.subject,
      targetValue: 60,
    });
    await ctx.db.delete("categories", categoryId);
  });

  const targets = await t.query(api.queries.targets.listWithProgress.listWithProgress, {
    weekStartJst: MONDAY,
  });
  expect(targets).toHaveLength(1);
  expect(targets[0]?.categoryName).toBe("不明");
  expect(targets[0]?.current).toBe(0);
});
