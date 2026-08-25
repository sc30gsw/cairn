import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { throwDomain } from "../../lib/ownerFunctions";
import { withMasteryProgressDelta } from "../goals/withMasteryProgressDelta";
import { clearTimerFields } from "./clearTimerFields";
import { rowDayLiveness } from "./rowDayLiveness";

export async function restore(
  ctx: MutationCtx,
  ownerId: string,
  args: { rowId: Id<"rows"> },
): Promise<null> {
  const row = await ctx.db.get("rows", args.rowId);
  if (row === null || row.ownerId !== ownerId || row.deletedAt === undefined) {
    throwDomain(new NotFoundError({ message: "ゴミ箱にその記録はありません", resource: "記録" }));
  }
  //? 生存判定は暦日で引く共通規則(rowDayLiveness)。confirm / skip と同じ規則。
  if ((await rowDayLiveness(ctx, ownerId, row)) === "trashed") {
    throwDomain(new ConflictError({ message: "日がゴミ箱にあります。先に日を戻してください" }));
  }
  //? 確定記録が実績に戻るぶんは、書き込みの前後を実測して出す(ADR-0007)。
  await withMasteryProgressDelta(ctx, ownerId, row, async () => {
    //? 計測フィールドも念のため一緒に消す。正しい経路では既に無いはずだが、レガシー/破損データが
    //? 走ったままの計測付きで復元されると幽霊の進行中扱いになる(docs/specs/study-timer.md §4.3)。
    await ctx.db.patch("rows", args.rowId, { ...clearTimerFields(), deletedAt: undefined });
  });
  return null;
}
