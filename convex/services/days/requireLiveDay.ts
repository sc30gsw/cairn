import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { collapseExtraLiveDays } from "./collapseExtraLiveDays";
import { getDayByDate } from "./getDayByDate";

export async function requireLiveDay(
  ctx: MutationCtx,
  ownerId: string,
  dateJst: string,
): Promise<Doc<"days">> {
  const existing = await getDayByDate(ctx, ownerId, dateJst);
  if (existing !== null && existing.deletedAt !== undefined) {
    throwDomain(
      new NotFoundError({ message: "ゴミ箱の日です。先に戻してください", resource: "日" }),
    );
  }
  if (existing !== null) {
    return existing;
  }
  await ctx.db.insert("days", { dateJst, ownerId });
  const winner = await collapseExtraLiveDays(ctx, ownerId, dateJst);
  if (winner === null) {
    throwDomain(new NotFoundError({ message: "日を作れませんでした", resource: "日" }));
  }
  return winner;
}
