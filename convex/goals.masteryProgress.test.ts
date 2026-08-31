import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { TRASH_TTL_MS } from "./lib/trash";
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
const TODAY = "2026-08-17";
const YESTERDAY = "2026-08-16";

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

const MASTERY_GOAL = {
  content: "音読を止まらずにできる",
  criterion: "1分間で120語",
  type: "mastery",
} as const;

const CONCRETE_ACTION = "Unit 1 を音読する";

async function seedItemId(t: ReturnType<typeof owner>, ownerId: string = OWNER.subject) {
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

async function addRow(t: ReturnType<typeof owner>, itemId: Id<"items">, dateJst: string) {
  return await t.mutation(api.mutations.rows.add.add, {
    content: CONCRETE_ACTION,
    dateJst,
    itemId,
    minutes: 0,
    todayJst: TODAY,
  });
}

async function confirmRow(t: ReturnType<typeof owner>, rowId: Id<"rows">, minutes: number) {
  await t.mutation(api.mutations.rows.confirm.confirm, {
    content: CONCRETE_ACTION,
    minutes,
    rowId,
  });
}

async function addConfirmedRow(
  t: ReturnType<typeof owner>,
  itemId: Id<"items">,
  entry: { dateJst: string; minutes: number },
) {
  const rowId = await addRow(t, itemId, entry.dateJst);
  await confirmRow(t, rowId, entry.minutes);
  return rowId;
}

async function progressOf(t: ReturnType<typeof owner>, goalId: Id<"goals">) {
  const goals = await t.query(api.queries.goals.list.list, {});
  const goal = goals.find((entry) => entry._id === goalId);
  if (goal === undefined || goal.type !== "mastery") {
    throw new Error("習得目標が見つからない");
  }
  return { activeDays: goal.activeDays, confirmedMinutes: goal.confirmedMinutes };
}

async function liveDayId(t: ReturnType<typeof owner>, dateJst: string) {
  const page = await t.query(api.queries.days.get.get, { dateJst, todayJst: TODAY });
  const dayId = page.day?._id;
  if (dayId === undefined) {
    throw new Error("日が見つからない");
  }
  return dayId;
}

async function repair(t: ReturnType<typeof owner>) {
  await t.mutation(internal.mutations.goals.recomputeMasteryProgress.recomputeMasteryProgress, {
    ownerId: OWNER.subject,
  });
}

test("習得には目標作成以降の確定分数と実施日数が併記される", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  await addConfirmedRow(t, itemId, { dateJst: YESTERDAY, minutes: 90 });
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });
  await addRow(t, itemId, TODAY);
  const skipped = await addRow(t, itemId, TODAY);
  await t.mutation(api.mutations.rows.skip.skip, { rowId: skipped });

  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
});

test("記録の確定で学習量の実績が増え、分数の編集にも追従する", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });

  const rowId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await confirmRow(t, rowId, 45);
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 45 });
});

test("同じ日の2件目の確定では実施日数が増えない", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });

  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
});

test("確定をスキップに戻すと実績が減る", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  const rowId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });

  await t.mutation(api.mutations.rows.skip.skip, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});

test("確定を未着手に戻すと実績が減る", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  const rowId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });

  await t.mutation(api.mutations.rows.unconfirm.unconfirm, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  const page = await t.query(api.queries.days.get.get, { dateJst: TODAY, todayJst: TODAY });
  expect(page.rows.find((entry) => entry._id === rowId)?.status).toBe("未着手");
});

test("確定記録をゴミ箱に入れると実績が減り、戻すと実績も戻る", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  const rowId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });

  await t.mutation(api.mutations.rows.remove.remove, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 20 });

  await t.mutation(api.mutations.rows.restore.restore, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
});

test("昨日の確定コピーで上書きした確定は実績から外れる", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await addConfirmedRow(t, itemId, { dateJst: YESTERDAY, minutes: 25 });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await t.mutation(api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed, {
    dateJst: TODAY,
    todayJst: TODAY,
  });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});

test("最後の確定記録を消すと実施日数も減る", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  const rowId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });

  await t.mutation(api.mutations.rows.remove.remove, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  await t.mutation(api.mutations.rows.restore.restore, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("日をゴミ箱に入れると配下の確定が実績から外れ、戻すと実績も戻る", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });
  const dayId = await liveDayId(t, TODAY);

  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: TODAY });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  await t.mutation(api.mutations.trash.restoreDay.restoreDay, { dayId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
});

test("ゴミ箱の日に属する確定記録は、消しても実績を動かさず、日を戻すまで戻せない", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  const rowId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  const dayId = await liveDayId(t, TODAY);

  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: TODAY });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  await t.mutation(api.mutations.rows.remove.remove, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  await expect(t.mutation(api.mutations.rows.restore.restore, { rowId })).rejects.toThrow();

  await t.mutation(api.mutations.trash.restoreDay.restoreDay, { dayId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  await t.mutation(api.mutations.rows.restore.restore, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("未着手だけを入れ替えるプリセット切替では実績が動かない", async () => {
  const t = owner();
  await t.mutation(api.mutations.catalog.ensure.ensure, {});
  await t.mutation(api.mutations.days.open.open, { dateJst: TODAY, todayJst: TODAY });
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  await addRow(t, itemId, TODAY);

  const presets = await t.query(api.queries.presets.list.list, {});
  const target = presets.find((preset) => preset.lines.length > 0);
  if (target === undefined) {
    throw new Error("切替先のプリセットがない");
  }
  await t.mutation(api.mutations.rows.switchPreset.switchPreset, {
    dateJst: TODAY,
    presetId: target._id,
    todayJst: TODAY,
  });

  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("ゴミ箱の完全削除では実績が動かない", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  const purgedId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });

  await t.mutation(api.mutations.rows.remove.remove, { rowId: purgedId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await t.mutation(api.mutations.trash.purgeRow.purgeRow, { rowId: purgedId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: TODAY });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  const trashedDay = (await t.query(api.queries.trash.list.list, {})).days.find(
    (day) => day.dateJst === TODAY,
  );
  if (trashedDay === undefined) {
    throw new Error("ゴミ箱の日がない");
  }
  await t.mutation(api.mutations.trash.purgeDay.purgeDay, { dayId: trashedDay._id });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});

test("期限切れの自動完全削除では実績が動かない", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  const expiredId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });
  await t.mutation(api.mutations.rows.remove.remove, { rowId: expiredId });

  const trashedRow = (await t.query(api.queries.trash.list.list, {})).rows.find(
    (row) => row._id === expiredId,
  );
  if (trashedRow === undefined) {
    throw new Error("ゴミ箱の記録がない");
  }
  await t.mutation(internal.mutations.trash.purgeExpired.purgeExpired, {
    now: trashedRow.deletedAt + TRASH_TTL_MS,
  });

  expect((await t.query(api.queries.trash.list.list, {})).rows).toEqual([]);
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("目標を作った日に既にある確定は実績の初期値に入る", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });

  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("作成日の確定は複数件でも初期値に入り、前日ぶんと確定以外は入らない", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  await addConfirmedRow(t, itemId, { dateJst: YESTERDAY, minutes: 90 });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });
  await addRow(t, itemId, TODAY);

  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
  await repair(t);
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
});

test("目標を作る前の日の確定は、あとから消しても実績を動かさない", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const rowId = await addConfirmedRow(t, itemId, { dateJst: YESTERDAY, minutes: 90 });
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  await t.mutation(api.mutations.rows.remove.remove, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});

test("目標の編集では学習量の実績を持ち越す", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });

  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...MASTERY_GOAL, criterion: "1分間で150語" },
    goalId: masteryId,
  });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("他人の確定は自分の習得目標の実績を動かさない", async () => {
  const t = raw();
  const asOwner = t.withIdentity(OWNER);
  const asOther = t.withIdentity(OTHER_OWNER);
  const masteryId = await asOwner.mutation(api.mutations.goals.create.create, {
    goal: MASTERY_GOAL,
  });

  const otherItemId = await seedItemId(asOther, OTHER_OWNER.subject);
  await addConfirmedRow(asOther, otherItemId, { dateJst: TODAY, minutes: 120 });

  expect(await progressOf(asOwner, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});

test("未認証では記録を確定できず、実績も動かない", async () => {
  const t = raw();
  const asOwner = t.withIdentity(OWNER);
  const itemId = await seedItemId(asOwner);
  const masteryId = await asOwner.mutation(api.mutations.goals.create.create, {
    goal: MASTERY_GOAL,
  });
  const rowId = await addRow(asOwner, itemId, TODAY);

  await expect(
    t.mutation(api.mutations.rows.confirm.confirm, {
      content: CONCRETE_ACTION,
      minutes: 30,
      rowId,
    }),
  ).rejects.toThrow();
  expect(await progressOf(asOwner, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });
});
