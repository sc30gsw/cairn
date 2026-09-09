import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type { RestoreTrashResult } from "../../lib/validators/trash";
import { restore as restoreRow } from "../rows/restore";
import { restoreDay } from "./restoreDay";

type RestoreManyArgs = {
  dayIds: Id<"days">[];
  rowIds: Id<"rows">[];
};

export async function restoreMany(
  ctx: MutationCtx,
  ownerId: string,
  args: RestoreManyArgs,
): Promise<RestoreTrashResult> {
  const dayIds = new Set<Id<"days">>(args.dayIds);
  const rowDayIds = new Map<Id<"rows">, Id<"days">>();
  const trashedParentDayIds = new Set<Id<"days">>();

  const rowLookups = await Promise.all(
    [...new Set(args.rowIds)].map(async (rowId) => {
      const row = await ctx.db.get("rows", rowId);
      if (row === null || row.ownerId !== ownerId || row.deletedAt === undefined) {
        return null;
      }
      const day = await ctx.db.get("days", row.dayId);
      return { day, row, rowId };
    }),
  );
  for (const lookup of rowLookups) {
    if (lookup === null) {
      continue;
    }
    const dayId = lookup.row.dayId;
    rowDayIds.set(lookup.rowId, dayId);
    if (lookup.day?.ownerId === ownerId && lookup.day.deletedAt !== undefined) {
      dayIds.add(dayId);
      trashedParentDayIds.add(dayId);
    }
  }

  const dayResults = await Promise.all(
    [...dayIds].map(async (dayId) => {
      try {
        await restoreDay(ctx, ownerId, { dayId });
        return { dayId, restored: true };
      } catch {
        return { dayId, restored: false };
      }
    }),
  );
  const restoredDayIds: Id<"days">[] = [];
  const failedDayIds: Id<"days">[] = [];
  for (const result of dayResults) {
    (result.restored ? restoredDayIds : failedDayIds).push(result.dayId);
  }

  const failedDays = new Set(failedDayIds);
  const rowResults = await Promise.all(
    [...new Set(args.rowIds)].map(async (rowId) => {
      const dayId = rowDayIds.get(rowId);
      if (dayId !== undefined && trashedParentDayIds.has(dayId) && failedDays.has(dayId)) {
        return { restored: false, rowId };
      }
      try {
        await restoreRow(ctx, ownerId, { rowId });
        return { restored: true, rowId };
      } catch {
        return { restored: false, rowId };
      }
    }),
  );
  const restoredRowIds: Id<"rows">[] = [];
  const failedRowIds: Id<"rows">[] = [];
  for (const result of rowResults) {
    (result.restored ? restoredRowIds : failedRowIds).push(result.rowId);
  }

  return { failedDayIds, failedRowIds, restoredDayIds, restoredRowIds };
}
