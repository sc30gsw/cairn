import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";

export async function getDayByDate(
  ctx: QueryCtx | MutationCtx,
  ownerId: string,
  dateJst: string,
): Promise<Doc<"days"> | null> {
  const days = await ctx.db
    .query("days")
    .withIndex("by_owner_and_date", (q) => q.eq("ownerId", ownerId).eq("dateJst", dateJst))
    .collect();
  const live = days
    .filter((day) => day.deletedAt === undefined)
    .toSorted((left, right) => left._creationTime - right._creationTime);
  if (live[0] !== undefined) {
    return live[0];
  }
  const trashed = days
    .filter((day) => day.deletedAt !== undefined)
    .toSorted((left, right) => left._creationTime - right._creationTime);
  return trashed[0] ?? null;
}
