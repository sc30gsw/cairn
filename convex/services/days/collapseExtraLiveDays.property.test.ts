import { convexTest } from "convex-test";
import { expect, test } from "vite-plus/test";

import { convexModules } from "../../../src/test-utils/convex-modules";
import type { Id } from "../../_generated/dataModel";
import schema from "../../schema";
import { collapseExtraLiveDays } from "./collapseExtraLiveDays";

const OWNER = "owner-a";
const DATE = "2026-08-17";

type Scenario = {
  label: string;
  liveRows: readonly number[];
  trashedRows: readonly number[];
};

function masks(count: number): number[][] {
  if (count === 0) {
    return [[]];
  }
  const smaller = masks(count - 1);
  return smaller.flatMap((row) => [
    [...row, 0],
    [...row, 1],
  ]);
}

function scenarios(): Scenario[] {
  const found: Scenario[] = [];
  for (let live = 0; live <= 2; live += 1) {
    for (let trashed = 0; trashed <= 2; trashed += 1) {
      for (const liveRows of masks(live)) {
        for (const trashedRows of masks(trashed)) {
          found.push({
            label: `live ${liveRows.join(",")} / trash ${trashedRows.join(",")}`,
            liveRows,
            trashedRows,
          });
        }
      }
    }
  }
  found.push({
    label: "newer live day has two rows, one of them trashed",
    liveRows: [0, 2],
    trashedRows: [1],
  });
  return found;
}

test("collapseExtraLiveDays は最古の生きた日へ記録を集め、ゴミ箱の日は残す", async () => {
  for (const scenario of scenarios()) {
    const t = convexTest(schema, convexModules);
    await t.run(async (ctx) => {
      const categoryId = await ctx.db.insert("categories", {
        name: "TOEIC対策",
        ownerId: OWNER,
        sortOrder: 0,
      });
      const itemId = await ctx.db.insert("items", {
        categoryId,
        name: "金のフレーズ",
        ownerId: OWNER,
        sortOrder: 0,
      });

      const decoyOwnerDay = await ctx.db.insert("days", {
        dateJst: DATE,
        ownerId: "owner-b",
      });
      const decoyOwnerRow = await ctx.db.insert("rows", {
        content: "他人",
        dateJst: DATE,
        dayId: decoyOwnerDay,
        itemId,
        minutes: 5,
        ownerId: "owner-b",
        sortOrder: 0,
        status: "未着手",
      });
      const decoyDateDay = await ctx.db.insert("days", {
        dateJst: "2026-08-16",
        ownerId: OWNER,
      });
      const decoyDateRow = await ctx.db.insert("rows", {
        content: "別の日",
        dateJst: "2026-08-16",
        dayId: decoyDateDay,
        itemId,
        minutes: 5,
        ownerId: OWNER,
        sortOrder: 0,
        status: "未着手",
      });

      const trashedDays: Id<"days">[] = [];
      const trashedRows: { dayId: Id<"days">; rowId: Id<"rows"> }[] = [];
      for (const [dayIndex, rowCount] of scenario.trashedRows.entries()) {
        const dayId = await ctx.db.insert("days", {
          dateJst: DATE,
          deletedAt: 2_000 + dayIndex,
          ownerId: OWNER,
        });
        trashedDays.push(dayId);
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
          trashedRows.push({
            dayId,
            rowId: await ctx.db.insert("rows", {
              content: `trash-${String(dayIndex)}-${String(rowIndex)}`,
              dateJst: DATE,
              dayId,
              itemId,
              minutes: rowIndex,
              ownerId: OWNER,
              sortOrder: rowIndex,
              status: "確定",
            }),
          });
        }
      }

      const liveDays: Id<"days">[] = [];
      const liveRowIds: Id<"rows">[] = [];
      const trashedLiveRowIds: Id<"rows">[] = [];
      for (const [dayIndex, rowCount] of scenario.liveRows.entries()) {
        const dayId = await ctx.db.insert("days", { dateJst: DATE, ownerId: OWNER });
        liveDays.push(dayId);
        for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
          const deletedAt = rowIndex === 1 ? 9 : undefined;
          const rowId = await ctx.db.insert("rows", {
            content: `live-${String(dayIndex)}-${String(rowIndex)}`,
            dateJst: DATE,
            dayId,
            ...(deletedAt === undefined ? {} : { deletedAt }),
            itemId,
            minutes: 10 + rowIndex,
            ownerId: OWNER,
            sortOrder: rowIndex,
            status: "未着手",
          });
          liveRowIds.push(rowId);
          if (deletedAt !== undefined) {
            trashedLiveRowIds.push(rowId);
          }
        }
      }

      const winner = await collapseExtraLiveDays(ctx, OWNER, DATE);
      const expectedWinner = liveDays[0] ?? null;
      expect(winner?._id ?? null, scenario.label).toBe(expectedWinner);

      for (const [index, dayId] of liveDays.entries()) {
        const doc = await ctx.db.get("days", dayId);
        expect(doc === null, `${scenario.label} live ${String(index)}`).toBe(index > 0);
      }
      for (const dayId of trashedDays) {
        const doc = await ctx.db.get("days", dayId);
        expect(doc?.deletedAt, scenario.label).not.toBeUndefined();
      }
      for (const rowId of liveRowIds) {
        const row = await ctx.db.get("rows", rowId);
        expect(row?.dayId, scenario.label).toBe(expectedWinner ?? undefined);
        if (trashedLiveRowIds.includes(rowId)) {
          expect(row?.deletedAt, scenario.label).toBe(9);
        }
      }
      for (const trapped of trashedRows) {
        const row = await ctx.db.get("rows", trapped.rowId);
        expect(row?.dayId, scenario.label).toBe(trapped.dayId);
      }
      expect((await ctx.db.get("rows", decoyOwnerRow))?.dayId).toBe(decoyOwnerDay);
      expect((await ctx.db.get("rows", decoyDateRow))?.dayId).toBe(decoyDateDay);
    });
  }
}, 120_000);
