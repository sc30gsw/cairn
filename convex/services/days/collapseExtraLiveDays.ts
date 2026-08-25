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
  //? 消える側(loser)の配下の記録を勝者の日へ付け替えてから日を消す。付け替えないと、消えた
  //? dayId を指したまま孤児になった記録が日表示から見えなくなるのに集計には数え続けてしまう。
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
