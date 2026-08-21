import type { Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { addDaysJst, mondayOfWeek } from "../../lib/jst";
import { throwDomain } from "../../lib/ownerFunctions";
import { assertScheduleRange, requireScheduleInstant } from "../../lib/scheduleInstant";

const DEFAULT_COLOR = "blue";

function normalizeTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed === "") {
    throwDomain(new ValidationFailedError({ message: "タイトルは必須です" }));
  }
  return trimmed;
}

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

export async function listForWeek(
  ctx: QueryCtx,
  ownerId: string,
  args: { anchorDateJst: string },
): Promise<
  Array<{
    _id: Id<"boardScheduleEvents">;
    color: string;
    endAt: string;
    startAt: string;
    title: string;
  }>
> {
  const weekStart = mondayOfWeek(args.anchorDateJst);
  const weekEndExclusive = `${addDaysJst(weekStart, 7)} 00:00:00`;
  const rangeStart = `${weekStart} 00:00:00`;
  const blocks = await ctx.db
    .query("boardScheduleEvents")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  const result: Array<{
    _id: Id<"boardScheduleEvents">;
    color: string;
    endAt: string;
    startAt: string;
    title: string;
  }> = [];
  for (const block of blocks) {
    if (block.startAt >= weekEndExclusive || block.endAt <= rangeStart) {
      continue;
    }
    result.push({
      _id: block._id,
      color: block.color ?? DEFAULT_COLOR,
      endAt: block.endAt,
      startAt: block.startAt,
      title: block.title,
    });
  }
  return result;
}

export async function create(
  ctx: MutationCtx,
  ownerId: string,
  args: { color?: string; endAt: string; startAt: string; title: string },
): Promise<Id<"boardScheduleEvents">> {
  const title = normalizeTitle(args.title);
  const { endAt, startAt } = normalizeRange(args.startAt, args.endAt);
  return await ctx.db.insert("boardScheduleEvents", {
    color: args.color ?? DEFAULT_COLOR,
    endAt,
    ownerId,
    startAt,
    title,
  });
}

export async function update(
  ctx: MutationCtx,
  ownerId: string,
  args: {
    blockId: Id<"boardScheduleEvents">;
    color?: string;
    endAt: string;
    startAt: string;
    title: string;
  },
): Promise<null> {
  await requireOwnedBlock(ctx, ownerId, args.blockId);
  const title = normalizeTitle(args.title);
  const { endAt, startAt } = normalizeRange(args.startAt, args.endAt);
  await ctx.db.patch("boardScheduleEvents", args.blockId, {
    color: args.color ?? DEFAULT_COLOR,
    endAt,
    startAt,
    title,
  });
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
  await requireOwnedBlock(ctx, ownerId, args.blockId);
  const { endAt, startAt } = normalizeRange(args.startAt, args.endAt);
  await ctx.db.patch("boardScheduleEvents", args.blockId, { endAt, startAt });
  return null;
}
