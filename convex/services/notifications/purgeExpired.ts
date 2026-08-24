import type { MutationCtx } from "../../_generated/server";
import { NOTIFICATION_PURGE_BATCH, NOTIFICATION_TTL_MS } from "../../lib/notifications";

//* 保持期間(30日)を超えた通知を消す。未読でも消す — 読まれない催促を永久に溜めない。
export async function purgeExpired(ctx: MutationCtx, args: { now?: number } = {}): Promise<null> {
  const now = args.now ?? Date.now();
  const cutoff = now - NOTIFICATION_TTL_MS;
  //? 素のテーブルスキャンは組み込みの by_creation_time 昇順(= 最古から)なので、
  //? .take で上限を切れば「古い順に最大200件」を読める(CVX-11 の許容手段)。
  //? .filter は書かない(CVX-10)。cutoff の判定は TypeScript 側で行う。
  const oldest = await ctx.db.query("notifications").take(NOTIFICATION_PURGE_BATCH);
  const expired = oldest.filter((doc) => doc._creationTime < cutoff);
  await Promise.all(expired.map((doc) => ctx.db.delete("notifications", doc._id)));
  return null;
}
