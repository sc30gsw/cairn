import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type { RestoreTrashResult } from "../../lib/validators/trash";
import { restore as restoreRow } from "../rows/restore";
import { restoreDay } from "./restoreDay";

type RestoreManyArgs = {
  dayIds: Id<"days">[];
  rowIds: Id<"rows">[];
};

async function restoreDaysSequentially(
  ctx: MutationCtx,
  ownerId: string,
  dayIds: readonly Id<"days">[],
  index = 0,
): Promise<Id<"days">[]> {
  const dayId = dayIds[index];
  if (dayId === undefined) {
    return [];
  }
  await restoreDay(ctx, ownerId, { dayId });
  const remaining = await restoreDaysSequentially(ctx, ownerId, dayIds, index + 1);
  return [dayId, ...remaining];
}

async function restoreRowsSequentially(
  ctx: MutationCtx,
  ownerId: string,
  rowIds: readonly Id<"rows">[],
  rowDayIds: ReadonlyMap<Id<"rows">, Id<"days">>,
  trashedParentDayIds: ReadonlySet<Id<"days">>,
  failedDayIds: ReadonlySet<Id<"days">>,
  index = 0,
): Promise<Id<"rows">[]> {
  const rowId = rowIds[index];
  if (rowId === undefined) {
    return [];
  }
  const dayId = rowDayIds.get(rowId);
  if (dayId !== undefined && trashedParentDayIds.has(dayId) && failedDayIds.has(dayId)) {
    return restoreRowsSequentially(
      ctx,
      ownerId,
      rowIds,
      rowDayIds,
      trashedParentDayIds,
      failedDayIds,
      index + 1,
    );
  }
  await restoreRow(ctx, ownerId, { rowId });
  const remaining = await restoreRowsSequentially(
    ctx,
    ownerId,
    rowIds,
    rowDayIds,
    trashedParentDayIds,
    failedDayIds,
    index + 1,
  );
  return [rowId, ...remaining];
}

export async function restoreMany(
  ctx: MutationCtx,
  ownerId: string,
  args: RestoreManyArgs,
): Promise<RestoreTrashResult> {
  const dayIds = new Set<Id<"days">>(args.dayIds);
  const rowDayIds = new Map<Id<"rows">, Id<"days">>();
  const trashedParentDayIds = new Set<Id<"days">>();
  const rowIds = [...new Set(args.rowIds)];

  const rowLookups = await Promise.all(
    rowIds.map(async (rowId) => {
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

  const dayLookups = await Promise.all(
    [...dayIds].map(async (dayId) => ({ day: await ctx.db.get("days", dayId), dayId })),
  );
  const restorableDayIds: Id<"days">[] = [];
  const failedDayIds: Id<"days">[] = [];
  for (const { day, dayId } of dayLookups) {
    if (day === null || day.ownerId !== ownerId || day.deletedAt === undefined) {
      failedDayIds.push(dayId);
    } else {
      restorableDayIds.push(dayId);
    }
  }
  const restoredDayIds = await restoreDaysSequentially(ctx, ownerId, restorableDayIds);

  const failedDays = new Set(failedDayIds);
  const failedRowIds: Id<"rows">[] = [];
  const restorableRowIds: Id<"rows">[] = [];
  for (const rowId of rowIds) {
    const dayId = rowDayIds.get(rowId);
    if (dayId === undefined || (trashedParentDayIds.has(dayId) && failedDays.has(dayId))) {
      failedRowIds.push(rowId);
    } else {
      restorableRowIds.push(rowId);
    }
  }
  const restoredRowIds = await restoreRowsSequentially(
    ctx,
    ownerId,
    restorableRowIds,
    rowDayIds,
    trashedParentDayIds,
    failedDays,
  );

  return { failedDayIds, failedRowIds, restoredDayIds, restoredRowIds };
}
