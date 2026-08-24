import type { QueryCtx } from "../../_generated/server";
import { CHECKPOINT_AUDIT_LIMIT } from "../../lib/domain";
import type { CheckpointParentAudit } from "../../lib/validators";
import { summarizeCheckpointParents } from "./summarizeCheckpointParents";

//* #49 の移行ゲート兼検証。全所有者を横断するのでインデックスが張れず、上限で必ず切る(CVX-11)。
//? Date.now() も日付引数も使わない(CVX-14)。集計は純関数側が持つ。
export async function auditCheckpointParents(ctx: QueryCtx): Promise<CheckpointParentAudit> {
  const goals = await ctx.db.query("goals").take(CHECKPOINT_AUDIT_LIMIT + 1);
  const truncated = goals.length > CHECKPOINT_AUDIT_LIMIT;

  //? 打ち切ったときは参照整合(dangling / chained)の判定が信頼できないので truncated を返す。
  return summarizeCheckpointParents(goals.slice(0, CHECKPOINT_AUDIT_LIMIT), truncated);
}
