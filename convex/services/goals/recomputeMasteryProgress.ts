import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { liveDayDatesFrom, liveRows } from "../history/shared";
import { creationDateJst, masteryProgressSince } from "./masteryProgress";

//* 保存済みカウンタを rows から作り直す。達成解除の「現在進行形への復帰」がこれ(ADR-0007)。
//? 差分更新の経路漏れでカウンタが漂流したときの修復手段も兼ねる(だから常に全期間を数え直す)。
export async function recomputeMasteryProgress(
  ctx: MutationCtx,
  goal: Doc<"goals">,
): Promise<null> {
  if (goal.type !== "mastery") {
    return null;
  }
  const since = creationDateJst(goal._creationTime);
  const [rows, days] = await Promise.all([
    ctx.db
      .query("rows")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", goal.ownerId).gte("dateJst", since))
      .collect(),
    ctx.db
      .query("days")
      .withIndex("by_owner_and_date", (q) => q.eq("ownerId", goal.ownerId).gte("dateJst", since))
      .collect(),
  ]);
  await ctx.db.patch(
    "goals",
    goal._id,
    masteryProgressSince(liveRows(rows, liveDayDatesFrom(days)), since),
  );
  return null;
}
