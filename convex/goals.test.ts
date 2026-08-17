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

const ALLOWED_EMAIL = "owner@example.com";
const OWNER = { email: ALLOWED_EMAIL, subject: "owner-subject" };
const OTHER_OWNER = { email: ALLOWED_EMAIL, subject: "other-owner-subject" };
const MONDAY = "2026-08-17";

function raw() {
  process.env.ALLOWED_EMAIL = ALLOWED_EMAIL;
  return convexTest(schema, modules);
}

function owner() {
  return raw().withIdentity(OWNER);
}

test("5タイプの目標を作成でき、list に反映される", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "本番までに公式問題集を1冊やり切る",
      examDate: "2026-10-01",
      maxScore: 900,
      minScore: 800,
      type: "exam",
    },
    weekStartJst: MONDAY,
  });
  const paceId = await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "毎日机に向かう",
      dailyFloorMinutes: 30,
      daysPerWeek: 4,
      type: "pace",
    },
    weekStartJst: MONDAY,
  });
  const volumeId = await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "公式問題集を1冊やり切る",
      deadline: "2026-09-30",
      startAmount: 10,
      targetAmount: 300,
      type: "volume",
      unit: "ページ",
    },
    weekStartJst: MONDAY,
  });
  const masteryId = await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "音読を止まらずにできる", criterion: "1分間で120語", type: "mastery" },
    weekStartJst: MONDAY,
  });
  const otherId = await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "机の上を片付ける", memo: "週末", type: "other" },
    weekStartJst: MONDAY,
  });

  const goals = await t.query(api.queries.goals.list.list, {});
  expect(goals).toHaveLength(5);
  expect(goals).toContainEqual({
    _id: examId,
    content: "本番までに公式問題集を1冊やり切る",
    examDate: "2026-10-01",
    maxScore: 900,
    minScore: 800,
    type: "exam",
  });
  expect(goals).toContainEqual({
    _id: paceId,
    content: "毎日机に向かう",
    dailyFloorMinutes: 30,
    daysPerWeek: 4,
    type: "pace",
  });
  //? startAmount が currentAmount の初期値として写る
  expect(goals).toContainEqual({
    _id: volumeId,
    content: "公式問題集を1冊やり切る",
    currentAmount: 10,
    deadline: "2026-09-30",
    itemId: undefined,
    startAmount: 10,
    targetAmount: 300,
    type: "volume",
    unit: "ページ",
  });
  expect(goals).toContainEqual({
    _id: masteryId,
    content: "音読を止まらずにできる",
    criterion: "1分間で120語",
    deadline: undefined,
    type: "mastery",
  });
  expect(goals).toContainEqual({
    _id: otherId,
    content: "机の上を片付ける",
    deadline: undefined,
    memo: "週末",
    type: "other",
  });
});

test("startAmount 省略時、達成量の現在値は0から始まる", async () => {
  const t = owner();
  const volumeId = await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "単語帳を1冊終える",
      deadline: "2026-09-30",
      targetAmount: 100,
      type: "volume",
      unit: "冊",
    },
    weekStartJst: MONDAY,
  });
  const goals = await t.query(api.queries.goals.list.list, {});
  const volume = goals.find((goal) => goal._id === volumeId);
  expect(volume?.type === "volume" && volume.currentAmount).toBe(0);
});

test("本番目標は1件までで2件目は拒否される", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "本番で900点を取る",
      examDate: "2026-10-01",
      maxScore: 900,
      minScore: 800,
      type: "exam",
    },
    weekStartJst: MONDAY,
  });
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "本番で950点を取る",
        examDate: "2026-11-01",
        maxScore: 990,
        minScore: 850,
        type: "exam",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
  expect(await t.query(api.queries.goals.list.list, {})).toHaveLength(1);
});

test("ペース目標は1件までで2件目は拒否される", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "毎日30分", dailyFloorMinutes: 30, daysPerWeek: 4, type: "pace" },
    weekStartJst: MONDAY,
  });
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { content: "もう1つのペース", dailyFloorMinutes: 10, daysPerWeek: 2, type: "pace" },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
  expect(await t.query(api.queries.goals.list.list, {})).toHaveLength(1);
});

test("達成量・習得・その他タイプは複数件作成できる", async () => {
  const t = owner();
  await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "問題集A",
      deadline: "2026-09-30",
      targetAmount: 100,
      type: "volume",
      unit: "ページ",
    },
    weekStartJst: MONDAY,
  });
  await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "問題集B",
      deadline: "2026-10-31",
      targetAmount: 200,
      type: "volume",
      unit: "問題",
    },
    weekStartJst: MONDAY,
  });
  expect(await t.query(api.queries.goals.list.list, {})).toHaveLength(2);
});

test("TOEICスコアが範囲外なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "本番で高得点を取る",
        examDate: "2026-10-01",
        maxScore: 995,
        minScore: 800,
        type: "exam",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("TOEICスコアが5刻みでなければ拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "本番で高得点を取る",
        examDate: "2026-10-01",
        maxScore: 903,
        minScore: 800,
        type: "exam",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("TOEICスコアの下限が上限を超えていれば拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "本番で高得点を取る",
        examDate: "2026-10-01",
        maxScore: 800,
        minScore: 900,
        type: "exam",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("本番日の形式が不正なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "本番で高得点を取る",
        examDate: "2026/10/01",
        maxScore: 900,
        minScore: 800,
        type: "exam",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("ペースの実施日数・最低分数が範囲外なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { content: "毎日机に向かう", dailyFloorMinutes: 30, daysPerWeek: 8, type: "pace" },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { content: "毎日机に向かう", dailyFloorMinutes: 1, daysPerWeek: 3, type: "pace" },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("達成量の目標量が0以下・現在量が負なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "問題集をやる",
        deadline: "2026-09-30",
        targetAmount: 0,
        type: "volume",
        unit: "ページ",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "問題集をやる",
        deadline: "2026-09-30",
        startAmount: -1,
        targetAmount: 100,
        type: "volume",
        unit: "ページ",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("達成量の目標量・開始量が非整数なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "問題集をやる",
        deadline: "2026-09-30",
        targetAmount: 10.5,
        type: "volume",
        unit: "ページ",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "問題集をやる",
        deadline: "2026-09-30",
        startAmount: Number.NaN,
        targetAmount: 100,
        type: "volume",
        unit: "ページ",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
  expect(await t.query(api.queries.goals.list.list, {})).toEqual([]);
});

test("開始量が目標量以上なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "問題集をやる",
        deadline: "2026-09-30",
        startAmount: 100,
        targetAmount: 100,
        type: "volume",
        unit: "ページ",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("実在しない暦日は拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "問題集をやる",
        deadline: "2026-02-31",
        targetAmount: 100,
        type: "volume",
        unit: "ページ",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("他人の項目や実在しない項目に紐づけた達成量目標は拒否される", async () => {
  const shared = raw();
  const t = shared.withIdentity(OWNER);
  const stranger = shared.withIdentity(OTHER_OWNER);
  const strangerItemId = await shared.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "他人のカテゴリ",
      ownerId: OTHER_OWNER.subject,
      sortOrder: 0,
    });
    return ctx.db.insert("items", {
      categoryId,
      name: "他人の項目",
      ownerId: OTHER_OWNER.subject,
      sortOrder: 0,
    });
  });

  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "問題集をやる",
        deadline: "2026-09-30",
        itemId: strangerItemId,
        targetAmount: 100,
        type: "volume",
        unit: "ページ",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
  expect(await t.query(api.queries.goals.list.list, {})).toEqual([]);

  //? 既に消えている項目 ID も同じく通さない
  const deletedItemId = await shared.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "消えるカテゴリ",
      ownerId: OWNER.subject,
      sortOrder: 1,
    });
    const itemId = await ctx.db.insert("items", {
      categoryId,
      name: "消える項目",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    await ctx.db.delete("items", itemId);
    return itemId;
  });
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "問題集をやる",
        deadline: "2026-09-30",
        itemId: deletedItemId,
        targetAmount: 100,
        type: "volume",
        unit: "ページ",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();

  //? 逆向きも同じ。他人からは所有者の項目に紐づけられない
  const ownerItemId = await shared.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "TOEIC対策",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    return ctx.db.insert("items", {
      categoryId,
      name: "金のフレーズ",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
  });
  await expect(
    stranger.mutation(api.mutations.goals.create.create, {
      goal: {
        content: "問題集をやる",
        deadline: "2026-09-30",
        itemId: ownerItemId,
        targetAmount: 100,
        type: "volume",
        unit: "ページ",
      },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("自分の項目に紐づけた達成量目標は保存でき、項目を消すとリンクだけ外れる", async () => {
  const t = owner();
  const itemId = await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "TOEIC対策",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    return ctx.db.insert("items", {
      categoryId,
      name: "金のフレーズ",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
  });
  const volumeId = await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "金のフレーズを1周する",
      deadline: "2026-09-30",
      itemId,
      targetAmount: 100,
      type: "volume",
      unit: "ページ",
    },
    weekStartJst: MONDAY,
  });
  const before = await t.query(api.queries.goals.list.list, {});
  expect(before.find((goal) => goal._id === volumeId)).toMatchObject({ itemId });

  await t.mutation(api.mutations.items.remove.remove, { itemId });

  //? 目標そのものは残り、宙吊りの項目リンクだけが外れる
  const after = await t.query(api.queries.goals.list.list, {});
  const goal = after.find((entry) => entry._id === volumeId);
  expect(goal?.type === "volume" && goal.itemId).toBeUndefined();
  expect(goal?.type === "volume" && goal.targetAmount).toBe(100);
});

test("達成の基準が空白なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { content: "音読を止まらずにできる", criterion: "  ", type: "mastery" },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("内容が空白なら拒否される", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { content: "  ", memo: undefined, type: "other" },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("未認証では目標を作成できない", async () => {
  const t = raw();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { content: "机の上を片付ける", type: "other" },
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
});

test("目標タイプの変更は拒否される", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "音読を止まらずにできる", criterion: "1分間で120語", type: "mastery" },
    weekStartJst: MONDAY,
  });
  await expect(
    t.mutation(api.mutations.goals.update.update, {
      goal: { content: "机の上を片付ける", type: "other" },
      goalId: masteryId,
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();
  const goals = await t.query(api.queries.goals.list.list, {});
  expect(goals.find((goal) => goal._id === masteryId)?.type).toBe("mastery");
});

test("同タイプの更新は内容を書き換える", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "音読を止まらずにできる", criterion: "1分間で120語", type: "mastery" },
    weekStartJst: MONDAY,
  });
  await t.mutation(api.mutations.goals.update.update, {
    goal: { content: "音読を止まらずにできる", criterion: "1分間で150語", type: "mastery" },
    goalId: masteryId,
    weekStartJst: MONDAY,
  });
  const goals = await t.query(api.queries.goals.list.list, {});
  const updated = goals.find((goal) => goal._id === masteryId);
  expect(updated?.type === "mastery" && updated.criterion).toBe("1分間で150語");
});

test("達成量の編集は現在値を巻き戻さない", async () => {
  const t = owner();
  const volumeId = await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "公式問題集を1冊やり切る",
      deadline: "2026-09-30",
      startAmount: 10,
      targetAmount: 300,
      type: "volume",
      unit: "ページ",
    },
    weekStartJst: MONDAY,
  });
  await t.mutation(api.mutations.goals.setVolumeProgress.setVolumeProgress, {
    currentAmount: 120,
    goalId: volumeId,
  });
  await t.mutation(api.mutations.goals.update.update, {
    goal: {
      content: "公式問題集を1冊やり切る（改訂版）",
      deadline: "2026-10-31",
      startAmount: 50,
      targetAmount: 350,
      type: "volume",
      unit: "ページ",
    },
    goalId: volumeId,
    weekStartJst: MONDAY,
  });
  const goals = await t.query(api.queries.goals.list.list, {});
  const updated = goals.find((goal) => goal._id === volumeId);
  expect(updated?.type === "volume" && updated.currentAmount).toBe(120);
  expect(updated?.type === "volume" && updated.targetAmount).toBe(350);
});

test("目標を削除できる", async () => {
  const t = owner();
  const otherId = await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "机の上を片付ける", type: "other" },
    weekStartJst: MONDAY,
  });
  expect(await t.query(api.queries.goals.list.list, {})).toHaveLength(1);
  await t.mutation(api.mutations.goals.remove.remove, { goalId: otherId });
  expect(await t.query(api.queries.goals.list.list, {})).toEqual([]);
});

test("他人の目標は取得できず、更新・削除・進捗更新も拒否される", async () => {
  const t = raw();
  const asOwner = t.withIdentity(OWNER);
  const asOther = t.withIdentity(OTHER_OWNER);

  const volumeId = await asOwner.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "公式問題集を1冊やり切る",
      deadline: "2026-09-30",
      startAmount: 10,
      targetAmount: 300,
      type: "volume",
      unit: "ページ",
    },
    weekStartJst: MONDAY,
  });

  expect(await asOther.query(api.queries.goals.list.list, {})).toEqual([]);

  await expect(
    asOther.mutation(api.mutations.goals.update.update, {
      goal: {
        content: "乗っ取り",
        deadline: "2026-09-30",
        targetAmount: 1,
        type: "volume",
        unit: "ページ",
      },
      goalId: volumeId,
      weekStartJst: MONDAY,
    }),
  ).rejects.toThrow();

  await expect(
    asOther.mutation(api.mutations.goals.setVolumeProgress.setVolumeProgress, {
      currentAmount: 999,
      goalId: volumeId,
    }),
  ).rejects.toThrow();

  await expect(
    asOther.mutation(api.mutations.goals.remove.remove, { goalId: volumeId }),
  ).rejects.toThrow();

  //? 所有者本人には影響していない
  const goals = await asOwner.query(api.queries.goals.list.list, {});
  expect(goals.find((goal) => goal._id === volumeId)?.type === "volume").toBe(true);
});

test("達成量の進捗を更新できる", async () => {
  const t = owner();
  const volumeId = await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "公式問題集を1冊やり切る",
      deadline: "2026-09-30",
      startAmount: 10,
      targetAmount: 300,
      type: "volume",
      unit: "ページ",
    },
    weekStartJst: MONDAY,
  });
  await t.mutation(api.mutations.goals.setVolumeProgress.setVolumeProgress, {
    currentAmount: 42,
    goalId: volumeId,
  });
  const goals = await t.query(api.queries.goals.list.list, {});
  const updated = goals.find((goal) => goal._id === volumeId);
  expect(updated?.type === "volume" && updated.currentAmount).toBe(42);
});

test("達成量の進捗更新に負値は拒否される", async () => {
  const t = owner();
  const volumeId = await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "公式問題集を1冊やり切る",
      deadline: "2026-09-30",
      targetAmount: 300,
      type: "volume",
      unit: "ページ",
    },
    weekStartJst: MONDAY,
  });
  await expect(
    t.mutation(api.mutations.goals.setVolumeProgress.setVolumeProgress, {
      currentAmount: -1,
      goalId: volumeId,
    }),
  ).rejects.toThrow();
});

test("達成量の進捗更新に非整数は拒否される", async () => {
  const t = owner();
  const volumeId = await t.mutation(api.mutations.goals.create.create, {
    goal: {
      content: "公式問題集を1冊やり切る",
      deadline: "2026-09-30",
      targetAmount: 300,
      type: "volume",
      unit: "ページ",
    },
    weekStartJst: MONDAY,
  });
  for (const currentAmount of [1.5, Number.NaN]) {
    await expect(
      t.mutation(api.mutations.goals.setVolumeProgress.setVolumeProgress, {
        currentAmount,
        goalId: volumeId,
      }),
    ).rejects.toThrow();
  }
});

test("達成量以外の目標への進捗更新は拒否される", async () => {
  const t = owner();
  const masteryId = await t.mutation(api.mutations.goals.create.create, {
    goal: { content: "音読を止まらずにできる", criterion: "1分間で120語", type: "mastery" },
    weekStartJst: MONDAY,
  });
  await expect(
    t.mutation(api.mutations.goals.setVolumeProgress.setVolumeProgress, {
      currentAmount: 10,
      goalId: masteryId,
    }),
  ).rejects.toThrow();
});
