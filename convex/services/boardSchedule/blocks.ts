import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import {
  DEFAULT_BOARD_SCHEDULE_COLOR,
  type BoardScheduleColor,
} from "../../lib/boardScheduleColors";
import { type BoardScheduleView, scheduleListRange } from "../../lib/boardScheduleRange";
import { requireDateJst } from "../../lib/dateArgs";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { assertScheduleRange, requireScheduleInstant } from "../../lib/scheduleInstant";
import { requireOwnedRow } from "../rows/requireOwnedRow";
import { rowDayLiveness } from "../rows/rowDayLiveness";

const DEFAULT_COLOR = DEFAULT_BOARD_SCHEDULE_COLOR;

function normalizeRange(startAt: string, endAt: string): { endAt: string; startAt: string } {
  const normalizedStart = requireScheduleInstant(startAt);
  const normalizedEnd = requireScheduleInstant(endAt);
  assertScheduleRange(normalizedStart, normalizedEnd);
  return { endAt: normalizedEnd, startAt: normalizedStart };
}

async function requireOwnedBlock(
  ctx: MutationCtx | QueryCtx,
  ownerId: string,
  blockId: Id<"boardScheduleEvents">,
) {
  const block = await ctx.db.get("boardScheduleEvents", blockId);
  if (block === null || block.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "予定が見つかりません", resource: "予定" }));
  }
  return block;
}

async function requireLiveRowForSchedule(
  ctx: MutationCtx,
  ownerId: string,
  rowId: Id<"rows">,
): Promise<{ itemName: string; rowId: Id<"rows"> }> {
  const row = await requireOwnedRow(ctx, ownerId, rowId);
  if ((await rowDayLiveness(ctx, ownerId, row)) !== "live") {
    throwDomain(new NotFoundError({ message: "記録が見つかりません", resource: "記録" }));
  }
  const item = await ctx.db.get("items", row.itemId);
  if (item === null || item.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
  }
  return { itemName: item.name, rowId: row._id };
}

export async function listForWeek(
  ctx: QueryCtx,
  ownerId: string,
  args: { anchorDateJst: string; view: BoardScheduleView },
): Promise<
  Array<{
    _id: Id<"boardScheduleEvents">;
    color: BoardScheduleColor;
    endAt: string;
    rowId: Id<"rows">;
    startAt: string;
    title: string;
  }>
> {
  const anchorDateJst = requireDateJst(args.anchorDateJst);
  const { rangeEndExclusive, rangeStart } = scheduleListRange(args.view, anchorDateJst);
  const candidateBlocks = await ctx.db
    .query("boardScheduleEvents")
    .withIndex("by_owner_and_startAt", (q) =>
      q.eq("ownerId", ownerId).gte("startAt", rangeStart).lt("startAt", rangeEndExclusive),
    )
    .collect();
  const result: Array<{
    _id: Id<"boardScheduleEvents">;
    color: BoardScheduleColor;
    endAt: string;
    rowId: Id<"rows">;
    startAt: string;
    title: string;
  }> = [];
  for (const block of candidateBlocks) {
    result.push({
      _id: block._id,
      color: block.color ?? DEFAULT_COLOR,
      endAt: block.endAt,
      rowId: block.rowId,
      startAt: block.startAt,
      title: block.title,
    });
  }
  return result;
}

export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: { color?: BoardScheduleColor; endAt: string; rowId: Id<"rows">; startAt: string },
): Promise<Id<"boardScheduleEvents">> {
  const { endAt, startAt } = normalizeRange(args.startAt, args.endAt);
  const { itemName, rowId } = await requireLiveRowForSchedule(ctx, ownerId, args.rowId);
  return await ctx.db.insert("boardScheduleEvents", {
    color: args.color ?? DEFAULT_COLOR,
    endAt,
    ownerId,
    rowId,
    startAt,
    title: itemName,
  });
}

export async function update(
  ctx: MutationCtx,
  ownerId: string,
  args: {
    blockId: Id<"boardScheduleEvents">;
    color?: BoardScheduleColor;
    endAt: string;
    rowId?: Id<"rows">;
    startAt: string;
  },
): Promise<null> {
  const block = await requireOwnedBlock(ctx, ownerId, args.blockId);
  const { endAt, startAt } = normalizeRange(args.startAt, args.endAt);
  const patch: {
    color?: BoardScheduleColor;
    endAt: string;
    rowId?: Id<"rows">;
    startAt: string;
    title?: string;
  } = {
    endAt,
    startAt,
  };
  if (args.color !== undefined) {
    patch.color = args.color;
  }
  if (args.rowId !== undefined) {
    const { itemName, rowId } = await requireLiveRowForSchedule(ctx, ownerId, args.rowId);
    patch.rowId = rowId;
    patch.title = itemName;
  } else {
    await requireLiveRowForSchedule(ctx, ownerId, block.rowId);
  }
  await ctx.db.patch("boardScheduleEvents", args.blockId, patch);
  return null;
}

export async function remove(
  ctx: MutationCtx,
  ownerId: string,
  args: { blockId: Id<"boardScheduleEvents"> },
): Promise<null> {
  await requireOwnedBlock(ctx, ownerId, args.blockId);
  await ctx.db.delete("boardScheduleEvents", args.blockId);
  return null;
}

export async function move(
  ctx: MutationCtx,
  ownerId: string,
  args: { blockId: Id<"boardScheduleEvents">; endAt: string; startAt: string },
): Promise<null> {
  const block = await requireOwnedBlock(ctx, ownerId, args.blockId);
  await requireLiveRowForSchedule(ctx, ownerId, block.rowId);
  const { endAt, startAt } = normalizeRange(args.startAt, args.endAt);
  await ctx.db.patch("boardScheduleEvents", args.blockId, { endAt, startAt });
  return null;
}

export async function removeForRow(
  ctx: MutationCtx,
  ownerId: string,
  rowId: Id<"rows">,
): Promise<void> {
  const blocks = await ctx.db
    .query("boardScheduleEvents")
    .withIndex("by_row", (q) => q.eq("rowId", rowId))
    .collect();
  const deletions: Array<Promise<void>> = [];
  for (const block of blocks) {
    if (block.ownerId !== ownerId) {
      continue;
    }
    deletions.push(ctx.db.delete("boardScheduleEvents", block._id));
  }
  await Promise.all(deletions);
}
