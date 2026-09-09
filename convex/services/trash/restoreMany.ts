import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type { RestoreTrashResult } from "../../lib/validators/trash";
import { restore as restoreRow } from "../rows/restore";
import { restoreDay } from "./restoreDay";

type RestoreManyArgs = {
  dayIds: Id<"days">[];
  rowIds: Id<"rows">[];
};

type RestoreDayResult = { dayId: Id<"days">; restored: boolean };
type RestoreRowResult = { restored: boolean; rowId: Id<"rows"> };

async function restoreDaysSequentially(
  ctx: MutationCtx,
  ownerId: string,
  dayIds: readonly Id<"days">[],
  index = 0,
  results: RestoreDayResult[] = [],
): Promise<RestoreDayResult[]> {
  const dayId = dayIds[index];
  if (dayId === undefined) {
    return results;
  }
  try {
    await restoreDay(ctx, ownerId, { dayId });
    results.push({ dayId, restored: true });
  } catch {
    results.push({ dayId, restored: false });
  }
  return restoreDaysSequentially(ctx, ownerId, dayIds, index + 1, results);
}

async function restoreRowsSequentially(
  ctx: MutationCtx,
  ownerId: string,
  rowIds: readonly Id<"rows">[],
  rowDayIds: ReadonlyMap<Id<"rows">, Id<"days">>,
  trashedParentDayIds: ReadonlySet<Id<"days">>,
  failedDayIds: ReadonlySet<Id<"days">>,
  index = 0,
  results: RestoreRowResult[] = [],
): Promise<RestoreRowResult[]> {
  const rowId = rowIds[index];
  if (rowId === undefined) {
    return results;
  }
  const dayId = rowDayIds.get(rowId);
  if (dayId !== undefined && trashedParentDayIds.has(dayId) && failedDayIds.has(dayId)) {
    results.push({ restored: false, rowId });
    return restoreRowsSequentially(
      ctx,
      ownerId,
      rowIds,
      rowDayIds,
      trashedParentDayIds,
      failedDayIds,
      index + 1,
      results,
    );
  }
  try {
    await restoreRow(ctx, ownerId, { rowId });
    results.push({ restored: true, rowId });
  } catch {
    results.push({ restored: false, rowId });
  }
  return restoreRowsSequentially(
    ctx,
    ownerId,
    rowIds,
    rowDayIds,
    trashedParentDayIds,
    failedDayIds,
    index + 1,
    results,
  );
}

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

  const dayResults = await restoreDaysSequentially(ctx, ownerId, [...dayIds]);
  const restoredDayIds: Id<"days">[] = [];
  const failedDayIds: Id<"days">[] = [];
  for (const result of dayResults) {
    (result.restored ? restoredDayIds : failedDayIds).push(result.dayId);
  }

  const failedDays = new Set(failedDayIds);
  const rowResults = await restoreRowsSequentially(
    ctx,
    ownerId,
    [...new Set(args.rowIds)],
    rowDayIds,
    trashedParentDayIds,
    failedDays,
  );
  const restoredRowIds: Id<"rows">[] = [];
  const failedRowIds: Id<"rows">[] = [];
  for (const result of rowResults) {
    (result.restored ? restoredRowIds : failedRowIds).push(result.rowId);
  }

  return { failedDayIds, failedRowIds, restoredDayIds, restoredRowIds };
}
