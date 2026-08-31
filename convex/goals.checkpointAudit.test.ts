import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { expect, test } from "vite-plus/test";

import { CHECKPOINT_AUDIT_LIMIT } from "./lib/domain";
import type { CheckpointParentAudit } from "./lib/validators";
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

const auditRef = makeFunctionReference<"query", Record<string, never>, CheckpointParentAudit>(
  "queries/goals/auditCheckpointParents:auditCheckpointParents",
);

const OWNER = "owner-subject";
const OTHER_OWNER = "other-owner-subject";

const MASTERY_FIELDS = {
  activeDays: 0,
  confirmedMinutes: 0,
  criterion: "できる",
  type: "mastery",
} as const;

function raw() {
  return convexTest(schema, modules);
}

test("孤児・dangling・chained・self・cross-owner・親あり期限なしをそれぞれ1件数える", async () => {
  const t = raw();
  await t.run(async (ctx) => {
    const longTermId = await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "音読を続けられる",
      ownerId: OWNER,
    });
    const otherLongTermId = await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "他人の長期目標",
      ownerId: OTHER_OWNER,
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "孤児",
      deadline: "2026-09-06",
      ownerId: OWNER,
    });
    const removedParentId = await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "消える親",
      ownerId: OWNER,
    });
    await ctx.db.delete("goals", removedParentId);
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "dangling",
      deadline: "2026-09-07",
      ownerId: OWNER,
      parentGoalId: removedParentId,
    });
    const chainedParentId = await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "親が親を持つ",
      deadline: "2026-09-08",
      ownerId: OWNER,
      parentGoalId: longTermId,
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "chained",
      deadline: "2026-09-09",
      ownerId: OWNER,
      parentGoalId: chainedParentId,
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "cross-owner",
      deadline: "2026-09-10",
      ownerId: OWNER,
      parentGoalId: otherLongTermId,
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "期限を外し忘れた",
      ownerId: OWNER,
      parentGoalId: longTermId,
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "壊れた期限",
      deadline: "2026/09/11",
      ownerId: OWNER,
    });
  });

  const audit = await t.query(auditRef, {});
  expect(audit.danglingParentCount).toBe(1);
  expect(audit.chainedCount).toBe(1);
  expect(audit.crossOwnerParentCount).toBe(1);
  expect(audit.parentWithoutDeadlineCount).toBe(1);
  expect(audit.malformedDeadlineCount).toBe(1);
  expect(audit.selfParentCount).toBe(0);
  expect(audit.truncated).toBe(false);
  expect(audit.orphanCount).toBe(2);
  expect(audit.owners.map((owner) => owner.ownerId)).toEqual([OTHER_OWNER, OWNER]);
});

test("自分自身を親にした目標を selfParentCount が拾う", async () => {
  const t = raw();
  await t.run(async (ctx) => {
    const goalId = await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "自己参照",
      deadline: "2026-09-06",
      ownerId: OWNER,
    });
    await ctx.db.patch("goals", goalId, { parentGoalId: goalId });
  });

  const audit = await t.query(auditRef, {});
  expect(audit.selfParentCount).toBe(1);
});

test("所有者ごとの plan と失う期限を出す", async () => {
  const t = raw();
  await t.run(async (ctx) => {
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "近い孤児",
      deadline: "2026-09-06",
      ownerId: OWNER,
    });
    await ctx.db.insert("goals", {
      ...MASTERY_FIELDS,
      content: "遠い孤児",
      deadline: "2026-12-06",
      ownerId: OWNER,
    });
  });

  const audit = await t.query(auditRef, {});
  const owner = audit.owners.find((entry) => entry.ownerId === OWNER);
  expect(owner?.plan).toBe("promote");
  expect(owner?.promoteLosesDeadline).toBe("2026-12-06");
  expect(owner?.orphanCount).toBe(2);
  expect(owner?.examGoalCount).toBe(0);
  expect(owner?.longTermCount).toBe(0);
});

test("上限を超える件数では truncated: true を返す", async () => {
  const t = raw();
  await t.run(async (ctx) => {
    for (let index = 0; index <= CHECKPOINT_AUDIT_LIMIT; index += 1) {
      await ctx.db.insert("goals", {
        ...MASTERY_FIELDS,
        content: `長期目標 ${String(index)}`,
        ownerId: OWNER,
      });
    }
  });

  const audit = await t.query(auditRef, {});
  expect(audit.truncated).toBe(true);
});
