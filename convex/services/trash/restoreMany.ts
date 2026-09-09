import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type { RestoreManyArgs, RestoreTrashResult } from "../../lib/validators/trash";
import { restore as restoreRow } from "../rows/restore";
import { restoreDay } from "./restoreDay";

type DayFailure = RestoreTrashResult["failedDayReasons"][number];
type RowFailure = RestoreTrashResult["failedRowReasons"][number];

type DayRestoreResult = {
  failedDays: DayFailure[];
  restoredDayIds: Id<"days">[];
};

type RowRestoreResult = {
  failedRows: RowFailure[];
  restoredRowIds: Id<"rows">[];
};

function failureReason(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const data = Reflect.get(error, "data");
    const message = data !== null && typeof data === "object" ? Reflect.get(data, "message") : null;
    if (typeof message === "string" && message.trim() !== "") {
      return message;
    }
  }
  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }
  return fallback;
}

async function restoreDaysSequentially(
  ctx: MutationCtx,
  ownerId: string,
  dayIds: readonly Id<"days">[],
  index = 0,
  result: DayRestoreResult = { failedDays: [], restoredDayIds: [] },
): Promise<DayRestoreResult> {
  const dayId = dayIds[index];
  if (dayId === undefined) {
    return result;
  }
  try {
    await restoreDay(ctx, ownerId, { dayId });
    return restoreDaysSequentially(ctx, ownerId, dayIds, index + 1, {
      failedDays: result.failedDays,
      restoredDayIds: result.restoredDayIds.concat(dayId),
    });
  } catch (error) {
    return restoreDaysSequentially(ctx, ownerId, dayIds, index + 1, {
      failedDays: result.failedDays.concat({
        dayId,
        reason: failureReason(error, "日を復元できませんでした"),
      }),
      restoredDayIds: result.restoredDayIds,
    });
  }
}

async function restoreRowsSequentially(
  ctx: MutationCtx,
  ownerId: string,
  rowIds: readonly Id<"rows">[],
  index = 0,
  result: RowRestoreResult = { failedRows: [], restoredRowIds: [] },
): Promise<RowRestoreResult> {
  const rowId = rowIds[index];
  if (rowId === undefined) {
    return result;
  }
  try {
    await restoreRow(ctx, ownerId, { rowId });
    return restoreRowsSequentially(ctx, ownerId, rowIds, index + 1, {
      failedRows: result.failedRows,
      restoredRowIds: result.restoredRowIds.concat(rowId),
    });
  } catch (error) {
    return restoreRowsSequentially(ctx, ownerId, rowIds, index + 1, {
      failedRows: result.failedRows.concat({
        reason: failureReason(error, "記録を復元できませんでした"),
        rowId,
      }),
      restoredRowIds: result.restoredRowIds,
    });
  }
}

export async function restoreMany(
  ctx: MutationCtx,
  ownerId: string,
  args: RestoreManyArgs,
): Promise<RestoreTrashResult> {
  const rowIds = [...new Set(args.rowIds)];

  const rowLookups = await Promise.all(
    rowIds.map(async (rowId) => {
      const row = await ctx.db.get("rows", rowId);
      if (row === null || row.ownerId !== ownerId || row.deletedAt === undefined) {
        return { day: null, reason: "ゴミ箱にその記録がありません", row: null, rowId };
      }
      const day = await ctx.db.get("days", row.dayId);
      return { day, row, rowId };
    }),
  );
  const validRowLookups = rowLookups.filter((lookup) => lookup.row !== null);
  const rowDayIds = new Map(
    validRowLookups.flatMap((lookup) =>
      lookup.row === null
        ? []
        : [[lookup.rowId, lookup.row.dayId] as const satisfies readonly [Id<"rows">, Id<"days">]],
    ),
  );
  const trashedParentDayIds = new Set(
    validRowLookups.flatMap((lookup) =>
      lookup.row !== null && lookup.day?.ownerId === ownerId && lookup.day.deletedAt !== undefined
        ? [lookup.row.dayId]
        : [],
    ),
  );
  const dayIds = new Set<Id<"days">>([...args.dayIds, ...trashedParentDayIds]);
  const initialRowFailures = rowLookups.flatMap((lookup) =>
    lookup.row === null ? [{ reason: lookup.reason, rowId: lookup.rowId }] : [],
  );

  const dayLookups = await Promise.all(
    [...dayIds].map(async (dayId) => ({ day: await ctx.db.get("days", dayId), dayId })),
  );
  const initialDayFailures = dayLookups.flatMap(({ day, dayId }) =>
    day === null || day.ownerId !== ownerId || day.deletedAt === undefined
      ? [{ dayId, reason: "ゴミ箱にその日はありません" }]
      : [],
  );
  const restorableDayIds = dayLookups.flatMap(({ day, dayId }) =>
    day !== null && day.ownerId === ownerId && day.deletedAt !== undefined ? [dayId] : [],
  );
  const restoredDays = await restoreDaysSequentially(ctx, ownerId, restorableDayIds);
  const failedDayFailures = initialDayFailures.concat(restoredDays.failedDays);
  const failedDayReasons = new Map(
    failedDayFailures.map((failure) => [failure.dayId, failure.reason]),
  );
  const failedDays = new Set(failedDayReasons.keys());

  const parentRowFailures = validRowLookups.flatMap((lookup) => {
    if (lookup.row === null) {
      return [];
    }
    const dayId = rowDayIds.get(lookup.rowId);
    if (dayId !== undefined && trashedParentDayIds.has(dayId) && failedDays.has(dayId)) {
      const parentReason = failedDayReasons.get(dayId);
      return [
        {
          reason:
            parentReason === undefined
              ? "親の日を復元できませんでした"
              : `親の日を復元できませんでした: ${parentReason}`,
          rowId: lookup.rowId,
        },
      ];
    }
    return [];
  });
  const restorableRowIds = validRowLookups.flatMap((lookup) => {
    if (lookup.row === null) {
      return [];
    }
    const dayId = rowDayIds.get(lookup.rowId);
    return dayId !== undefined && trashedParentDayIds.has(dayId) && failedDays.has(dayId)
      ? []
      : [lookup.rowId];
  });
  const failedRowFailures = initialRowFailures.concat(parentRowFailures);
  const restoredRows = await restoreRowsSequentially(ctx, ownerId, restorableRowIds);
  const failedRows = failedRowFailures.concat(restoredRows.failedRows);

  return {
    failedDayIds: failedDayFailures.map((failure) => failure.dayId),
    failedDayReasons: failedDayFailures,
    failedRowIds: failedRows.map((failure) => failure.rowId),
    failedRowReasons: failedRows,
    restoredDayIds: restoredDays.restoredDayIds,
    restoredRowIds: restoredRows.restoredRowIds,
  };
}
