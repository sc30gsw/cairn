import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

import { convexModules } from "../../../src/test-utils/convex-modules";
import { api } from "../../_generated/api";
import type { GoalInput } from "../../lib/validators";
import schema from "../../schema";

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const TODAY = "2026-08-17";

const EXAM = {
  content: "終わった本番",
  examDate: "2026-10-01",
  maxScore: 900,
  minScore: 800,
  type: "exam",
} as const satisfies GoalInput;

const NEXT_EXAM = {
  ...EXAM,
  content: "次の本番",
  examDate: "2027-01-24",
  maxScore: 950,
  minScore: 900,
} as const satisfies GoalInput;

const CHECKPOINT = {
  content: "チェックポイント",
  criterion: "30問を10分",
  deadline: "2026-11-01",
  type: "mastery",
} as const satisfies GoalInput;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T12:00:00+09:00`));
});

afterEach(() => {
  vi.useRealTimers();
});

test("本番を消すとその子だけが消え、別の本番のチェックポイントは残る", async () => {
  const t = convexTest(schema, convexModules).withIdentity(OWNER);
  const finishedId = await t.mutation(api.mutations.goals.create.create, { goal: EXAM });
  const finishedChildId = await t.mutation(api.mutations.goals.create.create, {
    goal: { ...CHECKPOINT, content: "終わった本番の子", parentGoalId: finishedId },
  });
  await t.mutation(api.mutations.goals.setExamResult.setExamResult, {
    goalId: finishedId,
    result: { recordedAt: TODAY, score: 855 },
  });
  const activeId = await t.mutation(api.mutations.goals.create.create, { goal: NEXT_EXAM });
  const activeChildId = await t.mutation(api.mutations.goals.create.create, {
    goal: {
      ...CHECKPOINT,
      content: "次の本番の子",
      deadline: "2026-12-01",
      parentGoalId: activeId,
    },
  });

  const removed = await t.mutation(api.mutations.goals.remove.remove, { goalId: finishedId });

  expect(removed).toBe(1);
  const remaining = new Set(
    (await t.query(api.queries.goals.list.list, {})).map((goal) => goal._id),
  );
  expect(remaining.has(finishedId)).toBe(false);
  expect(remaining.has(finishedChildId)).toBe(false);
  expect(remaining.has(activeId)).toBe(true);
  expect(remaining.has(activeChildId)).toBe(true);
});
