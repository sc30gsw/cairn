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
  "!./migrations.ts",
]);

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const OTHER_OWNER = { email: "other@example.com", subject: "other-owner-subject" };
const THEN_ACTION = "Unit 3 の例文を声に出して5文読む";

function raw() {
  return convexTest(schema, modules);
}

function owner() {
  return raw().withIdentity(OWNER);
}

test("障害プランを作成・一覧・更新・削除できる", async () => {
  const t = owner();
  const planId = await t.mutation(api.mutations.goals.createObstacle.createObstacle, {
    ifText: "眠い",
    thenText: THEN_ACTION,
  });

  expect(await t.query(api.queries.goals.listObstacles.listObstacles, {})).toEqual([
    { _id: planId, ifText: "眠い", thenText: THEN_ACTION },
  ]);

  await t.mutation(api.mutations.goals.updateObstacle.updateObstacle, {
    ifText: "とても眠い",
    planId,
    thenText: THEN_ACTION,
  });
  expect(await t.query(api.queries.goals.listObstacles.listObstacles, {})).toEqual([
    { _id: planId, ifText: "とても眠い", thenText: THEN_ACTION },
  ]);

  await t.mutation(api.mutations.goals.removeObstacle.removeObstacle, { planId });
  expect(await t.query(api.queries.goals.listObstacles.listObstacles, {})).toEqual([]);
});

test("if や then が空なら作成・更新を拒否する", async () => {
  const t = owner();
  await expect(
    t.mutation(api.mutations.goals.createObstacle.createObstacle, {
      ifText: "  ",
      thenText: THEN_ACTION,
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.createObstacle.createObstacle, {
      ifText: "眠い",
      thenText: "  ",
    }),
  ).rejects.toThrow();

  const planId = await t.mutation(api.mutations.goals.createObstacle.createObstacle, {
    ifText: "眠い",
    thenText: THEN_ACTION,
  });
  await expect(
    t.mutation(api.mutations.goals.updateObstacle.updateObstacle, {
      ifText: "  ",
      planId,
      thenText: THEN_ACTION,
    }),
  ).rejects.toThrow();
});

test("他人の障害プランは更新・削除できない", async () => {
  const shared = raw();
  const asOwner = shared.withIdentity(OWNER);
  const asOther = shared.withIdentity(OTHER_OWNER);

  const planId = await asOwner.mutation(api.mutations.goals.createObstacle.createObstacle, {
    ifText: "眠い",
    thenText: THEN_ACTION,
  });

  await expect(
    asOther.mutation(api.mutations.goals.updateObstacle.updateObstacle, {
      ifText: "乗っ取り",
      planId,
      thenText: THEN_ACTION,
    }),
  ).rejects.toThrow();
  await expect(
    asOther.mutation(api.mutations.goals.removeObstacle.removeObstacle, { planId }),
  ).rejects.toThrow();

  expect(await asOwner.query(api.queries.goals.listObstacles.listObstacles, {})).toHaveLength(1);
});

test("存在しない障害プランの更新・削除は拒否される", async () => {
  const t = owner();
  const planId = await t.mutation(api.mutations.goals.createObstacle.createObstacle, {
    ifText: "眠い",
    thenText: THEN_ACTION,
  });
  await t.mutation(api.mutations.goals.removeObstacle.removeObstacle, { planId });

  await expect(
    t.mutation(api.mutations.goals.updateObstacle.updateObstacle, {
      ifText: "眠い",
      planId,
      thenText: THEN_ACTION,
    }),
  ).rejects.toThrow();
  await expect(
    t.mutation(api.mutations.goals.removeObstacle.removeObstacle, { planId }),
  ).rejects.toThrow();
});
