import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { convexModules } from "../../../src/test-utils/convex-modules";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { getDayByDate } from "./getDayByDate";

const OWNER = "owner-a";
const DATE = "2026-08-17";

type Scenario = {
  liveCount: number;
  trashedCount: number;
};

function scenarios(): Scenario[] {
  const found: Scenario[] = [];
  for (let liveCount = 0; liveCount <= 3; liveCount += 1) {
    for (let trashedCount = 0; trashedCount <= 3; trashedCount += 1) {
      found.push({ liveCount, trashedCount });
    }
  }
  return found;
}

test("getDayByDate は生きた日の最古、無ければゴミ箱の最古を返す", async () => {
  for (const scenario of scenarios()) {
    const t = convexTest(schema, convexModules);
    await t.run(async (ctx) => {
      const otherOwner = await ctx.db.insert("days", {
        dateJst: DATE,
        ownerId: "owner-b",
      });
      const otherDate = await ctx.db.insert("days", {
        dateJst: "2026-08-16",
        ownerId: OWNER,
      });
      const trashed: Id<"days">[] = [];
      for (let index = 0; index < scenario.trashedCount; index += 1) {
        trashed.push(
          await ctx.db.insert("days", {
            dateJst: DATE,
            deletedAt: 1_000 + index,
            ownerId: OWNER,
          }),
        );
      }
      const live: Id<"days">[] = [];
      for (let index = 0; index < scenario.liveCount; index += 1) {
        live.push(await ctx.db.insert("days", { dateJst: DATE, ownerId: OWNER }));
      }

      const picked = await getDayByDate(ctx, OWNER, DATE);
      const expected = live[0] ?? trashed[0] ?? null;
      expect(picked?._id ?? null, JSON.stringify(scenario)).toBe(expected);
      expect(await ctx.db.get("days", otherOwner)).not.toBeNull();
      expect(await ctx.db.get("days", otherDate)).not.toBeNull();
    });
  }
}, 60_000);
