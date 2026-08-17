import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { deleteDayAndRows } from "../../lib/trash";

export async function purgeDay(
  ctx: MutationCtx,
  ownerId: string,
  args: { dayId: Id<"days"> },
): Promise<null> {
  const day = await ctx.db.get("days", args.dayId);
  if (day === null || day.ownerId !== ownerId || day.deletedAt === undefined) {
    throwDomain(new NotFoundError({ message: "ゴミ箱にその日はありません", resource: "日" }));
  }
  //? ゴミ箱の日の配下は既に実績から外れている。完全削除で確定分数は動かない(ADR-0007)。
  await deleteDayAndRows(ctx, args.dayId);
  return null;
}
