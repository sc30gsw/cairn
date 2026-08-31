import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { requireDateJst } from "../../lib/dateArgs";
import { requireValidMinutes } from "../../lib/domain";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { liveRowsForDay } from "../days/liveRowsForDay";
import { requireEditableDay } from "../days/requireEditableDay";
import { requireLiveDay } from "../days/requireLiveDay";

export async function add(
  ctx: MutationCtx,
  ownerId: string,
  args: {
    content: string;
    dateJst: string;
    itemId: Id<"items">;
    minutes: number;
    todayJst: string;
  },
): Promise<Id<"rows">> {
  const dateJst = requireDateJst(args.dateJst);
  const todayJst = requireDateJst(args.todayJst);
  await requireEditableDay(ctx, ownerId, dateJst, todayJst);
  const minutes = requireValidMinutes(args.minutes);
  const item = await ctx.db.get("items", args.itemId);
  if (item === null || item.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
  }
  const day = await requireLiveDay(ctx, ownerId, dateJst);
  const rows = await liveRowsForDay(ctx, day._id);
  const sortOrder = rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
  return await ctx.db.insert("rows", {
    content: args.content,
    dateJst,
    dayId: day._id,
    itemId: args.itemId,
    minutes,
    ownerId,
    sortOrder,
    status: "未着手",
  });
}
