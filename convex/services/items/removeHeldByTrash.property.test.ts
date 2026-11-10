import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { convexModules } from "../../../src/test-utils/convex-modules";
import { api } from "../../_generated/api";
import schema from "../../schema";

const OWNER = { email: "owner@example.com", subject: "owner-subject" };

test("ゴミ箱の記録が残る項目は消せない", async () => {
  const t = convexTest(schema, convexModules).withIdentity(OWNER);
  const { heldId, freeId } = await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "語彙",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    const heldId = await ctx.db.insert("items", {
      categoryId,
      name: "金フレ",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    const freeId = await ctx.db.insert("items", {
      categoryId,
      name: "未使用",
      ownerId: OWNER.subject,
      sortOrder: 1,
    });
    const dayId = await ctx.db.insert("days", {
      dateJst: "2026-08-17",
      deletedAt: 1,
      ownerId: OWNER.subject,
    });
    await ctx.db.insert("rows", {
      content: "捨てた記録",
      dateJst: "2026-08-17",
      dayId,
      deletedAt: 2,
      itemId: heldId,
      minutes: 10,
      ownerId: OWNER.subject,
      sortOrder: 0,
      status: "確定",
    });
    return { freeId, heldId };
  });

  await expect(t.mutation(api.mutations.items.remove.remove, { itemId: heldId })).rejects.toThrow(
    "使っている行または雛形がある項目は消せません",
  );
  expect(await t.run(async (ctx) => ctx.db.get("items", heldId))).not.toBeNull();
  await t.mutation(api.mutations.items.remove.remove, { itemId: freeId });
  expect(await t.run(async (ctx) => ctx.db.get("items", freeId))).toBeNull();
});
