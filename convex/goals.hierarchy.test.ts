import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00+09:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

const EXAM_GOAL = {
  content: "本番で900点を取る",
  examDate: "2026-10-01",
  maxScore: 900,
  minScore: 800,
  type: "exam",
} as const;

const LONG_TERM_GOAL = {
  content: "音読を止まらずにできる",
  criterion: "1分間で120語",
  type: "mastery",
} as const;

function raw() {
  return convexTest(schema, modules);
}

function owner() {
  return raw().withIdentity(OWNER);
}

async function createLongTerm(t: ReturnType<typeof owner>, content: string) {
  return await t.mutation(api.mutations.goals.create.create, {
    goal: { ...LONG_TERM_GOAL, content },
  });
}

async function createCheckpoint(
  t: ReturnType<typeof owner>,
  input: { content: string; deadline: string; parentGoalId: Id<"goals"> },
) {
  return await t.mutation(api.mutations.goals.create.create, {
    goal: { ...LONG_TERM_GOAL, ...input },
  });
}

test("期限だけ・親だけの入力は create でも update でも拒否される(INV-1)", async () => {
  const t = owner();
  const parentId = await createLongTerm(t, "長期目標");

  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { ...LONG_TERM_GOAL, content: "期限だけ", deadline: "2026-09-06" },
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.create.create, {
      goal: { ...LONG_TERM_GOAL, content: "親だけ", parentGoalId: parentId },
    }),
  ).rejects.toThrow();

  const goalId = await createLongTerm(t, "編集対象");
  await expect(
    t.mutation(api.mutations.goals.update.update, {
      goal: { ...LONG_TERM_GOAL, content: "編集対象", deadline: "2026-09-06" },
      goalId,
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.update.update, {
      goal: { ...LONG_TERM_GOAL, content: "編集対象", parentGoalId: parentId },
      goalId,
    }),
  ).rejects.toThrow();
});

test("チェックポイントを親にはできない(INV-4)", async () => {
  const t = owner();
  const parentId = await createLongTerm(t, "長期目標");
  const checkpointId = await createCheckpoint(t, {
    content: "チェックポイント",
    deadline: "2026-09-06",
    parentGoalId: parentId,
  });

  await expect(
    createCheckpoint(t, {
      content: "孫",
      deadline: "2026-09-13",
      parentGoalId: checkpointId,
    }),
  ).rejects.toThrow();
});

test("自分自身を親にはできない(INV-3)", async () => {
  const t = owner();
  const parentId = await createLongTerm(t, "長期目標");
  const checkpointId = await createCheckpoint(t, {
    content: "チェックポイント",
    deadline: "2026-09-06",
    parentGoalId: parentId,
  });

  await expect(
    t.mutation(api.mutations.goals.update.update, {
      goal: {
        ...LONG_TERM_GOAL,
        content: "チェックポイント",
        deadline: "2026-09-06",
        parentGoalId: checkpointId,
      },
      goalId: checkpointId,
    }),
  ).rejects.toThrow();
});

test("他人の目標を親に指定すると拒否される(INV-2 / IDOR)", async () => {
  const t = raw();
  const asOwner = t.withIdentity(OWNER);
  const asOther = t.withIdentity(OTHER_OWNER);
  const otherParentId = await asOther.mutation(api.mutations.goals.create.create, {
    goal: { ...LONG_TERM_GOAL, content: "他人の長期目標" },
  });

  await expect(
    asOwner.mutation(api.mutations.goals.create.create, {
      goal: {
        ...LONG_TERM_GOAL,
        content: "乗っ取りチェックポイント",
        deadline: "2026-09-06",
        parentGoalId: otherParentId,
      },
    }),
  ).rejects.toThrow();
});

test("子チェックポイントを持つ長期目標に期限は付けられない(INV-5)", async () => {
  const t = owner();
  const parentId = await createLongTerm(t, "長期目標");
  await createCheckpoint(t, {
    content: "チェックポイント",
    deadline: "2026-09-06",
    parentGoalId: parentId,
  });
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });

  await expect(
    t.mutation(api.mutations.goals.update.update, {
      goal: {
        ...LONG_TERM_GOAL,
        content: "長期目標",
        deadline: "2026-10-06",
        parentGoalId: examId,
      },
      goalId: parentId,
    }),
  ).rejects.toThrow();
});

test("親を削除すると子チェックポイントも消え、返り値が子の件数になる(INV-6)", async () => {
  const t = owner();
  const parentId = await createLongTerm(t, "長期目標");
  await createCheckpoint(t, {
    content: "未達成の子",
    deadline: "2026-09-06",
    parentGoalId: parentId,
  });
  const achievedChildId = await createCheckpoint(t, {
    content: "達成済みの子",
    deadline: "2026-09-13",
    parentGoalId: parentId,
  });
  await t.mutation(api.mutations.goals.setAchieved.setAchieved, {
    achievedAt: TODAY,
    goalId: achievedChildId,
  });
  const survivor = await createLongTerm(t, "残る長期目標");

  const removedChildren = await t.mutation(api.mutations.goals.remove.remove, {
    goalId: parentId,
  });
  expect(removedChildren).toBe(2);

  const goals = await t.query(api.queries.goals.list.list, {});
  expect(goals.map((goal) => goal._id)).toEqual([survivor]);
});

test("子を持たない目標の削除は0件を返す", async () => {
  const t = owner();
  const goalId = await createLongTerm(t, "長期目標");
  expect(await t.mutation(api.mutations.goals.remove.remove, { goalId })).toBe(0);
});

test("期限を外す更新では親も一緒に落ちる(replace の性質)", async () => {
  const t = owner();
  const parentId = await createLongTerm(t, "長期目標");
  const checkpointId = await createCheckpoint(t, {
    content: "チェックポイント",
    deadline: "2026-09-06",
    parentGoalId: parentId,
  });

  await t.mutation(api.mutations.goals.update.update, {
    goal: { ...LONG_TERM_GOAL, content: "チェックポイント" },
    goalId: checkpointId,
  });

  const goals = await t.query(api.queries.goals.list.list, {});
  const updated = goals.find((goal) => goal._id === checkpointId);
  expect(updated?.type === "mastery" && updated.deadline).toBeUndefined();
  expect(updated?.type === "mastery" && updated.parentGoalId).toBeUndefined();
});

test("親の付け替えができ、list の parentGoalId が変わる", async () => {
  const t = owner();
  const examId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM_GOAL });
  const longTermId = await createLongTerm(t, "長期目標");
  const checkpointId = await createCheckpoint(t, {
    content: "チェックポイント",
    deadline: "2026-09-06",
    parentGoalId: examId,
  });

  await t.mutation(api.mutations.goals.update.update, {
    goal: {
      ...LONG_TERM_GOAL,
      content: "チェックポイント",
      deadline: "2026-09-06",
      parentGoalId: longTermId,
    },
    goalId: checkpointId,
  });

  const goals = await t.query(api.queries.goals.list.list, {});
  const updated = goals.find((goal) => goal._id === checkpointId);
  expect(updated?.type === "mastery" && updated.parentGoalId).toBe(longTermId);
});

test("list の DTO に createdAt と parentGoalId が載る", async () => {
  const t = owner();
  const parentId = await createLongTerm(t, "長期目標");
  const checkpointId = await createCheckpoint(t, {
    content: "チェックポイント",
    deadline: "2026-09-06",
    parentGoalId: parentId,
  });

  const goals = await t.query(api.queries.goals.list.list, {});
  const checkpoint = goals.find((goal) => goal._id === checkpointId);
  expect(checkpoint?.createdAt).toBeTypeOf("number");
  expect(checkpoint?.type === "mastery" && checkpoint.parentGoalId).toBe(parentId);
});
