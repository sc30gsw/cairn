import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError, ValidationFailedError } from "../../lib/errors";
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
  await requireEditableDay(ctx, ownerId, args.dateJst, args.todayJst);
  if (args.minutes < 0) {
    throwDomain(new ValidationFailedError({ message: "分数は0以上です" }));
  }
  const item = await ctx.db.get("items", args.itemId);
  if (item === null || item.ownerId !== ownerId) {
    throwDomain(new NotFoundError({ message: "項目が見つかりません", resource: "項目" }));
  }
  const day = await requireLiveDay(ctx, ownerId, args.dateJst);
  const rows = await liveRowsForDay(ctx, day._id);
  const sortOrder = rows.reduce((max, row) => Math.max(max, row.sortOrder), -1) + 1;
  //? 追加は未着手なので確定分数を動かさない。習得目標のカウンタ更新は confirm 側の担当(ADR-0007)。
  return await ctx.db.insert("rows", {
    content: args.content,
    dateJst: args.dateJst,
    dayId: day._id,
    itemId: args.itemId,
    minutes: args.minutes,
    ownerId,
    sortOrder,
    status: "未着手",
  });
}
