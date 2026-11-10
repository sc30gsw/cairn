import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { convexModules } from "../../../src/test-utils/convex-modules";
import { api } from "../../_generated/api";
import type { Status } from "../../lib/domain";
import schema from "../../schema";

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const DATE = "2026-08-17";
const STARTED_AT = 1_700_000_000_000;

test("プリセット切替は未着手だけ差し替え、計測中の進行中と確定とスキップを残す", async () => {
  const t = convexTest(schema, convexModules).withIdentity(OWNER);
  const seeded = await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "語彙",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    const itemId = await ctx.db.insert("items", {
      categoryId,
      name: "金フレ",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    const freshId = await ctx.db.insert("items", {
      categoryId,
      name: "新しい項目",
      ownerId: OWNER.subject,
      sortOrder: 1,
    });
    const dayId = await ctx.db.insert("days", { dateJst: DATE, ownerId: OWNER.subject });
    const insert = async (status: Status, sortOrder: number, timerStartedAt?: number) =>
      ctx.db.insert("rows", {
        content: status,
        dateJst: DATE,
        dayId,
        itemId,
        minutes: 15,
        ownerId: OWNER.subject,
        sortOrder,
        status,
        ...(timerStartedAt === undefined ? {} : { timerStartedAt }),
      });
    return {
      confirmedId: await insert("確定", 0),
      freshId,
      ongoingId: await insert("進行中", 1, STARTED_AT),
      pendingId: await insert("未着手", 2),
      skippedId: await insert("スキップ", 3),
    };
  });
  const presetId = await t.mutation(api.mutations.presets.create.create, {
    lines: [{ content: "差し替え", itemId: seeded.freshId, minutes: 5 }],
    name: "入替",
    weekdays: [1],
  });

  await t.mutation(api.mutations.rows.switchPreset.switchPreset, {
    dateJst: DATE,
    presetId,
    todayJst: DATE,
  });

  const rows = await t.run(async (ctx) => ctx.db.query("rows").collect());
  const byId = new Map(rows.map((row) => [row._id, row]));
  expect(byId.get(seeded.confirmedId)?.status).toBe("確定");
  expect(byId.get(seeded.ongoingId)?.status).toBe("進行中");
  expect(byId.get(seeded.ongoingId)?.timerStartedAt).toBe(STARTED_AT);
  expect(byId.get(seeded.skippedId)?.status).toBe("スキップ");
  expect(byId.get(seeded.pendingId)).toBeUndefined();
  const replacements = rows.filter((row) => row.content === "差し替え");
  expect(replacements).toHaveLength(1);
  expect(replacements[0]?.status).toBe("未着手");
});
