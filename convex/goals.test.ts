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
]);

const ALLOWED_EMAIL = "owner@example.com";
const OWNER = { email: ALLOWED_EMAIL, subject: "owner-subject" };
const OTHER_OWNER = { email: ALLOWED_EMAIL, subject: "other-owner-subject" };
const TODAY = "2026-08-17";
const YESTERDAY = "2026-08-16";

//? 習得の学習量実績は目標の作成日を起点にするので、サーバが見る現在時刻を固定する。
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00+09:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

function raw() {
  process.env.ALLOWED_EMAIL = ALLOWED_EMAIL;
  return convexTest(schema, modules);
}

function owner() {
  return raw().withIdentity(OWNER);
}

const EXAM_GOAL = {
  content: "本番で900点を取る",
  examDate: "2026-10-01",
  maxScore: 900,
  minScore: 800,
  type: "exam",
} as const;

const MASTERY_GOAL = {
  content: "音読を止まらずにできる",
  criterion: "1分間で120語",
  type: "mastery",
} as const;

const CONCRETE_ACTION = "Unit 1 を音読する";

//? 学習量の実績は保存カウンタで、記録側の書き込み経路が差分更新する(ADR-0007)。
//? したがってテストは rows を直接 insert せず、必ず本物の mutation を通す。
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

test("試験・習得の2タイプを作成でき、list に反映される", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });

  const goals = await t.query(api.queries.goals.list.list, {});
  expect(goals).toHaveLength(2);
  expect(goals).toContainEqual({ _id: examId, ...EXAM_GOAL });
  //? 習得には達成日(未達成なら undefined)と学習量の実績が載る
  expect(goals).toContainEqual({
    _id: masteryId,
    achievedAt: undefined,
    activeDays: 0,
    confirmedMinutes: 0,
    ...MASTERY_GOAL,
    deadline: undefined,
  });
});

test("期限つきの習得(チェックポイント)は同じタイプとして保存される", async () => {
  const t = owner();
  const goalId = await t.mutation(api.mutations.goals.create.create, {
    goal: { ...MASTERY_GOAL, deadline: "2026-08-23" },
  });
  const goals = await t.query(api.queries.goals.list.list, {});
  const goal = goals.find((entry) => entry._id === goalId);
  expect(goal?.type).toBe("mastery");
  expect(goal?.type === "mastery" && goal.deadline).toBe("2026-08-23");
});

test("本番目標は1件までで2件目は拒否される", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { ...EXAM_GOAL, content: "本番で950点を取る", maxScore: 990, minScore: 850 },
    }),
  ).rejects.toThrow();
  expect(await t.query(api.queries.goals.list.list, {})).toHaveLength(1);
});

test("習得は複数件作成できる", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await t.mutation(api.mutations.goals.create.create, {
    goal: { ...MASTERY_GOAL, content: "Part2 を聞き取れる", criterion: "正答率9割" },
  });
  await t.mutation(api.mutations.goals.create.create, {
    goal: { ...MASTERY_GOAL, content: "長文を時間内に読み切れる", deadline: "2026-08-30" },
  });
  expect(await t.query(api.queries.goals.list.list, {})).toHaveLength(3);
});

test("TOEICスコアが範囲外・5刻みでない・下限が上限超なら拒否される", async () => {
  const t = owner();
  for (const scores of [
    { maxScore: 995, minScore: 800 },
    { maxScore: 903, minScore: 800 },
    { maxScore: 800, minScore: 900 },
  ]) {
    await expect(
      t.mutation(api.mutations.goals.create.create, { goal: { ...EXAM_GOAL, ...scores } }),
    ).rejects.toThrow();
  }
  expect(await t.query(api.queries.goals.list.list, {})).toEqual([]);
});

test("本番日の形式が不正・実在しない暦日なら拒否される", async () => {
  const t = owner();
  for (const examDate of ["2026/10/01", "2026-02-31"]) {
    await expect(
      t.mutation(api.mutations.goals.create.create, { goal: { ...EXAM_GOAL, examDate } }),
    ).rejects.toThrow();
  }
});

test("習得の期限が実在しない暦日なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { ...MASTERY_GOAL, deadline: "2026-02-31" },
    }),
  ).rejects.toThrow();
});

test("達成の基準・内容が空白なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, { goal: { ...MASTERY_GOAL, criterion: "  " } }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.create.create, { goal: { ...MASTERY_GOAL, content: "  " } }),
  ).rejects.toThrow();
});

test("未認証では目標を作成できない", async () => {
  const t = raw();
  await expect(
    t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL }),
  ).rejects.toThrow();
});

test("目標タイプの変更は拒否される", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await expect(
    t.mutation(api.mutations.goals.update.update, { goal: EXAM_GOAL, goalId: masteryId }),
  ).rejects.toThrow();
  const goals = await t.query(api.queries.goals.list.list, {});
  expect(goals.find((goal) => goal._id === masteryId)?.type).toBe("mastery");
});

test("同タイプの更新は基準と期限を書き換える", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...MASTERY_GOAL, criterion: "1分間で150語", deadline: "2026-08-23" },
    goalId: masteryId,
  });
  const goals = await t.query(api.queries.goals.list.list, {});
  const updated = goals.find((goal) => goal._id === masteryId);
  expect(updated?.type === "mastery" && updated.criterion).toBe("1分間で150語");
  expect(updated?.type === "mastery" && updated.deadline).toBe("2026-08-23");
});

test("setAchieved は習得を達成にし、undefined で取り消せる", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: masteryId,
  });
  const achieved = await t.query(api.queries.goals.list.list, {});
  const achievedGoal = achieved.find((goal) => goal._id === masteryId);
  expect(achievedGoal?.type === "mastery" && achievedGoal.achievedAt).toBe(TODAY);

  //? 達成しても目標は消えない(達成済みの一覧が達成の履歴になる)
  expect(achieved).toHaveLength(1);

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { goalId: masteryId });
  const cleared = await t.query(api.queries.goals.list.list, {});
  const clearedGoal = cleared.find((goal) => goal._id === masteryId);
  expect(clearedGoal?.type === "mastery" && clearedGoal.achievedAt).toBeUndefined();
});

test("達成日は編集で消えない", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: masteryId,
  });
  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...MASTERY_GOAL, deadline: "2026-08-30" },
    goalId: masteryId,
  });
  const goals = await t.query(api.queries.goals.list.list, {});
  const updated = goals.find((goal) => goal._id === masteryId);
  expect(updated?.type === "mastery" && updated.achievedAt).toBe(TODAY);
});

test("setAchieved は本番目標と不正な日付を拒否する", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });

  await expect(
    t.mutation(api.mutations.goals.setAchieved.setAchieved, {
      achievedAt: TODAY,
      goalId: examId,
    }),
  ).rejects.toThrow();
  for (const achievedAt of ["2026/08/17", "2026-02-31"]) {
    await expect(
      t.mutation(api.mutations.goals.setAchieved.setAchieved, { achievedAt, goalId: masteryId }),
    ).rejects.toThrow();
  }
});

test("習得には目標作成以降の確定分数と実施日数が併記される", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  //? 目標を作る前の日の記録は入らない
  await addConfirmedRow(t, itemId, { dateJst: YESTERDAY, minutes: 90 });
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  //? 同じ日に何件あっても実施日は1日
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });
  //? 確定以外は学習量に入らない
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

  //? 確定済みの分数を直しても実施日は増えず、分数だけ差し替わる
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

test("確定記録をゴミ箱に入れると実績が減り、戻すと実績も戻る", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  const rowId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  //? 同じ日にもう1件残しておくと、実施日は減らずに分数だけ減る
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });

  await t.mutation(api.mutations.rows.remove.remove, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 20 });

  await t.mutation(api.mutations.rows.restore.restore, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
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

test("達成すると実績が凍結され、達成後の確定では動かない", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: masteryId,
  });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("ゴミ箱の日に属する確定記録は、消しても実績を動かさず、日を戻すまで戻せない", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  const rowId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  const dayId = await liveDayId(t, TODAY);

  await t.mutation(api.mutations.trash.removeDay.removeDay, { dateJst: TODAY });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  //? 日ごと実績から外れているので、配下の記録を消しても差分は出ない
  await t.mutation(api.mutations.rows.remove.remove, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  await expect(t.mutation(api.mutations.rows.restore.restore, { rowId })).rejects.toThrow();

  //? 日を戻しても記録はゴミ箱のままなので実績はまだ0
  await t.mutation(api.mutations.trash.restoreDay.restoreDay, { dayId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  await t.mutation(api.mutations.rows.restore.restore, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("達成を解除すると凍結中に動いた確定を取り込んで再計算される", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: masteryId,
  });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { goalId: masteryId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });
});

test("日ドキュメントが入れ替わった記録でも、実績は暦日の生存で数え直される", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  const rowId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  const staleDayId = await liveDayId(t, TODAY);

  //? collapseExtraLiveDays は余剰の日を配下の記録ごと消さずに落とす。その結果あり得る
  //? 「記録の dayId だけが消え、暦日には別の生きた日がある」状態を作って再現する。
  await t.run(async (ctx) => {
    await ctx.db.insert("days", { dateJst: TODAY, ownerId: OWNER.subject });
    await ctx.db.delete("days", staleDayId);
  });

  //? 実測(暦日に生きた日がある = 確定は実績に入る)と保存カウンタは一致したまま
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });

  await t.mutation(api.mutations.rows.remove.remove, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 0, confirmedMinutes: 0 });

  await t.mutation(api.mutations.rows.restore.restore, { rowId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("凍結中に確定が減っていれば、解除の再計算で実績も減る", async () => {
  const t = owner();
  const itemId = await seedItemId(t);
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 30 });
  const droppedId = await addConfirmedRow(t, itemId, { dateJst: TODAY, minutes: 20 });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: masteryId,
  });

  //? 凍結中はゴミ箱に入れても動かない
  await t.mutation(api.mutations.rows.remove.remove, { rowId: droppedId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 50 });

  await t.mutation(api.mutations.goals.setAchieved.setAchieved, { goalId: masteryId });
  expect(await progressOf(t, masteryId)).toEqual({ activeDays: 1, confirmedMinutes: 30 });
});

test("未着手だけを入れ替えるプリセット切替では実績が動かない", async () => {
  const t = owner();
  //? 既定のカタログとプリセットを用意するために先に日を開く
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

  //? ゴミ箱の記録は既に実績の外。完全削除では差分が出ない
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

test("目標を削除できる", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, { goal: MASTERY_GOAL });
  expect(await t.query(api.queries.goals.list.list, {})).toHaveLength(1);
  await t.mutation(api.mutations.goals.remove.remove, { goalId: masteryId });
  expect(await t.query(api.queries.goals.list.list, {})).toEqual([]);
});

test("他人の目標は取得できず、更新・削除・達成も拒否される", async () => {
  const t = raw();
  const asOwner = t.withIdentity(OWNER);
  const asOther = t.withIdentity(OTHER_OWNER);

  const masteryId = await asOwner.mutation(api.mutations.goals.create.create, {
    goal: MASTERY_GOAL,
  });

  expect(await asOther.query(api.queries.goals.list.list, {})).toEqual([]);

  await expect(
    asOther.mutation(api.mutations.goals.update.update, {
      goal: { ...MASTERY_GOAL, content: "乗っ取り" },
      goalId: masteryId,
    }),
  ).rejects.toThrow();
  await expect(
    asOther.mutation(api.mutations.goals.setAchieved.setAchieved, {
      achievedAt: TODAY,
      goalId: masteryId,
    }),
  ).rejects.toThrow();
  await expect(
    asOther.mutation(api.mutations.goals.remove.remove, { goalId: masteryId }),
  ).rejects.toThrow();

  //? 所有者本人には影響していない
  const goals = await asOwner.query(api.queries.goals.list.list, {});
  const goal = goals.find((entry) => entry._id === masteryId);
  expect(goal?.type === "mastery" && goal.content).toBe(MASTERY_GOAL.content);
  expect(goal?.type === "mastery" && goal.achievedAt).toBeUndefined();
});
