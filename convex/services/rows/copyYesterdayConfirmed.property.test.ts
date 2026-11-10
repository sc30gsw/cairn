import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { convexModules } from "../../../src/test-utils/convex-modules";
import { api } from "../../_generated/api";
import schema from "../../schema";

const OWNER = { email: "owner@example.com", subject: "owner-subject" };
const YESTERDAY = "2026-08-16";
const TODAY = "2026-08-17";

test("昨日のコピーは生きた確定だけを未着手で足し、見送り・未着手・進行中・ゴミ箱の確定は足さない", async () => {
  const t = convexTest(schema, convexModules).withIdentity(OWNER);
  await t.run(async (ctx) => {
    const categoryId = await ctx.db.insert("categories", {
      name: "語彙",
      ownerId: OWNER.subject,
      sortOrder: 0,
    });
    const dayId = await ctx.db.insert("days", { dateJst: YESTERDAY, ownerId: OWNER.subject });
    const specs = [
      { content: "確定した", deletedAt: undefined, status: "確定" },
      { content: "見送った", deletedAt: undefined, status: "スキップ" },
      { content: "まだ", deletedAt: undefined, status: "未着手" },
      { content: "進行", deletedAt: undefined, status: "進行中" },
      { content: "捨てた確定", deletedAt: 9, status: "確定" },
    ] as const;
    for (const [index, spec] of specs.entries()) {
      const itemId = await ctx.db.insert("items", {
        categoryId,
        name: spec.content,
        ownerId: OWNER.subject,
        sortOrder: index,
      });
      await ctx.db.insert("rows", {
        content: spec.content,
        dateJst: YESTERDAY,
        dayId,
        ...(spec.deletedAt === undefined ? {} : { deletedAt: spec.deletedAt }),
        itemId,
        minutes: 12 + index,
        ownerId: OWNER.subject,
        sortOrder: index,
        status: spec.status,
      });
    }
  });

  const copied = await t.mutation(
    api.mutations.rows.copyYesterdayConfirmed.copyYesterdayConfirmed,
    {
      dateJst: TODAY,
      todayJst: TODAY,
    },
  );

  expect(copied).toBe(1);
  const todayRows = await t.run(async (ctx) =>
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", OWNER.subject).eq("dateJst", TODAY))
      .collect(),
  );
  expect(
    todayRows.map((row) => ({ content: row.content, minutes: row.minutes, status: row.status })),
  ).toEqual([{ content: "確定した", minutes: 12, status: "未着手" }]);
});
