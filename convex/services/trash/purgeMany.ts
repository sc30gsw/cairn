import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import type { OwnerId } from "../../lib/owner";
import { throwDomain } from "../../lib/ownerFunctions";
import { deleteRowsByIds } from "../../lib/trash";
import {
  TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT,
  TRASH_PURGE_SELECTION_LIMIT,
} from "../../lib/trashSelection";
import type { PurgeManyArgs } from "../../lib/validators/trash";
import { purgeDay } from "./purgeDay";

function throwMissing(resource: "日" | "記録"): never {
  throwDomain(
    new NotFoundError({
      message: `ゴミ箱に選択した${resource}はありません`,
      resource,
    }),
  );
}

function throwTooMuchWork(): never {
  throwDomain(
    new ValidationFailedError({
      message: "関連する記録と予定が多すぎます。選択を減らしてもう一度お試しください",
    }),
  );
}

async function collectRowsForDays(
  ctx: MutationCtx,
  dayIds: readonly Id<"days">[],
  affectedRowIds: Set<Id<"rows">>,
  index = 0,
): Promise<void> {
  const dayId = dayIds[index];
  if (dayId === undefined) {
    return;
  }
  const remaining = TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT - dayIds.length - affectedRowIds.size;
  const rows = await ctx.db
    .query("rows")
    .withIndex("by_day", (q) => q.eq("dayId", dayId))
    .take(remaining + 1);
  for (const row of rows) {
    affectedRowIds.add(row._id);
  }
  if (affectedRowIds.size + dayIds.length > TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT) {
    throwTooMuchWork();
  }
  await collectRowsForDays(ctx, dayIds, affectedRowIds, index + 1);
}

async function countScheduleEvents(
  ctx: MutationCtx,
  rowIds: readonly Id<"rows">[],
  workCount: number,
  index = 0,
): Promise<number> {
  const rowId = rowIds[index];
  if (rowId === undefined) {
    return workCount;
  }
  const events = await ctx.db
    .query("boardScheduleEvents")
    .withIndex("by_row", (q) => q.eq("rowId", rowId))
    .take(TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT - workCount + 1);
  const nextWorkCount = workCount + events.length;
  if (nextWorkCount > TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT) {
    return nextWorkCount;
  }
  return countScheduleEvents(ctx, rowIds, nextWorkCount, index + 1);
}

async function assertBoundedPurgeWork(
  ctx: MutationCtx,
  dayIds: readonly Id<"days">[],
  directRowIds: readonly Id<"rows">[],
): Promise<void> {
  const affectedRowIds = new Set(directRowIds);
  await collectRowsForDays(ctx, dayIds, affectedRowIds);
  const workCount = await countScheduleEvents(
    ctx,
    [...affectedRowIds],
    dayIds.length + affectedRowIds.size,
  );
  if (workCount > TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT) {
    throwTooMuchWork();
  }
}

async function purgeDaysSequentially(
  ctx: MutationCtx,
  ownerId: OwnerId,
  dayIds: readonly Id<"days">[],
  index = 0,
): Promise<null> {
  const dayId = dayIds[index];
  if (dayId === undefined) {
    return null;
  }
  await purgeDay(ctx, ownerId, { dayId });
  return purgeDaysSequentially(ctx, ownerId, dayIds, index + 1);
}

export async function purgeMany(
  ctx: MutationCtx,
  ownerId: OwnerId,
  args: PurgeManyArgs,
): Promise<null> {
  const dayIds = [...new Set(args.dayIds)];
  const rowIds = [...new Set(args.rowIds)];
  if (dayIds.length + rowIds.length > TRASH_PURGE_SELECTION_LIMIT) {
    throwDomain(
      new ValidationFailedError({
        message: `一度に完全削除できるのは${TRASH_PURGE_SELECTION_LIMIT}件までです`,
      }),
    );
  }
  const [days, rows] = await Promise.all([
    Promise.all(dayIds.map((dayId) => ctx.db.get("days", dayId))),
    Promise.all(rowIds.map((rowId) => ctx.db.get("rows", rowId))),
  ]);

  if (days.some((day) => day === null || day.ownerId !== ownerId || day.deletedAt === undefined)) {
    throwMissing("日");
  }
  if (rows.some((row) => row === null || row.ownerId !== ownerId || row.deletedAt === undefined)) {
    throwMissing("記録");
  }

  const selectedDayIds = new Set<Id<"days">>(dayIds);
  const directRowIds = rows.flatMap((row, index) => {
    const rowId = rowIds[index];
    return row !== null && rowId !== undefined && !selectedDayIds.has(row.dayId) ? [rowId] : [];
  });

  await assertBoundedPurgeWork(ctx, dayIds, directRowIds);
  await purgeDaysSequentially(ctx, ownerId, dayIds);
  await deleteRowsByIds(ctx, directRowIds);
  return null;
}
