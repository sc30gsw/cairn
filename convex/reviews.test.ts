import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  REVIEW_DUE_MESSAGE,
  REVIEW_OF_REVIEW_MESSAGE,
  REVIEW_ONLY_CONFIRMED_MESSAGE,
} from "./lib/review";
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
const OTHER = { email: "other@example.com", subject: "other-subject" };
const DAY1 = "2026-08-17";
const DAY2 = "2026-08-18";
const DAY5 = "2026-08-21";
const DAY10 = "2026-08-26";

function raw() {
  return convexTest(schema, modules);
}

type Harness = ReturnType<typeof raw>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${DAY1}T12:00:00+09:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

//? プリセットの無い所有者。今日を開いても記録は並ばず、復習だけが並ぶ状態を作れる
async function seedItem(t: Harness, ownerId: string = OWNER.subject): Promise<Id<"items">> {
  return await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "TOEIC対策",
      ownerId,
      sortOrder: 0,
    });
    return await ctx.db.insert("items", {
      categoryId,
      name: "金のフレーズ",
      ownerId,
      sortOrder: 0,
    });
  });
}

async function seedConfirmedRow(
  t: Harness,
  args: {
    content?: string;
    dateJst: string;
    itemId: Id<"items">;
    ownerId?: string;
    status?: "確定" | "未着手";
  },
): Promise<Id<"rows">> {
  const ownerId = args.ownerId ?? OWNER.subject;
  return await t.run(async (ctx) => {
    const existing = await ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", args.dateJst))
      .unique();
    const dayId =
      existing?._id ?? (await ctx.db.insert("days", { dateJst: args.dateJst, ownerId }));
    return await ctx.db.insert("rows", {
      content: args.content ?? "Unit 1 を音読",
      dateJst: args.dateJst,
      dayId,
      itemId: args.itemId,
      minutes: 30,
      ownerId,
      sortOrder: 0,
      status: args.status ?? "確定",
    });
  });
}

async function flags(t: Harness) {
  return await t.run(async (ctx) => ctx.db.query("reviewFlags").collect());
}

async function dayRows(t: Harness, dateJst: string) {
  const page = await t
    .withIdentity(OWNER)
    .query(api.queries.days.get.get, { dateJst, todayJst: dateJst });
  return page.rows;
}

test("確定した記録にだけ印を付けられ、既定の期日は翌日。付け直しは期日だけを変える", async () => {
  const t = raw();
  const owner = t.withIdentity(OWNER);
  const itemId = await seedItem(t);
  const confirmed = await seedConfirmedRow(t, { dateJst: DAY1, itemId });
  const pending = await seedConfirmedRow(t, { dateJst: DAY1, itemId, status: "未着手" });

  await expect(
    owner.mutation(api.mutations.reviews.flag.flag, { rowId: pending, todayJst: DAY1 }),
  ).rejects.toThrow(REVIEW_ONLY_CONFIRMED_MESSAGE);
  await owner.mutation(api.mutations.reviews.flag.flag, { rowId: confirmed, todayJst: DAY1 });

  const [flag] = await flags(t);
  expect(flag).toMatchObject({
    content: "Unit 1 を音読",
    dueJst: DAY2,
    itemId,
    sourceRowId: confirmed,
    stage: 0,
  });
  const rows = await dayRows(t, DAY1);
  expect(rows.find((row) => row._id === confirmed)?.review).toEqual({
    dueJst: DAY2,
    kind: "source",
    stage: 0,
  });
  expect(rows.find((row) => row._id === pending)?.review).toBeNull();

  await owner.mutation(api.mutations.reviews.flag.flag, {
    dueJst: DAY5,
    rowId: confirmed,
    todayJst: DAY1,
  });
  expect(await flags(t)).toHaveLength(1);
  expect((await flags(t))[0]?.dueJst).toBe(DAY5);

  await expect(
    owner.mutation(api.mutations.reviews.flag.flag, {
      dueJst: DAY1,
      rowId: confirmed,
      todayJst: DAY1,
    }),
  ).rejects.toThrow(REVIEW_DUE_MESSAGE);

  await owner.mutation(api.mutations.reviews.unflag.unflag, { rowId: confirmed });
  expect(await flags(t)).toEqual([]);
});

test("他の所有者の記録には印を付けられない", async () => {
  const t = raw();
  const itemId = await seedItem(t, OTHER.subject);
  const rowId = await seedConfirmedRow(t, { dateJst: DAY1, itemId, ownerId: OTHER.subject });

  await expect(
    t.withIdentity(OWNER).mutation(api.mutations.reviews.flag.flag, { rowId, todayJst: DAY1 }),
  ).rejects.toThrow();
});

test("期日が来た日に今日を開くと、復習が先頭に未着手で並び、期日超過も繰り越す", async () => {
  const t = raw();
  const owner = t.withIdentity(OWNER);
  const itemId = await seedItem(t);
  const source = await seedConfirmedRow(t, { dateJst: DAY1, itemId });
  await owner.mutation(api.mutations.reviews.flag.flag, { rowId: source, todayJst: DAY1 });

  //? 期日の前日に開いても並ばない
  expect(
    await owner.mutation(api.mutations.days.open.open, { dateJst: DAY1, todayJst: DAY1 }),
  ).toEqual({
    applied: false,
  });
  expect((await dayRows(t, DAY1)).filter((row) => row.review?.kind === "review")).toEqual([]);

  //? 期日（翌日）を飛ばして 5 日後に開く: 期日超過でも今日に並ぶ
  vi.setSystemTime(new Date(`${DAY5}T09:00:00+09:00`));
  await t.run(async (ctx) => {
    const day = await ctx.db.insert("days", { dateJst: DAY5, ownerId: OWNER.subject });
    await ctx.db.insert("rows", {
      content: "",
      dateJst: DAY5,
      dayId: day,
      itemId,
      minutes: 20,
      ownerId: OWNER.subject,
      sortOrder: 0,
      status: "未着手",
    });
  });
  await owner.mutation(api.mutations.days.open.open, { dateJst: DAY5, todayJst: DAY5 });

  const rows = await dayRows(t, DAY5);
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    content: "Unit 1 を音読",
    itemName: "金のフレーズ",
    minutes: 0,
    review: { kind: "review", stage: 0 },
    status: "未着手",
  });
  expect(rows[1]?.review).toBeNull();
  //? もう一度開いても二重には並ばない
  await owner.mutation(api.mutations.days.open.open, { dateJst: DAY5, todayJst: DAY5 });
  expect(await dayRows(t, DAY5)).toHaveLength(2);
  //? 復習の記録そのものには印を付け直せない
  const reviewRow = rows[0]?._id as Id<"rows">;
  await owner.mutation(api.mutations.rows.confirm.confirm, {
    content: "Unit 1 を音読",
    minutes: 10,
    rowId: reviewRow,
  });
  expect(await flags(t)).toHaveLength(1);
});

test("復習を確定すると段階が進み、次の期日はその日から数える。最後の段階で印は消える", async () => {
  const t = raw();
  const owner = t.withIdentity(OWNER);
  const itemId = await seedItem(t);
  const source = await seedConfirmedRow(t, { dateJst: DAY1, itemId });
  await owner.mutation(api.mutations.reviews.flag.flag, { rowId: source, todayJst: DAY1 });

  vi.setSystemTime(new Date(`${DAY2}T09:00:00+09:00`));
  await owner.mutation(api.mutations.days.open.open, { dateJst: DAY2, todayJst: DAY2 });
  const [first] = await dayRows(t, DAY2);
  const firstId = first?._id as Id<"rows">;
  await expect(
    owner.mutation(api.mutations.reviews.flag.flag, { rowId: firstId, todayJst: DAY2 }),
  ).rejects.toThrow(REVIEW_OF_REVIEW_MESSAGE);
  await owner.mutation(api.mutations.rows.confirm.confirm, {
    content: "Unit 1 を音読",
    minutes: 10,
    rowId: firstId,
  });

  let [flag] = await flags(t);
  expect(flag).toMatchObject({ dueJst: DAY5, stage: 1 });
  expect(flag?.reviewRowId).toBeUndefined();
  //? 確定した復習の記録は普通の確定した記録になり、元の記録は次の期日を持つ
  const day2 = await dayRows(t, DAY2);
  expect(day2[0]?.review).toBeNull();
  expect((await dayRows(t, DAY1))[0]?.review).toEqual({ dueJst: DAY5, kind: "source", stage: 1 });

  //? 段階 1（3日後）→ 2（7日後）→ 3（14日後）→ 終了
  for (const [dateJst, expectedNext] of [
    [DAY5, 2],
    ["2026-08-28", 3],
    ["2026-09-11", null],
  ] as const) {
    vi.setSystemTime(new Date(`${dateJst}T09:00:00+09:00`));
    await owner.mutation(api.mutations.days.open.open, { dateJst, todayJst: dateJst });
    const [review] = await dayRows(t, dateJst);
    expect(review?.review?.kind).toBe("review");
    await owner.mutation(api.mutations.rows.confirm.confirm, {
      content: "",
      minutes: 5,
      rowId: review?._id as Id<"rows">,
    });
    [flag] = await flags(t);
    if (expectedNext === null) {
      expect(flag).toBeUndefined();
    } else {
      expect(flag?.stage).toBe(expectedNext);
    }
  }
});

test("復習を見送るか、ゴミ箱に入れると復習は終わる", async () => {
  const t = raw();
  const owner = t.withIdentity(OWNER);
  const itemId = await seedItem(t);
  const skipped = await seedConfirmedRow(t, { content: "見送る方", dateJst: DAY1, itemId });
  const removed = await seedConfirmedRow(t, { content: "捨てる方", dateJst: DAY1, itemId });
  await owner.mutation(api.mutations.reviews.flag.flag, { rowId: skipped, todayJst: DAY1 });
  await owner.mutation(api.mutations.reviews.flag.flag, { rowId: removed, todayJst: DAY1 });

  vi.setSystemTime(new Date(`${DAY2}T09:00:00+09:00`));
  await owner.mutation(api.mutations.days.open.open, { dateJst: DAY2, todayJst: DAY2 });
  const rows = await dayRows(t, DAY2);
  expect(rows.map((row) => row.content)).toEqual(["見送る方", "捨てる方"]);
  await owner.mutation(api.mutations.rows.skip.skip, { rowId: rows[0]?._id as Id<"rows"> });
  expect(await flags(t)).toHaveLength(1);
  await owner.mutation(api.mutations.rows.remove.remove, { rowId: rows[1]?._id as Id<"rows"> });
  expect(await flags(t)).toEqual([]);
  expect(await dayRows(t, DAY10)).toEqual([]);
});
