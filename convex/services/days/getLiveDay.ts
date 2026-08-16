import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { getDayByDate } from "./getDayByDate";

export async function getLiveDay(
  ctx: QueryCtx | MutationCtx,
  ownerId: string,
  dateJst: string,
): Promise<Doc<"days"> | null> {
  const day = await getDayByDate(ctx, ownerId, dateJst);
  if (day === null || day.deletedAt !== undefined) {
    return null;
  }
  return day;
}
