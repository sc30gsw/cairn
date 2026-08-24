import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { GOAL_SCOPE_FROZEN_MESSAGE, GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE } from "./lib/domain";
import schema from "./schema";

//? 対象項目(scopeItemIds)で絞った学習量の実績(#53)。差分更新の経路別テストは
//? goals.masteryProgress.test.ts、凍結と修復は goals.masteryProgressRepair.test.ts に置く。
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
const TODAY = "2026-08-17";
const YESTERDAY = "2026-08-16";

//? 実績の起点は目標の作成日なので、サーバが見る現在時刻を固定する。
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00+09:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

function raw() {
  return convexTest(schema, modules);
}

function owner() {
  return raw().withIdentity(OWNER);
}

type Client = ReturnType<typeof owner>;

const MASTERY_GOAL = {
  content: "音読を止まらずにできる",
  criterion: "1分間で120語",
  type: "mastery",
} as const;

const CONCRETE_ACTION = "Unit 1 を音読する";

//? 実績は保存カウンタなので、テストは rows を直接 insert せず必ず本物の mutation を通す。
//? 対象項目の効果を見るために、カテゴリ1つに項目2つを用意する。
async function seedItems(t: Client, ownerId: string = OWNER.subject) {
  return await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "TOEIC対策",
      ownerId,
      sortOrder: 0,
    });
    const inScope = await ctx.db.insert("items", {
      categoryId,
      name: "金のフレーズ",
      ownerId,
      sortOrder: 0,
    });
    const outOfScope = await ctx.db.insert("items", {
      categoryId,
      name: "多読",
      ownerId,
      sortOrder: 1,
    });
    return { inScope, outOfScope };
  });
}

async function addRow(t: Client, itemId: Id<"items">, dateJst: string) {
  return await t.mutation(api.mutations.rows.add.add, {
    content: CONCRETE_ACTION,
    dateJst,
    itemId,
    minutes: 0,
    todayJst: TODAY,
  });
}

async function addConfirmedRow(
  t: Client,
  itemId: Id<"items">,
  entry: { dateJst: string; minutes: number },
) {
  const rowId = await addRow(t, itemId, entry.dateJst);
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: CONCRETE_ACTION,
    minutes: entry.minutes,
    rowId,
  });
  return rowId;
}

async function masteryGoalOf(t: Client, goalId: Id<"goals">) {
  const goals = await t.query(api.queries.goals.list.list, {});
  const goal = goals.find((entry) => entry._id === goalId);
  if (goal === undefined || goal.type !== "mastery") {
    throw new Error("習得目標が見つからない");
  }
  return goal;
}

async function progressOf(t: Client, goalId: Id<"goals">) {
  const goal = await masteryGoalOf(t, goalId);
  return { activeDays: goal.activeDays, confirmedMinutes: goal.confirmedMinutes };
}

async function createScopedGoal(t: Client, scopeItemIds: Id<"items">[] | undefined) {
  return await t.mutation(api.mutations.goals.create.create, {
    goal: { ...MASTERY_GOAL, scopeItemIds },
  });
}

async function updateScope(
  t: Client,
  goalId: Id<"goals">,
  scopeItemIds: Id<"items">[] | undefined,
) {
  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...MASTERY_GOAL, scopeItemIds },
    goalId,
  });
}

//? 「数え直しが走っていない」ことを確かめるために、保存カウンタを意図的に狂わせる。
//? 数え直しが走れば実測値に戻り、走らなければ狂った値が残る。
async function driftCounter(t: Client, goalId: Id<"goals">) {
  await t.run(async (ctx) => {
    await ctx.db.patch("goals", goalId, { activeDays: 99, confirmedMinutes: 9999 });
  });
}

async function liveDayId(t: Client, dateJst: string) {
  const page = await t.query(api.queries.days.get.get, { dateJst, todayJst: TODAY });
  const dayId = page.day?._id;
  if (dayId === undefined) {
    throw new Error("日が見つからない");
  }
  return dayId;
}

//? カウンタ漂流時の修復手段(ADR-0007)。対象項目つきでも同じ入口で数え直せることを確かめる。
async function repair(t: Client) {
  await t.mutation(internal.mutations.goals.recomputeMasteryProgress.recomputeMasteryProgress, {
    ownerId: OWNER.subject,
  });
}

test("対象項目つきで作成すると、作成日の対象内の確定だけが初期値になる", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 240 });

  const goalId = await createScopedGoal(t, [inScope]);
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
  //? 重複は落ち、保存形は正規化された配列になる
  expect((await masteryGoalOf(t, goalId)).scopeItemIds).toEqual([inScope]);
});

test("空配列の対象項目は「すべての記録」に畳まれる", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 20 });

  const goalId = await createScopedGoal(t, []);
  expect((await masteryGoalOf(t, goalId)).scopeItemIds).toBeUndefined();
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
});

test("重複した対象項目は正規化されて1件になる", async () => {
  const t = owner();
  const { inScope } = await seedItems(t);

  const goalId = await createScopedGoal(t, [inScope, inScope]);
  expect((await masteryGoalOf(t, goalId)).scopeItemIds).toEqual([inScope]);
});

test("対象内の確定でカウンタが増え、対象外の確定では増えない", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await createScopedGoal(t, [inScope]);

  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 240 });
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("対象外だけの暦日は実施日にも数えない", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await createScopedGoal(t, [inScope]);

  await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 240 });
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});

test("対象外の確定を取り消し・見送り・削除・復元しても、対象つき目標は漂流しない", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await createScopedGoal(t, [inScope]);
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  const expected = { activeDays: 1, confirmedMinutes: 30 };

  const unconfirmed = await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 20 });
  await t.mutation(api.mutations.rows.unconfirm.unconfirm, { rowId: unconfirmed });
  expect(await progressOf(t, goalId)).toEqual(expected);

  const skipped = await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 25 });
  await t.mutation(api.mutations.rows.skip.skip, { rowId: skipped });
  expect(await progressOf(t, goalId)).toEqual(expected);

  const removed = await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 40 });
  await t.mutation(api.mutations.rows.remove.remove, { rowId: removed });
  expect(await progressOf(t, goalId)).toEqual(expected);

  await t.mutation(api.mutations.rows.restore.restore, { rowId: removed });
  expect(await progressOf(t, goalId)).toEqual(expected);

  //? 修復と一致する = 差分更新が実測とずれていない
  await repair(t);
  expect(await progressOf(t, goalId)).toEqual(expected);
});

test("1トランザクションで対象内・対象外が同時に動いても、対象内のぶんだけ動く", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const scopedId = await createScopedGoal(t, [inScope]);
  const allId = await createScopedGoal(t, undefined);
  //? 昨日にも同じ2項目の確定を置くと、コピーが今日の確定2件を1トランザクションで消す
  await addConfirmedRow(t, inScope, { dateJst: YESTERDAY, minutes: 15 });
  await addConfirmedRow(t, outOfScope, { dateJst: YESTERDAY, minutes: 15 });
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 20 });
  expect(await progressOf(t, scopedId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
  expect(await progressOf(t, allId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });

  await t.mutation(api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed, {
    dateJst: TODAY,
    todayJst: TODAY,
  });

  expect(await progressOf(t, scopedId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
  expect(await progressOf(t, allId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
  await repair(t);
  expect(await progressOf(t, scopedId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});

test("対象項目を絞る編集で、作成日以降が数え直される", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await createScopedGoal(t, undefined);
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 240 });
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 270 });

  await updateScope(t, goalId, [inScope]);
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("対象項目を広げる編集でも数え直され、全解除ですべての記録に戻る", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await createScopedGoal(t, [inScope]);
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 240 });
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await updateScope(t, goalId, [inScope, outOfScope]);
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 270 });

  await updateScope(t, goalId, undefined);
  expect((await masteryGoalOf(t, goalId)).scopeItemIds).toBeUndefined();
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 270 });
});

test("対象項目の順序だけを変えた編集では数え直さない", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await createScopedGoal(t, [inScope, outOfScope]);
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  await driftCounter(t, goalId);

  await updateScope(t, goalId, [outOfScope, inScope]);
  //? 数え直しが走っていれば実測に戻る。走らないので狂った値が残る
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 99, confirmedMinutes: 9999 });
});

test("達成済みの目標では対象項目を変えられず、内容の編集では実績が据え置かれる", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await createScopedGoal(t, [inScope]);
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { achievedAt: TODAY, goalId });

  await expect(updateScope(t, goalId, [inScope, outOfScope])).rejects.toThrow(
    GOAL_SCOPE_FROZEN_MESSAGE,
  );
  await expect(updateScope(t, goalId, undefined)).rejects.toThrow(GOAL_SCOPE_FROZEN_MESSAGE);

  //? 対象項目が同じなら内容の編集は通り、凍結された実績はそのまま
  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...MASTERY_GOAL, criterion: "1分間で150語", scopeItemIds: [inScope] },
    goalId,
  });
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
  expect((await masteryGoalOf(t, goalId)).criterion).toBe("1分間で150語");
});

test("達成を外すと、そのときの対象項目で数え直される", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await createScopedGoal(t, [inScope]);
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { achievedAt: TODAY, goalId });
  //? 凍結中の確定はどちらの項目でも実績を動かさない
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 20 });
  await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 240 });
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { goalId });
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
});

test("他人の項目・存在しない項目を対象項目に指定すると拒否される", async () => {
  const t = raw();
  const asOwner = t.withIdentity(OWNER);
  const asOther = t.withIdentity(OTHER_OWNER);
  const { inScope } = await seedItems(asOwner);
  const other = await seedItems(asOther, OTHER_OWNER.subject);

  await expect(createScopedGoal(asOwner, [other.inScope])).rejects.toThrow(
    GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE,
  );

  //? 実在しない id(作って消した項目)
  const goneId = await asOwner.run(async (ctx) => {
    const item = await ctx.db.insert("items", {
      categoryId: (await ctx.db.get("items", inScope))?.categoryId,
      name: "消える項目",
      ownerId: OWNER.subject,
      sortOrder: 9,
    });
    await ctx.db.delete("items", item);
    return item;
  });
  await expect(createScopedGoal(asOwner, [goneId])).rejects.toThrow(
    GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE,
  );

  const goalId = await createScopedGoal(asOwner, [inScope]);
  await expect(updateScope(asOwner, goalId, [other.inScope])).rejects.toThrow(
    GOAL_SCOPE_ITEM_UNKNOWN_MESSAGE,
  );
});

test("対象項目にしている項目は削除できず、目標から外せば削除できる", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await createScopedGoal(t, [outOfScope]);

  await expect(
    t.mutation(api.mutations.items.remove.remove, { itemId: outOfScope }),
  ).rejects.toThrow("対象項目にしている目標がある項目は消せません");

  await updateScope(t, goalId, [inScope]);
  await t.mutation(api.mutations.items.remove.remove, { itemId: outOfScope });
  expect((await t.query(api.queries.items.list.list, {})).map((item) => item._id)).toEqual([
    inScope,
  ]);
});

test("日をゴミ箱に入れる・戻すで、対象つき目標の実施日が ±1 する", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await createScopedGoal(t, [inScope]);
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 240 });
  const dayId = await liveDayId(t, TODAY);

  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: TODAY });
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  await t.mutation(api.mutations.trash.restoreDay.restoreDay, { dayId });
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("修復の internalMutation は対象項目つきの目標もスコープ込みで数え直す", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await createScopedGoal(t, [inScope]);
  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 240 });
  await driftCounter(t, goalId);

  await repair(t);
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("対象項目なしの目標は従来どおり全記録を数える(既存の回帰)", async () => {
  const t = owner();
  const { inScope, outOfScope } = await seedItems(t);
  const goalId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  expect((await masteryGoalOf(t, goalId)).scopeItemIds).toBeUndefined();

  await addConfirmedRow(t, inScope, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, outOfScope, { dateJst: TODAY, minutes: 20 });
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });

  await repair(t);
  expect(await progressOf(t, goalId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
});
