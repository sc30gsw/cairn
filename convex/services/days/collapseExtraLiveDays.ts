import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";

export async function collapseExtraLiveDays(
  ctx: MutationCtx,
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
  const winner = live[0];
  if (winner === undefined) {
    return null;
  }
  const losers = live.slice(1);
  for (const loser of losers) {
    const orphanedRows = await ctx.db
      .query("rows")
      .withIndex("by_day", (q) => q.eq("dayId", loser._id))
      .collect();
    await Promise.all(
      orphanedRows.map((row) => ctx.db.patch("rows", row._id, { dayId: winner._id })),
    );
  }
  await Promise.all(losers.map((day) => ctx.db.delete("days", day._id)));
  return winner;
}
