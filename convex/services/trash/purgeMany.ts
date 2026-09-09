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

async function assertBoundedPurgeWork(
  ctx: MutationCtx,
  dayIds: readonly Id<"days">[],
  directRowIds: readonly Id<"rows">[],
): Promise<void> {
  let remaining = TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT - dayIds.length;
  const affectedRowIds = new Set(directRowIds);

  for (const dayId of dayIds) {
    const rows = await ctx.db
      .query("rows")
      .withIndex("by_day", (q) => q.eq("dayId", dayId))
      .take(remaining + 1);
    for (const row of rows) {
      affectedRowIds.add(row._id);
    }
    remaining = TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT - dayIds.length - affectedRowIds.size;
    if (remaining < 0) {
      throwTooMuchWork();
    }
  }

  let workCount = dayIds.length + affectedRowIds.size;
  for (const rowId of affectedRowIds) {
    const events = await ctx.db
      .query("boardScheduleEvents")
      .withIndex("by_row", (q) => q.eq("rowId", rowId))
      .take(TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT - workCount + 1);
    workCount += events.length;
    if (workCount > TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT) {
      break;
    }
  }

  if (workCount > TRASH_PURGE_EXPANDED_DOCUMENT_LIMIT) {
    throwTooMuchWork();
  }
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
  for (const dayId of dayIds) {
    await purgeDay(ctx, ownerId, { dayId });
  }
  await deleteRowsByIds(ctx, directRowIds);
  return null;
}
