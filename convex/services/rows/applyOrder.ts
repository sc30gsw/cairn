import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { getLiveDay } from "../days/getLiveDay";
import { liveRowsForDay } from "../days/liveRowsForDay";

export async function applyOrder(
  ctx: MutationCtx,
  ownerId: string,
  args: { dateJst: string; orderedRowIds: Id<"rows">[] },
): Promise<null> {
  const day = await getLiveDay(ctx, ownerId, args.dateJst);
  if (day === null) {
    throwDomain(new NotFoundError({ message: "日が見つかりません", resource: "日" }));
  }
  const rows = await liveRowsForDay(ctx, day._id);
  if (args.orderedRowIds.length !== rows.length) {
    throwDomain(new ValidationFailedError({ message: "記録の並べ替えが不正です" }));
  }
  const liveIds = new Set(rows.map((row) => row._id));
  const seenRowIds = new Set<Id<"rows">>();
  for (const rowId of args.orderedRowIds) {
    if (!liveIds.has(rowId) || seenRowIds.has(rowId)) {
      throwDomain(new ValidationFailedError({ message: "記録の並べ替えが不正です" }));
    }
    seenRowIds.add(rowId);
  }
  await Promise.all(
    args.orderedRowIds.map(async (rowId, sortOrder) => {
      const row = rows.find((entry) => entry._id === rowId);
      if (row === undefined || row.sortOrder === sortOrder) {
        return;
      }
      await ctx.db.patch("rows", rowId, { sortOrder });
    }),
  );
  return null;
}
